const express = require("express");

const {
  createAirportPickupPreferenceController,
  updateAirportPickupPreferenceController,
  getAllAirportPickupPreferencesController,
  disableAirportPickupPreferenceController,
} = require("../../controllers/airportBooking/airportPickupPreferenceController.js");

const {
  validateAirportPickupPreference,
} = require("../../models/airportBooking/AirportPickupPreference.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  validate(validateAirportPickupPreference),
  createAirportPickupPreferenceController
);
router.put("/:pickupPreferenceId", updateAirportPickupPreferenceController);
router.put(
  "/:pickupPreferenceId/disable",
  disableAirportPickupPreferenceController
);
router.get("/", getAllAirportPickupPreferencesController);

module.exports = router;
