const { HourlyCharterBook } = require("../models/HourlyCharterBook.js");
const { PointToPointBook } = require("../models/PointToPointBook.js");
const { AirportBook } = require("../models/airportBooking/AirportBook.js");
const { Car } = require("../models/Car.js");
const { Op } = require("sequelize");

// Define a function to search user bookings by user ID
async function searchUserBookingsByUserId(userId) {
  // Define options for querying
  const queryOptions = {
    where: {
      userId: userId,
      deletedAt: { [Op.is]: null }, // Filter out soft-deleted records
    },
    order: [["updatedAt", "DESC"]],
    attributes: { exclude: ["deletedAt"] },
    include: [
      {
        model: Car, // Include the Car model
        attributes: ["carImageUrl"],
      },
    ],
  };

  // Search point-to-point bookings
  const pointToPointBookings = await PointToPointBook.findAll(queryOptions);

  // Search hourly charter bookings
  const hourlyCharterBookings = await HourlyCharterBook.findAll(queryOptions);

  // Search airport bookings
  const airportBookings = await AirportBook.findAll(queryOptions);

  return {
    pointToPointBookings,
    hourlyCharterBookings,
    airportBookings,
  };
}

async function calculateP2PTotalTripPrice(booking) {
  const { pricePerMile, minimumStartFee } = booking.Car;
  const percentage = booking.Gratuity.percentage;

  let carPrice =
    Number(pricePerMile * booking.distanceInMiles) + Number(minimumStartFee);
  
    if (booking.tripType === "Round-Trip") carPrice *= 2;

  let additionalStopPrice = booking.AdditionalStopOnTheWay
    ? booking.AdditionalStopOnTheWay.additionalStopPrice
    : 0;

  let extraOptionsPrice = 0;
  if (booking.ExtraOptions) {
    for (const extraOption of Object.values(booking.ExtraOptions)) {
      extraOptionsPrice +=
        extraOption.pricePerItem *
        extraOption.PointToPointBookExtraOption.quantity;
    }
  }

  const tripPrice =
    Number(carPrice) + Number(additionalStopPrice) + Number(extraOptionsPrice);

  return tripPrice + tripPrice * (percentage / 100);
}

async function calculateHourlyCharterTotalTripPrice(booking) {
  const { pricePerHour, minimumStartFee } = booking.Car;
  const percentage = booking.Gratuity.percentage;

  let carPrice = pricePerHour * booking.selectedHours;

  let extraOptionsPrice = 0;
  if (booking.ExtraOptions) {
    for (const extraOption of Object.values(booking.ExtraOptions)) {
      extraOptionsPrice +=
        extraOption.pricePerItem *
        extraOption.HourlyCharterBookExtraOption.quantity;
    }
  }

  const tripPrice =
    Number(minimumStartFee) + Number(carPrice) + Number(extraOptionsPrice);

  return tripPrice + tripPrice * (percentage / 100);
}

async function calculateAirportBookingTotalTripPrice(booking) {
  const { pricePerMile, minimumStartFee } = booking.Car;
  const percentage = booking.Gratuity.percentage;

  let carPrice =
    Number(pricePerMile * booking.distanceInMiles) + Number(minimumStartFee);

  const isRoundTrip =
    booking.tripType === "Ride to the airport(round trip)" ||
    booking.tripType === "Ride from the airport(round trip)";
  if (isRoundTrip) carPrice *= 2;

  let additionalStopPrice = booking.AdditionalStopOnTheWay
    ? booking.AdditionalStopOnTheWay.additionalStopPrice
    : 0;

  let airportPickupPreferencePrice = booking.AirportPickupPreference
    ? booking.AirportPickupPreference.preferencePrice
    : 0;

  let extraOptionsPrice = 0;
  if (booking.ExtraOptions) {
    for (const extraOption of Object.values(booking.ExtraOptions)) {
      extraOptionsPrice +=
        extraOption.pricePerItem * extraOption.AirportBookExtraOption.quantity;
    }
  }

  const tripPrice =
    Number(carPrice) +
    Number(additionalStopPrice) +
    Number(airportPickupPreferencePrice) +
    Number(extraOptionsPrice);

  return tripPrice + tripPrice * (percentage / 100);
}

module.exports = {
  searchUserBookingsByUserId,
  calculateP2PTotalTripPrice,
  calculateHourlyCharterTotalTripPrice,
  calculateAirportBookingTotalTripPrice,
};
