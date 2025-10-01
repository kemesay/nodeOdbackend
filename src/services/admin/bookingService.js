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
const {
  formatDateTime,
  getP2PReservationDetails,
  getHourlyCharterDetails,
  getAirportServiceDetails,
} = require("../../utils/emailSenderHelper");

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
    const date = new Date();
    const pacificDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    const reservationDate = pacificDate;
    const reservationTime = `${pacificTime}`;

    let reservationDetails, fareDetails;
    try {
      if (bookingType === "P2P") {
        ({ reservationDetails, fareDetails } = getP2PReservationDetails(
          "Point to point",
          booking
        ));
      } else if (bookingType === "HOURLY_CHARTER") {
        ({ reservationDetails, fareDetails } = getHourlyCharterDetails(
          "Hourly Charter",
          booking
        ));
      } else if (bookingType === "AIRPORT") {
        ({ reservationDetails, fareDetails } = getAirportServiceDetails(
          "Airport Service",
          booking
        ));
      } else {
        throw new Error(`Invalid booking type: ${bookingType}`);
      }
    } catch (error) {
      console.error("Error getting reservation details for accepted booking email:", error);
      throw new Error(`Failed to get reservation details for accepted booking email: ${error.message}`);
    }

    emailData.name = booking.passengerFullName;
    emailData.reservationDate = reservationDate;
    emailData.reservationTime = reservationTime;
    emailData.userEmail = userEmail;

    emailData.contactDetails = {
      "Confirmation Number": booking.confirmationNumber,
      "Passenger Name": booking.passengerFullName,
      "Contact Phone": booking.passengerCellPhone,
      "Contact Email": userEmail,
    };
    emailData.reservationDetails = reservationDetails;
    emailData.fareDetails = fareDetails;
    emailData.totalFare = `$${Number(booking.totalTripFeeInDollars).toFixed(2)}`;

    if (typeof booking.discountAmountInDollars !== 'undefined' && booking.discountAmountInDollars > 0) {
      emailData.discountAmountInDollars = booking.discountAmountInDollars;
    }
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
