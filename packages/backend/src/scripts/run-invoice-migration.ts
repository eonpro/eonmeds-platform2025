import { pool } from "../config/database";
import fs from "fs";
import path from "path";

async function runInvoiceMigration() {
  console.log("🚀 Starting invoice schema migration...\n");

  try {
    // Test connection
    const testResult = await pool.query("SELECT NOW()");
    console.log("✅ Connected to database at:", testResult.rows[0].now);

    // Read the SQL file
    const sqlPath = path.join(__dirname, "../config/invoice-schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Split SQL statements more carefully to handle functions with $$ delimiters
    const statements: string[] = [];
    let currentStatement = "";
    let inFunction = false;

    const lines = sql.split("\n");
    for (const line of lines) {
      currentStatement += line + "\n";

      // Check if we're entering or leaving a function definition
      if (line.includes("$$")) {
        inFunction = !inFunction;
      }

      // If we hit a semicolon and we're not in a function, it's the end of a statement
      if (line.trim().endsWith(";") && !inFunction) {
        statements.push(currentStatement.trim());
        currentStatement = "";
      }
    }

    // Don't forget the last statement if it exists
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const firstLine = statement.split("\n")[0].substring(0, 50);

      try {
        await pool.query(statement);
        console.log(`✅ [${i + 1}/${statements.length}] ${firstLine}...`);
      } catch (err: any) {
        if (err.message.includes("already exists")) {
          console.log(
            `⏭️  [${i + 1}/${statements.length}] ${firstLine}... (already exists)`,
          );
        } else {
          console.error(
            `❌ [${i + 1}/${statements.length}] Failed:`,
            err.message,
          );
          throw err;
        }
      }
    }

    // Verify tables were created
    console.log("\n🔍 Verifying migration...\n");

    const tables = ["invoices", "invoice_items", "invoice_payments"];
    for (const table of tables) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `,
        [table],
      );

      const exists = result.rows[0].exists;
      console.log(`Table ${table}: ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
    }

    // Test invoice number generation
    const testInvoice = await pool.query(
      "SELECT generate_invoice_number() as number",
    );
    console.log(
      `\n✅ Invoice number generation test: ${testInvoice.rows[0].number}`,
    );

    console.log("\n🎉 Invoice schema migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runInvoiceMigration();
