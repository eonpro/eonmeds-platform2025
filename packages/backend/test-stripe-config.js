require("dotenv").config();

console.log("🔍 Checking Stripe Configuration...\n");

// Check if Stripe keys are set
const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

console.log("Backend Configuration:");
console.log(
  `✅ STRIPE_SECRET_KEY: ${hasSecretKey ? "Set (starts with " + process.env.STRIPE_SECRET_KEY.substring(0, 7) + "...)" : "❌ Not set"}`,
);
console.log(
  `✅ STRIPE_WEBHOOK_SECRET: ${hasWebhookSecret ? "Set (starts with " + process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) + "...)" : "❌ Not set"}`,
);

if (hasSecretKey) {
  // Test Stripe connection
  const Stripe = require("stripe");
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  console.log("\n🧪 Testing Stripe Connection...");

  stripe.customers
    .list({ limit: 1 })
    .then(() => {
      console.log("✅ Successfully connected to Stripe!");

      // Try to retrieve account info
      return stripe.accounts.retrieve();
    })
    .then((account) => {
      console.log(
        `✅ Connected to Stripe account: ${account.email || account.id}`,
      );
      console.log(`✅ Account type: ${account.type}`);
      console.log(`✅ Livemode: ${account.livemode ? "LIVE" : "TEST MODE"}`);
    })
    .catch((error) => {
      console.error("❌ Error connecting to Stripe:", error.message);
    });
} else {
  console.log("\n⚠️  Please add your Stripe keys to the .env file:");
  console.log("STRIPE_SECRET_KEY=sk_test_...");
  console.log("STRIPE_WEBHOOK_SECRET=whsec_...");
}

console.log("\n📝 Next Steps:");
console.log("1. Add your Stripe keys to packages/backend/.env");
console.log(
  "2. Add REACT_APP_STRIPE_PUBLISHABLE_KEY to packages/frontend/.env",
);
console.log("3. Run this script again to verify connection");
console.log(
  "4. Set up webhook endpoint in Stripe dashboard or use Stripe CLI for local testing",
);
