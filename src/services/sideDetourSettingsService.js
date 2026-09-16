const { SideDetourSettings } = require("../models/SideDetourSettings.js");

const SETTINGS_ID = 1;

/**
 * The single row controlling the side-pick-detour start fee, seeded with
 * today's defaults (off / $0) the first time anything asks for it.
 */
async function getSideDetourSettings() {
  const [settings] = await SideDetourSettings.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { id: SETTINGS_ID },
  });
  return settings;
}

async function updateSideDetourSettings(patch) {
  const settings = await getSideDetourSettings();
  await settings.update(patch);
  return settings;
}

module.exports = { getSideDetourSettings, updateSideDetourSettings };
