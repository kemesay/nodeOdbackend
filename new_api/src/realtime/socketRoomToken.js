const jwt = require("jsonwebtoken");

const DEFAULT_TTL_SECONDS = 15 * 60; // 15 minutes

function getSocketRoomSecret() {
  return (
    process.env.SOCKET_ROOM_JWT_SECRET ||
    process.env.JWT_PRIVATE_KEY ||
    ""
  );
}

function assertSecret() {
  const secret = getSocketRoomSecret();
  if (!secret) {
    throw new Error(
      "SOCKET_ROOM_JWT_SECRET (or JWT_PRIVATE_KEY) is required for socket room tokens."
    );
  }
  return secret;
}

function roomForBooking(bookingType, bookingId) {
  return `booking:${String(bookingType)}:${String(bookingId)}`;
}

function signBookingRoomToken({ bookingType, bookingId, userId, ttlSeconds }) {
  const secret = assertSecret();
  const room = roomForBooking(bookingType, bookingId);
  const payload = {
    typ: "booking_room",
    room,
    bookingType: String(bookingType),
    bookingId: String(bookingId),
    userId: userId ? String(userId) : undefined,
  };
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds || DEFAULT_TTL_SECONDS });
}

function verifyBookingRoomToken(token) {
  const secret = assertSecret();
  const decoded = jwt.verify(token, secret);
  if (decoded?.typ !== "booking_room" || typeof decoded?.room !== "string") {
    throw new Error("Invalid room token");
  }
  return decoded;
}

module.exports = {
  roomForBooking,
  signBookingRoomToken,
  verifyBookingRoomToken,
};

