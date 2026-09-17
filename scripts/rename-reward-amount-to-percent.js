/**
 * Renames referral_rewards.rewardAmount to rewardPercent (and retypes it
 * from DECIMAL(10,2) to DECIMAL(5,2)) now that a referrer's reward is a
 * percentage off their next ride instead of a flat dollar amount.
 *
 * Safe to run against a table with existing rows too — RENAME COLUMN /
 * CHANGE COLUMN preserves the stored numeric values as-is; nothing here
 * reinterprets old flat-dollar values as percentages. As of this change,
 * production's referral_rewards table has zero rows, so there's nothing to
 * reinterpret in practice.
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds).
 *
 * Usage: npm run db:rename-reward-amount-to-percent
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

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}).`);

  const hasOld = await columnExists("referral_rewards", "rewardAmount");
  const hasNew = await columnExists("referral_rewards", "rewardPercent");

  if (hasNew) {
    console.log("  referral_rewards.rewardPercent already exists — nothing to do.");
  } else if (!hasOld) {
    console.log("  referral_rewards.rewardAmount not found either — nothing to rename.");
  } else if (isPostgres()) {
    await sequelize.query(
      `ALTER TABLE "referral_rewards" RENAME COLUMN "rewardAmount" TO "rewardPercent"`
    );
    await sequelize.query(
      `ALTER TABLE "referral_rewards" ALTER COLUMN "rewardPercent" TYPE DECIMAL(5,2)`
    );
    console.log("  renamed rewardAmount -> rewardPercent and retyped to DECIMAL(5,2)");
  } else {
    await sequelize.query(
      `ALTER TABLE \`referral_rewards\` CHANGE COLUMN \`rewardAmount\` \`rewardPercent\` DECIMAL(5,2) NOT NULL`
    );
    console.log("  renamed rewardAmount -> rewardPercent and retyped to DECIMAL(5,2)");
  }

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to rename rewardAmount to rewardPercent:", error);
  process.exit(1);
});
