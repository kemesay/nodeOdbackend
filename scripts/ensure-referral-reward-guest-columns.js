/**
 * Lets a guest (never-registered) referred friend still earn their referrer
 * a reward: relaxes referral_rewards.referredUserId to nullable and adds
 * referredGuestEmail/referredGuestPhone as the guest-identity fallback,
 * mirroring what promo_code_redemptions already has.
 *
 * Usage: npm run db:referral-reward-guest-columns
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");

async function columnExists(table, column) {
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
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
  console.log(`  added ${table}.${column}`);
}

async function main() {
  await sequelize.authenticate();
  console.log("Connected.");

  // Idempotent: MODIFY to NULL is a no-op if it's already nullable.
  await sequelize.query(
    "ALTER TABLE `referral_rewards` MODIFY COLUMN `referredUserId` BIGINT NULL"
  );
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
