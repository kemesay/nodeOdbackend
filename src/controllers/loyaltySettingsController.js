const {
  getLoyaltySettings,
  updateLoyaltySettings,
} = require("../services/loyaltySettingsService.js");

function serializeLoyaltySettings(settings) {
  return {
    isActive: settings.isActive,
    milestoneInterval: settings.milestoneInterval,
    milestonePercent: Number(settings.milestonePercent),
  };
}

/** Admin-only: today's loyalty-milestone numbers (on/off, every-Nth, %). */
async function getLoyaltySettingsController(req, res, _next) {
  const settings = await getLoyaltySettings();
  return res.json(serializeLoyaltySettings(settings));
}

/**
 * Admin-only: change one or more loyalty-milestone numbers. Only affects
 * bookings completed from now on — anything already credited keeps whatever
 * rate it was credited at.
 */
async function updateLoyaltySettingsController(req, res, _next) {
  const settings = await updateLoyaltySettings(req.body);
  return res.json(serializeLoyaltySettings(settings));
}

module.exports = {
  getLoyaltySettingsController,
  updateLoyaltySettingsController,
};
