const express = require("express");
const router = express.Router();

const {
  myWalletController,
  createMyCashOutRequestController,
  listMyCashOutRequestsController,
} = require("../controllers/walletController.js");
const { validateCreateCashOutRequest } = require("../models/WalletCredit.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Signed-in user's own wallet balance + lot history (account page).
router.get("/", [auth], myWalletController);

// Signed-in user requesting a cash-out of their own balance directly —
// creates a pending request an admin must still review/settle (see
// src/routes/admin/walletCashOutRoutes.js), it never moves money by itself.
router.post(
  "/cash-out-requests",
  [auth, validate(validateCreateCashOutRequest)],
  createMyCashOutRequestController
);

// Signed-in user's own cash-out request history (pending + resolved).
router.get("/cash-out-requests", [auth], listMyCashOutRequestsController);

module.exports = router;
