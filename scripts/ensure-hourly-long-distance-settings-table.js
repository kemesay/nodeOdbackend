/**
 * Creates the hourly_long_distance_settings table (a single admin-tunable
 * row for the optional Hourly Charter "Long Distance Fee") if it doesn't
 * already exist yet, and seeds the default row (off / $0 / 0 miles).
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for a
 * brand new table that's a plain CREATE TABLE IF NOT EXISTS, and it never
 * touches any other (already-existing) table. See src/config/database.js
 * for why blanket auto-alter is disabled.
 *
 * Usage: npm run db:hourly-long-distance-settings-table
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const {
  HourlyLongDistanceSettings,
} = require("../src/models/HourlyLongDistanceSettings.js");

async function main() {
  await sequelize.authenticate();
  console.log(
    `Connected (${sequelize.getDialect()}). Ensuring hourly_long_distance_settings exists...`
  );

  await HourlyLongDistanceSettings.sync();
  console.log("  hourly_long_distance_settings ensured");

  const [settings, created] = await HourlyLongDistanceSettings.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  console.log(
    created
      ? `  seeded default row: isActive=${settings.isActive}, minimumDistanceInMiles=${settings.minimumDistanceInMiles}, feeAmount=$${settings.feeAmount}`
      : "  row already existed, left untouched"
  );

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure hourly_long_distance_settings table:", error);
  process.exit(1);
});
