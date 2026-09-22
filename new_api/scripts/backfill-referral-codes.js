/**
 * Pre-generates a referral promo code (FirstName + short hash of userId) for
 * every existing user who doesn't have one yet. Safe to run repeatedly —
 * getOrCreateReferralCode() is a no-op for a user who already has a code.
 *
 * Without this, an existing user simply gets their code the first time they
 * call GET /api/v1/promo-codes/my-referral-code (created lazily, on demand).
 * Run this instead only if you want every existing user's code to exist
 * *before* that first call — e.g. to email everyone their code for a launch,
 * or to pre-populate an admin export.
 *
 * Usage: npm run db:backfill-referral-codes
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { User } = require("../src/models/user/User.js");
const { PromoCode } = require("../src/models/PromoCode.js");
const { getOrCreateReferralCode } = require("../src/services/promoCodeService.js");

const BATCH_SIZE = 200;

async function main() {
  await sequelize.authenticate();
  console.log("Connected. Backfilling referral codes for existing users...");

  let offset = 0;
  let created = 0;
  let alreadyHadOne = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const users = await User.findAll({
      attributes: ["userId", "fullName"],
      limit: BATCH_SIZE,
      offset,
      order: [["userId", "ASC"]],
    });
    if (users.length === 0) break;

    for (const user of users) {
      const existing = await PromoCode.findOne({
        where: { type: "referral", ownerUserId: user.userId },
      });
      if (existing) {
        alreadyHadOne++;
        continue;
      }

      const promoCode = await getOrCreateReferralCode(user);
      created++;
      console.log(`  user ${user.userId} (${user.fullName}) -> ${promoCode.code} [created]`);
    }

    offset += users.length;
  }

  console.log(`Done. Created ${created} new referral code(s), ${alreadyHadOne} user(s) already had one.`);
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to backfill referral codes:", error);
  process.exit(1);
});
