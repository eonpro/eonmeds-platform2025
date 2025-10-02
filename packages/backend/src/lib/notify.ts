/**
 * Notification service for internal team alerts
 */

interface BillingNotification {
  type: 'external_payment_mirrored';
  patientId: string;
  email: string;
  amount: number;
  currency: string;
  mirroredChargeId: string;
  createdInvoiceId: string;
  stripeInvoiceUrl?: string;
}

/**
 * Send notification to billing team
 * @param notification - Billing notification details
 */
export async function notifyBilling(notification: BillingNotification): Promise<void> {
  try {
    // TODO: Implement actual notification logic (email, Slack, etc.)
    // For now, just log to console with formatted message

    const amountFormatted = (notification.amount / 100).toFixed(2);
    const stripeUrl =
      notification.stripeInvoiceUrl ||
      `https://dashboard.stripe.com/invoices/${notification.createdInvoiceId}`;

    console.log('=== BILLING NOTIFICATION ===');
    console.log(`Type: ${notification.type}`);
    console.log(`Patient ID: ${notification.patientId}`);
    console.log(`Email: ${notification.email}`);
    console.log(`Amount: ${amountFormatted} ${notification.currency.toUpperCase()}`);
    console.log(`Mirrored Charge ID: ${notification.mirroredChargeId}`);
    console.log(`Created Invoice ID: ${notification.createdInvoiceId}`);
    console.log(`Stripe Invoice URL: ${stripeUrl}`);
    console.log('===========================');

    // Future implementation ideas:
    // 1. Send email via SendGrid/AWS SES
    // 2. Post to Slack webhook
    // 3. Create internal notification in database
    // 4. Trigger webhook to external billing system
  } catch (error) {
    // Don't let notification failures break the main flow
    console.error('Failed to send billing notification:', error);
  }
}

/**
 * Generic notification function for future expansion
 * @param type - Notification type
 * @param data - Notification data
 */
export async function notify(type: string, data: any): Promise<void> {
  switch (type) {
    case 'billing':
      if (data.type === 'external_payment_mirrored') {
        await notifyBilling(data);
      }
      break;
    // Add more notification types as needed
    default:
      console.log(`Unknown notification type: ${type}`, data);
  }
}
