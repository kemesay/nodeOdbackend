/**
 * Creates the referral_settings table (a single admin-tunable row for the
 * referral discount %, referrer reward $, and the two lifetime redemption
 * caps) if it doesn't already exist yet, and seeds the default row.
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for a
 * brand new table that's a plain CREATE TABLE IF NOT EXISTS, and it never
 * touches any other (already-existing) table. See src/config/database.js
 * for why blanket auto-alter is disabled.
 *
 * Usage: npm run db:referral-settings-table
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { ReferralSettings } = require("../src/models/ReferralSettings.js");

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}). Ensuring referral_settings exists...`);

  await ReferralSettings.sync();
  console.log("  referral_settings ensured");

  const [settings, created] = await ReferralSettings.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  console.log(
    created
      ? `  seeded default row: ${settings.referralDiscountPercent}% / ${settings.maxLifetimePublicRedemptions} public / ${settings.maxLifetimeReferralRedemptions} referral`
      : "  row already existed, left untouched"
  );

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure referral_settings table:", error);
  process.exit(1);
});
