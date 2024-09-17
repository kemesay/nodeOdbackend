const {
  AirportPickupPreference,
} = require("../../models/airportBooking/AirportPickupPreference.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

async function createAirportPickupPreference(preferenceData) {
  return await AirportPickupPreference.create(preferenceData);
}

async function updateAirportPickupPreference(
  pickupPreferenceId,
  updatedPreferenceData
) {
  const preference = await getAirportPickupPreferenceById(pickupPreferenceId);
  return await preference.update(updatedPreferenceData);
}

async function getAllAirportPickupPreferences() {
  return await AirportPickupPreference.findAll();
}

async function disableAirportPickupPreference(pickupPreferenceId) {
  const airportPickupPreference = await getAirportPickupPreferenceById(
    pickupPreferenceId
  );
  airportPickupPreference.status = "Disabled";
  await airportPickupPreference.save();
}

async function getAirportPickupPreferenceById(pickupPreferenceId) {
  const airportPickupPreference = await AirportPickupPreference.findByPk(
    pickupPreferenceId
  );
  if (!airportPickupPreference)
    throw new ResourceNotFoundError(
      `Airport Pickup Preference with ID ${pickupPreferenceId} not found`
    );
  return airportPickupPreference;
}

module.exports = {
  createAirportPickupPreference,
  updateAirportPickupPreference,
  getAllAirportPickupPreferences,
  disableAirportPickupPreference,
  getAirportPickupPreferenceById,
};
