const {
  createAirportPickupPreference,
  updateAirportPickupPreference,
  getAllAirportPickupPreferences,
  disableAirportPickupPreference,
} = require("../../services/airportBooking/airportPickupPreferenceService.js");

const { successResponse } = require("../../utils/responseUtil.js");

async function createAirportPickupPreferenceController(req, res, _next) {
  const airportPickupPreference = await createAirportPickupPreference(req.body);
  return res.status(201).json(airportPickupPreference);
}

async function updateAirportPickupPreferenceController(req, res, _next) {
  const pickupPreferenceId = req.params.pickupPreferenceId;
  const updatedAirportPickupPreferenceData = req.body;

  const updatedAirportPickupPreference = await updateAirportPickupPreference(
    pickupPreferenceId,
    updatedAirportPickupPreferenceData
  );
  return res.json(updatedAirportPickupPreference);
}

async function getAllAirportPickupPreferencesController(_req, res, _next) {
  const airportPickupPreferences = await getAllAirportPickupPreferences();
  return res.json(airportPickupPreferences);
}

async function disableAirportPickupPreferenceController(req, res, _next) {
  await disableAirportPickupPreference(req.params.pickupPreferenceId);
  const response = successResponse(
    "Airport Pickup Preference disabled successfully"
  );
  return res.json(response);
}

module.exports = {
  createAirportPickupPreferenceController,
  updateAirportPickupPreferenceController,
  getAllAirportPickupPreferencesController,
  disableAirportPickupPreferenceController,
};
