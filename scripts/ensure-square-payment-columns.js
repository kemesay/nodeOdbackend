/**
 * Applies Square-related DB schema changes (PostgreSQL or MySQL).
 * Usage: npm run db:square-columns
 */
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");

config();

const { sequelize } = require("../src/config/database.js");

const BOOKING_TABLES = [
  "hourly_charter_books",
  "point_to_point_books",
  "airport_books",
];

const SQUARE_PAYMENT_METHODS = [
  "PRIMARY_CARD",
  "EXISTING_CARD",
  "NEW_CARD",
  "SQUARE_NEW_CARD",
  "SQUARE_SAVED_CARD",
];

const PAYMENT_DETAIL_SQUARE_COLUMNS = [
  { name: "squareCustomerId", ddl: "VARCHAR(64) NULL" },
  { name: "squareCardId", ddl: "VARCHAR(64) NULL" },
  { name: "cardBrand", ddl: "VARCHAR(32) NULL" },
  { name: "last4", ddl: "VARCHAR(4) NULL" },
  { name: "expMonth", ddl: "SMALLINT NULL" },
  { name: "expYear", ddl: "SMALLINT NULL" },
];

const PAYMENT_DETAIL_NULLABLE_COLUMNS = [
  "creditCardNumber",
  "expirationDate",
  "securityCode",
];

async function columnExists(table, column) {
  const dialect = sequelize.getDialect();
  if (dialect === "postgres") {
    const [rows] = await sequelize.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :table
        AND column_name = :column
      LIMIT 1
      `,
      { replacements: { table, column } }
    );
    return rows.length > 0;
  }

  const [rows] = await sequelize.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = :table
      AND column_name = :column
    LIMIT 1
    `,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function applyPostgresMigration() {
  const sqlPath = path.join(
    __dirname,
    "../database/sql/add_square_payment_columns.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await sequelize.query(sql);
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`  skip ${table}.${column} (exists)`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
  console.log(`  added ${table}.${column}`);
}

async function makeColumnNullable(table, column) {
  const [rows] = await sequelize.query(
    `
    SELECT IS_NULLABLE, COLUMN_TYPE
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = :table
      AND column_name = :column
    LIMIT 1
    `,
    { replacements: { table, column } }
  );
  if (!rows.length || rows[0].IS_NULLABLE === "YES") {
    return;
  }
  const columnType = rows[0].COLUMN_TYPE;
  await sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${columnType} NULL`
  );
  console.log(`  ${table}.${column} → NULL allowed`);
}

function parseMysqlEnumValues(columnType) {
  const match = /^enum\((.*)\)$/i.exec(columnType);
  if (!match) return null;
  return match[1]
    .split(",")
    .map((v) => v.trim().replace(/^'|'$/g, ""));
}

async function extendBookingPaymentMethodEnum(table) {
  const [rows] = await sequelize.query(
    `
    SELECT COLUMN_TYPE, IS_NULLABLE
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = :table
      AND column_name = 'paymentMethod'
    LIMIT 1
    `,
    { replacements: { table } }
  );
  if (!rows.length) {
    console.log(`  skip ${table}.paymentMethod (column not found)`);
    return;
  }

  const columnType = rows[0].COLUMN_TYPE;
  const existing = parseMysqlEnumValues(columnType);
  if (!existing) {
    console.log(`  skip ${table}.paymentMethod (not ENUM — likely VARCHAR)`);
    return;
  }

  const merged = [...existing];
  for (const value of SQUARE_PAYMENT_METHODS) {
    if (!merged.includes(value)) merged.push(value);
  }

  if (merged.length === existing.length) {
    console.log(`  skip ${table}.paymentMethod (Square values already present)`);
    return;
  }

  const enumList = merged.map((v) => `'${v.replace(/'/g, "''")}'`).join(",");
  const nullClause = rows[0].IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
  await sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN \`paymentMethod\` ENUM(${enumList}) ${nullClause}`
  );
  console.log(`  extended ${table}.paymentMethod ENUM`);
}

async function applyMysqlMigration() {
  const sqlPath = path.join(
    __dirname,
    "../database/sql/add_square_payment_columns.mysql.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await sequelize.query(sql);
  console.log("  payment_transactions table ensured");

  console.log("  payment_details Square columns:");
  for (const col of PAYMENT_DETAIL_SQUARE_COLUMNS) {
    await addColumnIfMissing("payment_details", col.name, col.ddl);
  }

  console.log("  payment_details nullable PAN columns:");
  for (const col of PAYMENT_DETAIL_NULLABLE_COLUMNS) {
    await makeColumnNullable("payment_details", col);
  }

  console.log("  booking paymentMethod ENUM values:");
  for (const table of BOOKING_TABLES) {
    await extendBookingPaymentMethodEnum(table);
  }
}

async function main() {
  await sequelize.authenticate();
  const dialect = sequelize.getDialect();
  console.log(`Applying Square migration for dialect: ${dialect}`);

  if (dialect === "postgres") {
    await applyPostgresMigration();
  } else if (dialect === "mysql" || dialect === "mariadb") {
    await applyMysqlMigration();
  } else {
    throw new Error(`Unsupported dialect: ${dialect}`);
  }

  console.log("Square payment columns migration applied.");
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
