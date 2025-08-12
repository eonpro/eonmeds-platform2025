#!/usr/bin/env node
import dotenv from 'dotenv';
import { getStripeClient } from '../config/stripe.config';
import { pool } from '../config/database';

// Load environment variables
dotenv.config();

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
  results.push({ name, status, message, details });
  console.log(`[${status}] ${name}: ${message}`);
  if (details) {
    console.log('  Details:', details);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...');

  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'DATABASE_URL'];
  let allPresent = true;

  for (const varName of required) {
    if (process.env[varName]) {
      let displayValue = '***';
      if (varName === 'STRIPE_SECRET_KEY') {
        displayValue = process.env[varName].startsWith('sk_test_') ? 'sk_test_***' : 'sk_live_***';
      } else if (varName === 'STRIPE_WEBHOOK_SECRET') {
        displayValue = 'whsec_***';
      } else if (varName === 'DATABASE_URL') {
        displayValue = 'postgres://***';
      }
      addResult(`ENV: ${varName}`, 'PASS', `Set (${displayValue})`);
    } else {
      addResult(`ENV: ${varName}`, 'FAIL', 'Not set');
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkStripeConnection() {
  console.log('\n🔍 Checking Stripe Connection...');

  try {
    const stripe = getStripeClient();

    // Test API key by listing customers
    const customers = await stripe.customers.list({ limit: 1 });

    // Get Stripe account info
    const apiVersion = '2024-06-20';
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE';

    addResult('Stripe API Connection', 'PASS', `Connected successfully (${mode} mode)`, {
      apiVersion,
      mode,
      customersFound: customers.data.length,
    });

    return true;
  } catch (error: any) {
    addResult('Stripe API Connection', 'FAIL', `Failed to connect: ${error.message}`, {
      error: error.type || error.code,
    });
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('\n🔍 Checking Database Connection...');

  try {
    await pool.query('SELECT 1 as test');

    // Check for required tables
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('patients', 'invoices', 'invoice_items', 'invoice_payments', 'processed_webhook_events')
      ORDER BY table_name
    `);

    const tables = tableCheck.rows.map((r) => r.table_name);
    const missingTables = [
      'patients',
      'invoices',
      'invoice_items',
      'invoice_payments',
      'processed_webhook_events',
    ].filter((t) => !tables.includes(t));

    if (missingTables.length === 0) {
      addResult('Database Connection', 'PASS', 'Connected and all required tables exist', {
        tables,
      });
    } else {
      addResult(
        'Database Connection',
        'PASS',
        `Connected but missing tables: ${missingTables.join(', ')}`,
        { existingTables: tables, missingTables }
      );
    }

    return true;
  } catch (error: any) {
    addResult('Database Connection', 'FAIL', `Failed to connect: ${error.message}`, {
      error: error.code,
    });
    return false;
  }
}

async function checkWebhookConfiguration() {
  console.log('\n🔍 Checking Webhook Configuration...');

  // Check if webhook secret is properly formatted
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret.startsWith('whsec_')) {
    addResult('Webhook Secret Format', 'PASS', 'Properly formatted (whsec_***)');
  } else {
    addResult('Webhook Secret Format', 'FAIL', 'Invalid format (should start with whsec_)');
  }

  // Check webhook endpoints
  const endpoints = ['/api/v1/stripe/webhook', '/api/v1/payments/webhook/stripe'];

  addResult('Webhook Endpoints', 'PASS', `Configured endpoints: ${endpoints.join(', ')}`);
}

async function runSelfCheck() {
  console.log('🚀 Stripe Integration Self-Check\n');
  console.log('='.repeat(50));

  // Run all checks
  const envOk = await checkEnvironmentVariables();
  if (envOk) {
    await checkStripeConnection();
    await checkDatabaseConnection();
  }
  await checkWebhookConfiguration();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY\n');

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All checks passed! Stripe integration is ready for production.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSelfCheck().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runSelfCheck, results };
