// Add these imports at the top with other route imports
import billingInvoiceRoutes from './routes/billing.invoice.routes';
import invoiceForwardRoutes from './routes/invoice.forward';

// After the existing route registrations, add:

// New billing invoice routes with auth middleware already applied
app.use('/api/v1/billing', billingInvoiceRoutes);

// Update the existing invoice routes to use forwarding
// Replace: app.use('/api/v1/payments/invoices', invoiceRoutes);
// With:
app.use('/api/v1/payments/invoices', invoiceForwardRoutes);

// This ensures backward compatibility while using the new handler
