import { Pool } from 'pg';
import Stripe from 'stripe';

interface TaxRate {
  id: string;
  country_code: string;
  state_code?: string;
  tax_type: string;
  rate: number;
  name: string;
  stripe_tax_rate_id?: string;
}

interface TaxCalculationRequest {
  amount: number;
  currency: string;
  customer_id: string;
  line_items: Array<{
    amount: number;
    description: string;
    tax_category?: string; // 'digital', 'physical', 'service'
  }>;
  shipping_address?: {
    country: string;
    state?: string;
    postal_code?: string;
  };
  billing_address?: {
    country: string;
    state?: string;
    postal_code?: string;
  };
}

interface TaxCalculationResult {
  subtotal: number;
  tax_amount: number;
  total: number;
  tax_breakdown: Array<{
    tax_rate_id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  applied_rates: TaxRate[];
}

export class TaxCalculationService {
  private pool: Pool;
  private stripe: Stripe;
  private taxRateCache: Map<string, TaxRate[]> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour

  constructor(pool: Pool, stripe: Stripe) {
    this.pool = pool;
    this.stripe = stripe;
  }

  // ========== TAX CALCULATION ==========

  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    // Determine tax jurisdiction
    const taxAddress = request.shipping_address || request.billing_address;
    if (!taxAddress) {
      throw new Error('Tax calculation requires either shipping or billing address');
    }

    // Get applicable tax rates
    const applicableTaxRates = await this.getApplicableTaxRates(
      taxAddress.country,
      taxAddress.state
    );

    // Calculate tax for each line item
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown: TaxCalculationResult['tax_breakdown'] = [];

    for (const item of request.line_items) {
      subtotal += item.amount;

      // Apply each applicable tax rate
      for (const taxRate of applicableTaxRates) {
        if (this.shouldApplyTaxToItem(item, taxRate)) {
          const taxAmount = item.amount * taxRate.rate;
          totalTax += taxAmount;

          // Add to breakdown
          const existingBreakdown = taxBreakdown.find(b => b.tax_rate_id === taxRate.id);
          if (existingBreakdown) {
            existingBreakdown.amount += taxAmount;
          } else {
            taxBreakdown.push({
              tax_rate_id: taxRate.id,
              name: taxRate.name,
              rate: taxRate.rate,
              amount: taxAmount
            });
          }
        }
      }
    }

    return {
      subtotal,
      tax_amount: Math.round(totalTax * 100) / 100, // Round to 2 decimal places
      total: subtotal + Math.round(totalTax * 100) / 100,
      tax_breakdown: taxBreakdown,
      applied_rates: applicableTaxRates
    };
  }

  private shouldApplyTaxToItem(
    item: TaxCalculationRequest['line_items'][0],
    taxRate: TaxRate
  ): boolean {
    const category = item.tax_category || 'service';
    
    switch (category) {
      case 'digital':
        return taxRate.applies_to_digital !== false;
      case 'physical':
        return taxRate.applies_to_physical !== false;
      case 'service':
        return true; // Services are generally taxable
      default:
        return true;
    }
  }

  // ========== TAX RATE MANAGEMENT ==========

  async getApplicableTaxRates(
    countryCode: string,
    stateCode?: string
  ): Promise<TaxRate[]> {
    const cacheKey = `${countryCode}-${stateCode || 'ALL'}`;
    
    // Check cache first
    const cached = this.taxRateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.pool.query(
      `SELECT * FROM tax_rates 
       WHERE country_code = $1 
       AND (state_code = $2 OR state_code IS NULL)
       AND active = true
       AND (valid_from <= CURRENT_DATE OR valid_from IS NULL)
       AND (valid_to >= CURRENT_DATE OR valid_to IS NULL)
       ORDER BY state_code DESC NULLS LAST`, // Prefer state-specific rates
      [countryCode, stateCode]
    );

    const taxRates = result.rows;
    
    // Cache the results
    this.taxRateCache.set(cacheKey, taxRates);
    setTimeout(() => this.taxRateCache.delete(cacheKey), this.cacheExpiry);

    return taxRates;
  }

  async createTaxRate(data: {
    country_code: string;
    state_code?: string;
    tax_type: string;
    rate: number;
    name: string;
    description?: string;
    applies_to_digital?: boolean;
    applies_to_physical?: boolean;
  }): Promise<TaxRate> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create in Stripe if rate is valid
      let stripeTaxRateId: string | undefined;
      if (data.rate > 0) {
        const stripeTaxRate = await this.stripe.taxRates.create({
          display_name: data.name,
          description: data.description,
          jurisdiction: data.state_code || data.country_code,
          percentage: data.rate * 100, // Convert to percentage
          inclusive: false,
          metadata: {
            country_code: data.country_code,
            state_code: data.state_code || '',
            tax_type: data.tax_type
          }
        });
        stripeTaxRateId = stripeTaxRate.id;
      }

      // Save to database
      const result = await client.query(
        `INSERT INTO tax_rates 
         (country_code, state_code, tax_type, rate, name, description, 
          applies_to_digital, applies_to_physical, stripe_tax_rate_id, valid_from)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
         RETURNING *`,
        [
          data.country_code,
          data.state_code || null,
          data.tax_type,
          data.rate,
          data.name,
          data.description || null,
          data.applies_to_digital !== false,
          data.applies_to_physical !== false,
          stripeTaxRateId
        ]
      );

      await client.query('COMMIT');
      
      // Clear cache for this location
      this.clearTaxRateCache(data.country_code, data.state_code);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTaxRate(
    taxRateId: string,
    updates: Partial<{
      rate: number;
      name: string;
      description: string;
      active: boolean;
      valid_to: Date;
    }>
  ): Promise<TaxRate> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current tax rate
      const currentResult = await client.query(
        'SELECT * FROM tax_rates WHERE id = $1',
        [taxRateId]
      );
      
      if (currentResult.rows.length === 0) {
        throw new Error('Tax rate not found');
      }

      const currentTaxRate = currentResult.rows[0];

      // If rate changed, create new Stripe tax rate
      let newStripeTaxRateId = currentTaxRate.stripe_tax_rate_id;
      if (updates.rate && updates.rate !== currentTaxRate.rate) {
        // Archive old Stripe tax rate
        if (currentTaxRate.stripe_tax_rate_id) {
          await this.stripe.taxRates.update(currentTaxRate.stripe_tax_rate_id, {
            active: false
          });
        }

        // Create new Stripe tax rate
        const stripeTaxRate = await this.stripe.taxRates.create({
          display_name: updates.name || currentTaxRate.name,
          description: updates.description || currentTaxRate.description,
          jurisdiction: currentTaxRate.state_code || currentTaxRate.country_code,
          percentage: updates.rate * 100,
          inclusive: false,
          metadata: {
            country_code: currentTaxRate.country_code,
            state_code: currentTaxRate.state_code || '',
            tax_type: currentTaxRate.tax_type
          }
        });
        newStripeTaxRateId = stripeTaxRate.id;
      }

      // Update database
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.rate !== undefined) {
        updateFields.push(`rate = $${paramCount++}`);
        values.push(updates.rate);
      }
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.active !== undefined) {
        updateFields.push(`active = $${paramCount++}`);
        values.push(updates.active);
      }
      if (updates.valid_to !== undefined) {
        updateFields.push(`valid_to = $${paramCount++}`);
        values.push(updates.valid_to);
      }
      if (newStripeTaxRateId !== currentTaxRate.stripe_tax_rate_id) {
        updateFields.push(`stripe_tax_rate_id = $${paramCount++}`);
        values.push(newStripeTaxRateId);
      }

      values.push(taxRateId);
      
      const result = await client.query(
        `UPDATE tax_rates 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');
      
      // Clear cache
      this.clearTaxRateCache(currentTaxRate.country_code, currentTaxRate.state_code);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========== TAX COMPLIANCE ==========

  async validateTaxConfiguration(countryCode: string): Promise<{
    isValid: boolean;
    missingRates: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      missingRates: [] as string[],
      warnings: [] as string[]
    };

    // Check if country has any tax rates configured
    const countryRates = await this.getApplicableTaxRates(countryCode);
    if (countryRates.length === 0) {
      result.warnings.push(`No tax rates configured for ${countryCode}`);
    }

    // Country-specific validation
    switch (countryCode) {
      case 'US':
        // US requires state-level tax configuration
        const statesWithSalesTax = ['CA', 'NY', 'TX', 'FL', 'IL']; // Example states
        for (const state of statesWithSalesTax) {
          const stateRates = await this.getApplicableTaxRates('US', state);
          if (stateRates.length === 0) {
            result.missingRates.push(`US-${state}`);
          }
        }
        break;

      case 'GB':
      case 'DE':
      case 'FR':
        // EU countries typically have VAT
        const vatRate = countryRates.find(r => r.tax_type === 'vat');
        if (!vatRate) {
          result.missingRates.push(`${countryCode} VAT`);
          result.isValid = false;
        }
        break;

      case 'CA':
        // Canada has GST/HST/PST
        const gstRate = countryRates.find(r => r.tax_type === 'gst');
        if (!gstRate) {
          result.missingRates.push('CA GST');
        }
        break;
    }

    if (result.missingRates.length > 0) {
      result.isValid = false;
    }

    return result;
  }

  async applyTaxToInvoice(
    invoiceId: string,
    taxCalculation: TaxCalculationResult
  ): Promise<void> {
    // Update invoice with tax information
    await this.pool.query(
      `UPDATE invoices 
       SET tax_amount = $1,
           tax_rates = $2,
           total_amount = amount + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        taxCalculation.tax_amount,
        JSON.stringify(taxCalculation.tax_breakdown),
        invoiceId
      ]
    );
  }

  // ========== TAX REPORTING ==========

  async getTaxCollectedReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'country' | 'state' | 'tax_type' = 'country'
  ): Promise<Array<{
    jurisdiction: string;
    tax_type: string;
    total_collected: number;
    transaction_count: number;
  }>> {
    let groupByClause: string;
    let selectClause: string;

    switch (groupBy) {
      case 'state':
        selectClause = "COALESCE(tr.state_code, tr.country_code) as jurisdiction";
        groupByClause = "tr.country_code, tr.state_code";
        break;
      case 'tax_type':
        selectClause = "tr.tax_type as jurisdiction";
        groupByClause = "tr.tax_type";
        break;
      default:
        selectClause = "tr.country_code as jurisdiction";
        groupByClause = "tr.country_code";
    }

    const result = await this.pool.query(
      `SELECT 
         ${selectClause},
         tr.tax_type,
         SUM(i.tax_amount) as total_collected,
         COUNT(DISTINCT i.id) as transaction_count
       FROM invoices i
       CROSS JOIN LATERAL jsonb_array_elements(i.tax_rates) as tax_rate_json
       JOIN tax_rates tr ON tr.id = (tax_rate_json->>'tax_rate_id')::uuid
       WHERE i.status = 'paid'
       AND i.paid_at >= $1
       AND i.paid_at <= $2
       GROUP BY ${groupByClause}, tr.tax_type
       ORDER BY total_collected DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  async generateTaxRemittanceReport(
    jurisdiction: string,
    period: { start: Date; end: Date }
  ): Promise<{
    jurisdiction: string;
    period: { start: Date; end: Date };
    gross_sales: number;
    taxable_sales: number;
    exempt_sales: number;
    tax_collected: number;
    tax_rates_applied: Array<{
      rate_name: string;
      rate: number;
      taxable_amount: number;
      tax_amount: number;
    }>;
  }> {
    // Get all paid invoices for the period
    const invoicesResult = await this.pool.query(
      `SELECT 
         i.id,
         i.amount,
         i.tax_amount,
         i.tax_rates,
         p.billing_country,
         p.billing_state
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       WHERE i.status = 'paid'
       AND i.paid_at >= $1
       AND i.paid_at <= $2
       AND (p.billing_country = $3 OR p.billing_state = $3)`,
      [period.start, period.end, jurisdiction]
    );

    let grossSales = 0;
    let taxableSales = 0;
    let exemptSales = 0;
    let taxCollected = 0;
    const rateBreakdown: Map<string, any> = new Map();

    for (const invoice of invoicesResult.rows) {
      grossSales += invoice.amount;
      
      if (invoice.tax_amount > 0) {
        taxableSales += invoice.amount;
        taxCollected += invoice.tax_amount;

        // Break down by tax rate
        const taxRates = invoice.tax_rates || [];
        for (const rate of taxRates) {
          const key = rate.tax_rate_id;
          if (!rateBreakdown.has(key)) {
            rateBreakdown.set(key, {
              rate_name: rate.name,
              rate: rate.rate,
              taxable_amount: 0,
              tax_amount: 0
            });
          }
          const breakdown = rateBreakdown.get(key);
          breakdown.taxable_amount += invoice.amount;
          breakdown.tax_amount += rate.amount;
        }
      } else {
        exemptSales += invoice.amount;
      }
    }

    return {
      jurisdiction,
      period,
      gross_sales: grossSales,
      taxable_sales: taxableSales,
      exempt_sales: exemptSales,
      tax_collected: taxCollected,
      tax_rates_applied: Array.from(rateBreakdown.values())
    };
  }

  // ========== UTILITIES ==========

  private clearTaxRateCache(countryCode: string, stateCode?: string): void {
    this.taxRateCache.delete(`${countryCode}-${stateCode || 'ALL'}`);
    this.taxRateCache.delete(`${countryCode}-ALL`);
  }

  async seedCommonTaxRates(): Promise<void> {
    const commonRates = [
      // US Sales Tax (examples)
      { country_code: 'US', state_code: 'CA', tax_type: 'sales_tax', rate: 0.0725, name: 'California Sales Tax' },
      { country_code: 'US', state_code: 'NY', tax_type: 'sales_tax', rate: 0.08, name: 'New York Sales Tax' },
      { country_code: 'US', state_code: 'TX', tax_type: 'sales_tax', rate: 0.0625, name: 'Texas Sales Tax' },
      
      // EU VAT
      { country_code: 'GB', tax_type: 'vat', rate: 0.20, name: 'UK VAT' },
      { country_code: 'DE', tax_type: 'vat', rate: 0.19, name: 'German VAT' },
      { country_code: 'FR', tax_type: 'vat', rate: 0.20, name: 'French VAT' },
      
      // Canada
      { country_code: 'CA', tax_type: 'gst', rate: 0.05, name: 'Canadian GST' },
      { country_code: 'CA', state_code: 'ON', tax_type: 'hst', rate: 0.13, name: 'Ontario HST' },
      
      // Australia
      { country_code: 'AU', tax_type: 'gst', rate: 0.10, name: 'Australian GST' }
    ];

    for (const rate of commonRates) {
      try {
        await this.createTaxRate(rate);
        console.log(`Created tax rate: ${rate.name}`);
      } catch (error) {
        console.error(`Failed to create tax rate ${rate.name}:`, error);
      }
    }
  }
}
