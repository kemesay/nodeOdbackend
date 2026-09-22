const { signBookingRoomToken } = require("../realtime/socketRoomToken.js");
const { getAirportBookById } = require("../services/airportBooking/airportBookService.js");
const {
  getPointToPointBookById,
} = require("../services/pointTopoint/pointToPointBookService.js");
const {
  getHourlyCharterBookById,
} = require("../services/hourlyCharter/hourlyCharterBookService.js");
const { ResourceNotFoundError } = require("../errors/CustomErrors.js");

const SOCKET_TYPES = {
  airport: "AIRPORT",
  p2p: "P2P",
  hourly: "HOURLY",
};

async function assertBookingAccess({ segment, bookingId, userId, isAdmin }) {
  const socketType = SOCKET_TYPES[segment];
  if (!socketType) {
    throw new ResourceNotFoundError("Invalid booking type.");
  }

  let book;
  if (segment === "airport") {
    book = await getAirportBookById(bookingId);
  } else if (segment === "p2p") {
    book = await getPointToPointBookById(bookingId);
  } else {
    book = await getHourlyCharterBookById(bookingId);
  }

  if (!book) {
    throw new ResourceNotFoundError("Booking not found.");
  }

  if (!isAdmin) {
    if (!book.userId || Number(book.userId) !== Number(userId)) {
      throw new ResourceNotFoundError("Booking not found.");
    }
  }

  return { bookingType: socketType, book };
}

async function getBookingRoomToken({ segment, bookingId, userId, isAdmin }) {
  const { bookingType } = await assertBookingAccess({
    segment,
    bookingId,
    userId,
    isAdmin,
  });

  return {
    provider: "socket.io",
    event: "payment.transaction.updated",
    roomToken: signBookingRoomToken({
      bookingType,
      bookingId,
      userId: userId || undefined,
    }),
  };
}

module.exports = {
  getBookingRoomToken,
  assertBookingAccess,
};
