const { pool } = require('./src/config/database');

async function fixInvoiceFunction() {
  console.log('🔧 Adding missing invoice number generation function...');

  try {
    // Create sequence for invoice numbers
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;
    `);
    console.log('✅ Created invoice_number_seq sequence');

    // Create function to generate invoice numbers
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_invoice_number()
      RETURNS VARCHAR AS $$
      DECLARE
        new_number VARCHAR;
      BEGIN
        new_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
        RETURN new_number;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created generate_invoice_number() function');

    // Test the function
    const result = await pool.query('SELECT generate_invoice_number() as invoice_number');
    console.log('✅ Function test successful. Generated invoice number:', result.rows[0].invoice_number);

    console.log('✅ Invoice function fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing invoice function:', error);
  } finally {
    await pool.end();
  }
}

fixInvoiceFunction();
