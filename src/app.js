const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const path = require("path");  // Import 'path' for serving static files
config();

const logging = require("./config/logging.js");
const routes = require("./startUp/routes.js");
const { connectToDatabase } = require("./config/database.js");
const { initSocket } = require("./realtime/socket.js");

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
logging();
routes(app);

// Connect to database
connectToDatabase();

const port = process.env.PORT || 5100;

const http = require("http");
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

module.exports = server;

