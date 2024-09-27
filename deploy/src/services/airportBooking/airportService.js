const { Airport } = require("../../models/airportBooking/Airport.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

async function createAirport(airportData) {
  return await Airport.create(airportData);
}

async function updateAirport(airportId, updatedAirportData) {
  const airport = await getAirportById(airportId);
  return await airport.update(updatedAirportData);
}

async function getAllActiveAirports() {
  return await Airport.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

//For admin
async function getAllAirports() {
  return await Airport.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function toggleAirportStatus(airportId) {
  const airport = await getAirportById(airportId);
  // Toggle the status
  airport.status = airport.status === "Active" ? "Inactive" : "Active";

  await airport.save();
  return airport;
}

async function getAirportById(airportId) {
  const airport = await Airport.findByPk(airportId);
  if (!airport)
    throw new ResourceNotFoundError(`Airport with ID ${airportId} not found`);
  return airport;
}

module.exports = {
  createAirport,
  updateAirport,
  getAllAirports,
  getAllActiveAirports,
  toggleAirportStatus,
  getAirportById,
};
