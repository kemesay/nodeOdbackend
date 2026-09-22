/**
 * Creates the side_pick_detours table if it doesn't exist yet.
 * (Point-to-point and airport bookings support one-or-many optional side
 * pick/detour stops via the SidePickDetour model — the table backing it
 * was never created, so booking creation fails with
 * "Table 'side_pick_detours' doesn't exist" whenever a stop is included.)
 * Usage: npm run db:side-pick-detours-table
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { SidePickDetour } = require("../src/models/booking/SidePickDetour.js");
// Pull these in so their associations with SidePickDetour are registered
// before sync — the FK constraints reference these tables.
require("../src/models/PointToPointBook.js");
require("../src/models/airportBooking/AirportBook.js");

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table LIMIT 1`,
    { replacements: { table } }
  );
  return rows.length > 0;
}

async function main() {
  await sequelize.authenticate();

  if (await tableExists("side_pick_detours")) {
    console.log("side_pick_detours already exists — nothing to do.");
    await sequelize.close();
    return;
  }

  await SidePickDetour.sync();
  console.log("Created side_pick_detours table.");
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
