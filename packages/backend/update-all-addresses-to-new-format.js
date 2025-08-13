require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function updateAllAddresses() {
  const client = await pool.connect();

  try {
    // Get all patients with addresses
    const result = await client.query(`
      SELECT id, patient_id, address, address_house, address_street, apartment_number
      FROM patients
      WHERE address IS NOT NULL OR address_house IS NOT NULL
    `);

    console.log(`Found ${result.rows.length} patients with addresses\n`);

    let updatedCount = 0;

    for (const patient of result.rows) {
      // Skip if already has new format
      if (patient.address_house && patient.address_street) {
        console.log(`✓ Patient ${patient.patient_id} already has new format`);
        continue;
      }

      // If only has legacy address field, parse it
      if (patient.address && !patient.address_house) {
        const parsed = parseAddress(patient.address);

        if (parsed.house || parsed.street) {
          await client.query(
            `
            UPDATE patients 
            SET 
              address_house = $1,
              address_street = $2,
              apartment_number = COALESCE(apartment_number, $3)
            WHERE id = $4
          `,
            [parsed.house, parsed.street, parsed.apartment, patient.id],
          );

          console.log(`✅ Updated ${patient.patient_id}:`);
          console.log(`   Address: ${patient.address}`);
          console.log(
            `   → House: ${parsed.house}, Street: ${parsed.street}${parsed.apartment ? ", Apt: " + parsed.apartment : ""}`,
          );
          updatedCount++;
        } else {
          console.log(
            `⚠️  Could not parse address for ${patient.patient_id}: ${patient.address}`,
          );
        }
      }
    }

    console.log(`\n✅ Updated ${updatedCount} patient addresses to new format`);
  } catch (error) {
    console.error("Error updating addresses:", error);
  } finally {
    client.release();
    pool.end();
  }
}

function parseAddress(address) {
  if (!address) return { house: null, street: null, apartment: null };

  // Remove extra whitespace and trim
  address = address.replace(/\s+/g, " ").trim();

  // Check for apartment indicators
  let apartment = null;
  const aptMatch = address.match(
    /[,\s]+(apt|apartment|unit|#)\s*([a-zA-Z0-9-]+)/i,
  );
  if (aptMatch) {
    apartment = aptMatch[2];
    // Remove apartment from address for parsing
    address = address.substring(0, aptMatch.index).trim();
  }

  // Match common address patterns
  // Pattern 1: "123 Main Street"
  const match1 = address.match(/^(\d+)\s+(.+)$/);
  if (match1) {
    return {
      house: match1[1],
      street: match1[2],
      apartment,
    };
  }

  // Pattern 2: "123-45 Main Street" (common in NYC)
  const match2 = address.match(/^(\d+-\d+)\s+(.+)$/);
  if (match2) {
    return {
      house: match2[1],
      street: match2[2],
      apartment,
    };
  }

  // Pattern 3: "123A Main Street"
  const match3 = address.match(/^(\d+[a-zA-Z]?)\s+(.+)$/);
  if (match3) {
    return {
      house: match3[1],
      street: match3[2],
      apartment,
    };
  }

  // If no pattern matches, just use the whole thing as street
  return {
    house: null,
    street: address,
    apartment,
  };
}

// Run the update
updateAllAddresses();
