const express = require("express");

const {
  createHourlyCharterBookController,
  updateHourlyCharterBookController,
  getAllHourlyCharterBooksController,
  getHourlyCharterBookController,
  deleteHourlyCharterBookController,
  updatePaymentStatusController,
  updateBookingStatusController,
} = require("../controllers/hourlyCharterBookController.js");

const { validateHourlyCharterBook } = require("../models/HourlyCharterBook.js");
const {
  validatePaymentStatus,
  validateBookingStatus,
} = require("../utils/validationUtils.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [validate(validateHourlyCharterBook)],
  createHourlyCharterBookController
);

router.put("/:hourlyCharterBookId", [auth], updateHourlyCharterBookController);

router.delete(
  "/:hourlyCharterBookId",
  [auth, admin],
  deleteHourlyCharterBookController
);
router.get("/", [auth, admin], getAllHourlyCharterBooksController);
router.get("/:hourlyCharterBookId", [auth], getHourlyCharterBookController);

router.put(
  "/:hourlyCharterBookId/payment-status",
  [auth, admin, validate(validatePaymentStatus)],
  updatePaymentStatusController
);

router.put(
  "/:hourlyCharterBookId/booking-status",
  [auth, admin, validate(validateBookingStatus)],
  updateBookingStatusController
);

module.exports = router;
