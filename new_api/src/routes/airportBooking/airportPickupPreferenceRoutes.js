const express = require("express");

const {
  createAirportPickupPreferenceController,
  updateAirportPickupPreferenceController,
  getAllAirportPickupPreferencesController,
  disableAirportPickupPreferenceController,
  enableAirportPickupPreferenceController,
  deleteAirportPickupPreferenceController,
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
  [auth, admin, validate(validateAirportPickupPreference)],
  createAirportPickupPreferenceController
);
router.put(
  "/:pickupPreferenceId",
  [auth, admin],
  updateAirportPickupPreferenceController
);
router.put(
  "/:pickupPreferenceId/disable",
  [auth, admin],
  disableAirportPickupPreferenceController
);
router.put(
  "/:pickupPreferenceId/enable",
  [auth, admin],
  enableAirportPickupPreferenceController
);
router.delete(
  "/:pickupPreferenceId",
  [auth, admin],
  deleteAirportPickupPreferenceController
);
router.get("/", getAllAirportPickupPreferencesController);

module.exports = router;
