const {
  searchUserBookingsByUserId,
} = require("../services/utilTripService.js");

const {
  updateAirportBookForUser,
} = require("../services/airportBooking/airportBookService.js");
const {
  updatePointToPointBookForUser,
} = require("../services/pointTopoint/pointToPointBookService.js");
const {
  updateHourlyCharterBookForUser,
} = require("../services/hourlyCharter/hourlyCharterBookService.js");

async function searchUserBookingsController(req, res, _next) {
  const {userId} = req.user;
  const response = await searchUserBookingsByUserId(userId);
  return res.json(response);
}

async function updateMyAirportBookingController(req, res, _next) {
  const { userId } = req.user;
  const airportBookId = req.params.airportBookId;
  const updated = await updateAirportBookForUser(airportBookId, userId, req.body);
  return res.json(updated);
}

async function updateMyPointToPointBookingController(req, res, _next) {
  const { userId } = req.user;
  const pointToPointBookId = req.params.pointToPointBookId;
  const updated = await updatePointToPointBookForUser(
    pointToPointBookId,
    userId,
    req.body
  );
  return res.json(updated);
}

async function updateMyHourlyCharterBookingController(req, res, _next) {
  const { userId } = req.user;
  const hourlyCharterBookId = req.params.hourlyCharterBookId;
  const updated = await updateHourlyCharterBookForUser(
    hourlyCharterBookId,
    userId,
    req.body
  );
  return res.json(updated);
}

module.exports = {
  searchUserBookingsController,
  updateMyAirportBookingController,
  updateMyPointToPointBookingController,
  updateMyHourlyCharterBookingController,
};
