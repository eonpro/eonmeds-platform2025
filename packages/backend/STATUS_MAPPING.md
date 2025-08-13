# Patient Status Mapping

## Important: Status Values

The frontend expects the following status values:

- **`qualified`** - Paying customers who have made a payment (shown in Clients page)
- **`pending`** - New patients who haven't paid yet
- **`pending_review`** - Patients awaiting review

⚠️ **Note**: Do NOT use `'client'` status - the frontend filters for `'qualified'` status only.

## Webhook Integration

When processing Stripe payments, always set patient status to `'qualified'` (not `'client'`).

## Hashtags

- `#activemember` - Patient has an active Stripe subscription
- `#fromstripe` - Patient was created from Stripe data (not from form submission)
