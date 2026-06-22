let _io = null;
const { verifyBookingRoomToken } = require("./socketRoomToken.js");
const { getSocketConfig } = require("../config/socketConfig.js");

function initSocket(server) {
  const { Server } = require("socket.io");
  const socketOptions = getSocketConfig();

  _io = new Server(server, socketOptions);

  if (process.env.NODE_ENV !== "test") {
    console.log(`Socket.IO listening on path ${socketOptions.path}`);
  }

  _io.on("connection", (socket) => {
    // Secure-ish join: client sends a short-lived signed token for a specific room.
    socket.on("join", (payload) => {
      try {
        const token = payload?.token;
        if (typeof token !== "string" || token.length > 2048) return;
        const decoded = verifyBookingRoomToken(token);
        socket.join(decoded.room);
      } catch (_) {
        // ignore
      }
    });
    socket.on("leave", (payload) => {
      try {
        const token = payload?.token;
        if (typeof token !== "string" || token.length > 2048) return;
        const decoded = verifyBookingRoomToken(token);
        socket.leave(decoded.room);
      } catch (_) {
        // ignore
      }
    });
  });

  return _io;
}

function getIo() {
  return _io;
}

function roomForBooking(bookingType, bookingId) {
  return `booking:${String(bookingType)}:${String(bookingId)}`;
}

function emitPaymentTransactionUpdated(tx) {
  if (!_io || !tx) return;
  const room = roomForBooking(tx.bookingType, tx.bookingId);
  _io.to(room).emit("payment.transaction.updated", {
    bookingType: tx.bookingType,
    bookingId: tx.bookingId,
    confirmationNumber: tx.confirmationNumber || null,
    squarePaymentId: tx.squarePaymentId || null,
    status: tx.status,
    amountCents: tx.amountCents,
    currency: tx.currency || "USD",
    updatedAt: tx.updatedAt,
  });
}

module.exports = {
  initSocket,
  getIo,
  roomForBooking,
  emitPaymentTransactionUpdated,
};

