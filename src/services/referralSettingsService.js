const { ReferralSettings } = require("../models/ReferralSettings.js");

const SETTINGS_ID = 1;

/**
 * The single row of admin-tunable referral-program numbers, seeded with
 * today's defaults (10% / $10 / 5 / 5) the first time anything asks for it.
 */
async function getReferralSettings() {
  const [settings] = await ReferralSettings.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { id: SETTINGS_ID },
  });
  return settings;
}

async function updateReferralSettings(patch) {
  const settings = await getReferralSettings();
  await settings.update(patch);
  return settings;
}

module.exports = { getReferralSettings, updateReferralSettings };
