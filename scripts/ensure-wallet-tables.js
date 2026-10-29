/**
 * Creates the wallet-credit tables (wallet_credits, wallet_credit_redemptions,
 * wallet_cash_out_requests) if they don't already exist yet.
 *
 * Uses Model.sync() rather than sequelize.sync({ alter: true }) — for brand
 * new tables that's a plain CREATE TABLE IF NOT EXISTS, and it never touches
 * any other (already-existing) table. See scripts/ensure-promo-code-tables.js
 * for the same pattern used when promo codes were added.
 *
 * Usage: npm run db:wallet-tables
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");
const {
  WalletCredit,
  WalletCreditRedemption,
  WalletCashOutRequest,
} = require("../src/models/WalletCredit.js");

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}). Ensuring wallet tables exist...`);

  await WalletCredit.sync();
  console.log("  wallet_credits ensured");

  await WalletCreditRedemption.sync();
  console.log("  wallet_credit_redemptions ensured");

  await WalletCashOutRequest.sync();
  console.log("  wallet_cash_out_requests ensured");

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure wallet tables:", error);
  process.exit(1);
});
