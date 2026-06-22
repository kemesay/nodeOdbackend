const squareWebhookService = require("../services/payments/squareWebhookService.js");
const { getSquareCredentials } = require("../config/square.js");

async function squareWebhook(req, res) {
  const signature = req.get("x-square-hmacsha256-signature");
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ message: "Invalid webhook body" });
  }

  const bodyString = rawBody.toString("utf8");
  const creds = getSquareCredentials();
  const notificationUrl =
    creds.webhookNotificationUrl ||
    `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  try {
    const valid = squareWebhookService.verifySignature(
      bodyString,
      signature,
      notificationUrl
    );
    if (!valid) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(bodyString);
    const result = await squareWebhookService.handleWebhookEvent(event);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { squareWebhook };
