const { Op } = require("sequelize");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const {
  createSquareCustomer,
  createCardOnFile,
  getPayment,
} = require("./squarePaymentService.js");

function asString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function formatExpirationDate(expMonth, expYear) {
  if (expMonth == null || expYear == null) return null;
  const mm = String(expMonth).padStart(2, "0");
  const yy = String(expYear).slice(-2);
  return `${mm}/${yy}`;
}

/**
 * Normalize card metadata from a Square Payment API object (camelCase or snake_case).
 */
function extractCardMetaFromPayment(payment) {
  const details = payment?.cardDetails || payment?.card_details;
  const card = details?.card;
  if (!card) return null;

  return {
    cardBrand: card.cardBrand || card.card_brand || null,
    last4: card.last4 || card.last_4 || null,
    expMonth: card.expMonth ?? card.exp_month ?? null,
    expYear: card.expYear ?? card.exp_year ?? null,
    cardholderName: card.cardholderName || card.cardholder_name || null,
    billingPostalCode:
      card.billingAddress?.postalCode ||
      card.billing_address?.postal_code ||
      null,
    fingerprint: card.fingerprint || null,
    squareCardId: card.id && String(card.id).startsWith("ccof:") ? card.id : null,
  };
}

async function findExistingSquareCardRow({
  userId,
  squareCardId,
  last4,
  expMonth,
  expYear,
}) {
  if (squareCardId) {
    const bySquareId = await PaymentDetail.findOne({ where: { squareCardId } });
    if (bySquareId) return bySquareId;
  }

  if (userId && last4 && expMonth != null && expYear != null) {
    return PaymentDetail.findOne({
      where: { userId, last4, expMonth, expYear },
      order: [["updatedAt", "DESC"]],
    });
  }

  return null;
}

async function ensureSquareCustomerForUser(userId, hints = {}) {
  if (!userId) return null;

  const existingWithCustomer = await PaymentDetail.findOne({
    where: { userId, squareCustomerId: { [Op.ne]: null } },
    order: [["updatedAt", "DESC"]],
  });
  if (existingWithCustomer?.squareCustomerId) {
    return existingWithCustomer.squareCustomerId;
  }

  const ownerName =
    hints.cardOwnerName || hints.passengerFullName || "Cardholder";
  const nameParts = String(ownerName).trim().split(/\s+/);

  return createSquareCustomer({
    emailAddress:
      hints.email ||
      hints.passengerEmail ||
      `user${userId}@guest.odatransportation.local`,
    givenName: nameParts[0] || "Cardholder",
    familyName: nameParts.slice(1).join(" ") || "User",
    referenceId: userId,
  });
}

function buildCardOwnerName(meta, cardHints, existingPaymentDetail) {
  return (
    cardHints.cardOwnerName ||
    meta?.cardholderName ||
    cardHints.passengerFullName ||
    existingPaymentDetail?.cardOwnerName ||
    "Cardholder"
  );
}

function buildZipCode(meta, cardHints, existingPaymentDetail) {
  return (
    cardHints.zipCode ||
    meta?.billingPostalCode ||
    existingPaymentDetail?.zipCode ||
    "00000"
  );
}

/**
 * After any successful Square payment, persist card-on-file metadata locally so
 * admin take-payment can charge again if the authorization is later canceled.
 *
 * Uses payment.id as source_id for Create Card when the original charge was a nonce.
 */
async function persistSquareCardFromPayment({
  payment,
  userId,
  existingPaymentDetail = null,
  cardHints = {},
}) {
  if (!payment?.id) return existingPaymentDetail;

  const meta = extractCardMetaFromPayment(payment);
  if (!meta && !existingPaymentDetail?.squareCardId) {
    return existingPaymentDetail;
  }

  let squareCustomerId =
    existingPaymentDetail?.squareCustomerId ||
    payment.customer_id ||
    payment.customerId ||
    null;

  if (!squareCustomerId && userId) {
    squareCustomerId = await ensureSquareCustomerForUser(userId, cardHints);
  }

  let squareCardId =
    existingPaymentDetail?.squareCardId || meta?.squareCardId || null;

  if (!String(squareCardId || "").startsWith("ccof:") && squareCustomerId) {
    try {
      const card = await createCardOnFile({
        customerId: squareCustomerId,
        sourceId: payment.id,
        cardholderName: buildCardOwnerName(meta, cardHints, existingPaymentDetail),
        postalCode: buildZipCode(meta, cardHints, existingPaymentDetail),
        referenceId: userId,
      });
      squareCardId = card.squareCardId;
      meta.cardBrand = meta.cardBrand || card.cardBrand;
      meta.last4 = meta.last4 || card.last4;
      meta.expMonth = meta.expMonth ?? card.expMonth;
      meta.expYear = meta.expYear ?? card.expYear;
    } catch (err) {
      console.warn(
        `[squareCardPersistence] Could not create card on file from payment ${payment.id}: ${err.message}`
      );
    }
  }

  const payload = {
    squareCustomerId,
    squareCardId: squareCardId || existingPaymentDetail?.squareCardId || null,
    cardBrand: meta?.cardBrand || existingPaymentDetail?.cardBrand || null,
    last4: meta?.last4 || existingPaymentDetail?.last4 || null,
    expMonth: meta?.expMonth ?? existingPaymentDetail?.expMonth ?? null,
    expYear: meta?.expYear ?? existingPaymentDetail?.expYear ?? null,
    expirationDate:
      formatExpirationDate(
        meta?.expMonth ?? existingPaymentDetail?.expMonth,
        meta?.expYear ?? existingPaymentDetail?.expYear
      ) || existingPaymentDetail?.expirationDate,
    cardOwnerName: buildCardOwnerName(meta, cardHints, existingPaymentDetail),
    zipCode: buildZipCode(meta, cardHints, existingPaymentDetail),
    creditCardNumber: null,
    securityCode: null,
  };

  if (existingPaymentDetail?.paymentDetailId) {
    await existingPaymentDetail.update(payload);
    return existingPaymentDetail;
  }

  const matched = await findExistingSquareCardRow({
    userId,
    squareCardId: payload.squareCardId,
    last4: payload.last4,
    expMonth: payload.expMonth,
    expYear: payload.expYear,
  });
  if (matched) {
    await matched.update(payload);
    return matched;
  }

  if (!userId && !payload.squareCardId) {
    return existingPaymentDetail;
  }

  return PaymentDetail.create({
    userId: userId || null,
    isPrimary: false,
    ...payload,
  });
}

/**
 * Rebuild a chargeable PaymentDetail from a ledger row (e.g. canceled authorization).
 */
async function recoverPaymentDetailFromTransaction(tx, { userId, cardHints } = {}) {
  if (!tx?.squarePaymentId) return null;

  let payment = tx.rawResponse;
  if (!payment?.cardDetails && !payment?.card_details) {
    try {
      payment = await getPayment(tx.squarePaymentId);
    } catch (err) {
      console.warn(
        `[squareCardPersistence] Could not fetch payment ${tx.squarePaymentId}: ${err.message}`
      );
      payment = tx.rawResponse;
    }
  }

  if (!payment?.id) return null;

  const meta = extractCardMetaFromPayment(payment);
  const existing = await findExistingSquareCardRow({
    userId,
    squareCardId: meta?.squareCardId,
    last4: meta?.last4,
    expMonth: meta?.expMonth,
    expYear: meta?.expYear,
  });

  return persistSquareCardFromPayment({
    payment,
    userId,
    existingPaymentDetail: existing,
    cardHints,
  });
}

function isCanceledSquarePaymentError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("canceled") || msg.includes("cancelled");
}

module.exports = {
  extractCardMetaFromPayment,
  ensureSquareCustomerForUser,
  persistSquareCardFromPayment,
  recoverPaymentDetailFromTransaction,
  isCanceledSquarePaymentError,
};
