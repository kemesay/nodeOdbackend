const express = require("express");
const router = express.Router();

const {
  getLoyaltySettingsController,
  updateLoyaltySettingsController,
} = require("../controllers/loyaltySettingsController.js");

const { validateUpdateLoyaltySettings } = require("../models/LoyaltySettings.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Admin-only — today's loyalty-milestone numbers.
router.get("/", [auth, admin], getLoyaltySettingsController);

// Admin-only — turn it on/off, change the every-Nth interval or the %.
router.patch(
  "/",
  [auth, admin, validate(validateUpdateLoyaltySettings)],
  updateLoyaltySettingsController
);

module.exports = router;
