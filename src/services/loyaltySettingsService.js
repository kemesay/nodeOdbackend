const { LoyaltySettings } = require("../models/LoyaltySettings.js");

const SETTINGS_ID = 1;

/** The single row of admin-tunable loyalty-milestone numbers, seeded (off / every 5th / 5%) on first use. */
async function getLoyaltySettings() {
  const [settings] = await LoyaltySettings.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { id: SETTINGS_ID },
  });
  return settings;
}

async function updateLoyaltySettings(patch) {
  const settings = await getLoyaltySettings();
  await settings.update(patch);
  return settings;
}

module.exports = { getLoyaltySettings, updateLoyaltySettings };
