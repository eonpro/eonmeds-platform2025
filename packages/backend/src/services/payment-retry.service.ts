import { pool } from '../config/database';
import { stripeService } from './stripe.service';
import { auditService, AuditAction, AuditSeverity } from './audit.service';

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface PaymentRetryJob {
  invoiceId: string;
  paymentMethodId: string;
  amount: number;
  attemptNumber: number;
  lastError?: string;
}

class PaymentRetryService {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 5000, // 5 seconds
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 2
  };

  /**
   * Schedule a payment retry
   */
  async scheduleRetry(
    invoiceId: string,
    paymentMethodId: string,
    amount: number,
    error: string,
    attemptNumber: number = 1
  ): Promise<void> {
    const delayMs = this.calculateBackoff(attemptNumber);
    const retryAt = new Date(Date.now() + delayMs);

    try {
      await pool.query(
        `INSERT INTO payment_retry_queue 
         (invoice_id, payment_method_id, amount, attempt_number, 
          last_error, retry_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [invoiceId, paymentMethodId, amount, attemptNumber, error, retryAt]
      );

      await auditService.log({
        action: AuditAction.PAYMENT_INTENT_FAILED,
        severity: AuditSeverity.WARNING,
        resourceType: 'invoice',
        resourceId: invoiceId,
        metadata: {
          payment_method_id: paymentMethodId,
          attempt_number: attemptNumber,
          retry_at: retryAt,
          error: error
        }
      });

      console.info(`⏰ Payment retry scheduled for invoice ${invoiceId} at ${retryAt.toISOString()}`);
    } catch (error) {
      console.error('Failed to schedule payment retry:', error);
    }
  }

  /**
   * Process pending payment retries
   */
  async processPendingRetries(): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT * FROM payment_retry_queue 
         WHERE status = 'pending' 
         AND retry_at <= NOW() 
         ORDER BY retry_at ASC 
         LIMIT 10`
      );

      for (const job of result.rows) {
        await this.processRetry(job);
      }
    } catch (error) {
      console.error('Error processing payment retries:', error);
    }
  }

  /**
   * Process a single retry
   */
  private async processRetry(job: PaymentRetryJob): Promise<void> {
    console.info(`🔄 Processing payment retry for invoice ${job.invoiceId} (attempt ${job.attemptNumber})`);

    try {
      // Mark as processing
      await pool.query(
        `UPDATE payment_retry_queue 
         SET status = 'processing', started_at = NOW() 
         WHERE invoice_id = $1`,
        [job.invoiceId]
      );

      // Get invoice details
      const invoiceResult = await pool.query(
        `SELECT i.*, p.stripe_customer_id 
         FROM invoices i 
         JOIN patients p ON i.patient_id = p.patient_id 
         WHERE i.id = $1`,
        [job.invoiceId]
      );

      if (invoiceResult.rowCount === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Attempt payment
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: Math.round(job.amount * 100),
        currency: 'usd',
        customer: invoice.stripe_customer_id,
        payment_method: job.paymentMethodId,
        metadata: {
          invoice_id: job.invoiceId,
          retry_attempt: job.attemptNumber.toString()
        },
        description: `Retry payment for invoice ${invoice.invoice_number}`,
        idempotencyKey: `retry_${job.invoiceId}_${job.attemptNumber}`
      });

      // Confirm the payment
      const confirmedIntent = await stripeService.retrievePaymentIntent(paymentIntent.id);

      if (confirmedIntent.status === 'succeeded') {
        // Payment succeeded
        await this.handleRetrySuccess(job, paymentIntent.id);
      } else if (confirmedIntent.status === 'requires_action') {
        // Needs customer action - cancel retry
        await this.handleRetryRequiresAction(job);
      } else {
        // Payment failed
        throw new Error(`Payment intent status: ${confirmedIntent.status}`);
      }
    } catch (error: any) {
      await this.handleRetryFailure(job, error);
    }
  }

  /**
   * Handle successful retry
   */
  private async handleRetrySuccess(job: any, paymentIntentId: string): Promise<void> {
    await pool.query(
      `UPDATE payment_retry_queue 
       SET status = 'succeeded', completed_at = NOW() 
       WHERE invoice_id = $1`,
      [job.invoiceId]
    );

    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', paid_at = NOW(), stripe_payment_intent_id = $2 
       WHERE id = $1`,
      [job.invoiceId, paymentIntentId]
    );

    await auditService.logPayment(
      AuditAction.PAYMENT_INTENT_SUCCEEDED,
      paymentIntentId,
      job.amount,
      'usd',
      {
        invoice_id: job.invoiceId,
        retry_attempt: job.attemptNumber,
        retry_success: true
      }
    );

    console.info(`✅ Payment retry successful for invoice ${job.invoiceId}`);
  }

  /**
   * Handle retry that requires customer action
   */
  private async handleRetryRequiresAction(job: any): Promise<void> {
    await pool.query(
      `UPDATE payment_retry_queue 
       SET status = 'requires_action', completed_at = NOW() 
       WHERE invoice_id = $1`,
      [job.invoiceId]
    );

    console.info(`⚠️ Payment retry requires customer action for invoice ${job.invoiceId}`);
  }

  /**
   * Handle retry failure
   */
  private async handleRetryFailure(job: any, error: Error): Promise<void> {
    const nextAttempt = job.attemptNumber + 1;

    if (nextAttempt <= this.defaultConfig.maxAttempts) {
      // Schedule next retry
      await this.scheduleRetry(
        job.invoiceId,
        job.paymentMethodId,
        job.amount,
        error.message,
        nextAttempt
      );

      await pool.query(
        `UPDATE payment_retry_queue 
         SET status = 'retrying', last_error = $2 
         WHERE invoice_id = $1`,
        [job.invoiceId, error.message]
      );
    } else {
      // Max retries exceeded
      await pool.query(
        `UPDATE payment_retry_queue 
         SET status = 'failed', completed_at = NOW(), last_error = $2 
         WHERE invoice_id = $1`,
        [job.invoiceId, error.message]
      );

      await auditService.log({
        action: AuditAction.PAYMENT_INTENT_FAILED,
        severity: AuditSeverity.ERROR,
        resourceType: 'invoice',
        resourceId: job.invoiceId,
        metadata: {
          max_retries_exceeded: true,
          total_attempts: job.attemptNumber,
          final_error: error.message
        }
      });

      console.error(`❌ Payment retry failed for invoice ${job.invoiceId} after ${job.attemptNumber} attempts`);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attemptNumber: number): number {
    const delay = Math.min(
      this.defaultConfig.initialDelayMs * Math.pow(this.defaultConfig.backoffMultiplier, attemptNumber - 1),
      this.defaultConfig.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Get retry status for an invoice
   */
  async getRetryStatus(invoiceId: string): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM payment_retry_queue 
       WHERE invoice_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [invoiceId]
    );

    return result.rows[0] || null;
  }

  /**
   * Cancel pending retries for an invoice
   */
  async cancelRetries(invoiceId: string): Promise<void> {
    await pool.query(
      `UPDATE payment_retry_queue 
       SET status = 'cancelled', completed_at = NOW() 
       WHERE invoice_id = $1 AND status = 'pending'`,
      [invoiceId]
    );
  }
}

// Export singleton instance
export const paymentRetryService = new PaymentRetryService();
