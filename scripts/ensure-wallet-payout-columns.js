/**
 * Adds the columns a cash-out request needs to carry the customer's own
 * payout destination (Zelle, Venmo, CashApp, PayPal, bank transfer, check,
 * or free-text "other") instead of relying entirely on a phone call to find
 * out where to send the money — see walletService.createCashOutRequest and
 * models/WalletCredit.js's validateCreateCashOutRequest.
 *
 *  - payoutMethod: short label, e.g. "zelle" | "bank_transfer" | ...
 *  - payoutDetails: JSON blob, shape depends on payoutMethod (validated at
 *    the API layer, not the DB layer — this column just stores whatever
 *    shape that validation already approved).
 *
 * Works against either dialect this project has used for local dev
 * (MySQL/MariaDB in production, Postgres for local-only workarounds). Safe
 * to re-run — every column add is guarded by a columnExists check.
 *
 * Usage: npm run db:wallet-payout-columns
 */
const { config } = require("dotenv");
config();

const { sequelize } = require("../src/config/database.js");

function isPostgres() {
  return sequelize.getDialect() === "postgres";
}

async function columnExists(table, column) {
  if (isPostgres()) {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
       LIMIT 1`,
      { replacements: { table, column } }
    );
    return rows.length > 0;
  }

  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = :table AND column_name = :column
     LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`  skip ${table}.${column} (exists)`);
    return;
  }
  const quotedTable = isPostgres() ? `"${table}"` : `\`${table}\``;
  const quotedColumn = isPostgres() ? `"${column}"` : `\`${column}\``;
  await sequelize.query(`ALTER TABLE ${quotedTable} ADD COLUMN ${quotedColumn} ${ddl}`);
  console.log(`  added ${table}.${column}`);
}

async function main() {
  await sequelize.authenticate();
  console.log(`Connected (${sequelize.getDialect()}).`);

  await addColumnIfMissing("wallet_cash_out_requests", "payoutMethod", "VARCHAR(20) NULL");
  await addColumnIfMissing("wallet_cash_out_requests", "payoutDetails", "JSON NULL");

  console.log("Done.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Failed to ensure wallet payout columns:", error);
  process.exit(1);
});
