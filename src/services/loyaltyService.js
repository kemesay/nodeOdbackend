const { BOOKING_MODELS } = require("./promoCodeService.js");
const { WalletCredit } = require("../models/WalletCredit.js");
const { getLoyaltySettings } = require("./loyaltySettingsService.js");
const { creditWallet } = require("./walletService.js");
const logger = require("../config/logging.js");

/** Every completed booking counts toward the milestone, across all three trip types combined. */
async function countCompletedBookingsForUser(userId) {
  let total = 0;
  for (const Model of Object.values(BOOKING_MODELS)) {
    total += await Model.count({ where: { userId, bookingStatus: "COMPLETED" } });
  }
  return total;
}

/**
 * Call when a booking's status transitions to COMPLETED (alongside
 * creditReferralRewardIfCompleted — the two are independent and both can
 * credit the same customer's wallet, just never for the same booking).
 *
 * Credits `milestonePercent`% of THIS ride's own fare to the customer's
 * wallet every `milestoneInterval`-th completed booking (5th, 10th, 15th,
 * ...), counted across Point-to-Point/Airport/Hourly combined — UNLESS a
 * promo code was applied to this specific ride, in which case the milestone
 * is simply skipped: the customer already got their value via the discount,
 * and the two rewards never stack on one booking. Guests (no userId) never
 * qualify, same as referral rewards. Idempotent — safe to call more than
 * once for the same booking (e.g. a retried status update) since it checks
 * for an existing lot sourced from this exact booking first.
 */
async function creditLoyaltyMilestoneIfEligible(bookingType, bookingId) {
  const settings = await getLoyaltySettings();
  if (!settings.isActive) return null;

  const BookingModel = BOOKING_MODELS[bookingType];
  const booking = BookingModel ? await BookingModel.findByPk(bookingId) : null;
  if (!booking || !booking.userId) return null;

  const alreadyCredited = await WalletCredit.findOne({
    where: {
      sourceType: "loyalty_milestone",
      sourceBookingId: bookingId,
      sourceBookingType: bookingType,
    },
  });
  if (alreadyCredited) return null;

  const totalCompleted = await countCompletedBookingsForUser(booking.userId);
  const interval = settings.milestoneInterval;
  if (interval <= 0 || totalCompleted % interval !== 0) return null;

  const promoApplied = Number(booking.promoDiscountAmountInDollars) > 0;
  if (promoApplied) {
    logger.info(
      `Loyalty milestone skipped: ride #${totalCompleted} for user ${booking.userId} (${bookingType} #${bookingId}) had a promo code applied.`
    );
    return null;
  }

  const fare = Number(booking.totalTripFeeInDollars) || 0;
  const creditedAmount = Math.round((fare * Number(settings.milestonePercent)) / 100 * 100) / 100;
  if (creditedAmount <= 0) return null;

  const lot = await creditWallet({
    userId: booking.userId,
    amount: creditedAmount,
    sourceType: "loyalty_milestone",
    sourceBookingId: bookingId,
    sourceBookingType: bookingType,
    note: `Loyalty milestone: ride #${totalCompleted}`,
  });

  logger.info(
    `Loyalty milestone credited: $${creditedAmount} to user ${booking.userId} for ride #${totalCompleted} (${bookingType} #${bookingId}).`
  );
  return lot;
}

module.exports = {
  countCompletedBookingsForUser,
  creditLoyaltyMilestoneIfEligible,
};
