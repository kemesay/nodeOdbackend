#!/usr/bin/env node
/**
 * Backfill payment_details.squareCardId from payment_transactions ledger rows.
 *
 * Usage:
 *   node scripts/backfill-square-cards-from-ledger.js [bookingId] [bookingType]
 *
 * Examples:
 *   node scripts/backfill-square-cards-from-ledger.js 174 HOURLY
 *   node scripts/backfill-square-cards-from-ledger.js
 */
require("dotenv").config();

const { Op } = require("sequelize");
const { sequelize } = require("../src/config/database.js");
const { PaymentTransaction } = require("../src/models/PaymentTransaction.js");
const { HourlyCharterBook } = require("../src/models/HourlyCharterBook.js");
const { PointToPointBook } = require("../src/models/PointToPointBook.js");
const { AirportBook } = require("../src/models/airportBooking/AirportBook.js");
const {
  recoverPaymentDetailFromTransaction,
} = require("../src/services/payments/squareCardPersistence.js");
const { normalizePaymentBookingType } = require("../src/utils/paymentBookingType.js");

async function loadBooking(bookingType, bookingId) {
  const kind = normalizePaymentBookingType(bookingType);
  if (kind === "HOURLY") {
    return HourlyCharterBook.findByPk(bookingId);
  }
  if (kind === "P2P") {
    return PointToPointBook.findByPk(bookingId);
  }
  if (kind === "AIRPORT") {
    return AirportBook.findByPk(bookingId);
  }
  return null;
}

async function main() {
  const bookingIdArg = process.argv[2];
  const bookingTypeArg = process.argv[3];

  const where = {};
  if (bookingIdArg) where.bookingId = Number(bookingIdArg);
  if (bookingTypeArg) {
    where.bookingType = normalizePaymentBookingType(bookingTypeArg) || bookingTypeArg;
  }

  const rows = await PaymentTransaction.findAll({
    where: {
      ...where,
      squarePaymentId: { [Op.ne]: null },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!rows.length) {
    console.log("No payment transactions found.");
    process.exit(0);
  }

  let updated = 0;
  for (const tx of rows) {
    const booking = await loadBooking(tx.bookingType, tx.bookingId);
    const cardHints = booking
      ? {
          cardOwnerName: booking.cardOwnerName || booking.passengerFullName,
          zipCode: booking.zipCode,
          email: booking.passengerEmail,
          passengerFullName: booking.passengerFullName,
          passengerEmail: booking.passengerEmail,
        }
      : {};

    const detail = await recoverPaymentDetailFromTransaction(tx, {
      userId: booking?.userId ?? null,
      cardHints,
    });

    if (detail?.squareCardId && booking) {
      await booking.setPaymentDetail(detail);
      updated += 1;
      console.log(
        `OK booking ${tx.bookingType}/${tx.bookingId} -> paymentDetail ${detail.paymentDetailId} (${detail.squareCardId})`
      );
    } else if (detail?.squareCardId) {
      updated += 1;
      console.log(
        `OK tx ${tx.squarePaymentId} -> paymentDetail ${detail.paymentDetailId} (${detail.squareCardId})`
      );
    } else {
      console.log(
        `SKIP tx ${tx.squarePaymentId} (${tx.bookingType}/${tx.bookingId}) — could not recover card`
      );
    }
  }

  console.log(`Done. ${updated} card(s) persisted.`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
