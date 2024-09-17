const { successResponse } = require("../utils/responseUtil.js");

async function validatePaymentDetailController(req, res, _next) {
  const response = successResponse("Card validated successfully");
  return res.json(response);
}

module.exports = {
  validatePaymentDetailController,
};
