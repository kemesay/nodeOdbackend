
const {
  getAirportTerminalName,
  getAirportTerminalAddress,
} = require("./airportBookingDisplay.js");
const {
  calculatePointToPointFare,
  calculateHourlyCharterFare,
  calculateAirportFare,
  isRoundTripTripType,
  roundMoney,
  asMoney,
} = require("./bookingFareCalculator.js");

function formatDateTime(dateString) {
  const date = new Date(dateString);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return {
    date: formattedDate,
    time: `${formattedTime}`,
  };
}

function formatUsd(amount) {
  return `$${roundMoney(amount).toFixed(2)}`;
}

function gratuityEmailLabel(booking, gratuityAmount) {
  const pct = asMoney(booking.Gratuity?.percentage);
  const desc = booking.Gratuity?.description || "";
  if (pct <= 0) return "Will tip in cash";
  const label = desc || `${pct}%`;
  return `${formatUsd(gratuityAmount)} (${label})`;
}

function applyDiscountToFareDetails(fareDetails, booking) {
  // Promo-code and admin-manual discounts are tracked in separate columns
  // (see PromoCode.js / the applyDiscountToXBook functions) precisely so
  // one can never silently overwrite the other — shown as separate line
  // items here for the same reason, rather than summing them into one
  // "Discount" figure that would hide which discount actually applied.
  if (asMoney(booking.promoDiscountAmountInDollars) > 0) {
    fareDetails["Promo Discount"] = `-${formatUsd(booking.promoDiscountAmountInDollars)}`;
  }
  if (booking.hasDiscountApplied && asMoney(booking.discountAmountInDollars) > 0) {
    fareDetails.Discount = `-${formatUsd(booking.discountAmountInDollars)}`;
  }
  return fareDetails;
}

function extrasPerLegFromTotal(extraOptionsTotal, roundTrip) {
  const total = asMoney(extraOptionsTotal);
  if (total <= 0) return 0;
  return roundTrip ? roundMoney(total / 2) : total;
}

/**
 * calculatePointToPointFare/calculateAirportFare are called from this file
 * with no `sideDetourSettings` (the email helper has no admin-settings
 * lookup of its own), so their returned breakdown.sideDetourFee is always 0
 * from this call site — not a missing fee, just a blind spot in how it's
 * computed here. The booking loader (getPointToPointBookById/getAirportBookById)
 * already computed the real fee against the live Side Detour Settings and
 * stashed it directly on the booking row as `sideDetourFee`, so that's the
 * number the email should show instead of recomputing (and getting 0 from)
 * the fare breakdown.
 */
function sideDetourFeeDisplay(booking) {
  // `sideDetourFee` is stashed onto the booking via setDataValue() in
  // getPointToPointBookById/getAirportBookById — it's NOT a declared model
  // attribute, so Sequelize never generates a plain-property getter for it.
  // Plain `booking.sideDetourFee` silently reads as undefined on a real
  // model instance (confirmed directly: only `.get("sideDetourFee")`,
  // `.dataValues.sideDetourFee`, or `.toJSON().sideDetourFee` actually see
  // it). The website never hit this because it only ever sees the
  // already-JSON-serialized response; this file runs in-process on the live
  // Sequelize instance itself, straight out of the booking service, before
  // any res.json() has flattened it. `.get` is checked rather than assumed
  // so this still works if ever called with a plain object (e.g. a test).
  const raw =
    typeof booking.get === "function"
      ? booking.get("sideDetourFee")
      : booking.sideDetourFee;
  return asMoney(raw);
}

/**
 * Same reasoning and same Sequelize setDataValue gotcha as sideDetourFeeDisplay
 * above, for Hourly Charter's Long Distance Fee — stashed onto the booking via
 * setDataValue() in getHourlyCharterBookById, not a declared model attribute.
 */
function longDistanceFeeDisplay(booking) {
  const raw =
    typeof booking.get === "function"
      ? booking.get("longDistanceFee")
      : booking.longDistanceFee;
  return asMoney(raw);
}

/**
 * Side-pick detour stops are a list of SidePickDetour rows, not a single
 * denormalized column like "Stop on The Way" — so each stop gets its own
 * numbered reservationDetails key rather than one joined value. Both email
 * templates render reservationDetails as one table row per key via a plain
 * `Object.entries(...).forEach(...)` loop with no support for an array or a
 * multi-line value, so numbered keys are the zero-template-change way to
 * show more than one stop. A single stop renders as "Side Stop" (nothing
 * to number); not ordered by the DB query, so sorted by sortOrder here.
 */
function addSideDetourStops(reservationDetails, booking) {
  const stops = Array.isArray(booking.SidePickDetours)
    ? [...booking.SidePickDetours].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      )
    : [];
  if (stops.length === 0) return;
  if (stops.length === 1) {
    reservationDetails["Side Stop"] = stops[0].address;
    return;
  }
  stops.forEach((stop, index) => {
    reservationDetails[`Side Stop ${index + 1}`] = stop.address;
  });
}

function buildP2PFareDetails(booking) {
  const { breakdown } = calculatePointToPointFare(booking);
  const roundTrip = booking.tripType === "Round-Trip";
  const extrasPerLeg = extrasPerLegFromTotal(
    breakdown.extraOptionsPrice,
    roundTrip
  );

  const fareDetails = {
    Fare: formatUsd(breakdown.legCarFare),
    "Child Car Seat Fee": formatUsd(extrasPerLeg),
    Gratuity: gratuityEmailLabel(booking, breakdown.gratuity),
  };

  if (roundTrip) {
    fareDetails["Return Fare"] = formatUsd(breakdown.legCarFare);
    fareDetails["Return Child Car Seat Fee"] = formatUsd(extrasPerLeg);
  }

  if (breakdown.additionalStopPrice > 0) {
    fareDetails["Stop On The Way Fare"] = formatUsd(
      breakdown.additionalStopPrice
    );
  }

  const sideDetourFee = sideDetourFeeDisplay(booking);
  if (sideDetourFee > 0) {
    fareDetails["Side Stop Fee"] = formatUsd(sideDetourFee);
  }

  return applyDiscountToFareDetails(fareDetails, booking);
}

function buildHourlyFareDetails(booking) {
  const { breakdown } = calculateHourlyCharterFare(booking);

  const fareDetails = {
    Fare: formatUsd(breakdown.carFare),
    "Child Car Seat Fee": formatUsd(breakdown.extraOptionsPrice),
    Gratuity: gratuityEmailLabel(booking, breakdown.gratuity),
  };

  const longDistanceFee = longDistanceFeeDisplay(booking);
  if (longDistanceFee > 0) {
    fareDetails["Long Distance Fee"] = formatUsd(longDistanceFee);
  }

  return applyDiscountToFareDetails(fareDetails, booking);
}

function buildAirportFareDetails(booking) {
  const { breakdown } = calculateAirportFare(booking);
  const roundTrip = isRoundTripTripType(booking.tripType);
  const extrasPerLeg = extrasPerLegFromTotal(
    breakdown.extraOptionsPrice,
    roundTrip
  );

  const fareDetails = {
    Fare: formatUsd(breakdown.legCarFare),
    "Child Car Seat Fee": formatUsd(extrasPerLeg),
    Gratuity: gratuityEmailLabel(booking, breakdown.gratuity),
  };

  if (roundTrip) {
    fareDetails["Return Fare"] = formatUsd(breakdown.legCarFare);
    fareDetails["Return Child Car Seat Fee"] = formatUsd(extrasPerLeg);
  }

  if (breakdown.airportPickupPreferencePrice > 0) {
    fareDetails["Airport Pickup Preference Fare"] = formatUsd(
      breakdown.airportPickupPreferencePrice
    );
  }

  if (breakdown.additionalStopPrice > 0) {
    fareDetails["Stop On The Way Fare"] = formatUsd(
      breakdown.additionalStopPrice
    );
  }

  const sideDetourFee = sideDetourFeeDisplay(booking);
  if (sideDetourFee > 0) {
    fareDetails["Side Stop Fee"] = formatUsd(sideDetourFee);
  }

  return applyDiscountToFareDetails(fareDetails, booking);
}

function getP2PReservationDetails(bookingType, booking) {
  const pickupDateTime = formatDateTime(booking.pickupDateTime);
  const returnDateTime = formatDateTime(booking.returnPickupDateTime);

  const reservationDetails = {
    "Service Type": `${bookingType} (${booking.tripType})`,
    "Travel By": booking.Car?.carName || "",

    "Pickup Address": booking.pickupPhysicalAddress,
    "Drop off Address": booking.dropoffPhysicalAddress,
    "Travel Date on": pickupDateTime.date,
    "Travel Time at": pickupDateTime.time,

    "Return Pickup Address": null,
    "Return Drop off Address": null,
    "Return Date on": returnDateTime.date,
    "Return Time on": returnDateTime.time,

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

  addSideDetourStops(reservationDetails, booking);

  const tripType = booking.tripType;
  if (tripType && tripType === "Round-Trip") {
    reservationDetails["Return Pickup Address"] =
      booking.dropoffPhysicalAddress;
    reservationDetails["Return Drop off Address"] =
      booking.pickupPhysicalAddress;
    reservationDetails["Return Date on"] = returnDateTime.date;
    reservationDetails["Return Time on"] = returnDateTime.time;
  } else {
    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date on"];
    delete reservationDetails["Return Time on"];
  }

  const extraOptions = booking.ExtraOptions || [];
  for (const extraOption of extraOptions) {
    const qty = extraOption?.PointToPointBookExtraOption?.quantity;
    if (qty != null) {
      reservationDetails[extraOption.name] = qty;
    }
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;

  const fareDetails = buildP2PFareDetails(booking);

  return { reservationDetails, fareDetails };
}

function getHourlyCharterDetails(bookingType, booking) {
  const pickupDateTime = formatDateTime(booking.pickupDateTime);

  const reservationDetails = {
    "Service Type": bookingType,
    "Travel By": booking.Car?.carName || "",

    "Pickup Address": booking.pickupPhysicalAddress,
    "Drop off Address": booking.dropoffPhysicalAddress,
    "Travel Date on": pickupDateTime.date,
    "Travel Time at": pickupDateTime.time,

    Occasion: booking.occasion,
    "Passengers/Bags":
      booking.numberOfPassengers + "/" + booking.numberOfSuitcases,
  };

  const extraOptions = booking.ExtraOptions || [];
  for (const extraOption of extraOptions) {
    const qty = extraOption?.HourlyCharterBookExtraOption?.quantity;
    if (qty != null) {
      reservationDetails[extraOption.name] = qty;
    }
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;
  reservationDetails["Selected Hour"] = booking.selectedHours;

  const fareDetails = buildHourlyFareDetails(booking);

  return { reservationDetails, fareDetails };
}

function getAirportServiceDetails(bookingType, booking) {
  const pickupDateTime = formatDateTime(booking.pickupDateTime);
  const returnDateTime = formatDateTime(booking.returnPickupDateTime);

  const airportTerminalName = getAirportTerminalName(booking);
  const airportTerminalAddress = getAirportTerminalAddress(booking);

  const reservationDetails = {
    "Service Type": `${bookingType} (${booking.tripType})`,
    "Travel By": booking.Car?.carName || "",

    "Pickup Address": null,
    "Drop off Address": null,
    "Travel Date on": pickupDateTime.date,
    "Travel Time at": pickupDateTime.time,

    "Return Pickup Address": null,
    "Return Drop off Address": null,
    "Return Date on": returnDateTime.date,
    "Return Time at": returnDateTime.time,

    "Airport Name": airportTerminalName,
    "Airport Address": airportTerminalAddress,

    Airline: null,
    "Arrival Flight Number": null,
    "Airport Pickup Preference": null,

    "Passengers/Bags":
      booking.numberOfPassengers + "/" + booking.numberOfSuitcases,

    "Stop on The Way Description": null,
  };

  const tripType = booking.tripType;
  if (tripType === "Ride from the airport(round trip)") {
    reservationDetails["Pickup Address"] = airportTerminalName;
    reservationDetails["Drop off Address"] = booking.accommodationAddress;
    reservationDetails["Return Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Return Drop off Address"] = airportTerminalName;
    reservationDetails["Return Date on"] = returnDateTime.date;
    reservationDetails["Return Time at"] = returnDateTime.time;
  } else if (tripType === "Ride to the airport(round trip)") {
    reservationDetails["Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Drop off Address"] = airportTerminalName;
    reservationDetails["Return Pickup Address"] = airportTerminalName;
    reservationDetails["Return Drop off Address"] =
      booking.accommodationAddress;
    reservationDetails["Return Date on"] = returnDateTime.date;
    reservationDetails["Return Time at"] = returnDateTime.time;
  } else if (tripType === "Ride to the airport(one way)") {
    reservationDetails["Pickup Address"] = booking.accommodationAddress;
    reservationDetails["Drop off Address"] = airportTerminalName;
    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date on"];
    delete reservationDetails["Return Time at"];
  } else {
    reservationDetails["Pickup Address"] = airportTerminalName;
    reservationDetails["Drop off Address"] = booking.accommodationAddress;
    delete reservationDetails["Return Pickup Address"];
    delete reservationDetails["Return Drop off Address"];
    delete reservationDetails["Return Date on"];
    delete reservationDetails["Return Time at"];
  }

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

  if (booking.returnAirline) {
    reservationDetails["Return AirLine"] = booking.returnAirline;
  } else {
    delete reservationDetails["Return AirLine"];
  }

  if (booking.returnFlightNumber) {
    reservationDetails["Return Flight Number"] = booking.returnFlightNumber;
  } else {
    delete reservationDetails["Return Flight Number"];
  }

  if (booking.additionalStopOnTheWayDescription) {
    reservationDetails["Stop on The Way Description"] =
      booking.additionalStopOnTheWayDescription;
  } else {
    delete reservationDetails["Stop on The Way Description"];
  }

  addSideDetourStops(reservationDetails, booking);

  const extraOptions = booking.ExtraOptions || [];
  for (const extraOption of extraOptions) {
    const qty = extraOption?.AirportBookExtraOption?.quantity;
    if (qty != null) {
      reservationDetails[extraOption.name] = qty;
    }
  }

  reservationDetails["Travel Instruction"] = booking.specialInstructions;

  const fareDetails = buildAirportFareDetails(booking);

  return { reservationDetails, fareDetails };
}

module.exports = {
  formatDateTime,
  getP2PReservationDetails,
  getHourlyCharterDetails,
  getAirportServiceDetails,
};
