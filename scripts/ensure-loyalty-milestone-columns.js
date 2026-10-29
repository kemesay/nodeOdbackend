/**
 * Adds the columns the loyalty ride-count milestone needs on top of the
 * already-existing wallet_credits table:
 *  - sourceBookingId / sourceBookingType — which booking's completion earned
 *    a "loyalty_milestone" lot, so crediting is idempotent and auditable
 *    (see loyaltyService.creditLoyaltyMilestoneIfEligible)
 *
 * Also widens wallet_credits.sourceType to include "loyalty_milestone".
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 * Safe to re-run — every column add is guarded by a columnExists check.
 *
 * Usage: npm run db:loyalty-milestone-columns
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { BOOKING_TYPES } = require("../src/models/PromoCode.js");

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

async function widenSourceTypeEnum() {
  if (isPostgres()) {
    await sequelize.query(
      `ALTER TYPE "enum_wallet_credits_sourceType" ADD VALUE IF NOT EXISTS 'loyalty_milestone'`
    );
    console.log("  widened wallet_credits.sourceType enum (postgres)");
    return;
  }
  await sequelize.query(
    `ALTER TABLE \`wallet_credits\` MODIFY COLUMN \`sourceType\` ENUM('referral_reward','manual_admin_credit','loyalty_milestone') NOT NULL`
  );
  console.log("  widened wallet_credits.sourceType enum (mysql)");
}

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}).`);

  await addColumnIfMissing("wallet_credits", "sourceBookingId", "BIGINT NULL");

  const bookingTypeEnum = isPostgres()
    ? `"enum_wallet_credits_sourceBookingType" NULL`
    : `ENUM(${BOOKING_TYPES.map((t) => `'${t}'`).join(",")}) NULL`;
  if (isPostgres() && !(await columnExists("wallet_credits", "sourceBookingType"))) {
    // Postgres needs the enum TYPE created before a column can use it.
    await sequelize.query(
      `DO $$ BEGIN
         CREATE TYPE "enum_wallet_credits_sourceBookingType" AS ENUM (${BOOKING_TYPES.map((t) => `'${t}'`).join(",")});
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
    );
  }
  await addColumnIfMissing("wallet_credits", "sourceBookingType", bookingTypeEnum);

  await widenSourceTypeEnum();

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure loyalty-milestone columns:", error);
  process.exit(1);
});
