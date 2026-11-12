const express = require("express");
const router = express.Router();

const {
  getHourlyLongDistanceSettingsController,
  updateHourlyLongDistanceSettingsController,
} = require("../controllers/hourlyLongDistanceSettingsController.js");

const {
  validateUpdateHourlyLongDistanceSettings,
} = require("../models/HourlyLongDistanceSettings.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Public — any Hourly Charter booking form (guest included) needs this for
// an accurate live fare preview before a booking is ever submitted.
router.get("/", getHourlyLongDistanceSettingsController);

// Admin-only — turn the fee on/off and set the distance threshold/amount.
router.patch(
  "/",
  [auth, admin, validate(validateUpdateHourlyLongDistanceSettings)],
  updateHourlyLongDistanceSettingsController
);

module.exports = router;
