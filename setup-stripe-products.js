#!/usr/bin/env node

/**
 * Stripe Products Setup Script
 * This script helps create Stripe products and update environment variables
 */

const Stripe = require("stripe");

// Initialize Stripe with live key from environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Product configurations
const products = [
  {
    name: "Weight Loss Program - Monthly",
    description: "Monthly weight loss program with medical supervision",
    price: 19900, // $199.00 in cents
    interval: "month",
    productType: "weightLoss",
    priceType: "monthly",
  },
  {
    name: "Weight Loss Program - Quarterly",
    description: "Quarterly weight loss program with medical supervision",
    price: 49900, // $499.00 in cents
    interval: "month",
    intervalCount: 3,
    productType: "weightLoss",
    priceType: "quarterly",
  },
  {
    name: "Testosterone Therapy - Monthly",
    description: "Monthly testosterone replacement therapy",
    price: 14900, // $149.00 in cents
    interval: "month",
    productType: "testosterone",
    priceType: "monthly",
  },
  {
    name: "Testosterone Therapy - Quarterly",
    description: "Quarterly testosterone replacement therapy",
    price: 39900, // $399.00 in cents
    interval: "month",
    intervalCount: 3,
    productType: "testosterone",
    priceType: "quarterly",
  },
];

async function createProducts() {
  console.log("🚀 Creating Stripe products and prices...\n");

  const results = [];

  for (const productConfig of products) {
    try {
      console.log(`📦 Creating product: ${productConfig.name}`);

      // Create product
      const product = await stripe.products.create({
        name: productConfig.name,
        description: productConfig.description,
        metadata: {
          productType: productConfig.productType,
          priceType: productConfig.priceType,
        },
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create price
      const priceData = {
        unit_amount: productConfig.price,
        currency: "usd",
        recurring: {
          interval: productConfig.interval,
        },
        product: product.id,
      };

      if (productConfig.intervalCount) {
        priceData.recurring.interval_count = productConfig.intervalCount;
      }

      const price = await stripe.prices.create(priceData);

      console.log(
        `   ✅ Price created: ${price.id} ($${(productConfig.price / 100).toFixed(2)})`,
      );

      results.push({
        product: product,
        price: price,
        config: productConfig,
      });
    } catch (error) {
      console.error(
        `   ❌ Error creating ${productConfig.name}:`,
        error.message,
      );
    }
  }

  return results;
}

function generateEnvironmentVariables(results) {
  console.log("\n🔧 Environment Variables to Set:\n");

  const envVars = [];

  for (const result of results) {
    const { product, price, config } = result;

    const productVar = `STRIPE_PRODUCT_${config.productType.toUpperCase()}_${config.priceType.toUpperCase()}`;
    const priceVar = `STRIPE_PRICE_${config.productType.toUpperCase()}_${config.priceType.toUpperCase()}`;

    envVars.push({
      product: `${productVar}=${product.id}`,
      price: `${priceVar}=${price.id}`,
    });

    console.log(`# ${config.name}`);
    console.log(`${productVar}=${product.id}`);
    console.log(`${priceVar}=${price.id}`);
    console.log("");
  }

  return envVars;
}

function generateRailwayCommands(envVars) {
  console.log("🚂 Railway Commands to Run:\n");

  for (const envVar of envVars) {
    console.log(`railway variables --set "${envVar.product}"`);
    console.log(`railway variables --set "${envVar.price}"`);
  }
}

async function main() {
  try {
    console.log("🎯 Stripe Products Setup Script");
    console.log("================================\n");

    // Create products and prices
    const results = await createProducts();

    if (results.length === 0) {
      console.log("❌ No products were created successfully");
      return;
    }

    console.log(
      `\n✅ Successfully created ${results.length} products and prices`,
    );

    // Generate environment variables
    const envVars = generateEnvironmentVariables(results);

    // Generate Railway commands
    generateRailwayCommands(envVars);

    console.log("\n📋 Next Steps:");
    console.log(
      "1. Run the Railway commands above to set environment variables",
    );
    console.log("2. Configure webhook endpoint in Stripe dashboard");
    console.log("3. Test payment flow");

    console.log("\n🔗 Stripe Dashboard Links:");
    console.log("- Products: https://dashboard.stripe.com/products");
    console.log("- Webhooks: https://dashboard.stripe.com/webhooks");
    console.log("- Payments: https://dashboard.stripe.com/payments");
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createProducts, generateEnvironmentVariables };
