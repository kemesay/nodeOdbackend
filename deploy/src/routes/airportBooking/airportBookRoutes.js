const express = require("express");
const router = express.Router();

const {
  createAirportBookController,
  updateAirportBookController,
  getAirportBookController,
  deleteAirportBookController,
  getAirportBooksController,
  updatePaymentStatusController,
  updateBookingStatusController,
} = require("../../controllers/airportBooking/airportBookController.js");

const {
  validateAirportBook,
} = require("../../models/airportBooking/AirportBook.js");

const {
  validatePaymentStatus,
  validateBookingStatus,
} = require("../../utils/validationUtils.js");

const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");
const admin = require("../../middleware/admin.js");

router.post("/", [validate(validateAirportBook)], createAirportBookController);

router.put("/:airportBookId", [auth], updateAirportBookController);

router.put(
  "/:airportBookId/payment-status",
  [auth, admin, validate(validatePaymentStatus)],
  updatePaymentStatusController
);

router.put(
  "/:airportBookId/booking-status",
  [auth, admin, validate(validateBookingStatus)],
  updateBookingStatusController
);

router.delete("/:airportBookId", [auth, admin], deleteAirportBookController);
router.get("/", [auth, admin], getAirportBooksController);
router.get("/:airportBookId", [auth], getAirportBookController);

module.exports = router;
