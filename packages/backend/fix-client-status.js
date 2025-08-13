#!/usr/bin/env node

/**
 * Fix Status - Change 'client' to 'qualified'
 * The frontend expects 'qualified' status for paying customers
 */

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function fixStatus() {
  try {
    console.log('🔄 Updating patient status from "client" to "qualified"...\n');

    // First, show current status distribution
    const statusCheck = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM patients 
      GROUP BY status 
      ORDER BY count DESC
    `);

    console.log("Current status distribution:");
    statusCheck.rows.forEach((row) => {
      console.log(`  ${row.status || "null"}: ${row.count} patients`);
    });
    console.log();

    // Update all 'client' status to 'qualified'
    const result = await pool.query(`
      UPDATE patients 
      SET status = 'qualified', 
          updated_at = NOW() 
      WHERE status = 'client'
      RETURNING patient_id, first_name, last_name, email
    `);

    console.log(
      `✅ Updated ${result.rowCount} patients from 'client' to 'qualified'\n`,
    );

    if (result.rows.length > 0) {
      console.log("Updated patients:");
      result.rows.forEach((p) => {
        console.log(
          `  - ${p.patient_id}: ${p.first_name} ${p.last_name} (${p.email})`,
        );
      });
    }

    // Show new status distribution
    const newStatusCheck = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM patients 
      GROUP BY status 
      ORDER BY count DESC
    `);

    console.log("\nNew status distribution:");
    newStatusCheck.rows.forEach((row) => {
      console.log(`  ${row.status || "null"}: ${row.count} patients`);
    });
  } catch (error) {
    console.error("Error updating status:", error);
  } finally {
    await pool.end();
  }
}

fixStatus();
