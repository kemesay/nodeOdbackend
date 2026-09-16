const {
  getSideDetourSettings,
  updateSideDetourSettings,
} = require("../services/sideDetourSettingsService.js");

function serializeSideDetourSettings(settings) {
  return {
    isActive: settings.isActive,
    startFee: Number(settings.startFee),
  };
}

/**
 * Public — the booking form (guest or signed-in, web or app) needs this to
 * show an accurate live fare preview before a customer ever submits a
 * booking, so it isn't gated behind auth like the admin-only PATCH below.
 */
async function getSideDetourSettingsController(req, res, _next) {
  const settings = await getSideDetourSettings();
  return res.json(serializeSideDetourSettings(settings));
}

/**
 * Admin-only: turn the fee on/off and set its amount. Only affects fare
 * calculated from now on — bookings already priced and charged are untouched.
 */
async function updateSideDetourSettingsController(req, res, _next) {
  const settings = await updateSideDetourSettings(req.body);
  return res.json(serializeSideDetourSettings(settings));
}

module.exports = {
  getSideDetourSettingsController,
  updateSideDetourSettingsController,
};
