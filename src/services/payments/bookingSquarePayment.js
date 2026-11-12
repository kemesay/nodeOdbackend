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
  hasUsableSavedSquareCard,
} = require("../paymentDetailService.js");
const squarePaymentService = require("./squarePaymentService.js");
const {
  ensureSquareCustomerForUser,
  persistSquareCardFromPayment,
  persistSquareCardFromNonce,
  recoverPaymentDetailFromTransaction,
  isCanceledSquarePaymentError,
  SquareNonceConsumedError,
} = require("./squareCardPersistence.js");
const { emitPaymentTransactionUpdated } = require("../../realtime/socket.js");
const { normalizePaymentBookingType } = require("../../utils/paymentBookingType.js");
const { reverseWalletCreditForReferredBooking } = require("../walletService.js");
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

  // Deliberately NOT capped to the authorized hold here — the booking's
  // current total in the database is the source of truth at charge time
  // (it may have gone up or down since the original authorization). The
  // caller (handleAdminTakePayment) is responsible for reconciling either
  // direction against the existing hold: capture-and-refund-the-difference
  // when the current total is lower, or release-and-recharge when it's
  // higher — Square can never capture more than the original hold.
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
  cardDetails,
}) {
  if (paymentMethod === "SQUARE_NEW_CARD") {
    if (!square?.sourceId) {
      throw new ValidationError("square.sourceId is required");
    }

    // Save-then-charge instead of charge-then-best-effort-save: for a
    // signed-in customer, save this freshly-tokenized card as a card on file
    // FIRST, then charge the resulting ccof: id — Square's own recommended
    // order for "charge now, keep the card for later." This guarantees a
    // real saved card exists before the FIRST authorization is even
    // attempted, so the payment-hold renewal job and the recharge fallback
    // both have something real to work with from the start, instead of
    // depending on an after-the-fact best-effort save. Guests have no
    // account to attach a saved card to, so this only applies when userId is
    // present; a guest's new-card charge is unchanged.
    if (userId) {
      let saved;
      try {
        saved = await persistSquareCardFromNonce({
          userId,
          sourceId: square.sourceId,
          cardHints: {
            cardOwnerName: cardDetails?.cardOwnerName,
            zipCode: cardDetails?.zipCode,
            email: cardDetails?.email,
          },
        });
      } catch (err) {
        if (err instanceof SquareNonceConsumedError) {
          // The nonce was already submitted to Square while trying to save
          // this card and can never be charged now, win or lose — Square
          // consumes it on first submission regardless of outcome. Falling
          // back to charging square.sourceId here would just guarantee a
          // second, doomed call (Square's CARD_TOKEN_USED). The client must
          // re-tokenize the card (request a fresh nonce) and retry.
          //
          // Square does not block re-saving a card that's already on file
          // (duplicates are allowed), so this is NOT caused by the customer
          // re-adding a card they already have saved — it's a genuine
          // decline/error on Square's card-verification step, which can be
          // stricter than a real purchase. If they already have a working
          // saved/primary card, point them at it instead of just asking for
          // another round of re-entering details.
          const alreadyHasSavedCard = await hasUsableSavedSquareCard(userId).catch(
            () => false
          );
          throw new ValidationError(
            alreadyHasSavedCard
              ? "We couldn't verify this card with Square right now. If you've already saved a card, choose your saved or primary card instead — or re-enter the new card's details to try again."
              : "We couldn't save this card with Square — it may have been declined or the card session expired. Please re-enter your card details and try again."
          );
        }
        throw err;
      }
      if (saved?.squareCardId) {
        return {
          sourceId: saved.squareCardId,
          verificationToken: square.verificationToken,
          paymentDetail: saved,
        };
      }
    }

    // Fallback — guest booking, or we couldn't even resolve/create a Square
    // customer record for this user (rare; logged inside
    // persistSquareCardFromNonce). Either way the nonce was never submitted
    // to Square, so it's still safe to charge directly here.
    // persistSquareCardFromPayment still gets a second, after-the-fact
    // chance to save the card once the charge completes.
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
      cardDetails,
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
  booking = null,
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

  // The card to charge here is whatever the update ACTUALLY supplied, not
  // necessarily the booking's original `paymentMethod` — a customer
  // switching from a saved card to a fresh one (or vice versa) sends the new
  // card's fields, and trusting the stored method would ignore them (e.g.
  // demanding square.sourceId on a booking that was originally
  // SQUARE_SAVED_CARD, even though the customer just supplied a brand-new
  // squareCardId, or the reverse).
  let effectivePaymentMethod;
  let resolvedSquareCardId = squareCardId;
  let resolvedPaymentDetailId = paymentDetailId;

  if (square?.sourceId) {
    effectivePaymentMethod = "SQUARE_NEW_CARD";
  } else if (squareCardId) {
    effectivePaymentMethod = "SQUARE_SAVED_CARD";
  } else {
    // Neither a fresh nonce nor an explicit saved-card id came in with this
    // update — e.g. the customer only edited trip details and the fare
    // moved as a side effect, with no intent to touch payment at all. The
    // OLD code trusted the booking's stale, original `paymentMethod` label
    // here, which is "SQUARE_NEW_CARD" for the overwhelming majority of
    // bookings (that's the default at creation and is almost never
    // promoted afterward) — a one-time nonce that's already been spent and
    // can never be reused, so this unconditionally threw the generic
    // "square.sourceId is required" even when a perfectly good saved card
    // was available. Same fix already proven in chargeSavedCardForBooking:
    // check whether a REAL, resolvable Square card-on-file exists for this
    // booking/customer before giving up.
    const resolvedDetail = booking
      ? await ensureBookingPaymentDetail(booking, existing)
      : null;
    if (resolvedDetail?.squareCardId) {
      effectivePaymentMethod = "SQUARE_SAVED_CARD";
      resolvedSquareCardId = resolvedDetail.squareCardId;
      resolvedPaymentDetailId = resolvedDetail.paymentDetailId;
    } else {
      throw new ValidationError(
        "This booking's new total needs a card to charge, and there's no " +
          "saved card on file to use automatically. Please enter a new " +
          "card (or choose a saved one) to confirm this change."
      );
    }
  }

  const result = await processBookingPayment({
    bookingType,
    bookingId,
    confirmationNumber,
    amountDollars: newAmountDollars,
    paymentMethod: effectivePaymentMethod,
    square,
    squareCardId: resolvedSquareCardId,
    paymentDetailId: resolvedPaymentDetailId,
    userId,
    isGuestBooking: false,
  });

  return { ...result, paymentMethod: effectivePaymentMethod };
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

    // If this booking was the triggering ride for an already-credited
    // referral reward (i.e. it had completed and paid before now), claw back
    // whatever's left unspent of the referrer's wallet credit lot. A no-op
    // when this booking never credited anyone, or when the lot's already
    // been fully spent — see walletService.reverseWalletCreditForReferredBooking.
    await reverseWalletCreditForReferredBooking({
      bookingType: ledgerBookingType,
      bookingId,
    });
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

  // A booking's original paymentMethod (e.g. SQUARE_NEW_CARD) only records
  // how it was FIRST paid — it's never promoted afterward even when a real,
  // chargeable card-on-file was later saved (see persistSquareCardFromPayment,
  // which best-effort converts a one-time new-card charge into a saved card
  // for signed-in users, and ensureBookingPaymentDetail/
  // recoverPaymentDetailFromTransaction above, which can recover one from the
  // original transaction even now). Gating on that stale label instead of on
  // whether a real Square card-on-file actually exists wrongly blocked
  // recharging for exactly this common case — the majority of bookings
  // default to SQUARE_NEW_CARD, so this was failing "most of the time" even
  // when a perfectly chargeable saved card was sitting right there.
  const hasResolvableSquareCard = Boolean(paymentDetail?.squareCardId);
  const legacyMethod = booking.paymentMethod || "EXISTING_CARD";
  const allowedLegacy = new Set([
    "SQUARE_SAVED_CARD",
    "PRIMARY_CARD",
    "EXISTING_CARD",
  ]);
  if (!hasResolvableSquareCard && !allowedLegacy.has(legacyMethod)) {
    throw new ValidationError(
      "This booking's original card authorization is no longer valid " +
        "(it most likely expired before the payment was captured), and no " +
        "saved card is on file to recharge automatically. Ask the customer " +
        "to add a payment method from their account and try again, or " +
        "cancel this booking and have them re-book."
    );
  }
  const paymentMethod = hasResolvableSquareCard
    ? "SQUARE_SAVED_CARD"
    : legacyMethod;

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
  // Back-fills the stale paymentMethod label now that a real saved card is
  // confirmed to exist for this booking — prevents this exact mismatch
  // (label says SQUARE_NEW_CARD, a genuine ccof: card actually exists) from
  // recurring the next time this booking needs a recharge.
  if (
    paymentMethod === "SQUARE_SAVED_CARD" &&
    booking.paymentMethod !== "SQUARE_SAVED_CARD"
  ) {
    booking.paymentMethod = "SQUARE_SAVED_CARD";
  }
  booking.paymentStatus =
    result.paymentStatus === "PAID" ? "PAID" : result.paymentStatus;
  await booking.save();
  return booking;
}

/**
 * Renews a Square authorization that's about to expire while the trip is
 * still days away, instead of capturing it early. Capturing at the ~5-day
 * mark (paymentAuthExpiryGuard's normal behavior) is correct for a trip
 * that's happening soon, but for a booking made 2+ weeks out it would mean
 * billing the customer 10 days before their ride — surprising, and turns a
 * same-day cancellation into an actual refund instead of just voiding an
 * unused hold. This cancels the stale hold and opens a fresh one for the
 * exact same amount against a real saved card — the customer is never
 * charged and never has to do anything, and the capture still happens at
 * the normal time (right before the ride) via this same job once the trip
 * is close.
 *
 * Returns null (does nothing) if there's no resolvable saved card — e.g. a
 * SQUARE_NEW_CARD booking where persistSquareCardFromPayment's best-effort
 * save at booking time didn't succeed (see its own logging) or was never
 * reachable (a legacy/guest booking). The caller should fall back to
 * capturing early in that case — there's nothing left to silently renew.
 */
async function renewAuthorizationForBooking({
  booking,
  ledgerBookingType,
  bookingId,
  amount,
  tx,
}) {
  const paymentDetail = await ensureBookingPaymentDetail(booking, tx);
  if (!paymentDetail?.squareCardId) {
    return null;
  }

  try {
    await squarePaymentService.cancelPayment(tx.squarePaymentId);
  } catch (err) {
    // Square may have already expired/canceled it on its own between this
    // job's scan and this call — fine, that's exactly the state we want it
    // in before opening the new hold. Anything else is a real failure.
    if (!isCanceledSquarePaymentError(err)) {
      throw err;
    }
  }
  await tx.update({ status: "CANCELED" });

  const customerId = await resolveSquareCustomerId({
    userId: booking.userId,
    paymentDetail,
    squareCardId: paymentDetail.squareCardId,
  });

  const result = await chargeWithSquare({
    bookingType: ledgerBookingType,
    bookingId,
    confirmationNumber: booking.confirmationNumber,
    amountDollars: amount,
    sourceId: paymentDetail.squareCardId,
    paymentDetail,
    customerId,
    userId: booking.userId,
    cardHints: bookingCardHints(booking),
    forceImmediateCapture: false, // renew the hold — do NOT capture yet
  });

  if (result.paymentDetail) {
    await booking.setPaymentDetail(result.paymentDetail);
  }
  if (booking.paymentMethod !== "SQUARE_SAVED_CARD") {
    booking.paymentMethod = "SQUARE_SAVED_CARD";
  }
  // Expected to be "AUTHORIZED" — shouldChargeImmediately() is false in
  // authorize_capture mode, so chargeWithSquare opens a hold, not a capture.
  booking.paymentStatus = result.paymentStatus;
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
    const authorizedDollars = roundMoney(tx.amountCents / 100);

    if (amount > authorizedDollars) {
      // The booking's current total now exceeds what was held at booking
      // time (e.g. the trip was edited/repriced upward after approval).
      // Square can never capture more than the original hold, so the only
      // way to charge the correct, higher amount is to release the old
      // hold and open a fresh charge for the full updated total — falls
      // through to the same recharge path used below when there's no
      // valid hold to capture at all.
      try {
        await squarePaymentService.cancelPayment(tx.squarePaymentId);
      } catch (err) {
        if (!isCanceledSquarePaymentError(err)) {
          throw err;
        }
      }
      await tx.update({ status: "CANCELED" });
      emitPaymentTransactionUpdated(tx);
      return chargeSavedCardForBooking({
        booking,
        ledgerBookingType,
        bookingId,
        amount,
        tx,
      });
    }

    try {
      // Square's CompletePayment always captures the full authorized hold
      // (it has no partial-capture parameter). If the current total is
      // lower than the hold (e.g. a discount was applied after approval),
      // capture the full hold, then immediately refund the difference so
      // the customer nets out to the correct, current total.
      const discountDollars = roundMoney(
        Math.max(0, authorizedDollars - amount)
      );

      const payment = await squarePaymentService.capturePayment(
        tx.squarePaymentId
      );

      // Record the capture immediately, at the full authorized amount —
      // this is Square's actual state right now. If the discount refund
      // below fails, our records must still show the money was captured
      // (not still just "authorized"), so a retry never double-captures.
      await tx.update({
        status: "COMPLETED",
        amountCents: dollarsToCents(authorizedDollars),
        rawResponse: squarePaymentService.sanitizePaymentResponse(payment),
      });
      emitPaymentTransactionUpdated(tx);

      if (discountDollars > 0) {
        try {
          await squarePaymentService.refundPayment(
            tx.squarePaymentId,
            discountDollars,
            `${booking.confirmationNumber}-discount-refund-${randomUUID()}`
          );
        } catch (refundErr) {
          // The full amount was already captured above (tx is correctly
          // recorded as COMPLETED at the full amount) — only the discount
          // refund failed. Surface this distinctly so an admin knows to
          // manually refund $${discountDollars} rather than retry
          // "Take Payment" (which would now see a COMPLETED transaction
          // and mark the booking paid without ever retrying the refund).
          throw new ValidationError(
            `Payment of $${authorizedDollars} was captured, but the ` +
              `$${discountDollars} discount refund failed: ` +
              `${refundErr.message}. Please refund $${discountDollars} to ` +
              `this customer manually via Square.`
          );
        }
        await tx.update({ amountCents: dollarsToCents(amount) });
        emitPaymentTransactionUpdated(tx);
      }
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
  renewAuthorizationForBooking,
};
