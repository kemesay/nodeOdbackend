/**
 * Creates the promo-code tables (promo_codes, promo_code_redemptions,
 * referral_rewards) if they don't already exist yet.
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for brand
 * new tables that's a plain CREATE TABLE IF NOT EXISTS, and it never touches
 * any other (already-existing) table, so it's safe to run against the same
 * remote DB used by prod. See src/config/database.js for why blanket
 * auto-alter is disabled.
 *
 * Usage: npm run db:promo-code-tables
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const {
  PromoCode,
  PromoCodeRedemption,
  ReferralReward,
} = require("../src/models/PromoCode.js");

async function main() {
  await sequelize.authenticate();
  console.log("Connected. Ensuring promo-code tables exist...");

  await PromoCode.sync();
  console.log("  promo_codes ensured");

  await PromoCodeRedemption.sync();
  console.log("  promo_code_redemptions ensured");

  await ReferralReward.sync();
  console.log("  referral_rewards ensured");

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure promo-code tables:", error);
  process.exit(1);
});
