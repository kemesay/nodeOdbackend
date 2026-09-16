const express = require("express");
const router = express.Router();

const {
  getSideDetourSettingsController,
  updateSideDetourSettingsController,
} = require("../controllers/sideDetourSettingsController.js");

const { validateUpdateSideDetourSettings } = require("../models/SideDetourSettings.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Public — any booking form (guest included) needs this for an accurate
// live fare preview before a booking is ever submitted.
router.get("/", getSideDetourSettingsController);

// Admin-only — turn the fee on/off and set its amount.
router.patch(
  "/",
  [auth, admin, validate(validateUpdateSideDetourSettings)],
  updateSideDetourSettingsController
);

module.exports = router;
