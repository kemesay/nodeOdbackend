const { getAirportBookById } = require("../airportBooking/airportBookService");
const {
  getPointToPointBookById,
} = require("../pointTopoint/pointToPointBookService");
const {
  getHourlyCharterBookById,
} = require("../hourlyCharter/hourlyCharterBookService");

const {
  sendBookingApprovalEmail,
  paymentNotification,
} = require("../../utils/emailSender");
const { findUserById } = require("../../services/user/userService");

async function adminBookingApproval(bookingReq) {
  const { bookingId, bookingType, action, rejectionReason } = bookingReq;

  const booking = await getBooking(bookingId, bookingType);

  booking.bookingStatus = action;
  await booking.save();
  await sendBookingApprovalEmailService(
    booking,
    bookingType,
    action,
    rejectionReason
  );

  return booking;
}

async function paymentStatusUpdate(bookingReq) {
  const { bookingId, bookingType } = bookingReq;

  const booking = await getBooking(bookingId, bookingType);

  booking.paymentStatus = "PAID";
  await booking.save();
  await sendPaymentStatusUpdateEmailService(booking, bookingType);

  return booking;
}

async function getBooking(bookingId, bookingType) {
  let booking;

  if (bookingType === "P2P") booking = await getPointToPointBookById(bookingId);
  else if (bookingType === "AIRPORT")
    booking = await getAirportBookById(bookingId);
  else booking = await getHourlyCharterBookById(bookingId);

  return booking;
}

async function sendBookingApprovalEmailService(
  booking,
  bookingType,
  action,
  rejectionReason
) {
  let bookingTypeFullName;
  let pickupLocation;

  if (bookingType === "P2P") {
    bookingTypeFullName = "Poin To Point";
    pickupLocation = booking.pickupPhysicalAddress;
  } else if (bookingType === "AIRPORT") {
    bookingTypeFullName = "Airport Booking Service";
    if (
      booking.tripType === "Ride to the airport(one way)" ||
      booking.tripType === "Ride to the airport(round trip)"
    ) {
      pickupLocation = booking.accommodationAddress;
    } else {
      pickupLocation = booking.Airport.airportName;
    }
  } else {
    bookingTypeFullName = "Hourly Charter";
    pickupLocation = booking.pickupPhysicalAddress;
  }

  const userEmail = booking.passengerEmail;

  const emailData = {};

  if (action === "ACCEPTED") {
    emailData.name = booking.passengerFullName;
    emailData.totalTripFee = booking.totalTripFeeInDollars;
    emailData.bookingType = bookingTypeFullName;
    emailData.pickupLocation = pickupLocation;
    emailData.pickupDate = booking.pickupDateTime;
  } else {
    emailData.name = booking.passengerFullName;
    emailData.bookingType = bookingTypeFullName;
    emailData.pickupLocation = pickupLocation;
    emailData.pickupDate = booking.pickupDateTime;
    emailData.rejectionReason = rejectionReason;
  }

  await sendBookingApprovalEmail(emailData, action, userEmail);
}

async function sendPaymentStatusUpdateEmailService(booking, bookingType) {
  let bookingTypeFullName;
  let pickupLocation;

  if (bookingType === "P2P") {
    bookingTypeFullName = "Poin To Point";
    pickupLocation = booking.pickupPhysicalAddress;
  } else if (bookingType === "AIRPORT") {
    bookingTypeFullName = "Airport Booking Service";
    if (
      booking.tripType === "Ride to the airport(one way)" ||
      booking.tripType === "Ride to the airport(round trip)"
    ) {
      pickupLocation = booking.accommodationAddress;
    } else {
      pickupLocation = booking.Airport.airportName;
    }
  } else {
    bookingTypeFullName = "Hourly Charter";
    pickupLocation = booking.pickupPhysicalAddress;
  }

  const userEmail = booking.passengerEmail;
  const passengerFullName = booking.passengerFullName;

  console.log("========================================");
  console.log(pickupLocation);
  console.log(booking.totalTripFeeInDollars);
  // Prepare data for email templates
  const data = {
    bookingType: bookingTypeFullName,
    name: passengerFullName,
    totalTripFee: booking.totalTripFeeInDollars,
    pickupLocation: pickupLocation,
    pickupDate: booking.pickupDateTime,
  };

  await paymentNotification(userEmail, data);
}

module.exports = {
  adminBookingApproval,
  paymentStatusUpdate,
};
