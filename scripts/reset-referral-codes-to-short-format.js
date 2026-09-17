/**
 * Regenerates every existing customer's personal referral code (type
 * "referral") to the new short format — a 2-letter name prefix + 5-char
 * hash, 7 characters total — replacing the old FirstName+hash codes
 * (up to 11 characters) in place.
 *
 * Updates the `code` column on the existing PromoCode row only — the
 * promoCodeId stays the same, so redemption history (PromoCodeRedemption)
 * and any pending/credited referral rewards tied to it are untouched.
 * The only real-world effect is that any link or text a customer already
 * shared with their OLD code stops working; this is a deliberate one-time
 * reset, not something to run casually afterward.
 *
 * Safe to re-run: a code that's already in the new 7-character shape is
 * left alone.
 *
 * Usage: npm run db:reset-referral-codes
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { User } = require("../src/models/user/User.js");
const { PromoCode } = require("../src/models/PromoCode.js");
const { generateReferralCode } = require("../src/services/promoCodeService.js");

const BATCH_SIZE = 200;
const SHORT_CODE_PATTERN = /^[A-Z]{2}[A-Z0-9]{5}$/;

async function main() {
  await sequelize.authenticate();
  console.log("Connected. Resetting referral codes to the short 7-character format...");

  let offset = 0;
  let updated = 0;
  let alreadyShort = 0;
  let skippedNoOwner = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const promoCodes = await PromoCode.findAll({
      where: { type: "referral" },
      limit: BATCH_SIZE,
      offset,
      order: [["promoCodeId", "ASC"]],
    });
    if (promoCodes.length === 0) break;

    for (const promoCode of promoCodes) {
      if (SHORT_CODE_PATTERN.test(promoCode.code)) {
        alreadyShort++;
        continue;
      }

      const owner = await User.findByPk(promoCode.ownerUserId, { paranoid: false });
      if (!owner) {
        console.log(`  SKIP promoCodeId ${promoCode.promoCodeId} — owner user ${promoCode.ownerUserId} not found`);
        skippedNoOwner++;
        continue;
      }

      const firstName = String(owner.fullName || "").trim().split(/\s+/)[0] || "US";

      // Base code is deterministic; only the retry suffix changes on
      // collision, same pattern as getOrCreateReferralCode.
      let newCode = generateReferralCode(firstName, owner.userId);
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = attempt === 0 ? newCode : `${newCode}${attempt}`;
        const clash = await PromoCode.findOne({ where: { code: candidate } });
        if (!clash) {
          newCode = candidate;
          break;
        }
        if (attempt === 4) {
          throw new Error(`Could not allocate a unique short code for user ${owner.userId}`);
        }
      }

      const oldCode = promoCode.code;
      promoCode.code = newCode;
      await promoCode.save();
      updated++;
      console.log(`  user ${owner.userId} (${owner.fullName}): ${oldCode} -> ${newCode}`);
    }

    offset += promoCodes.length;
  }

  console.log(
    `Done. Updated ${updated} code(s), ${alreadyShort} already short, ${skippedNoOwner} skipped (no owner).`
  );
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to reset referral codes:", error);
  process.exit(1);
});
