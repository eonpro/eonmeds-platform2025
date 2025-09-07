// Re-export from centralized stripe config
import { getStripeClient } from "./stripe.config";

export const stripe = getStripeClient();
