/**
 * Adds the rolling-window redemption cap to promo_codes: periodDays +
 * maxRedemptionsPerPeriod together mean "N uses per person in any trailing
 * periodDays-day window" (e.g. 5 uses per 15 days), on top of (not instead
 * of) the existing lifetime maxRedemptionsPerUser cap.
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 *
 * Usage: npm run db:promo-period-columns
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");

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

  await addColumnIfMissing("promo_codes", "periodDays", "INTEGER NULL");
  await addColumnIfMissing("promo_codes", "maxRedemptionsPerPeriod", "INTEGER NULL");

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure promo-period columns:", error);
  process.exit(1);
});
