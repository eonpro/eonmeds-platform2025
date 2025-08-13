const fs = require("fs");
const path = require("path");

// Read the index.ts file
const indexPath = path.join(__dirname, "src", "index.ts");
let content = fs.readFileSync(indexPath, "utf8");

// Remove the first SOAP notes fix block
content = content.replace(
  /\/\/ Fix SOAP Notes table - drop old constraint if exists[\s\S]*?END \$\$;\s*`\);/g,
  "// SOAP notes table is handled by database.ts",
);

// Remove the CREATE TABLE soap_notes block
content = content.replace(
  /\/\/ Create SOAP Notes table for BECCA AI[\s\S]*?CREATE INDEX IF NOT EXISTS idx_soap_notes_status ON soap_notes\(status\);\s*`\);/g,
  `// Call ensureSOAPNotesTable to create the table with correct schema
        const { ensureSOAPNotesTable } = await import('./config/database');
        await ensureSOAPNotesTable();`,
);

// Write the updated content back
fs.writeFileSync(indexPath, content);

console.log(
  "✅ Fixed index.ts - removed conflicting SOAP notes schema creation",
);
