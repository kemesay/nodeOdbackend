function getP2PReservationDetails(bookingType, booking) {
  const reservationDetails = {
    "Service Type": `${bookingType} (${booking.tripType})`,
    "Travel By": booking.Car.carName,

    "Pickup Address": booking.pickupPhysicalAddress,
    "Drop off Address": booking.dropoffPhysicalAddress,
    "Travel Date & Time": booking.pickupDateTime,

    // Placeholder to maintain order
    "Return Pickup Address": null,
    "Return Drop off Address": null,
    "Return Date & Time": null,

    "Passengers/Bags":
      booking.numberOfPassengers + "/" + booking.numberOfSuitcases,

    "Stop on The Way Description": null,
  };

  if (booking.additionalStopOnTheWayDescription) {
    reservationDetails["Stop on The Way Description"] =
      booking.additionalStopOnTheWayDescription;
  } else {
    delete reservationDetails["Stop on The Way Description"];
  }

  // For Round-Trip
  const tripType = booking.tripType;
  if (tripType && tripType === "Round-Trip") {
    reservationDetails["Return Pickup Address"] =
      booking.dropoffPhysicalAddress;
    reservationDetails["Return Drop off Address"] =
      booking.pickupPhysicalAddress;
    reservationDetails["Return Date & Time"] = booking.returnPickupDateTime;
  } else {
    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date & Time"];
  }

  //ExtraOptions
  const extraOptions = booking.ExtraOptions;
  for (const extraOption of extraOptions) {
    reservationDetails[extraOption.name] =
      extraOption.PointToPointBookExtraOption.quantity;
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;

  //Fare Details
  const { pricePerMile, minimumStartFee } = booking.Car;
  const { percentage, description } = booking.Gratuity;

  let carPrice =
    Number(pricePerMile * booking.distanceInMiles) + Number(minimumStartFee);

  let extraOptionsPrice = 0;
  for (const extraOption of Object.values(extraOptions)) {
    extraOptionsPrice +=
      extraOption.pricePerItem *
      extraOption.PointToPointBookExtraOption.quantity;
  }

  const tripPrice = booking.totalTripFeeInDollars;
  let gratuity = `$${tripPrice * (percentage / 100)} (${description})`;
  if (percentage == 0) {
    gratuity = "Will tip in cash";
  }

  const fareDetails = {
    Fare: `$${carPrice}`,
    "Return Fare": `$${carPrice}`,
    "Stop On The Way Fare": null,
    "Extra Options Fare": `$${extraOptionsPrice}`,
    Gratuity: gratuity,
  };

  if (!(tripType === "Round-Trip")) delete fareDetails["Return Fare"];

  const additionalStopOnTheWay = booking.AdditionalStopOnTheWay;
  if (additionalStopOnTheWay) {
    fareDetails[
      "Stop On The Way Fare"
    ] = `$${additionalStopOnTheWay.additionalStopPrice}`;
  } else {
    delete fareDetails["Stop On The Way Fare"];
  }

  return { reservationDetails, fareDetails };
}

//============================================================================================================
function getHourlyCharterDetails(bookingType, booking) {
  const reservationDetails = {
    "Service Type": bookingType,
    "Travel By": booking.Car.carName,

    "Pickup Address": booking.pickupPhysicalAddress,
    "Drop off Address": booking.dropoffPhysicalAddress,
    "Travel Date & Time": booking.pickupDateTime,

    Occasion: booking.occasion,
    "Passengers/Bags":
      booking.numberOfPassengers + "/" + booking.numberOfSuitcases,
  };

  //ExtraOptions
  const extraOptions = booking.ExtraOptions;
  for (const extraOption of extraOptions) {
    reservationDetails[extraOption.name] =
      extraOption.HourlyCharterBookExtraOption.quantity;
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;

  //Fare Details
  const { pricePerHour } = booking.Car;
  const { percentage, description } = booking.Gratuity;

  const carPrice = pricePerHour * booking.selectedHours;

  let extraOptionsPrice = 0;
  for (const extraOption of Object.values(extraOptions)) {
    extraOptionsPrice +=
      extraOption.pricePerItem *
      extraOption.HourlyCharterBookExtraOption.quantity;
  }

  const tripPrice = booking.totalTripFeeInDollars;
  let gratuity = `$${tripPrice * (percentage / 100)} (${description})`;
  if (percentage == 0) {
    gratuity = "Will tip in cash";
  }

  const fareDetails = {
    Fare: `$${carPrice}`,
    "Extra Options Fare": `$${extraOptionsPrice}`,
    Gratuity: gratuity,
  };

  return { reservationDetails, fareDetails };
}

//==========================================================================================================

function getAirportServiceDetails(bookingType, booking) {
  const reservationDetails = {
    "Service Type": `${bookingType} (${booking.tripType})`,
    "Travel By": booking.Car.carName,

    "Pickup Address": null,
    "Drop off Address": null,
    "Travel Date & Time": null,

    // Placeholder to maintain order
    "Return Pickup Address": null,
    "Return Drop off Address": null,
    "Return Date & Time": null,

    "Airport Name": booking.Airport.airportName,
    "Airport Address": booking.Airport.airportAddress,

    Airline: null,
    "Arrival Flight Number": null,
    "Airport Pickup Preference": null,

    "Passengers/Bags":
      booking.numberOfPassengers + "/" + booking.numberOfSuitcases,

    "Stop on The Way Description": null,
  };

  const tripType = booking.tripType;
  if (tripType === "Ride from the airport(round trip)") {
    reservationDetails["Pickup Address"] = booking.Airport.airportName;
    reservationDetails["Drop off Address"] = booking.accommodationAddress;
    reservationDetails["Travel Date & Time"] = booking.pickupDateTime;

    reservationDetails["Return Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Return Drop off Address"] = booking.Airport.airportName;
    reservationDetails["Return Date & Time"] = booking.returnPickupDateTime;
  } else if (tripType === "Ride to the airport(round trip)") {
    reservationDetails["Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Drop off Address"] = booking.Airport.airportName;
    reservationDetails["Travel Date & Time"] = booking.pickupDateTime;

    reservationDetails["Return Pickup Address"] = booking.Airport.airportName;
    reservationDetails["Return Drop off Address"] =
      booking.accommodationAddress;
    reservationDetails["Return Date & Time"] = booking.returnPickupDateTime;
  } else if (tripType === "Ride to the airport(one way)") {
    reservationDetails["Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Drop off Address"] = booking.Airport.airportName;
    reservationDetails["Travel Date & Time"] = booking.pickupDateTime;

    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date & Time"];
  } else {
    reservationDetails["Pickup Address"] = booking.Airport.airportName;
    reservationDetails["Drop off Address"] = booking.accommodationAddress;
    reservationDetails["Travel Date & Time"] = booking.pickupDateTime;

    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date & Time"];
  }

  // For Round-Trip
  const airportPickupPreference = booking.AirportPickupPreference;
  if (airportPickupPreference) {
    reservationDetails["Airport Pickup Preference"] =
      airportPickupPreference.preferenceName;
  } else {
    delete reservationDetails["Airport Pickup Preference"];
  }

  if (booking.airline) {
    reservationDetails["Airline"] = booking.airline;
  } else {
    delete reservationDetails["Airline"];
  }

  if (booking.arrivalFlightNumber) {
    reservationDetails["Arrival Flight Number"] = booking.arrivalFlightNumber;
  } else {
    delete reservationDetails["Arrival Flight Number"];
  }

  if (booking.additionalStopOnTheWayDescription) {
    reservationDetails["Stop on The Way Description"] =
      booking.additionalStopOnTheWayDescription;
  } else {
    delete reservationDetails["Stop on The Way Description"];
  }

  //ExtraOptions
  const extraOptions = booking.ExtraOptions;
  for (const extraOption of extraOptions) {
    reservationDetails[extraOption.name] =
      extraOption.AirportBookExtraOption.quantity;
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;

  //====================Fare Details==========================
  const { pricePerMile, minimumStartFee } = booking.Car;
  const { percentage, description } = booking.Gratuity;

  let carPrice =
    Number(pricePerMile * booking.distanceInMiles) + Number(minimumStartFee);

  let extraOptionsPrice = 0;
  for (const extraOption of Object.values(extraOptions)) {
    extraOptionsPrice +=
      extraOption.pricePerItem * extraOption.AirportBookExtraOption.quantity;
  }

  const tripPrice = booking.totalTripFeeInDollars;
  let gratuity = `$${tripPrice * (percentage / 100)} (${description})`;
  if (percentage == 0) {
    gratuity = "Will tip in cash";
  }

  const fareDetails = {
    Fare: `$${carPrice}`,
    "Return Fare": `$${carPrice}`,
    "Stop On The Way Fare": "$0",
    "Airport Pickup Preference Fare": "$0",
    "Extra Options Fare": `$${extraOptionsPrice}`,
    Gratuity: gratuity,
  };

  const isRoundTrip =
    booking.tripType === "Ride to the airport(round trip)" ||
    booking.tripType === "Ride from the airport(round trip)";
  if (!isRoundTrip) delete fareDetails["Return Fare"];

  if (airportPickupPreference) {
    fareDetails[
      "Airport Pickup Preference Fare"
    ] = `$${airportPickupPreference.preferencePrice}`;
  }

  const additionalStopOnTheWay = booking.AdditionalStopOnTheWay;
  if (additionalStopOnTheWay) {
    fareDetails[
      "Stop On The Way Fare"
    ] = `$${additionalStopOnTheWay.additionalStopPrice}`;
  } else {
    delete fareDetails["Stop On The Way Fare"];
  }

  return { reservationDetails, fareDetails };
}

module.exports = {
  getP2PReservationDetails,
  getHourlyCharterDetails,
  getAirportServiceDetails,
};
