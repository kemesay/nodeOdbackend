const { HourlyLongDistanceSettings } = require("../models/HourlyLongDistanceSettings.js");

const SETTINGS_ID = 1;

/**
 * The single row controlling the Hourly Charter long-distance fee, seeded
 * with today's defaults (off / $0 / 0 miles) the first time anything asks
 * for it.
 */
async function getHourlyLongDistanceSettings() {
  const [settings] = await HourlyLongDistanceSettings.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { id: SETTINGS_ID },
  });
  return settings;
}

async function updateHourlyLongDistanceSettings(patch) {
  const settings = await getHourlyLongDistanceSettings();
  await settings.update(patch);
  return settings;
}

module.exports = { getHourlyLongDistanceSettings, updateHourlyLongDistanceSettings };
