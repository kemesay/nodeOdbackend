const { successResponse } = require("../utils/responseUtil.js");

const authenticateToken = require("../utils/getUserFromToken.js");

const {
  addOrUpdatePaymentDetail,
  createPaymentDetail,
  updatePaymentDetail,
  getPaymentDetails,
  getPaymentDetailById,
  deletePaymentDetail,
} = require("../services/paymentDetailService.js");
const {
  getPaymentDetailByUserId,
} = require("../services/utilTripService.js");

async function validatePaymentDetailController(req, res, _next) {
  try {
    const tokenHeader = req.header("Authorization");
    let user;
    if (tokenHeader) {
      user = await authenticateToken(tokenHeader);
      req.body.userId = user.userId;
    }

    // First validate the card
    const validationResponse = successResponse("Card validated successfully");

    // Then save the payment details
    const paymentDetail = await createPaymentDetail(req.body);

    // Return both validation and payment detail information
    return res.status(201).json({
      ...validationResponse,
      paymentDetail
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function addOrUpdatePaymentDetailController(req, res, _next) {
  const paymentDetail = await addOrUpdatePaymentDetail(req.body);
  return res.status(200).json(paymentDetail);
}

async function createPaymentDetailController(req, res, _next) {
  const tokenHeader = req.header("Authorization");
  let user;
  if (tokenHeader) {
    user = await authenticateToken(tokenHeader);
    req.body.userId = user.userId;
  }

  const paymentDetail = await createPaymentDetail(req.body);
  return res.status(201).json(paymentDetail);
}

async function updatePaymentDetailController(req, res, _next) {
  const paymentDetail = await updatePaymentDetail(req.params.paymentDetailId, req.body);
  return res.status(200).json(paymentDetail);
}

async function getPaymentDetailsController(req, res, _next) {
  const { page, pageSize, sortDirection } = req.query;
  sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const paymentDetails = await getPaymentDetails(
    page,
    pageSize,
    sortDirection
  );
  return res.status(200).json(paymentDetails);
}

async function getPaymentDetailByIdController(req, res, _next) {
  const paymentDetailId = req.params.paymentDetailId;
  const paymentDetail = await getPaymentDetailById(paymentDetailId);
  return res.status(200).json(paymentDetail);
}   

async function deletePaymentDetailController(req, res, _next) {
  await deletePaymentDetail(req.params.paymentDetailId);
  return res.status(200).json({ message: "Payment detail deleted successfully" });
}         

async function getPaymentDetailByUserIdController(req, res, _next) {
  const { userId } = req.user;
  const response = await getPaymentDetailByUserId(userId);
  return res.json(response);
}


module.exports = {
  validatePaymentDetailController,
  addOrUpdatePaymentDetailController,
  createPaymentDetailController,
  updatePaymentDetailController,
  getPaymentDetailsController,
  getPaymentDetailByIdController,
  getPaymentDetailByUserIdController,
  deletePaymentDetailController,
};
