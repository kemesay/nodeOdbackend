const {
  getSquarePublicConfig,
} = require("../config/square.js");
const { isSquarePaymentProvider } = require("../config/paymentConfig.js");

function getPublicConfig(_req, res) {
  if (!isSquarePaymentProvider()) {
    return res.json({
      paymentProvider: "legacy",
      squareEnabled: false,
    });
  }

  return res.json({
    squareEnabled: true,
    ...getSquarePublicConfig(),
  });
}

module.exports = { getPublicConfig };
