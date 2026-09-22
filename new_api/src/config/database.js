const { Sequelize } = require("sequelize");

/**
 * Switch environment: set `DB_ENV=production` (or `development`, the
 * default) in `.env`. Same concept as SQUARE_ENV — both credential sets
 * live in `.env` at once; only DB_ENV changes which one is active.
 */
const DB_ENV = (process.env.DB_ENV || "development").trim().toLowerCase();
const isProduction = DB_ENV === "production";
const envPrefix = isProduction ? "DB_PRODUCTION_" : "DB_DEV_";

function envValue(field, fallback) {
  const value = process.env[`${envPrefix}${field}`];
  return value != null && value !== "" ? value : fallback;
}

const dbConfig = {
  // These fallbacks are the DB this app has always pointed at during
  // development — kept so nothing breaks for anyone who hasn't added
  // DB_DEV_* to their .env yet. Production has no such fallback: it must be
  // set explicitly in .env, never hardcoded here.
  host: envValue("HOST", isProduction ? undefined : "192.249.113.151"),
  port: Number(envValue("PORT", isProduction ? undefined : 3306)),
  username: envValue("USERNAME", isProduction ? undefined : "odatra5_dev"),
  database: envValue("DATABASE", isProduction ? undefined : "odatra5_dev_db"),
  password: envValue("PASSWORD", isProduction ? undefined : "0fewNqU_,qdj"),
};

if (!dbConfig.host || !dbConfig.username || !dbConfig.database) {
  throw new Error(
    `Database is not configured for DB_ENV=${DB_ENV}. Set ${envPrefix}HOST, ${envPrefix}USERNAME, ${envPrefix}DATABASE and ${envPrefix}PASSWORD in .env.`
  );
}

const sequelize = new Sequelize({
  dialect: "mysql",
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  database: dbConfig.database,
  password: dbConfig.password,
  logging: false,
  pool: {
    max: 20,
    min: 2,
    idle: 10000,
    acquire: 30000,
  },
  dialectOptions: {
    // Remote host does not offer TLS; MariaDB/MySQL client defaults require SSL.
    ssl: (process.env.DB_SSL || "false").toLowerCase() === "true",
  },
});

// const sequelize = new Sequelize({
//   dialect: "postgres",
//   host: "127.0.0.1" || "192.249.113.151",
//   port: 5432,
//   username: "postgres",
//   database: "oda_transportation",
//   password: "postgres123",
//   logging: false,
//   pool: {
//     max: 20,
//     min: 2,
//     idle: 10000,
//     acquire: 30000,
//   },
// });

async function connectToDatabase() {
  try {
    await sequelize.authenticate();

    // sync({ alter: true }) auto-generates ALTER statements to reconcile
    // every model with the live schema on every single boot. There is no
    // separate dev database here — local restarts and production restarts
    // hit the same remote DB — so every nodemon reload and every process
    // respawn ran this. For columns with `unique: true` and no explicit
    // index name, Sequelize can't recognize its own previously-created
    // index and adds a brand new one each time; payment_transactions.
    // idempotencyKey accumulated 61 duplicate unique indexes this way and
    // hit MySQL's 64-key-per-table limit, which made the ALTER itself fail
    // and this whole function throw — crashing app boot outright.
    //
    // Auto-alter is now opt-in only. Schema changes should be applied
    // deliberately (e.g. a one-off `DB_AUTO_ALTER=true node src/app.js`
    // run, or a targeted script like scripts/ensure-square-payment-columns.js)
    // instead of on every restart.
    if (process.env.DB_AUTO_ALTER === "true") {
      await sequelize.sync({ alter: true });
      console.log("Models synced to the database (DB_AUTO_ALTER=true).");
    }
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

async function startTransaction() {
  const transaction = await sequelize.transaction();
  return transaction;
}

async function commitTransaction(transaction) {
  try {
    if (transaction) await transaction.commit();
  } catch (error) {
    throw error;
  }
}

async function rollbackTransaction(transaction) {
  try {
    if (transaction) await transaction.rollback();
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  connectToDatabase,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
};
