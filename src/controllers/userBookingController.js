const {
  searchUserBookingsByUserId,
} = require("../services/utilTripService.js");

async function searchUserBookingsController(req, res, _next) {
  const {userId} = req.user;
  const response = await searchUserBookingsByUserId(userId);
  return res.json(response);
}

module.exports = {
  searchUserBookingsController,
};
