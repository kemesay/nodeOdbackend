const {
  getHourlyLongDistanceSettings,
  updateHourlyLongDistanceSettings,
} = require("../services/hourlyLongDistanceSettingsService.js");

function serializeHourlyLongDistanceSettings(settings) {
  return {
    isActive: settings.isActive,
    minimumDistanceInMiles: Number(settings.minimumDistanceInMiles),
    feeAmount: Number(settings.feeAmount),
  };
}

/**
 * Public — the Hourly Charter booking form (guest or signed-in, web or app)
 * needs this to show an accurate live fare preview before a customer ever
 * submits a booking, so it isn't gated behind auth like the admin-only
 * PATCH below.
 */
async function getHourlyLongDistanceSettingsController(req, res, _next) {
  const settings = await getHourlyLongDistanceSettings();
  return res.json(serializeHourlyLongDistanceSettings(settings));
}

/**
 * Admin-only: turn the fee on/off and set the distance threshold/amount.
 * Only affects fare calculated from now on — bookings already priced and
 * charged are untouched.
 */
async function updateHourlyLongDistanceSettingsController(req, res, _next) {
  const settings = await updateHourlyLongDistanceSettings(req.body);
  return res.json(serializeHourlyLongDistanceSettings(settings));
}

module.exports = {
  getHourlyLongDistanceSettingsController,
  updateHourlyLongDistanceSettingsController,
};
