/**
 * Splits the promo-code discount from the admin manual discount (previously
 * both wrote to the same `discountAmountInDollars` column, so one silently
 * overwrote the other), and adds guest-identity columns to the redemption
 * ledger so guest bookings can finally be rate-limited.
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 *
 * Usage: npm run db:promo-discount-columns
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");

const BOOKING_TABLES = [
  "point_to_point_books",
  "hourly_charter_books",
  "airport_books",
];

function isPostgres() {
  return sequelize.getDialect() === "postgres";
}

async function columnExists(table, column) {
  if (isPostgres()) {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
       LIMIT 1`,
      { replacements: { table, column } }
    );
    return rows.length > 0;
  }

  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = :table AND column_name = :column
     LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`  skip ${table}.${column} (exists)`);
    return;
  }
  const quotedTable = isPostgres() ? `"${table}"` : `\`${table}\``;
  const quotedColumn = isPostgres() ? `"${column}"` : `\`${column}\``;
  await sequelize.query(`ALTER TABLE ${quotedTable} ADD COLUMN ${quotedColumn} ${ddl}`);
  console.log(`  added ${table}.${column}`);
}

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}).`);

  for (const table of BOOKING_TABLES) {
    await addColumnIfMissing(
      table,
      "promoDiscountAmountInDollars",
      "DECIMAL(10,2) NULL DEFAULT 0.00"
    );
  }

  await addColumnIfMissing(
    "promo_code_redemptions",
    "guestEmail",
    "VARCHAR(255) NULL"
  );
  await addColumnIfMissing(
    "promo_code_redemptions",
    "guestPhone",
    "VARCHAR(20) NULL"
  );

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure promo-discount columns:", error);
  process.exit(1);
});
