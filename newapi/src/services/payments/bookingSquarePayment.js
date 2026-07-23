const { randomUUID } = require("crypto");
const { ValidationError } = require("../../errors/CustomErrors.js");
const {
  isLegacyPaymentProvider,
  isSquarePaymentProvider,
  allowRawPanWithSquare,
  shouldAuthorizeAtBooking,
  shouldChargeImmediately,
} = require("../../config/paymentConfig.js");
const {
  createPaymentDetail,
  getPrimaryCard,
  getFromExistingCards,
  resolveSquareCustomerId,
  getPaymentDetailById,
} = require("../paymentDetailService.js");
const squarePaymentService = require("./squarePaymentService.js");
const {
  ensureSquareCustomerForUser,
  persistSquareCardFromPayment,
  recoverPaymentDetailFromTransaction,
  isCanceledSquarePaymentError,
} = require("./squareCardPersistence.js");
const { emitPaymentTransactionUpdated } = require("../../realtime/socket.js");
const { normalizePaymentBookingType } = require("../../utils/paymentBookingType.js");
const { parsePaymentAmountDollars, roundMoney } = require("../../utils/bookingFareCalculator.js");
const { dollarsToCents } = require("../../config/square.js");
const {
  calculateP2PTotalTripPrice,
  calculateHourlyCharterTotalTripPrice,
  calculateAirportBookingTotalTripPrice,
} = require("../utilTripService.js");

const SQUARE_METHODS = new Set([
  "SQUARE_NEW_CARD",
  "SQUARE_SAVED_CARD",
]);

function isSquareCardOnFile(sourceId) {
  return typeof sourceId === "string" && sourceId.startsWith("ccof:");
}

async function resolveCaptureAmountDollars(
  booking,
  bookingType,
  captureAmountDollars,
  existingTx
) {
  let amount = parsePaymentAmountDollars(
    captureAmountDollars ?? booking.totalTripFeeInDollars
  );

  if (!amount) {
    const ledgerType = normalizePaymentBookingType(bookingType) || bookingType;
    try {
      if (booking.pointToPointBookId || ledgerType === "P2P") {
        amount = await calculateP2PTotalTripPrice(booking);
      } else if (booking.airportBookId || ledgerType === "AIRPORT") {
        amount = await calculateAirportBookingTotalTripPrice(booking);
      } else {
        amount = await calculateHourlyCharterTotalTripPrice(booking);
      }
      amount = parsePaymentAmountDollars(amount);
    } catch {
      amount = null;
    }
  }

  if (!amount && existingTx?.amountCents > 0) {
    amount = parsePaymentAmountDollars(existingTx.amountCents / 100);
  }

  if (!amount) {
    throw new ValidationError("Invalid payment amount for this booking.");
  }

  // Capture cannot exceed the authorized hold (Square uses integer cents).
  if (existingTx?.status === "AUTHORIZED" && existingTx.amountCents > 0) {
    const authorizedDollars = roundMoney(existingTx.amountCents / 100);
    if (amount > authorizedDollars) {
      amount = authorizedDollars;
    }
  }

  return amount;
}

function assertNoLegacyPan(paymentMethod, cardDetails) {
  if (
    isSquarePaymentProvider() &&
    paymentMethod === "NEW_CARD" &&
    cardDetails
  ) {
    if (allowRawPanWithSquare()) {
      return;
    }

    throw new ValidationError([
      "Raw card details are not accepted when Square payments are enabled.",
      'Use Square In-App Payments (iOS/Android) or Web Payments SDK to tokenize and send:',
      '- paymentMethod: "SQUARE_NEW_CARD"',
      "- square.sourceId: <token/nonce from Square SDK>",
      "- square.verificationToken: <optional (SCA/buyer verification)>",
      "",
      'If you must keep legacy clients temporarily, set ALLOW_RAW_PAN_WITH_SQUARE=true (NOT for production).',
    ].join("\n"));
  }
}

async function resolveSquareSourceId({
  paymentMethod,
  square,
  squareCardId,
  paymentDetailId,
  userId,
}) {
  if (paymentMethod === "SQUARE_NEW_CARD") {
    if (!square?.sourceId) {
      throw new ValidationError("square.sourceId is required");
    }
    return {
      sourceId: square.sourceId,
      verificationToken: square.verificationToken,
      paymentDetail: null,
    };
  }

  if (
    paymentMethod === "SQUARE_SAVED_CARD" ||
    paymentMethod === "EXISTING_CARD" ||
    paymentMethod === "PRIMARY_CARD"
  ) {
    let cardRow = null;
    if (paymentMethod === "PRIMARY_CARD") {
      cardRow = await getPrimaryCard(userId);
    } else if (paymentDetailId) {
      cardRow = await getFromExistingCards(paymentDetailId, userId);
    }

    const onFileId =
      squareCardId ||
      (paymentMethod === "SQUARE_SAVED_CARD" ? squareCardId : null) ||
      cardRow?.squareCardId;

    if (!onFileId) {
      throw new ValidationError(
        "Saved card is not linked to Square. Add the card again using Square."
      );
    }

    return {
      sourceId: onFileId,
      verificationToken: square?.verificationToken,
      paymentDetail: cardRow,
    };
  }

  throw new ValidationError("Invalid payment method for Square");
}

async function resolveLegacyPaymentDetail({
  paymentMethod,
  paymentDetailId,
  userId,
  isGuestBooking,
  cardDetails,
}) {
  switch (paymentMethod) {
    case "PRIMARY_CARD":
      return getPrimaryCard(userId);
    case "EXISTING_CARD":
      if (!paymentDetailId) {
        throw new ValidationError(
          "Payment detail ID is required for existing card"
        );
      }
      return getFromExistingCards(paymentDetailId, userId);
    case "NEW_CARD": {
      if (!cardDetails) {
        throw new ValidationError("Card details are required for new card payment");
      }
      return createPaymentDetail({
        ...cardDetails,
        userId: isGuestBooking ? null : userId,
      });
    }
    default:
      throw new ValidationError("Invalid payment method");
  }
}

/**
 * Process payment after booking total is known.
 * @returns {{ paymentDetail, paymentStatus, transaction }}
 */
async function processBookingPayment({
  bookingType,
  bookingId,
  confirmationNumber,
  amountDollars,
  paymentMethod,
  square,
  squareCardId,
  paymentDetailId,
  userId,
  isGuestBooking,
  cardDetails,
}) {
  assertNoLegacyPan(paymentMethod, cardDetails);

  if (isLegacyPaymentProvider()) {
    const paymentDetail = await resolveLegacyPaymentDetail({
      paymentMethod,
      paymentDetailId,
      userId,
      isGuestBooking,
      cardDetails,
    });
    return {
      paymentDetail,
      paymentStatus: "NOT_PAID",
      transaction: null,
    };
  }

  // Compatibility mode: allow older clients to submit NEW_CARD + cardDetails
  // without breaking booking creation. This will NOT charge with Square.
  if (
    isSquarePaymentProvider() &&
    paymentMethod === "NEW_CARD" &&
    cardDetails &&
    allowRawPanWithSquare()
  ) {
    const paymentDetail = await resolveLegacyPaymentDetail({
      paymentMethod,
      paymentDetailId,
      userId,
      isGuestBooking,
      cardDetails,
    });
    return {
      paymentDetail,
      paymentStatus: "AWAITING_PAYMENT",
      transaction: null,
    };
  }

  const allowedSquare = new Set([
    "SQUARE_NEW_CARD",
    "SQUARE_SAVED_CARD",
    "PRIMARY_CARD",
    "EXISTING_CARD",
  ]);
  if (!allowedSquare.has(paymentMethod)) {
    throw new ValidationError(
      `Invalid payment method "${paymentMethod}" for Square payments`
    );
  }

  const parsedAmount = parsePaymentAmountDollars(amountDollars);
  if (!parsedAmount) {
    throw new ValidationError("Invalid payment amount for this booking.");
  }

  const { sourceId, verificationToken, paymentDetail } =
    await resolveSquareSourceId({
      paymentMethod,
      square,
      squareCardId,
      paymentDetailId,
      userId,
    });

  let customerId = null;
  if (isSquareCardOnFile(sourceId)) {
    customerId = await resolveSquareCustomerId({
      userId,
      paymentDetail,
      squareCardId: sourceId,
    });
  } else if (userId) {
    customerId = await ensureSquareCustomerForUser(userId, {
      cardOwnerName: cardDetails?.cardOwnerName,
      zipCode: cardDetails?.zipCode,
      email: cardDetails?.email,
    });
  }

  return chargeWithSquare({
    bookingType,
    bookingId,
    confirmationNumber,
    amountDollars: parsedAmount,
    sourceId,
    verificationToken,
    paymentDetail,
    customerId,
    userId,
    cardHints: {
      cardOwnerName: cardDetails?.cardOwnerName,
      zipCode: cardDetails?.zipCode,
      email: cardDetails?.email,
    },
  });
}

async function chargeWithSquare({
  bookingType,
  bookingId,
  confirmationNumber,
  amountDollars,
  sourceId,
  verificationToken,
  paymentDetail,
  customerId,
  userId,
  cardHints = {},
  forceImmediateCapture = false,
}) {
  const parsedAmount = parsePaymentAmountDollars(amountDollars);
  if (!parsedAmount) {
    throw new ValidationError("Invalid payment amount for this booking.");
  }

  const autocomplete = forceImmediateCapture || shouldChargeImmediately();
  // Keep within DB column (STRING(64)) and Square max (<= 45 typical, but varies by API).
  // UUID is sufficient uniqueness for payment creation.
  const idempotencyKey = randomUUID();

  if (isSquareCardOnFile(sourceId) && !customerId) {
    throw new ValidationError(
      "Square customer_id is required for saved cards. Re-add the card in Payment Methods."
    );
  }

  const { payment, status, amountCents, idempotencyKey: key } =
    await squarePaymentService.createPayment({
      sourceId,
      amountDollars: parsedAmount,
      referenceId: confirmationNumber,
      idempotencyKey,
      autocomplete,
      verificationToken,
      customerId: customerId || undefined,
    });

  const transaction = await squarePaymentService.recordPaymentTransaction({
    bookingType,
    bookingId,
    confirmationNumber,
    squarePaymentId: payment.id,
    idempotencyKey: key,
    amountCents,
    status,
    rawResponse: payment,
  });
  emitPaymentTransactionUpdated(transaction);

  let paymentStatus = "AWAITING_PAYMENT";
  if (status === "COMPLETED") {
    paymentStatus = "PAID";
  } else if (status === "AUTHORIZED") {
    paymentStatus = shouldAuthorizeAtBooking() ? "AUTHORIZED" : "AWAITING_PAYMENT";
  } else if (status === "FAILED") {
    throw new ValidationError("Card payment was declined. Please try another card.");
  }

  let resolvedPaymentDetail = paymentDetail;
  try {
    resolvedPaymentDetail = await persistSquareCardFromPayment({
      payment,
      userId: userId ?? paymentDetail?.userId ?? null,
      existingPaymentDetail: paymentDetail,
      cardHints,
    });
  } catch (err) {
    console.warn(
      `[bookingSquarePayment] Card persistence after payment failed: ${err.message}`
    );
  }

  return {
    paymentDetail: resolvedPaymentDetail,
    paymentStatus,
    transaction,
  };
}

async function reconcilePaymentOnBookingUpdate({
  bookingType,
  bookingId,
  confirmationNumber,
  newAmountDollars,
  paymentMethod,
  square,
  squareCardId,
  paymentDetailId,
  userId,
}) {
  const existing = await squarePaymentService.findLatestTransaction(
    bookingType,
    bookingId
  );

  if (!existing?.squarePaymentId) {
    return null;
  }

  try {
    if (existing.status === "AUTHORIZED") {
      await squarePaymentService.cancelPayment(existing.squarePaymentId);
      await existing.update({ status: "CANCELED" });
    } else if (existing.status === "COMPLETED") {
      await squarePaymentService.refundPayment(
        existing.squarePaymentId,
        existing.amountCents / 100,
        `${confirmationNumber}-refund-${randomUUID()}`
      );
      await existing.update({ status: "REFUNDED" });
    }
  } catch (err) {
    throw new ValidationError(
      `Could not adjust previous payment: ${err.message}`
    );
  }

  if (!isSquarePaymentProvider()) {
    return null;
  }

  return processBookingPayment({
    bookingType,
    bookingId,
    confirmationNumber,
    amountDollars: newAmountDollars,
    paymentMethod: paymentMethod || "SQUARE_SAVED_CARD",
    square,
    squareCardId,
    paymentDetailId,
    userId,
    isGuestBooking: false,
  });
}

async function handleAdminBookingPayment({
  booking,
  bookingType,
  action,
  captureAmountDollars,
}) {
  const ledgerBookingType = normalizePaymentBookingType(bookingType) || bookingType;
  const bookingId =
    booking.airportBookId ||
    booking.pointToPointBookId ||
    booking.hourlyCharterBookId;

  const tx = await squarePaymentService.findLatestTransaction(
    ledgerBookingType,
    bookingId
  );

  if (!tx?.squarePaymentId) {
    return booking;
  }

  if (action === "ACCEPTED" || action === "ACCEPT") {
    // Accept booking only — capture happens on admin take-payment, not here.
    if (tx.status === "COMPLETED") {
      booking.paymentStatus = "PAID";
    } else if (tx.status === "AUTHORIZED") {
      booking.paymentStatus = "AUTHORIZED";
    }
  } else if (
    action === "REJECTED" ||
    action === "REJECT" ||
    action === "CANCELLED" ||
    action === "CANCEL"
  ) {
    if (tx.status === "AUTHORIZED") {
      await squarePaymentService.cancelPayment(tx.squarePaymentId);
      await tx.update({ status: "CANCELED" });
    } else if (tx.status === "COMPLETED") {
      await squarePaymentService.refundPayment(
        tx.squarePaymentId,
        tx.amountCents / 100,
        `${booking.confirmationNumber}-reject-${randomUUID()}`
      );
      await tx.update({ status: "REFUNDED" });
    }
    booking.paymentStatus = "CANCELLED";
  }

  await booking.save();
  return booking;
}

function bookingCardHints(booking) {
  return {
    cardOwnerName: booking.cardOwnerName || booking.passengerFullName,
    zipCode: booking.zipCode,
    email: booking.passengerEmail,
    passengerFullName: booking.passengerFullName,
    passengerEmail: booking.passengerEmail,
  };
}

async function ensureBookingPaymentDetail(booking, tx) {
  if (booking.paymentDetailId) {
    try {
      if (booking.userId) {
        return await getFromExistingCards(
          booking.paymentDetailId,
          booking.userId
        );
      }
      return await getPaymentDetailById(booking.paymentDetailId);
    } catch {
      // stale link — recover below
    }
  }

  if (!tx) return null;

  const recovered = await recoverPaymentDetailFromTransaction(tx, {
    userId: booking.userId,
    cardHints: bookingCardHints(booking),
  });

  if (recovered) {
    await booking.setPaymentDetail(recovered);
    booking.paymentDetailId = recovered.paymentDetailId;
  }

  return recovered;
}

async function chargeSavedCardForBooking({
  booking,
  ledgerBookingType,
  bookingId,
  amount,
  tx,
}) {
  const paymentDetail = await ensureBookingPaymentDetail(booking, tx);

  const paymentMethod = booking.paymentMethod || "EXISTING_CARD";
  const allowed = new Set([
    "SQUARE_SAVED_CARD",
    "PRIMARY_CARD",
    "EXISTING_CARD",
  ]);
  if (!allowed.has(paymentMethod)) {
    throw new ValidationError(
      "No authorized payment to capture. Customer must pay with a saved card or re-book with Square."
    );
  }

  const { sourceId, verificationToken, paymentDetail: resolvedDetail } =
    await resolveSquareSourceId({
      paymentMethod,
      square: null,
      squareCardId: paymentDetail?.squareCardId || null,
      paymentDetailId: booking.paymentDetailId || paymentDetail?.paymentDetailId,
      userId: booking.userId,
    });

  let customerId = null;
  if (isSquareCardOnFile(sourceId)) {
    customerId = await resolveSquareCustomerId({
      userId: booking.userId,
      paymentDetail: resolvedDetail || paymentDetail,
      squareCardId: sourceId,
    });
  }

  const result = await chargeWithSquare({
    bookingType: ledgerBookingType,
    bookingId,
    confirmationNumber: booking.confirmationNumber,
    amountDollars: amount,
    sourceId,
    verificationToken,
    paymentDetail: resolvedDetail || paymentDetail,
    customerId,
    userId: booking.userId,
    cardHints: bookingCardHints(booking),
    forceImmediateCapture: true,
  });

  if (result.paymentDetail) {
    await booking.setPaymentDetail(result.paymentDetail);
  }
  booking.paymentStatus =
    result.paymentStatus === "PAID" ? "PAID" : result.paymentStatus;
  await booking.save();
  return booking;
}

/**
 * Admin "take payment" — capture an existing authorization or charge saved card.
 * Called from POST /api/v1/admin/bookings/update-payment-status
 */
async function handleAdminTakePayment({
  booking,
  bookingType,
  captureAmountDollars,
}) {
  const ledgerBookingType = normalizePaymentBookingType(bookingType) || bookingType;
  const bookingId =
    booking.airportBookId ||
    booking.pointToPointBookId ||
    booking.hourlyCharterBookId;

  if (booking.paymentStatus === "PAID") {
    return booking;
  }

  const lockedStatuses = new Set(["REJECTED", "CANCELLED"]);
  if (lockedStatuses.has(booking.bookingStatus)) {
    throw new ValidationError(
      "Cannot take payment on a rejected or cancelled booking."
    );
  }

  if (!isSquarePaymentProvider()) {
    booking.paymentStatus = "PAID";
    await booking.save();
    return booking;
  }

  const tx = await squarePaymentService.findLatestTransaction(
    ledgerBookingType,
    bookingId
  );

  const amount = await resolveCaptureAmountDollars(
    booking,
    bookingType,
    captureAmountDollars,
    tx
  );

  if (tx?.squarePaymentId && tx.status === "COMPLETED") {
    booking.paymentStatus = "PAID";
    await booking.save();
    return booking;
  }

  if (tx?.squarePaymentId && tx.status === "AUTHORIZED") {
    try {
      const payment = await squarePaymentService.capturePayment(
        tx.squarePaymentId,
        amount
      );
      await tx.update({
        status: "COMPLETED",
        amountCents: dollarsToCents(amount),
        rawResponse: squarePaymentService.sanitizePaymentResponse(payment),
      });
      emitPaymentTransactionUpdated(tx);
      try {
        await persistSquareCardFromPayment({
          payment,
          userId: booking.userId,
          existingPaymentDetail: booking.paymentDetailId
            ? await getFromExistingCards(
                booking.paymentDetailId,
                booking.userId
              ).catch(() => null)
            : null,
          cardHints: bookingCardHints(booking),
        });
      } catch (err) {
        console.warn(
          `[handleAdminTakePayment] Card persistence after capture failed: ${err.message}`
        );
      }
      booking.paymentStatus = "PAID";
      await booking.save();
      return booking;
    } catch (err) {
      if (!isCanceledSquarePaymentError(err)) {
        throw err;
      }
      await tx.update({ status: "CANCELED" });
      emitPaymentTransactionUpdated(tx);
    }
  }

  return chargeSavedCardForBooking({
    booking,
    ledgerBookingType,
    bookingId,
    amount,
    tx,
  });
}

module.exports = {
  assertNoLegacyPan,
  processBookingPayment,
  reconcilePaymentOnBookingUpdate,
  handleAdminBookingPayment,
  handleAdminTakePayment,
  resolveLegacyPaymentDetail,
};
