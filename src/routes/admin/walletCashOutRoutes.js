const express = require("express");
const router = express.Router();

const {
  listPendingCashOutRequestsController,
  resolveCashOutRequestController,
} = require("../../controllers/walletController.js");
const { validateResolveCashOutRequest } = require("../../models/WalletCredit.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

// Admin: every customer's cash-out requests, newest first — defaults to
// pending only (?status=fulfilled|cancelled|pending to narrow it).
router.get("/cash-out-requests", [auth, admin], listPendingCashOutRequestsController);

// Admin: settle a logged request. "fulfilled" also debits the wallet for
// real, through the same path a standalone manual debit would use.
router.patch(
  "/cash-out-requests/:requestId",
  [auth, admin, validate(validateResolveCashOutRequest)],
  resolveCashOutRequestController
);

module.exports = router;
