const express = require("express");

const {
  createAdditionalStopOnTheWayController,
  updateAdditionalStopOnTheWayController,
  getAllAdditionalStopOnTheWaysController,
} = require("../../controllers/booking/additionalStopOnTheWayController.js");

const {
  validateAdditionalStopOnTheWay,
  validateAdditionalStopOnTheWayUpdate,
} = require("../../models/booking/AdditionalStopOnTheWay.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  validate(validateAdditionalStopOnTheWay),
  createAdditionalStopOnTheWayController
);
router.put(
  "/:additionalStopId",
  validate(validateAdditionalStopOnTheWayUpdate),
  updateAdditionalStopOnTheWayController
);
router.get("/", getAllAdditionalStopOnTheWaysController);

module.exports = router;
