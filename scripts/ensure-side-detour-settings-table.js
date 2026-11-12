/**
 * Creates the side_detour_settings table (a single admin-tunable row for the
 * optional side-pick-detour "start fee") if it doesn't already exist yet, and
 * seeds the default row (off / $0).
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for a
 * brand new table that's a plain CREATE TABLE IF NOT EXISTS, and it never
 * touches any other (already-existing) table. See src/config/database.js
 * for why blanket auto-alter is disabled.
 *
 * Usage: npm run db:side-stop-settings-table
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { SideDetourSettings } = require("../src/models/SideDetourSettings.js");

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}). Ensuring side_stop_settings exists...`);

  await SideDetourSettings.sync();
  console.log("  side_stop_settings ensured");

  const [settings, created] = await SideDetourSettings.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 },
  });
  console.log(
    created
      ? `  seeded default row: isActive=${settings.isActive}, startFee=$${settings.startFee}`
      : "  row already existed, left untouched"
  );

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure side_stop_settings table:", error);
  process.exit(1);
});
