/**
 * Applies live billing mode columns to hourly_charter_books (PostgreSQL).
 * Usage: npm run db:live-billing-columns
 *
 * Safe to run multiple times — every operation is idempotent.
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");

const TABLE = "hourly_charter_books";
const ENUM_TYPE = "enum_hourly_charter_books_billingMode";

// New columns and their PostgreSQL DDL
const NEW_COLUMNS = [
  { name: "billingMode",             ddl: `"${ENUM_TYPE}" NOT NULL DEFAULT 'PRE_BOOKED'` },
  { name: "preAuthBufferHours",      ddl: "INTEGER NOT NULL DEFAULT 2" },
  { name: "actualStartTime",         ddl: "TIMESTAMPTZ NULL" },
  { name: "actualEndTime",           ddl: "TIMESTAMPTZ NULL" },
  { name: "actualHoursUsed",         ddl: "DECIMAL(6,2) NULL" },
  { name: "overtimeHours",           ddl: "DECIMAL(6,2) NULL DEFAULT 0" },
  { name: "overtimeRateMultiplier",  ddl: "DECIMAL(4,2) NOT NULL DEFAULT 1.5" },
  { name: "overtimeAmountInDollars", ddl: "DECIMAL(10,2) NULL DEFAULT 0" },
];

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = :table
       AND column_name  = :column
     LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function enumTypeExists(typeName) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = :typeName LIMIT 1`,
    { replacements: { typeName } }
  );
  return rows.length > 0;
}

async function indexExists(indexName) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE indexname = :indexName LIMIT 1`,
    { replacements: { indexName } }
  );
  return rows.length > 0;
}

async function main() {
  await sequelize.authenticate();
  console.log("Connected to:", sequelize.config.database);
  console.log(`\nApplying live billing columns to: ${TABLE}\n`);

  // 1. Ensure the ENUM type exists
  if (await enumTypeExists(ENUM_TYPE)) {
    console.log(`  skip  ENUM type "${ENUM_TYPE}" (already exists)`);
  } else {
    await sequelize.query(
      `CREATE TYPE "${ENUM_TYPE}" AS ENUM ('PRE_BOOKED', 'LIVE')`
    );
    console.log(`  added ENUM type "${ENUM_TYPE}"`);
  }

  // 2. Add each column if missing
  for (const col of NEW_COLUMNS) {
    if (await columnExists(TABLE, col.name)) {
      console.log(`  skip  ${TABLE}."${col.name}" (already exists)`);
    } else {
      await sequelize.query(
        `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS "${col.name}" ${col.ddl}`
      );
      console.log(`  added ${TABLE}."${col.name}"`);
    }
  }

  // 3. Partial index for live trip queries
  const IDX = "idx_hourly_live_billing";
  if (await indexExists(IDX)) {
    console.log(`  skip  index "${IDX}" (already exists)`);
  } else {
    await sequelize.query(
      `CREATE INDEX "${IDX}"
         ON ${TABLE} ("billingMode", "bookingStatus")
         WHERE "billingMode" = 'LIVE'`
    );
    console.log(`  added index "${IDX}"`);
  }

  // 4. Backfill existing rows
  const [, meta] = await sequelize.query(
    `UPDATE ${TABLE}
        SET "billingMode" = 'PRE_BOOKED'
      WHERE "billingMode" IS NULL`
  );
  const updated = meta?.rowCount ?? 0;
  if (updated > 0) {
    console.log(`  backfilled ${updated} existing rows → billingMode = 'PRE_BOOKED'`);
  } else {
    console.log(`  skip  backfill (no NULL billingMode rows)`);
  }

  console.log("\nLive billing columns migration complete.");
  await sequelize.close();
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
