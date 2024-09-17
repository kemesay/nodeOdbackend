const express = require("express");

const {
  createFooterContentController,
  getFooterContentController,
} = require("../../controllers/companyInfo/footerContentController.js");

const { validateFooterContent } = require("../../models/companyInfo/FooterContent.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [auth, admin, validate(validateFooterContent)],
  createFooterContentController
);

router.get("/", getFooterContentController);

module.exports = router;
