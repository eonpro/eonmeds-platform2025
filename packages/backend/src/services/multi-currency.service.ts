import { Pool } from 'pg';
import axios from 'axios';

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  valid_from: Date;
  valid_to?: Date;
}

interface CurrencyConversion {
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  rate_date: Date;
}

interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  active: boolean;
}

export class MultiCurrencyService {
  private pool: Pool;
  private baseCurrency: string;
  private rateCache: Map<string, { rate: number; expires: number }> = new Map();
  private exchangeRateProvider: string;
  private exchangeRateApiKey?: string;

  // Common currencies for medical billing
  private readonly SUPPORTED_CURRENCIES: SupportedCurrency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2, active: true },
    { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2, active: true },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2, active: true },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2, active: true },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2, active: true },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2, active: true },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0, active: true },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2, active: true },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2, active: true },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2, active: true }
  ];

  constructor(pool: Pool, config?: {
    baseCurrency?: string;
    exchangeRateProvider?: string;
    exchangeRateApiKey?: string;
  }) {
    this.pool = pool;
    this.baseCurrency = config?.baseCurrency || 'USD';
    this.exchangeRateProvider = config?.exchangeRateProvider || 'manual';
    this.exchangeRateApiKey = config?.exchangeRateApiKey;
  }

  // ========== CURRENCY CONVERSION ==========

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<CurrencyConversion> {
    // Handle same currency
    if (fromCurrency === toCurrency) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: amount,
        to_amount: amount,
        rate: 1,
        rate_date: date || new Date()
      };
    }

    // Get exchange rate
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    
    // Convert amount
    const convertedAmount = this.calculateConversion(amount, rate, toCurrency);

    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_amount: amount,
      to_amount: convertedAmount,
      rate: rate.rate,
      rate_date: rate.valid_from
    };
  }

  private calculateConversion(
    amount: number,
    rate: ExchangeRate,
    targetCurrency: string
  ): number {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === targetCurrency);
    const decimalPlaces = currency?.decimal_places || 2;
    
    const converted = amount * rate.rate;
    return Math.round(converted * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
  }

  async convertToBase(
    amount: number,
    currency: string,
    date?: Date
  ): Promise<number> {
    if (currency === this.baseCurrency) {
      return amount;
    }

    const conversion = await this.convert(amount, currency, this.baseCurrency, date);
    return conversion.to_amount;
  }

  // ========== EXCHANGE RATE MANAGEMENT ==========

  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<ExchangeRate> {
    // Check cache first
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached && cached.expires > Date.now() && !date) {
      return {
        id: 'cached',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: cached.rate,
        source: 'cache',
        valid_from: new Date()
      };
    }

    // Try to get from database
    let dbRate = await this.getStoredExchangeRate(fromCurrency, toCurrency, date);
    
    // If not found and not historical, fetch from provider
    if (!dbRate && !date) {
      dbRate = await this.fetchAndStoreExchangeRate(fromCurrency, toCurrency);
    }

    if (!dbRate) {
      // Try reverse rate
      const reverseRate = await this.getStoredExchangeRate(toCurrency, fromCurrency, date);
      if (reverseRate) {
        return {
          ...reverseRate,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: 1 / reverseRate.rate
        };
      }

      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    // Cache the rate
    if (!date) {
      this.rateCache.set(cacheKey, {
        rate: dbRate.rate,
        expires: Date.now() + 3600000 // 1 hour
      });
    }

    return dbRate;
  }

  private async getStoredExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<ExchangeRate | null> {
    const query = date
      ? `SELECT * FROM currency_exchange_rates 
         WHERE from_currency = $1 AND to_currency = $2
         AND valid_from <= $3
         AND (valid_to IS NULL OR valid_to >= $3)
         ORDER BY valid_from DESC
         LIMIT 1`
      : `SELECT * FROM currency_exchange_rates 
         WHERE from_currency = $1 AND to_currency = $2
         AND valid_to IS NULL
         ORDER BY valid_from DESC
         LIMIT 1`;

    const params = date ? [fromCurrency, toCurrency, date] : [fromCurrency, toCurrency];
    const result = await this.pool.query(query, params);
    
    return result.rows[0] || null;
  }

  private async fetchAndStoreExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate> {
    let rate: number;
    let source: string;

    switch (this.exchangeRateProvider) {
      case 'openexchangerates':
        rate = await this.fetchFromOpenExchangeRates(fromCurrency, toCurrency);
        source = 'openexchangerates';
        break;
      
      case 'exchangeratesapi':
        rate = await this.fetchFromExchangeRatesAPI(fromCurrency, toCurrency);
        source = 'exchangeratesapi';
        break;
      
      case 'manual':
      default:
        // Return a default rate or throw error
        throw new Error(`No exchange rate provider configured for ${fromCurrency} to ${toCurrency}`);
    }

    // Store the fetched rate
    const result = await this.pool.query(
      `INSERT INTO currency_exchange_rates 
       (from_currency, to_currency, rate, source, valid_from)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [fromCurrency, toCurrency, rate, source]
    );

    return result.rows[0];
  }

  private async fetchFromOpenExchangeRates(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (!this.exchangeRateApiKey) {
      throw new Error('OpenExchangeRates API key not configured');
    }

    try {
      const response = await axios.get(
        `https://openexchangerates.org/api/latest.json`,
        {
          params: {
            app_id: this.exchangeRateApiKey,
            base: 'USD' // Free tier only supports USD base
          }
        }
      );

      const rates = response.data.rates;
      
      if (fromCurrency === 'USD') {
        return rates[toCurrency] || 0;
      } else if (toCurrency === 'USD') {
        return 1 / (rates[fromCurrency] || 1);
      } else {
        // Cross rate calculation
        const fromRate = rates[fromCurrency];
        const toRate = rates[toCurrency];
        return toRate / fromRate;
      }
    } catch (error) {
      console.error('Failed to fetch from OpenExchangeRates:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  }

  private async fetchFromExchangeRatesAPI(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.exchangeratesapi.io/latest`,
        {
          params: {
            base: fromCurrency,
            symbols: toCurrency
          }
        }
      );

      return response.data.rates[toCurrency] || 0;
    } catch (error) {
      console.error('Failed to fetch from ExchangeRatesAPI:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  }

  // ========== BATCH OPERATIONS ==========

  async updateAllExchangeRates(): Promise<number> {
    let updatedCount = 0;

    // Get all active currency pairs
    const currencyPairs = await this.getActiveCurrencyPairs();

    for (const pair of currencyPairs) {
      try {
        await this.fetchAndStoreExchangeRate(pair.from_currency, pair.to_currency);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update rate for ${pair.from_currency}-${pair.to_currency}:`, error);
      }
    }

    return updatedCount;
  }

  private async getActiveCurrencyPairs(): Promise<Array<{ from_currency: string; to_currency: string }>> {
    // Get unique currency pairs from recent transactions
    const result = await this.pool.query(`
      SELECT DISTINCT currency as from_currency, $1 as to_currency
      FROM transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      AND currency != $1
      
      UNION
      
      SELECT DISTINCT currency as from_currency, $1 as to_currency
      FROM billing_plans
      WHERE active = true
      AND currency != $1
    `, [this.baseCurrency]);

    return result.rows;
  }

  // ========== REPORTING ==========

  async getRevenueByOriginalCurrency(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    currency: string;
    original_amount: number;
    base_amount: number;
    transaction_count: number;
    avg_exchange_rate: number;
  }>> {
    const result = await this.pool.query(`
      SELECT 
        currency,
        SUM(amount) as original_amount,
        SUM(base_currency_amount) as base_amount,
        COUNT(*) as transaction_count,
        AVG(exchange_rate) as avg_exchange_rate
      FROM transactions
      WHERE status = 'succeeded'
      AND created_at >= $1
      AND created_at <= $2
      GROUP BY currency
      ORDER BY base_amount DESC
    `, [startDate, endDate]);

    return result.rows;
  }

  async getCurrencyExposure(): Promise<Array<{
    currency: string;
    active_subscriptions: number;
    monthly_revenue: number;
    outstanding_invoices: number;
    total_exposure: number;
  }>> {
    const result = await this.pool.query(`
      WITH subscription_revenue AS (
        SELECT 
          bp.currency,
          COUNT(s.id) as active_subscriptions,
          SUM(bp.amount) as monthly_revenue
        FROM subscriptions s
        JOIN billing_plans bp ON s.plan_id = bp.id
        WHERE s.status = 'active'
        GROUP BY bp.currency
      ),
      outstanding_invoices AS (
        SELECT 
          i.currency,
          SUM(i.amount_due) as outstanding_amount
        FROM invoices i
        WHERE i.status IN ('draft', 'open')
        GROUP BY i.currency
      )
      SELECT 
        COALESCE(sr.currency, oi.currency) as currency,
        COALESCE(sr.active_subscriptions, 0) as active_subscriptions,
        COALESCE(sr.monthly_revenue, 0) as monthly_revenue,
        COALESCE(oi.outstanding_amount, 0) as outstanding_invoices,
        COALESCE(sr.monthly_revenue, 0) + COALESCE(oi.outstanding_amount, 0) as total_exposure
      FROM subscription_revenue sr
      FULL OUTER JOIN outstanding_invoices oi ON sr.currency = oi.currency
      ORDER BY total_exposure DESC
    `);

    return result.rows;
  }

  // ========== CONFIGURATION ==========

  async setSupportedCurrencies(currencies: string[]): Promise<void> {
    // Validate currencies
    for (const currency of currencies) {
      if (!this.SUPPORTED_CURRENCIES.find(c => c.code === currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }
    }

    // Update billing plans to support new currencies
    await this.pool.query(
      `UPDATE billing_plans 
       SET supported_currencies = $1::jsonb
       WHERE active = true`,
      [JSON.stringify(currencies)]
    );
  }

  async getPlanPricesInCurrency(
    planId: string,
    currency: string
  ): Promise<{
    original_price: number;
    original_currency: string;
    converted_price: number;
    target_currency: string;
    exchange_rate: number;
  }> {
    // Get plan details
    const planResult = await this.pool.query(
      'SELECT amount, currency FROM billing_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = planResult.rows[0];
    
    // Convert price
    const conversion = await this.convert(
      plan.amount,
      plan.currency,
      currency
    );

    return {
      original_price: plan.amount,
      original_currency: plan.currency,
      converted_price: conversion.to_amount,
      target_currency: currency,
      exchange_rate: conversion.rate
    };
  }

  // ========== UTILITIES ==========

  getSupportedCurrencies(): SupportedCurrency[] {
    return this.SUPPORTED_CURRENCIES.filter(c => c.active);
  }

  formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) {
      return `${amount} ${currencyCode}`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places
    });

    return formatter.format(amount);
  }

  async seedExchangeRates(): Promise<void> {
    // Seed some common exchange rates for testing
    const baseRates = [
      { from: 'USD', to: 'EUR', rate: 0.85 },
      { from: 'USD', to: 'GBP', rate: 0.73 },
      { from: 'USD', to: 'CAD', rate: 1.25 },
      { from: 'USD', to: 'AUD', rate: 1.35 },
      { from: 'EUR', to: 'GBP', rate: 0.86 },
      { from: 'EUR', to: 'CHF', rate: 1.08 },
      { from: 'GBP', to: 'CAD', rate: 1.71 }
    ];

    for (const rate of baseRates) {
      try {
        await this.pool.query(
          `INSERT INTO currency_exchange_rates 
           (from_currency, to_currency, rate, source, valid_from)
           VALUES ($1, $2, $3, 'seed', CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING`,
          [rate.from, rate.to, rate.rate]
        );

        // Also insert reverse rate
        await this.pool.query(
          `INSERT INTO currency_exchange_rates 
           (from_currency, to_currency, rate, source, valid_from)
           VALUES ($1, $2, $3, 'seed', CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING`,
          [rate.to, rate.from, 1 / rate.rate]
        );
      } catch (error) {
        console.error(`Failed to seed rate ${rate.from}-${rate.to}:`, error);
      }
    }
  }
}
