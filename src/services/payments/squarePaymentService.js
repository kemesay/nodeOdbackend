const { randomUUID } = require("crypto");
const {
  dollarsToCents,
  getSquareCredentials,
  assertSquareServerConfigured,
} = require("../../config/square.js");
const { PaymentTransaction } = require("../../models/PaymentTransaction.js");
const { ValidationError } = require("../../errors/CustomErrors.js");
const { normalizePaymentBookingType } = require("../../utils/paymentBookingType.js");

async function squareFetch(path, method, body) {
  const creds = getSquareCredentials();
  assertSquareServerConfigured(creds);

  const res = await fetch(`${creds.connectBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": creds.apiVersion,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.errors?.length) {
    const msg =
      json?.errors?.map((e) => e.detail || e.code).join("; ") ||
      `Square request failed (${res.status})`;
    throw new ValidationError(msg);
  }
  return json;
}

function mapSquarePaymentStatus(payment) {
  if (!payment) return "FAILED";
  if (payment.status === "COMPLETED") return "COMPLETED";
  if (payment.status === "APPROVED" || payment.status === "AUTHORIZED") {
    return "AUTHORIZED";
  }
  if (payment.status === "CANCELED" || payment.status === "VOIDED") {
    return "CANCELED";
  }
  if (payment.status === "FAILED") return "FAILED";
  return "PENDING";
}

function sanitizePaymentResponse(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    status: payment.status,
    amountMoney: payment.amountMoney,
    totalMoney: payment.totalMoney,
    approvedMoney: payment.approvedMoney,
    receiptUrl: payment.receiptUrl,
    cardDetails: payment.cardDetails
      ? {
          cardBrand: payment.cardDetails.card?.cardBrand,
          last4: payment.cardDetails.card?.last4,
          expMonth: payment.cardDetails.card?.expMonth,
          expYear: payment.cardDetails.card?.expYear,
        }
      : undefined,
  };
}

async function createPayment({
  sourceId,
  amountDollars,
  referenceId,
  idempotencyKey,
  autocomplete = false,
  verificationToken,
  customerId,
}) {
  const amountCents = dollarsToCents(amountDollars);
  const key = idempotencyKey || randomUUID();
  const creds = getSquareCredentials();

  const body = {
    source_id: sourceId,
    idempotency_key: key,
    amount_money: {
      amount: BigInt(amountCents),
      currency: "USD",
    },
    location_id: creds.locationId,
    reference_id: String(referenceId),
    autocomplete,
  };

  if (verificationToken) {
    body.verification_token = verificationToken;
  }
  if (customerId) {
    body.customer_id = customerId;
  }

  // Square HTTP API expects integer cents, not BigInt.
  body.amount_money.amount = amountCents;

  const response = await squareFetch("/v2/payments", "POST", body);
  const payment = response?.payment;
  if (!payment) {
    throw new ValidationError("Square did not return a payment");
  }

  return {
    payment,
    idempotencyKey: key,
    status: mapSquarePaymentStatus(payment),
    amountCents,
  };
}

async function capturePayment(squarePaymentId, amountDollars) {
  const body = {};

  if (amountDollars != null) {
    body.amount_money = {
      amount: dollarsToCents(amountDollars),
      currency: "USD",
    };
  }

  const response = await squareFetch(
    `/v2/payments/${encodeURIComponent(squarePaymentId)}/complete`,
    "POST",
    body
  );
  return response.payment;
}

async function cancelPayment(squarePaymentId) {
  const response = await squareFetch(
    `/v2/payments/${encodeURIComponent(squarePaymentId)}/cancel`,
    "POST",
    {}
  );
  return response.payment;
}

async function refundPayment(squarePaymentId, amountDollars, idempotencyKey) {
  const body = {
    idempotency_key: idempotencyKey || randomUUID(),
    payment_id: squarePaymentId,
    amount_money: {
      amount: dollarsToCents(amountDollars),
      currency: "USD",
    },
  };

  const response = await squareFetch("/v2/refunds", "POST", body);
  return response.refund;
}

async function recordPaymentTransaction({
  bookingType,
  bookingId,
  confirmationNumber,
  squarePaymentId,
  idempotencyKey,
  amountCents,
  status,
  rawResponse,
}) {
  return PaymentTransaction.create({
    bookingType,
    bookingId,
    confirmationNumber,
    squarePaymentId,
    idempotencyKey,
    amountCents,
    currency: "USD",
    status,
    rawResponse: sanitizePaymentResponse(rawResponse),
  });
}

async function findLatestTransaction(bookingType, bookingId) {
  const ledgerType = normalizePaymentBookingType(bookingType) || bookingType;
  return PaymentTransaction.findOne({
    where: { bookingType: ledgerType, bookingId },
    order: [["createdAt", "DESC"]],
  });
}

async function updateTransactionStatus(squarePaymentId, status, rawResponse) {
  const row = await PaymentTransaction.findOne({
    where: { squarePaymentId },
  });
  if (!row) return null;
  await row.update({
    status,
    rawResponse: sanitizePaymentResponse(rawResponse) || row.rawResponse,
  });
  return row;
}

/**
 * Create (or reuse) a Square Customer for a logged-in ODA user.
 * @returns {Promise<string>} Square customer id (e.g. "VDKXEEKPJN48QDG3BGGFAK05P8")
 */
async function createSquareCustomer({
  emailAddress,
  givenName,
  familyName,
  phoneNumber,
  referenceId,
}) {
  const idempotencyKey = randomUUID();

  const response = await squareFetch("/v2/customers", "POST", {
    idempotency_key: idempotencyKey,
    email_address: emailAddress,
    given_name: givenName,
    family_name: familyName,
    phone_number: phoneNumber,
    reference_id: referenceId ? String(referenceId) : undefined,
  });

  const customer = response?.customer;
  if (!customer?.id) {
    throw new ValidationError("Square did not return a customer id");
  }
  return customer.id;
}

/**
 * Resolve Square customer id for a card on file (ccof:...).
 */
async function getCustomerIdForCard(cardId) {
  if (!cardId || !String(cardId).startsWith("ccof:")) {
    throw new ValidationError("Invalid Square card on file id");
  }

  const response = await squareFetch(
    `/v2/cards/${encodeURIComponent(cardId)}`,
    "GET"
  );
  const customerId = response?.card?.customer_id;
  if (!customerId) {
    throw new ValidationError(
      "Could not resolve Square customer for this saved card"
    );
  }
  return customerId;
}

/**
 * Save a card on file for a Square customer (after Web/Mobile SDK tokenize).
 * @returns {{ squareCardId, cardBrand, last4, expMonth, expYear }}
 */
async function createCardOnFile({
  customerId,
  sourceId,
  cardholderName,
  postalCode,
  referenceId,
}) {
  const idempotencyKey = randomUUID();

  const response = await squareFetch("/v2/cards", "POST", {
    idempotency_key: idempotencyKey,
    source_id: sourceId,
    card: {
      customer_id: customerId,
      cardholder_name: cardholderName,
      reference_id: referenceId ? String(referenceId) : undefined,
      billing_address: postalCode
        ? { postal_code: postalCode, country: "US" }
        : undefined,
    },
  });

  const card = response?.card;
  if (!card?.id) {
    throw new ValidationError("Square did not return a card id");
  }

  return {
    squareCardId: card.id,
    cardBrand: card.cardBrand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
  };
}

module.exports = {
  createPayment,
  capturePayment,
  cancelPayment,
  refundPayment,
  recordPaymentTransaction,
  findLatestTransaction,
  updateTransactionStatus,
  createSquareCustomer,
  createCardOnFile,
  getCustomerIdForCard,
  mapSquarePaymentStatus,
  sanitizePaymentResponse,
};
