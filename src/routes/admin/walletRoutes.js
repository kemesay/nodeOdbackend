const express = require("express");
const router = express.Router();

const {
  adminGetWalletController,
  adminAdjustWalletController,
  createCashOutRequestController,
  listCashOutRequestsController,
} = require("../../controllers/walletController.js");
const {
  validateAdminAdjustWallet,
  validateCreateCashOutRequest,
} = require("../../models/WalletCredit.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

// Admin: a customer's wallet balance + lot history.
router.get("/:userId/wallet", [auth, admin], adminGetWalletController);

// Admin: manual goodwill credit (positive amount) or debit (negative
// amount), e.g. for a dispute or support correction. Requires a reason.
router.post(
  "/:userId/wallet/adjust",
  [auth, admin, validate(validateAdminAdjustWallet)],
  adminAdjustWalletController
);

// Admin: log that this customer asked to cash out some of their balance
// (no money moves yet — see /api/v1/admin/wallet/cash-out-requests/:requestId
// in walletCashOutRoutes.js for actually settling one).
router.post(
  "/:userId/wallet/cash-out-requests",
  [auth, admin, validate(validateCreateCashOutRequest)],
  createCashOutRequestController
);

// Admin: this customer's cash-out request history (pending + resolved).
router.get(
  "/:userId/wallet/cash-out-requests",
  [auth, admin],
  listCashOutRequestsController
);

module.exports = router;
