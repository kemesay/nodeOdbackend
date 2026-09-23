/**
 * One-time backfill: normalizes every existing PromoCode row's `code` to
 * UPPERCASE — the new canonical case for every code in the system, public
 * campaign codes and auto-generated referral/reward codes alike (see the
 * comment on promoCodeSchema in models/PromoCode.js for why uppercase was
 * chosen, and validatePromoCode/getPromoCodeByCode/createPublicPromoCode in
 * services/promoCodeService.js for the application-code lookups this keeps
 * in sync with).
 *
 * Before this change:
 *   - referral/reward codes were auto-generated and stored LOWERCASE.
 *   - public codes were stored exactly as an admin typed them (mixed case),
 *     and matching relied on the database collation being case-insensitive
 *     (true on production MySQL's *_ci collation, NOT true on a
 *     case-sensitive local Postgres dev database).
 * After this change, every code is looked up as an uppercase string against
 * an uppercase-stored column, so matching is exact and collation-independent
 * on every environment. This script brings EXISTING rows in line with that;
 * new rows are already normalized going forward by the application code.
 *
 * Safety:
 *   - Read-only pass first: groups all codes by their uppercase form and
 *     checks whether that would merge two DIFFERENT rows into the same
 *     string (e.g. a public code "OdaCar" and another "ODACAR" created
 *     before this fix, or a fluke lowercase/uppercase referral-code
 *     collision). If any such collision exists, the script aborts with a
 *     full report and CHANGES NOTHING — a human has to rename one of the
 *     colliding rows first (see the printed promoCodeId's), since silently
 *     picking a winner could break a code/link a customer already has.
 *   - Idempotent: a code that's already all-uppercase is left untouched and
 *     counted separately. Safe to re-run.
 *   - Writes happen inside a single transaction — either every row updates,
 *     or (on any error) none do.
 *   - `--dry-run` previews exactly what would change without writing
 *     anything.
 *
 * Usage:
 *   Dev (local Postgres):
 *     npm run db:uppercase-promo-codes -- --dry-run   # preview only
 *     npm run db:uppercase-promo-codes                # apply
 *
 *   Production (MySQL):
 *     NODE_ENV=production npm run db:uppercase-promo-codes -- --dry-run
 *     NODE_ENV=production npm run db:uppercase-promo-codes
 *   (Set NODE_ENV/whatever env var this project's config/database.js reads
 *   to select the production connection — dotenv only loads a local .env by
 *   default, so make sure the process actually has the production DB
 *   credentials in its environment before running without --dry-run.)
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const { PromoCode } = require("../src/models/PromoCode.js");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await sequelize.authenticate();
  console.log(
    `Connected${DRY_RUN ? " (DRY RUN — no changes will be written)" : ""}. ` +
      "Scanning promo_codes..."
  );

  const allCodes = await PromoCode.findAll({
    attributes: ["promoCodeId", "code", "type", "ownerUserId"],
    order: [["promoCodeId", "ASC"]],
  });

  // Group by uppercase form to find collisions BEFORE changing anything.
  const groups = new Map();
  for (const row of allCodes) {
    const upper = row.code.toUpperCase();
    if (!groups.has(upper)) groups.set(upper, []);
    groups.get(upper).push(row);
  }

  const collisions = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  if (collisions.length > 0) {
    console.error(
      `\nABORTED — ${collisions.length} code(s) would collide once uppercased. ` +
        "Rename one row in each group below (e.g. via the admin Edit Promo Code " +
        "screen, or a direct UPDATE by promoCodeId) and re-run this script.\n"
    );
    for (const [upper, rows] of collisions) {
      console.error(`  "${upper}" is shared by:`);
      for (const row of rows) {
        console.error(
          `    promoCodeId ${row.promoCodeId} — type=${row.type}, code="${row.code}"` +
            (row.ownerUserId ? `, ownerUserId=${row.ownerUserId}` : "")
        );
      }
    }
    await sequelize.close();
    process.exit(1);
  }

  const toUpdate = allCodes.filter((row) => row.code !== row.code.toUpperCase());
  console.log(
    `Found ${allCodes.length} code(s) total: ${toUpdate.length} need uppercasing, ` +
      `${allCodes.length - toUpdate.length} already canonical.`
  );

  if (toUpdate.length === 0) {
    console.log("Nothing to do.");
    await sequelize.close();
    return;
  }

  if (DRY_RUN) {
    for (const row of toUpdate) {
      console.log(`  [dry run] promoCodeId ${row.promoCodeId}: "${row.code}" -> "${row.code.toUpperCase()}"`);
    }
    console.log(`\nDry run complete. ${toUpdate.length} code(s) would be updated. Re-run without --dry-run to apply.`);
    await sequelize.close();
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    for (const row of toUpdate) {
      const oldCode = row.code;
      const newCode = oldCode.toUpperCase();
      await row.update({ code: newCode }, { transaction });
      console.log(`  promoCodeId ${row.promoCodeId}: "${oldCode}" -> "${newCode}"`);
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  console.log(`\nDone. Uppercased ${toUpdate.length} code(s).`);
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to uppercase existing promo codes:", error);
  process.exit(1);
});
