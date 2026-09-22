const { WebhooksHelper } = require("square");
const { getSquareCredentials } = require("../../config/square.js");
const squarePaymentService = require("./squarePaymentService.js");
const { emitPaymentTransactionUpdated } = require("../../realtime/socket.js");

function verifySignature(rawBody, signatureHeader, notificationUrl) {
  const creds = getSquareCredentials();
  const key = creds.webhookSignatureKey;
  if (!key) {
    throw new Error(
      `Square webhook signature key is missing for "${creds.environment}". Set SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY or SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY in .env`
    );
  }
  return WebhooksHelper.isValidWebhookEventSignature(
    rawBody,
    signatureHeader,
    key,
    notificationUrl
  );
}

async function handleWebhookEvent(event) {
  const type = event?.type;
  const payment = event?.data?.object?.payment;

  if (!payment?.id) {
    return { handled: false, type };
  }

  const status = squarePaymentService.mapSquarePaymentStatus(payment);
  const tx = await squarePaymentService.updateTransactionStatus(
    payment.id,
    status,
    payment
  );
  if (tx) {
    emitPaymentTransactionUpdated(tx);
  }

  return { handled: true, type, squarePaymentId: payment.id, status };
}

module.exports = {
  verifySignature,
  handleWebhookEvent,
};
