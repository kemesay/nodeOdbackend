/**
 * Regenerates every existing customer's personal referral code (type
 * "referral") to the current canonical format produced by
 * generateReferralCode() — a 2-letter name prefix + 5-char hash, 7
 * characters total, lowercase — replacing whatever shape/case it was in
 * before (the original up-to-11-character uppercase codes, or the
 * intermediate 7-character uppercase codes from before codes switched to
 * lowercase) in place.
 *
 * Updates the `code` column on the existing PromoCode row only — the
 * promoCodeId stays the same, so redemption history (PromoCodeRedemption)
 * and any pending/credited referral rewards tied to it are untouched.
 * The only real-world effect is that any link or text a customer already
 * shared with their OLD code stops working; this is a deliberate one-time
 * reset, not something to run casually afterward.
 *
 * Safe to re-run: a code that's already in the current canonical shape is
 * left alone.
 *
 * Usage: npm run db:reset-referral-codes
 */
const { config } = require("dotenv");
config();

const { Op } = require("sequelize");
const { sequelize } = require("../src/config/database.js");
const { User } = require("../src/models/user/User.js");
const { PromoCode } = require("../src/models/PromoCode.js");
const { generateReferralCode } = require("../src/services/promoCodeService.js");

const BATCH_SIZE = 200;
const CANONICAL_CODE_PATTERN = /^[a-z]{2}[a-z0-9]{5}$/;

async function main() {
  await sequelize.authenticate();
  console.log("Connected. Resetting referral codes to the canonical short lowercase format...");

  let offset = 0;
  let updated = 0;
  let alreadyCanonical = 0;
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
      if (CANONICAL_CODE_PATTERN.test(promoCode.code)) {
        alreadyCanonical++;
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
      // collision, same pattern as getOrCreateReferralCode. Excludes this
      // row's own promoCodeId from the clash check — otherwise, on a
      // case-insensitive collation, a row's own OLD value (e.g. "STCCXPQ")
      // reads as a "clash" against its own new lowercase candidate
      // ("stccxpq"), forcing every single code to fall through to the
      // "-1" retry suffix for no reason.
      let newCode = generateReferralCode(firstName, owner.userId);
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = attempt === 0 ? newCode : `${newCode}${attempt}`;
        const clash = await PromoCode.findOne({
          where: { code: candidate, promoCodeId: { [Op.ne]: promoCode.promoCodeId } },
        });
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
    `Done. Updated ${updated} code(s), ${alreadyCanonical} already canonical, ${skippedNoOwner} skipped (no owner).`
  );
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to reset referral codes:", error);
  process.exit(1);
});
