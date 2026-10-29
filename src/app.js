const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const path = require("path");  // Import 'path' for serving static files
config();

const logger = require("./config/logging.js"); // sets up the shared logger + async-error handling as a side effect
const routes = require("./startUp/routes.js");
const { connectToDatabase } = require("./config/database.js");
const { initSocket } = require("./realtime/socket.js");
const { verifyEmailTransport } = require("./utils/emailSender.js");
const { registerPaymentAuthExpiryGuard } = require("./jobs/paymentAuthExpiryGuard.js");

const app = express();

// Enable CORS for all routes
app.use(cors());

// Allow correct protocol/host when behind reverse proxies (Nginx/Cloudflare)
// Needed for webhook signature verification if deriving notification URL.
app.set("trust proxy", 1);

// Serve static files from the 'uploads' directory
// This allows accessing files like 'https://api.odatransportation.com/uploads/filename.jpg'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging and routing
routes(app);

const port = process.env.PORT || 5100;

const http = require("http");
const server = http.createServer(app);
logger.registerShutdownServer(server);
initSocket(server);

// Wait for the DB (and its schema sync) before accepting traffic — starting
// the listener first lets early requests hit a half-initialized connection
// pool on every restart, which is slow at best and drops the connection at
// worst.
connectToDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Listening on port ${port}...`);
  });

  // No-op unless ENABLE_PAYMENT_EXPIRY_GUARD=true is set — see
  // src/jobs/paymentAuthExpiryGuard.js for what this does and why.
  registerPaymentAuthExpiryGuard();

  // Best-effort SMTP check — never blocks startup on a flaky mail server,
  // just surfaces a bad credential/hostname immediately instead of only
  // when the first real booking/reset email silently fails later.
  verifyEmailTransport()
    .then(() => console.log("Email transport verified."))
    .catch((error) => logger.error(`Email transport verification failed: ${error.message}`));
});

module.exports = server;

