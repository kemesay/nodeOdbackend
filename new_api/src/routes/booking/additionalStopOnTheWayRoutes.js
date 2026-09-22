const express = require("express");

const {
  createAdditionalStopOnTheWayController,
  updateAdditionalStopOnTheWayController,
  getAllAdditionalStopOnTheWaysController,
  deleteAdditionalStopOnTheWayController,
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
  [auth, admin, validate(validateAdditionalStopOnTheWay)],
  createAdditionalStopOnTheWayController
);
router.put(
  "/:additionalStopId",
  [auth, admin, validate(validateAdditionalStopOnTheWayUpdate)],
  updateAdditionalStopOnTheWayController
);
router.delete(
  "/:additionalStopId",
  [auth, admin],
  deleteAdditionalStopOnTheWayController
);
router.get("/", getAllAdditionalStopOnTheWaysController);

module.exports = router;
