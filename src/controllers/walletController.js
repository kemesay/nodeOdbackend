const {
  getWalletSummary,
  adminAdjustWallet,
  createCashOutRequest,
  listCashOutRequests,
  resolveCashOutRequest,
} = require("../services/walletService.js");

/** Signed-in user's own wallet balance + lot history, for the account page. */
async function myWalletController(req, res, _next) {
  const summary = await getWalletSummary(req.user.userId);
  return res.json(summary);
}

/** Admin viewing any customer's wallet balance + lot history. */
async function adminGetWalletController(req, res, _next) {
  const summary = await getWalletSummary(req.params.userId);
  return res.json(summary);
}

/**
 * Admin issuing a manual goodwill credit (positive amount) or correcting a
 * balance with a debit (negative amount) — requires a reason, for audit.
 */
async function adminAdjustWalletController(req, res, _next) {
  const { amount, reason } = req.body;
  await adminAdjustWallet({
    userId: req.params.userId,
    amount,
    reason,
    adminId: req.user.userId,
  });
  const summary = await getWalletSummary(req.params.userId);
  return res.json(summary);
}

/** Admin logging that this customer asked to cash out some of their balance. */
async function createCashOutRequestController(req, res, _next) {
  const { amountRequested, note } = req.body;
  const request = await createCashOutRequest({
    userId: req.params.userId,
    amountRequested,
    note,
    requestedByAdminId: req.user.userId,
  });
  return res.status(201).json(request);
}

/** This customer's cash-out request history (pending + resolved), newest first. */
async function listCashOutRequestsController(req, res, _next) {
  const requests = await listCashOutRequests({ userId: req.params.userId });
  return res.json(requests);
}

/**
 * Self-service: the signed-in customer requesting a cash-out of their own
 * balance directly, instead of an admin logging it on their behalf over the
 * phone. `requestedByAdminId` stays null — that's exactly what distinguishes
 * a customer-initiated ask from an admin-logged one in the admin queue. It
 * still only creates a PENDING request; an admin must approve/settle it via
 * the existing resolve endpoint before any money actually moves.
 */
async function createMyCashOutRequestController(req, res, _next) {
  const { amountRequested, note } = req.body;
  const request = await createCashOutRequest({
    userId: req.user.userId,
    amountRequested,
    note,
    requestedByAdminId: null,
  });
  return res.status(201).json(request);
}

/** The signed-in customer's own cash-out request history (pending + resolved). */
async function listMyCashOutRequestsController(req, res, _next) {
  const requests = await listCashOutRequests({ userId: req.user.userId });
  return res.json(requests);
}

/** Every customer's pending cash-out requests — an admin-wide "who's waiting for cash" view. */
async function listPendingCashOutRequestsController(req, res, _next) {
  const requests = await listCashOutRequests({ status: req.query.status || "pending" });
  return res.json(requests);
}

/** Admin settling a logged request — "fulfilled" also debits the wallet for real. */
async function resolveCashOutRequestController(req, res, _next) {
  const { status, resolutionNote, finalAmount } = req.body;
  const request = await resolveCashOutRequest({
    walletCashOutRequestId: req.params.requestId,
    status,
    resolutionNote,
    finalAmount,
    resolvedByAdminId: req.user.userId,
  });
  return res.json(request);
}

module.exports = {
  myWalletController,
  adminGetWalletController,
  adminAdjustWalletController,
  createCashOutRequestController,
  listCashOutRequestsController,
  createMyCashOutRequestController,
  listMyCashOutRequestsController,
  listPendingCashOutRequestsController,
  resolveCashOutRequestController,
};
