const express = require("express");
const router = express.Router();

const {
  searchUserBookingsController,
  updateMyAirportBookingController,
  updateMyPointToPointBookingController,
  updateMyHourlyCharterBookingController,
  getMyBookingRoomTokenController,
} = require("../controllers/userBookingController.js");

const {
  validateAirportBookUpdate,
} = require("../models/airportBooking/AirportBook.js");
const {
  validatePointToPointBookUpdate,
} = require("../models/PointToPointBook.js");
const {
  validateHourlyCharterBookUpdate,
} = require("../models/HourlyCharterBook.js");


const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

//TODO: add auth middleware
router.get("/mine", auth,searchUserBookingsController);

router.get(
  "/mine/realtime/:bookingType(airport|p2p|hourly)/:bookingId",
  auth,
  getMyBookingRoomTokenController
);

// User-scoped update endpoints (ownership enforced in service)
router.patch(
  "/mine/airport/:airportBookId",
  [auth, validate(validateAirportBookUpdate)],
  updateMyAirportBookingController
);
router.patch(
  "/mine/p2p/:pointToPointBookId",
  [auth, validate(validatePointToPointBookUpdate)],
  updateMyPointToPointBookingController
);
router.patch(
  "/mine/hourly/:hourlyCharterBookId",
  [auth, validate(validateHourlyCharterBookUpdate)],
  updateMyHourlyCharterBookingController
);

module.exports = router;
