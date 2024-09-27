const express = require("express");
const multer = require("multer");

const {
  createSocialMediaController,
  updateSocialMediaController,
  toggleSocialMediaStatusController,
  getAllSocialMediasController,
  getAllActiveSocialMediasController,
  deleteSocialMediaController,
} = require("../../controllers/companyInfo/socialMediaController.js");

const {
  validateSocialMedia,
} = require("../../models/companyInfo/SocialMedia.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [auth, admin, validate(validateSocialMedia)],
  createSocialMediaController
);
router.put(
  "/:socialMediaId",
  [auth, admin, validate(validateSocialMedia)],
  updateSocialMediaController
);
router.put(
  "/:socialMediaId/toggle-status",
  [auth, admin],
  toggleSocialMediaStatusController
);
router.delete("/:socialMediaId", deleteSocialMediaController);
router.get("/", getAllActiveSocialMediasController);
router.get("/all", [auth, admin], getAllSocialMediasController);

module.exports = router;
