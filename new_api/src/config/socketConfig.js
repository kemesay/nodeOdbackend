/**
 * Socket.IO server settings (single import for realtime/socket.js).
 *
 * Production: reverse proxy must forward WebSocket upgrades for this path.
 * See docs/socket-io-production.md and oda-ride-transport/nginx-api.conf.example
 */

const DEFAULT_SOCKET_PATH = "/api/v1/socket.io";

function parseCorsOrigins() {
  const raw = process.env.SOCKET_CORS_ORIGINS || process.env.CORS_ORIGINS || "";
  if (!raw.trim()) {
    return "*";
  }
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function getSocketConfig() {
  const path = (process.env.SOCKET_IO_PATH || DEFAULT_SOCKET_PATH).trim();
  const origins = parseCorsOrigins();

  return {
    path: path.startsWith("/") ? path : `/${path}`,
    cors: {
      origin: origins.length === 1 && origins[0] === "*" ? "*" : origins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  };
}

module.exports = {
  DEFAULT_SOCKET_PATH,
  getSocketConfig,
};
