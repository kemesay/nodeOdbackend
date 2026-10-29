/**
 * Creates the loyalty_settings table (a single admin-tunable row for the
 * optional ride-count loyalty milestone) if it doesn't already exist yet,
 * and seeds the default row (off / every 5th ride / 5%).
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for a
 * brand new table that's a plain CREATE TABLE IF NOT EXISTS, and it never
 * touches any other (already-existing) table. See
 * scripts/ensure-side-detour-settings-table.js for the same pattern used
 * when side-detour settings were added.
 *
 * Usage: npm run db:loyalty-settings-table
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { LoyaltySettings } = require("../src/models/LoyaltySettings.js");

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}). Ensuring loyalty_settings exists...`);

  await LoyaltySettings.sync();
  console.log("  loyalty_settings ensured");

  const [settings, created] = await LoyaltySettings.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  console.log(
    created
      ? `  seeded default row: isActive=${settings.isActive}, milestoneInterval=${settings.milestoneInterval}, milestonePercent=${settings.milestonePercent}`
      : "  row already existed, left untouched"
  );

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure loyalty_settings table:", error);
  process.exit(1);
});
