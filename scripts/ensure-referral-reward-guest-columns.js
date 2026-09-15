/**
 * Lets a guest (never-registered) referred friend still earn their referrer
 * a reward: relaxes referral_rewards.referredUserId to nullable and adds
 * referredGuestEmail/referredGuestPhone as the guest-identity fallback,
 * mirroring what promo_code_redemptions already has.
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 *
 * Usage: npm run db:referral-reward-guest-columns
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

  // Idempotent: relaxing to NULL is a no-op if it's already nullable.
  if (isPostgres()) {
    await sequelize.query(
      `ALTER TABLE "referral_rewards" ALTER COLUMN "referredUserId" DROP NOT NULL`
    );
  } else {
    await sequelize.query(
      "ALTER TABLE `referral_rewards` MODIFY COLUMN `referredUserId` BIGINT NULL"
    );
  }
  console.log("  referral_rewards.referredUserId is now nullable");

  await addColumnIfMissing("referral_rewards", "referredGuestEmail", "VARCHAR(255) NULL");
  await addColumnIfMissing("referral_rewards", "referredGuestPhone", "VARCHAR(20) NULL");

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure referral-reward guest columns:", error);
  process.exit(1);
});
