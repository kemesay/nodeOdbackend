const {
  createAirport,
  updateAirport,
  getAllAirports,
  toggleAirportStatus,
  getAllActiveAirports,
} = require("../../services/airportBooking/airportService.js");

async function createAirportController(req, res, _next) {
  const airport = await createAirport(req.body);
  return res.status(201).json(airport);
}

async function updateAirportController(req, res, _next) {
  const airportId = req.params.airportId;
  const updatedAirportData = req.body;

  const updatedAirport = await updateAirport(airportId, updatedAirportData);
  return res.json(updatedAirport);
}

async function toggleAirportStatusController(req, res, _next) {
  const airportId = req.params.airportId;
  const updatedAirport = await toggleAirportStatus(airportId);
  return res.json(updatedAirport);
}

async function getAllAirportsController(_req, res, _next) {
  const airports = await getAllAirports();
  return res.json(airports);
}

async function getAllActiveAirportsController(_req, res, _next) {
  const airports = await getAllActiveAirports();
  return res.json(airports);
}

module.exports = {
  createAirportController,
  updateAirportController,
  getAllAirportsController,
  getAllActiveAirportsController,
  toggleAirportStatusController,
};
