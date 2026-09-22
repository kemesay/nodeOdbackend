const express = require("express");
const router = express.Router();

const {
  loginController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController
} = require("../../controllers/user/authController.js");
const {
  validateUserAuth,
  validatePasswordChange,
  validatePasswordReset
} = require("../../models/user/User.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");
const {
  loginRateLimiter,
  passwordResetRateLimiter,
} = require("../../middleware/rateLimiter.js");

router.post("/login", [loginRateLimiter, validate(validateUserAuth)], loginController);
router.post(
  "/change-password",
  [auth, validate(validatePasswordChange)],
  changePasswordController
);

router.post('/forgot-password', passwordResetRateLimiter, forgotPasswordController);
router.post('/reset-password', passwordResetRateLimiter, validate(validatePasswordReset), resetPasswordController);

module.exports = router;
