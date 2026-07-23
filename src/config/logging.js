require("express-async-errors");
const winston = require("winston");

// A single shared logger instance — exported directly (not a factory) so
// every module that logs (including the global error handler) writes
// through the same configured Console+File transports instead of the
// default winston singleton, which has no transports attached at all.
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.cli() }),
    new winston.transports.File({ filename: "logs/logs.log" }),
  ],
});

// A crashed process must still go away — an uncaughtException means we're in
// an unknown state and can't be trusted to keep serving requests correctly.
// But exiting immediately kills every *other* in-flight request on this
// worker too, which is what produces Passenger's "Incomplete response
// received from application" for requests that had nothing to do with the
// actual error. Instead: stop accepting new connections, let in-flight
// responses finish on their own, then exit — with a hard-kill fallback in
// case something is hung and never finishes.
let httpServer = null;
function registerShutdownServer(server) {
  httpServer = server;
}

function crashAndExit(err, label) {
  logger.error(label, err);
  if (!httpServer) {
    process.exit(1);
    return;
  }
  httpServer.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("uncaughtException", (err) => {
  crashAndExit(err, "Uncaught Exception:");
});

// Log and keep the process alive — most rejections here are genuine bugs in
// fire-and-forget code, not something that leaves the process in a broken
// state, so there's no reason to take down every other in-flight request
// over it the way uncaughtException must.
process.on("unhandledRejection", (ex) => {
  logger.error("Unhandled Rejection:", ex);
});

module.exports = logger;
module.exports.registerShutdownServer = registerShutdownServer;
