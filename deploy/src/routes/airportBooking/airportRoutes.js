const express = require("express");

const {
  createAirportController,
  updateAirportController,
  getAllAirportsController,
  getAllActiveAirportsController,
  toggleAirportStatusController,
} = require("../../controllers/airportBooking/airportController.js");

const { validateAirport } = require("../../models/airportBooking/Airport.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [auth, admin, validate(validateAirport)],
  createAirportController
);
router.put("/:airportId", [auth, admin], updateAirportController);
router.put(
  "/:airportId/toggle-status",
  [auth, admin],
  toggleAirportStatusController
);

router.get("/all", [auth, admin], getAllAirportsController);
router.get("/", getAllActiveAirportsController);

module.exports = router;
