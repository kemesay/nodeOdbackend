const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  PromoCode,
  PromoCodeRedemption,
  ReferralReward,
} = require("../models/PromoCode.js");
const { User } = require("../models/user/User.js");
const { PointToPointBook } = require("../models/PointToPointBook.js");
const { HourlyCharterBook } = require("../models/HourlyCharterBook.js");
const { AirportBook } = require("../models/airportBooking/AirportBook.js");
const {
  ValidationError,
  ResourceNotFoundError,
} = require("../errors/CustomErrors.js");
const logger = require("../config/logging.js");

// Referral economics: the friend who was invited gets a discount on their
// first ride; the person who invited them gets a flat credit once that ride
// is actually completed and paid for (not just booked) — mirrors Uber's
// anti-abuse rule that a referral only pays out for a real, finished trip.
const REFERRAL_RIDER_DISCOUNT_PERCENT = 10;
const REFERRAL_RIDER_MAX_DISCOUNT = 15;
const REFERRAL_REFERRER_REWARD_AMOUNT = 10;
const REFERRAL_REWARD_CODE_VALID_DAYS = 90;

// Lifetime cap, across every promo code combined (not per-code) — once a
// user has redeemed 5 promo codes total, no further code (public, referral,
// or reward) discounts their fare. Guests (no userId) can't be tracked
// across bookings, so this only applies to signed-in users.
const MAX_LIFETIME_PROMO_REDEMPTIONS_PER_USER = 5;

const BOOKING_MODELS = {
  "Point to point": PointToPointBook,
  "Hourly Charter": HourlyCharterBook,
  "Airport Service": AirportBook,
};

const BOOKING_PK = {
  "Point to point": "pointToPointBookId",
  "Hourly Charter": "hourlyCharterBookId",
  "Airport Service": "airportBookId",
};

/**
 * Deterministic, collision-resistant referral code: FIRSTNAME + a short
 * keyed-hash of the userId (not the raw id — a raw id would let anyone
 * enumerate every referral code in the system by counting up).
 */
function generateReferralCode(firstName, userId) {
  const cleanName = String(firstName || "USER")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 6) || "USER";

  const secret = process.env.REFERRAL_CODE_SECRET || process.env.JWT_PRIVATE_KEY || "oda-referral";
  const hash = crypto.createHmac("sha256", secret).update(String(userId)).digest("hex");
  const suffix = BigInt("0x" + hash.slice(0, 10)).toString(36).toUpperCase().slice(0, 5);

  return `${cleanName}${suffix}`;
}

/** Returns the user's personal referral code, creating it on first request. */
async function getOrCreateReferralCode(user) {
  const existing = await PromoCode.findOne({
    where: { type: "referral", ownerUserId: user.userId },
  });
  if (existing) return existing;

  const firstName = String(user.fullName || "").trim().split(/\s+/)[0] || "USER";

  // Base code is deterministic; only the retry suffix changes on collision,
  // so this loop should essentially never iterate more than once in practice.
  let code = generateReferralCode(firstName, user.userId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? code : `${code}${attempt}`;
    try {
      return await PromoCode.create({
        code: candidate,
        type: "referral",
        ownerUserId: user.userId,
        discountType: "percent",
        discountValue: REFERRAL_RIDER_DISCOUNT_PERCENT,
        maxDiscountAmount: REFERRAL_RIDER_MAX_DISCOUNT,
        firstRideOnly: true,
        maxRedemptionsPerUser: 1,
        isActive: true,
      });
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") throw error;
    }
  }
  throw new Error(`Could not allocate a unique referral code for user ${user.userId}`);
}

/** True if this user has no other booking anywhere in the system (referral/first-ride gating). */
async function hasAnyOtherBooking(userId, excludeBookingType, excludeBookingId) {
  if (!userId) return false; // guest bookings can't be identity-checked; let firstRideOnly pass through
  for (const [bookingType, Model] of Object.entries(BOOKING_MODELS)) {
    const pk = BOOKING_PK[bookingType];
    const where = { userId };
    if (bookingType === excludeBookingType) {
      where[pk] = { [Op.ne]: excludeBookingId };
    }
    const count = await Model.count({ where });
    if (count > 0) return true;
  }
  return false;
}

function computeDiscount(promoCode, fareAmount) {
  const raw =
    promoCode.discountType === "percent"
      ? (fareAmount * Number(promoCode.discountValue)) / 100
      : Number(promoCode.discountValue);
  const capped = promoCode.maxDiscountAmount != null
    ? Math.min(raw, Number(promoCode.maxDiscountAmount))
    : raw;
  return Math.min(Math.round(capped * 100) / 100, fareAmount);
}

/**
 * Validates a code for one booking without redeeming it.
 * @param {{ code: string, userId: number|null, bookingType: string, fareAmount: number, bookingId: number }} params
 * @returns {Promise<{ promoCode: PromoCode, discount: number }>}
 */
async function validatePromoCode({ code, userId, bookingType, fareAmount, bookingId }) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const promoCode = await PromoCode.findOne({ where: { code: normalizedCode } });

  if (!promoCode || !promoCode.isActive) {
    throw new ValidationError("Invalid or inactive promo code.");
  }

  const now = new Date();
  if (promoCode.startsAt && now < promoCode.startsAt) {
    throw new ValidationError("This promo code is not active yet.");
  }
  if (promoCode.expiresAt && now > promoCode.expiresAt) {
    throw new ValidationError("This promo code has expired.");
  }
  if (
    promoCode.applicableBookingTypes &&
    !promoCode.applicableBookingTypes.includes(bookingType)
  ) {
    throw new ValidationError("This promo code does not apply to this service type.");
  }
  if (promoCode.minFareAmount && Number(fareAmount) < Number(promoCode.minFareAmount)) {
    throw new ValidationError(`This promo code requires a minimum fare of $${promoCode.minFareAmount}.`);
  }
  if (promoCode.type !== "public" && promoCode.ownerUserId === userId) {
    throw new ValidationError("You can't redeem your own promo code.");
  }

  if (promoCode.firstRideOnly) {
    const hasHistory = await hasAnyOtherBooking(userId, bookingType, bookingId);
    if (hasHistory) {
      throw new ValidationError("This promo code is only valid on your first ride.");
    }
  }

  // Per-user redemption cap only applies to signed-in users — guest
  // bookings have no userId to key on, and passing `undefined` straight
  // into a Sequelize WHERE clause throws rather than matching nothing.
  if (userId) {
    const priorUses = await PromoCodeRedemption.count({
      where: {
        promoCodeId: promoCode.promoCodeId,
        redeemedByUserId: userId,
        status: "confirmed",
      },
    });
    if (priorUses >= promoCode.maxRedemptionsPerUser) {
      throw new ValidationError("You've already used this promo code.");
    }
  }

  if (promoCode.maxTotalRedemptions) {
    const totalUses = await PromoCodeRedemption.count({
      where: { promoCodeId: promoCode.promoCodeId, status: "confirmed" },
    });
    if (totalUses >= promoCode.maxTotalRedemptions) {
      throw new ValidationError("This promo code has reached its redemption limit.");
    }
  }

  if (userId) {
    const lifetimeUses = await PromoCodeRedemption.count({
      where: { redeemedByUserId: userId, status: "confirmed" },
    });
    if (lifetimeUses >= MAX_LIFETIME_PROMO_REDEMPTIONS_PER_USER) {
      throw new ValidationError(
        `You've reached the maximum of ${MAX_LIFETIME_PROMO_REDEMPTIONS_PER_USER} promo code uses.`
      );
    }
  }

  const discount = computeDiscount(promoCode, Number(fareAmount));
  if (discount <= 0) {
    throw new ValidationError("This promo code does not apply to this fare.");
  }

  return { promoCode, discount };
}

/**
 * Records a redemption after a booking's payment has gone through. For a
 * referral code this also opens a pending reward for the referrer — credited
 * later, once the referred rider's trip is actually completed
 * (see `creditReferralRewardIfCompleted`).
 */
async function redeemPromoCode({ promoCode, userId, bookingId, bookingType, discountApplied }) {
  const redemption = await PromoCodeRedemption.create({
    promoCodeId: promoCode.promoCodeId,
    redeemedByUserId: userId || null,
    bookingId,
    bookingType,
    discountApplied,
    status: "confirmed",
  });

  if (promoCode.type === "referral" && promoCode.ownerUserId && userId) {
    await ReferralReward.create({
      referrerUserId: promoCode.ownerUserId,
      referredUserId: userId,
      promoCodeId: promoCode.promoCodeId,
      triggeringBookingId: bookingId,
      triggeringBookingType: bookingType,
      rewardAmount: REFERRAL_REFERRER_REWARD_AMOUNT,
      rewardStatus: "pending",
    });
  }

  return redemption;
}

/**
 * Call when a booking's status transitions to COMPLETED. Mints a one-time
 * "reward" promo code for the referrer if this booking was the triggering
 * ride for a pending referral reward.
 */
async function creditReferralRewardIfCompleted(bookingType, bookingId) {
  const reward = await ReferralReward.findOne({
    where: { triggeringBookingType: bookingType, triggeringBookingId: bookingId, rewardStatus: "pending" },
  });
  if (!reward) return null;

  const referrer = await User.findByPk(reward.referrerUserId);
  if (!referrer) {
    reward.rewardStatus = "denied";
    await reward.save();
    return null;
  }

  const firstName = String(referrer.fullName || "").trim().split(/\s+/)[0] || "USER";
  const rewardCode = await PromoCode.create({
    code: `${generateReferralCode(firstName, referrer.userId)}R${reward.referralRewardId}`.slice(0, 20),
    type: "reward",
    ownerUserId: referrer.userId,
    discountType: "flat",
    discountValue: reward.rewardAmount,
    maxRedemptionsPerUser: 1,
    maxTotalRedemptions: 1,
    isActive: true,
    expiresAt: new Date(Date.now() + REFERRAL_REWARD_CODE_VALID_DAYS * 24 * 60 * 60 * 1000),
  });

  reward.rewardStatus = "credited";
  reward.rewardCodeId = rewardCode.promoCodeId;
  reward.creditedAt = new Date();
  await reward.save();

  logger.info(
    `Referral reward credited: referrer ${referrer.userId} got code ${rewardCode.code} ($${reward.rewardAmount})`
  );
  return rewardCode;
}

async function createPublicPromoCode(data) {
  const existing = await PromoCode.findOne({ where: { code: data.code } });
  if (existing) throw new ValidationError("A promo code with this code already exists.");

  return PromoCode.create({ ...data, type: "public", ownerUserId: null });
}

async function listPromoCodes({ page = 1, pageSize = 20 } = {}) {
  const limit = Math.max(1, Number(pageSize) || 20);
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

  const { rows, count } = await PromoCode.findAndCountAll({
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return { data: rows, total: count, page: Number(page) || 1, pageSize: limit };
}

async function getPromoCodeByCode(code) {
  const promoCode = await PromoCode.findOne({
    where: { code: String(code || "").trim().toUpperCase() },
    include: [{ model: PromoCodeRedemption }],
  });
  if (!promoCode) throw new ResourceNotFoundError("Promo code not found.");
  return promoCode;
}

async function setPromoCodeActive(code, isActive) {
  const promoCode = await getPromoCodeByCode(code);
  promoCode.isActive = Boolean(isActive);
  return promoCode.save();
}

module.exports = {
  BOOKING_MODELS,
  MAX_LIFETIME_PROMO_REDEMPTIONS_PER_USER,
  generateReferralCode,
  getOrCreateReferralCode,
  validatePromoCode,
  redeemPromoCode,
  creditReferralRewardIfCompleted,
  createPublicPromoCode,
  listPromoCodes,
  getPromoCodeByCode,
  setPromoCodeActive,
};
