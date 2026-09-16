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
const { getReferralSettings } = require("./referralSettingsService.js");

// Referral economics: the friend who was invited gets a discount on their
// first ride; the person who invited them gets a flat credit once that ride
// is actually completed and paid for (not just booked) — mirrors Uber's
// anti-abuse rule that a referral only pays out for a real, finished trip.
// No ceiling on the rider's discount — it's always the full percentage of
// whatever the fare is, however large.
//
// The discount %, the flat reward $, and the two lifetime redemption caps
// below are admin-tunable — see ReferralSettings/referralSettingsService —
// rather than fixed constants, so an owner can dial them from the dashboard
// (e.g. 10% -> 5%, 5 uses -> 3) without a deployment. Only the reward code's
// validity window stays a fixed constant; nobody has asked to tune that yet.
const REFERRAL_REWARD_CODE_VALID_DAYS = 90;
const REFERRAL_FAMILY_TYPES = ["referral", "reward"];

// Earning a reward by referring people is deliberately uncapped — a
// referrer is rewarded for every single friend who completes and pays for
// a ride, whether that's their 1st or their 100,000th. This is distinct
// from the two caps above, which limit how many codes a person can
// personally *spend* on their own bookings.

function normalizeEmail(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  return trimmed || null;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits || null;
}

/**
 * A signed-in user is identified by userId. A guest has none, so — for every
 * rate-limit check below — we fall back to whatever contact info they gave
 * at booking time (email OR phone matches an earlier confirmed redemption).
 * Returns null when there's truly nothing to key on (never happens for a
 * real booking, since email is always required, but guards it anyway).
 */
function identityWhereClause({ userId, guestEmail, guestPhone }) {
  if (userId) return { redeemedByUserId: userId };

  const email = normalizeEmail(guestEmail);
  const phone = normalizePhone(guestPhone);
  const or = [];
  if (email) or.push({ guestEmail: email });
  if (phone) or.push({ guestPhone: phone });
  return or.length > 0 ? { [Op.or]: or } : null;
}

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
  const settings = await getReferralSettings();

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
        discountValue: settings.referralDiscountPercent,
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

/**
 * True if this person has any other booking anywhere in the system
 * (referral/first-ride gating). Signed-in users are matched by userId;
 * guests are matched by whichever of email/phone they gave, since that's
 * the only identity a guest has.
 */
async function hasAnyOtherBooking(
  { userId, guestEmail, guestPhone },
  excludeBookingType,
  excludeBookingId
) {
  const email = normalizeEmail(guestEmail);
  const phone = normalizePhone(guestPhone);
  if (!userId && !email && !phone) return false;

  for (const [bookingType, Model] of Object.entries(BOOKING_MODELS)) {
    const pk = BOOKING_PK[bookingType];
    let where;
    if (userId) {
      where = { userId };
    } else {
      const or = [];
      if (email) or.push({ passengerEmail: email });
      if (phone) or.push({ passengerCellPhone: phone });
      where = { [Op.or]: or };
    }
    if (bookingType === excludeBookingType) {
      where[pk] = { [Op.ne]: excludeBookingId };
    }
    const count = await Model.count({ where });
    if (count > 0) return true;
  }
  return false;
}

function computeDiscount(promoCode, fareAmount) {
  // No ceiling on a percent discount — it's always the exact percentage of
  // the fare, however large. maxDiscountAmount is no longer read here: the
  // column stays in the schema (in case a cap is ever wanted again for some
  // future code), but nothing enforces it today. The only real floor/ceiling
  // left is the fare itself — a discount can never exceed what's being paid.
  const raw =
    promoCode.discountType === "percent"
      ? (fareAmount * Number(promoCode.discountValue)) / 100
      : Number(promoCode.discountValue);
  return Math.min(Math.round(raw * 100) / 100, fareAmount);
}

/**
 * Validates a code for one booking without redeeming it.
 * @param {{ code: string, userId: number|null, guestEmail?: string, guestPhone?: string, bookingType: string, fareAmount: number, bookingId: number }} params
 * @returns {Promise<{ promoCode: PromoCode, discount: number }>}
 */
async function validatePromoCode({
  code,
  userId,
  guestEmail,
  guestPhone,
  bookingType,
  fareAmount,
  bookingId,
}) {
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
    const hasHistory = await hasAnyOtherBooking(
      { userId, guestEmail, guestPhone },
      bookingType,
      bookingId
    );
    if (hasHistory) {
      throw new ValidationError("This promo code is only valid on your first ride.");
    }
  }

  // Per-person redemption cap for THIS code — signed-in users are matched by
  // userId, guests by whatever contact info they gave at booking time.
  const identity = identityWhereClause({ userId, guestEmail, guestPhone });
  if (identity) {
    const priorUses = await PromoCodeRedemption.count({
      where: {
        promoCodeId: promoCode.promoCodeId,
        status: "confirmed",
        ...identity,
      },
    });
    if (priorUses >= promoCode.maxRedemptionsPerUser) {
      throw new ValidationError("You've already used this promo code.");
    }

    // Rolling-window cap, on top of the lifetime cap above — e.g. 5 uses
    // per person in any trailing 15-day window. Recovers on its own as the
    // oldest use in the window ages out; no reset date is ever stored.
    if (promoCode.periodDays && promoCode.maxRedemptionsPerPeriod) {
      const windowStart = new Date(
        Date.now() - promoCode.periodDays * 24 * 60 * 60 * 1000
      );
      const usesInPeriod = await PromoCodeRedemption.count({
        where: {
          promoCodeId: promoCode.promoCodeId,
          status: "confirmed",
          createdAt: { [Op.gte]: windowStart },
          ...identity,
        },
      });
      if (usesInPeriod >= promoCode.maxRedemptionsPerPeriod) {
        throw new ValidationError(
          `You've used this code ${promoCode.maxRedemptionsPerPeriod} times in the last ${promoCode.periodDays} days. Try again once your next chance opens up.`
        );
      }
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

  // Lifetime cap — two independent buckets per person: one for public codes,
  // one for referral/reward codes combined (admin-tunable, see ReferralSettings).
  if (identity) {
    const isReferralFamily = REFERRAL_FAMILY_TYPES.includes(promoCode.type);
    const settings = await getReferralSettings();
    const lifetimeCap = isReferralFamily
      ? settings.maxLifetimeReferralRedemptions
      : settings.maxLifetimePublicRedemptions;

    const lifetimeUses = await PromoCodeRedemption.count({
      where: { status: "confirmed", ...identity },
      include: [
        {
          model: PromoCode,
          where: {
            type: isReferralFamily ? REFERRAL_FAMILY_TYPES : "public",
          },
        },
      ],
    });
    if (lifetimeUses >= lifetimeCap) {
      throw new ValidationError(
        isReferralFamily
          ? `You've reached the maximum of ${lifetimeCap} referral/reward promo uses.`
          : `You've reached the maximum of ${lifetimeCap} promo code uses.`
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
async function redeemPromoCode({
  promoCode,
  userId,
  guestEmail,
  guestPhone,
  bookingId,
  bookingType,
  discountApplied,
}) {
  const redemption = await PromoCodeRedemption.create({
    promoCodeId: promoCode.promoCodeId,
    redeemedByUserId: userId || null,
    guestEmail: userId ? null : normalizeEmail(guestEmail),
    guestPhone: userId ? null : normalizePhone(guestPhone),
    bookingId,
    bookingType,
    discountApplied,
    status: "confirmed",
  });

  // A referred friend earns their referrer a reward whether they registered
  // or booked as a guest — the reward is keyed on whichever identity they
  // actually have. Opened as "pending" regardless of any lifetime cap —
  // that's only checked when a code is *spent* (see validatePromoCode),
  // since a pending referral that never completes shouldn't burn a slot.
  // The reward amount is frozen at today's admin-set rate the moment this
  // reward is opened, not whatever it is later when it's credited.
  if (promoCode.type === "referral" && promoCode.ownerUserId) {
    const settings = await getReferralSettings();
    await ReferralReward.create({
      referrerUserId: promoCode.ownerUserId,
      referredUserId: userId || null,
      referredGuestEmail: userId ? null : normalizeEmail(guestEmail),
      referredGuestPhone: userId ? null : normalizePhone(guestPhone),
      promoCodeId: promoCode.promoCodeId,
      triggeringBookingId: bookingId,
      triggeringBookingType: bookingType,
      rewardAmount: settings.referrerRewardAmount,
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

  // No cap on earning — a referrer is rewarded for every single friend who
  // genuinely completes and pays for a ride, whether that's their 1st or
  // their 100,000th. (The unrelated, admin-tunable caps on how many codes a
  // person can personally *spend* — see ReferralSettings — are untouched by
  // this.)
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

/**
 * Everything a signed-in user would want to see on a "My Rewards" screen:
 * how much they've actually saved so far, how much they've earned by
 * referring others, and how many of their lifetime chances remain in each
 * of the three caps (public codes, referral/reward codes spent, referral
 * rewards earned as a referrer).
 */
async function getMyDiscountSummary(userId) {
  const redemptions = await PromoCodeRedemption.findAll({
    where: { redeemedByUserId: userId, status: "confirmed" },
    include: [{ model: PromoCode, attributes: ["type"] }],
  });

  let publicUsed = 0;
  let referralFamilyUsed = 0;
  let totalSaved = 0;
  for (const redemption of redemptions) {
    totalSaved += Number(redemption.discountApplied) || 0;
    if (redemption.PromoCode?.type === "public") {
      publicUsed += 1;
    } else {
      referralFamilyUsed += 1;
    }
  }

  const creditedRewards = await ReferralReward.findAll({
    where: { referrerUserId: userId, rewardStatus: "credited" },
  });
  const totalReferralRewardsEarned = creditedRewards.reduce(
    (sum, reward) => sum + (Number(reward.rewardAmount) || 0),
    0
  );

  const pendingReferralRewards = await ReferralReward.count({
    where: { referrerUserId: userId, rewardStatus: "pending" },
  });

  const settings = await getReferralSettings();
  const round = (n) => Math.round(n * 100) / 100;

  return {
    totalSaved: round(totalSaved),
    totalReferralRewardsEarned: round(totalReferralRewardsEarned),
    publicCodes: {
      used: publicUsed,
      remaining: Math.max(settings.maxLifetimePublicRedemptions - publicUsed, 0),
      limit: settings.maxLifetimePublicRedemptions,
    },
    referralCodesSpent: {
      used: referralFamilyUsed,
      remaining: Math.max(
        settings.maxLifetimeReferralRedemptions - referralFamilyUsed,
        0
      ),
      limit: settings.maxLifetimeReferralRedemptions,
    },
    // Uncapped — null limit/remaining signals "unlimited" to clients,
    // instead of a fixed cap like the two buckets above.
    referralRewardsEarned: {
      used: creditedRewards.length,
      remaining: null,
      limit: null,
    },
    pendingReferralRewards,
  };
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
  generateReferralCode,
  getOrCreateReferralCode,
  validatePromoCode,
  redeemPromoCode,
  creditReferralRewardIfCompleted,
  getMyDiscountSummary,
  createPublicPromoCode,
  listPromoCodes,
  getPromoCodeByCode,
  setPromoCodeActive,
};
