/**
 * Adds the columns the wallet-credit feature needs on top of existing tables:
 *  - walletCreditAppliedInDollars on each booking table (third, independent
 *    discount bucket alongside discountAmountInDollars/promoDiscountAmountInDollars)
 *  - creditedAmount on referral_rewards (the actual $ credited to the
 *    referrer's wallet, since rewardPercent alone no longer tells you the
 *    dollar amount — see promoCodeService.creditReferralRewardIfCompleted)
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 * Safe to re-run — every column add is guarded by a columnExists check.
 *
 * Also widens referral_rewards.rewardStatus to include "reversed" — the
 * clawback outcome for a reward whose triggering booking was later refunded
 * (see walletService.reverseWalletCreditForReferredBooking). Postgres native
 * enums and MySQL inline enums need different ALTER syntax, handled below.
 *
 * Usage: npm run db:wallet-columns
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

async function widenRewardStatusEnum() {
  if (isPostgres()) {
    // Postgres enum type name follows Sequelize's default convention:
    // enum_<table>_<column>. Adding a value is safe/idempotent via IF NOT EXISTS.
    await sequelize.query(
      `ALTER TYPE "enum_referral_rewards_rewardStatus" ADD VALUE IF NOT EXISTS 'reversed'`
    );
    console.log("  widened referral_rewards.rewardStatus enum (postgres)");
    return;
  }
  await sequelize.query(
    `ALTER TABLE \`referral_rewards\` MODIFY COLUMN \`rewardStatus\` ENUM('pending','credited','denied','reversed') NOT NULL DEFAULT 'pending'`
  );
  console.log("  widened referral_rewards.rewardStatus enum (mysql)");
}

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}).`);

  for (const table of BOOKING_TABLES) {
    await addColumnIfMissing(
      table,
      "walletCreditAppliedInDollars",
      "DECIMAL(10,2) NULL DEFAULT 0.00"
    );
  }

  await addColumnIfMissing(
    "referral_rewards",
    "creditedAmount",
    "DECIMAL(10,2) NULL"
  );

  await widenRewardStatusEnum();

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure wallet columns:", error);
  process.exit(1);
});
