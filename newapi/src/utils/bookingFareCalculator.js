/**
 * Canonical trip fare math — keep in sync with oda-ride-transport/src/utils/bookingFeeCalculator.js
 * and oda-black-car-service/lib/core/utils/pricing_calculator.dart
 */

function asMoney(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Number(asMoney(value).toFixed(2));
}

/**
 * Parse a dollar amount for Square (accepts DECIMAL strings from Sequelize).
 * @returns {number|null} positive dollars rounded to 2 decimals, or null if invalid
 */
function parsePaymentAmountDollars(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney(n);
}

function isRoundTripTripType(tripType) {
  const t = String(tripType || "");
  return (
    t === "Round-Trip" ||
    t === "Ride to the airport(round trip)" ||
    t === "Ride from the airport(round trip)"
  );
}

/**
 * One-way leg vehicle fare from car rate card.
 * P2P / Airport: pricePerMile × miles + minimumStartFee
 * Hourly: pricePerHour × hours (minimum start fee is not added on hourly)
 */
function legCarFareFromCar(car, { bookingKind, distanceInMiles, selectedHours }) {
  if (!car) return 0;

  const pricePerMile = asMoney(car.pricePerMile);
  const pricePerHour = asMoney(car.pricePerHour);
  const minimumStartFee = asMoney(car.minimumStartFee);

  if (bookingKind === "HOURLY") {
    const hours = Math.max(asMoney(selectedHours), 0);
    return roundMoney(pricePerHour * hours);
  }

  const miles = Math.max(asMoney(distanceInMiles), 0);
  return roundMoney(pricePerMile * miles + minimumStartFee);
}

function gratuityOnCarFare(legCarFare, percentage, tripType) {
  const pct = asMoney(percentage);
  if (pct <= 0) return 0;
  const perLeg = legCarFare * (pct / 100);
  return roundMoney(isRoundTripTripType(tripType) ? perLeg * 2 : perLeg);
}

function sumExtraOptionsPrice(extraOptions, throughKey, { roundTrip }) {
  if (!extraOptions) return 0;

  const list = Array.isArray(extraOptions)
    ? extraOptions
    : Object.values(extraOptions);

  let total = 0;
  for (const option of list) {
    if (!option) continue;
    const junction = option[throughKey];
    const qty = asMoney(junction?.quantity);
    const unit = asMoney(option.pricePerItem);
    if (qty <= 0) continue;
    total += unit * qty;
  }

  if (roundTrip) total *= 2;
  return roundMoney(total);
}

function detectBookingKind(booking) {
  if (booking.hourlyCharterBookId != null || booking.selectedHours != null) {
    if (booking.airportBookId == null && booking.pointToPointBookId == null) {
      return "HOURLY";
    }
    if (booking.selectedHours != null && !booking.distanceInMiles) {
      return "HOURLY";
    }
  }
  if (booking.airportBookId != null) return "AIRPORT";
  if (booking.pointToPointBookId != null) return "P2P";
  if (booking.selectedHours != null && !booking.distanceInMiles) return "HOURLY";
  return "P2P";
}

function assertCarForFare(car) {
  if (!car) {
    throw new Error("Unable to calculate price: missing car (carId / rate card).");
  }
  const kind = car.pricePerHour > 0 || car.pricePerMile > 0;
  if (!kind && asMoney(car.minimumStartFee) <= 0) {
    throw new Error("Unable to calculate price: car rate card has no pricing fields.");
  }
}

/** True when Car association includes at least one pricing column (not just image/name). */
function carHasFareRates(car) {
  if (!car) return false;
  return (
    car.pricePerMile != null ||
    car.pricePerHour != null ||
    car.minimumStartFee != null
  );
}

/**
 * @returns {{ total: number, breakdown: object }}
 */
function calculatePointToPointFare(booking) {
  assertCarForFare(booking.Car);
  const roundTrip = booking.tripType === "Round-Trip";
  const legCar = legCarFareFromCar(booking.Car, {
    bookingKind: "P2P",
    distanceInMiles: booking.distanceInMiles,
  });
  const carFare = roundMoney(legCar * (roundTrip ? 2 : 1));

  const additionalStopPrice = booking.AdditionalStopOnTheWay
    ? asMoney(booking.AdditionalStopOnTheWay.additionalStopPrice)
    : 0;

  const extraOptionsPrice = sumExtraOptionsPrice(
    booking.ExtraOptions,
    "PointToPointBookExtraOption",
    { roundTrip }
  );

  const subtotal = roundMoney(carFare + additionalStopPrice + extraOptionsPrice);
  const gratuityPct = asMoney(booking.Gratuity?.percentage);
  const gratuity = gratuityOnCarFare(legCar, gratuityPct, booking.tripType);
  const total = roundMoney(subtotal + gratuity);

  return {
    total,
    breakdown: {
      legCarFare: legCar,
      carFare,
      additionalStopPrice,
      extraOptionsPrice,
      gratuity,
      subtotal,
    },
  };
}

function calculateHourlyCharterFare(booking) {
  assertCarForFare(booking.Car);
  const legCar = legCarFareFromCar(booking.Car, {
    bookingKind: "HOURLY",
    selectedHours: booking.selectedHours,
  });
  const carFare = legCar;

  const extraOptionsPrice = sumExtraOptionsPrice(
    booking.ExtraOptions,
    "HourlyCharterBookExtraOption",
    { roundTrip: false }
  );

  const subtotal = roundMoney(carFare + extraOptionsPrice);
  const gratuityPct = asMoney(booking.Gratuity?.percentage);
  const gratuity = gratuityOnCarFare(legCar, gratuityPct, booking.tripType);
  const total = roundMoney(subtotal + gratuity);

  return {
    total,
    breakdown: {
      legCarFare: legCar,
      carFare,
      extraOptionsPrice,
      gratuity,
      subtotal,
    },
  };
}

function calculateAirportFare(booking) {
  assertCarForFare(booking.Car);
  const roundTrip = isRoundTripTripType(booking.tripType);
  const legCar = legCarFareFromCar(booking.Car, {
    bookingKind: "AIRPORT",
    distanceInMiles: booking.distanceInMiles,
  });
  const carFare = roundMoney(legCar * (roundTrip ? 2 : 1));

  const additionalStopPrice = booking.AdditionalStopOnTheWay
    ? asMoney(booking.AdditionalStopOnTheWay.additionalStopPrice)
    : 0;

  const airportPickupPreferencePrice = booking.AirportPickupPreference
    ? asMoney(booking.AirportPickupPreference.preferencePrice)
    : 0;

  const extraOptionsPrice = sumExtraOptionsPrice(
    booking.ExtraOptions,
    "AirportBookExtraOption",
    { roundTrip }
  );

  const subtotal = roundMoney(
    carFare + additionalStopPrice + airportPickupPreferencePrice + extraOptionsPrice
  );
  const gratuityPct = asMoney(booking.Gratuity?.percentage);
  const gratuity = gratuityOnCarFare(legCar, gratuityPct, booking.tripType);
  const total = roundMoney(subtotal + gratuity);

  return {
    total,
    breakdown: {
      legCarFare: legCar,
      carFare,
      additionalStopPrice,
      airportPickupPreferencePrice,
      extraOptionsPrice,
      gratuity,
      subtotal,
    },
  };
}

/**
 * Extra-time charge for LIVE billing mode — time beyond the booked/base hours.
 * Plain linear rate: pricePerHour × extraHours. No overtime premium/multiplier —
 * the customer pays the same per-hour rate whether under, at, or over their
 * booked hours (the booked-hours minimum charge is enforced by the caller).
 */
function calculateExtraTimeFare(pricePerHour, extraHours) {
  const hours = Math.max(asMoney(extraHours), 0);
  if (hours <= 0) return 0;
  return roundMoney(asMoney(pricePerHour) * hours);
}

/**
 * Pre-authorization amount for LIVE billing mode.
 * Authorizes (selectedHours + bufferHours) so the card hold covers overtime.
 */
function calculateLiveModePreAuthAmount({
  car,
  selectedHours,
  bufferHours = 2,
  gratuityPercentage = 0,
  extraOptionsPerLeg = 0,
}) {
  assertCarForFare(car);
  const totalHours = asMoney(selectedHours) + asMoney(bufferHours);
  const legCar = roundMoney(asMoney(car.pricePerHour) * totalHours);
  const extras = roundMoney(asMoney(extraOptionsPerLeg));
  const subtotal = roundMoney(legCar + extras);
  const gratuity = gratuityOnCarFare(legCar, gratuityPercentage);
  return roundMoney(subtotal + gratuity);
}

function calculateBookingFare(booking, bookingKind) {
  const kind =
    bookingKind ||
    (booking.hourlyCharterBookId != null
      ? "HOURLY"
      : booking.airportBookId != null
        ? "AIRPORT"
        : detectBookingKind(booking));

  switch (kind) {
    case "HOURLY":
    case "HOURLY_CHARTER":
      return calculateHourlyCharterFare(booking);
    case "AIRPORT":
      return calculateAirportFare(booking);
    case "P2P":
    case "POINT_TO_POINT":
    default:
      return calculatePointToPointFare(booking);
  }
}

/**
 * Quote from raw inputs (for POST /bookings/quote and client previews).
 */
function quoteFare({
  bookingKind,
  car,
  tripType,
  distanceInMiles,
  selectedHours,
  gratuityPercentage = 0,
  additionalStopPrice = 0,
  airportPickupPreferencePrice = 0,
  extraOptionsPerLeg = 0,
}) {
  assertCarForFare(car);
  const kind = String(bookingKind || "P2P").toUpperCase();
  const roundTrip = isRoundTripTripType(tripType);

  if (kind === "HOURLY" || kind === "HOURLY_CHARTER") {
    const legCar = legCarFareFromCar(car, {
      bookingKind: "HOURLY",
      selectedHours,
    });
    const extras = roundMoney(asMoney(extraOptionsPerLeg));
    const subtotal = roundMoney(legCar + extras);
    const gratuity = gratuityOnCarFare(legCar, gratuityPercentage, tripType);
    return { total: roundMoney(subtotal + gratuity), legCarFare: legCar, gratuity };
  }

  const legCar = legCarFareFromCar(car, {
    bookingKind: kind === "AIRPORT" ? "AIRPORT" : "P2P",
    distanceInMiles,
  });
  const carFare = roundMoney(legCar * (roundTrip ? 2 : 1));
  const extras = roundMoney(asMoney(extraOptionsPerLeg) * (roundTrip ? 2 : 1));
  const subtotal = roundMoney(
    carFare +
      asMoney(additionalStopPrice) +
      asMoney(airportPickupPreferencePrice) +
      extras
  );
  const gratuity = gratuityOnCarFare(legCar, gratuityPercentage, tripType);
  return {
    total: roundMoney(subtotal + gratuity),
    legCarFare: legCar,
    carFare,
    gratuity,
  };
}

module.exports = {
  asMoney,
  parsePaymentAmountDollars,
  roundMoney,
  isRoundTripTripType,
  legCarFareFromCar,
  gratuityOnCarFare,
  carHasFareRates,
  calculatePointToPointFare,
  calculateHourlyCharterFare,
  calculateAirportFare,
  calculateBookingFare,
  quoteFare,
  calculateExtraTimeFare,
  calculateLiveModePreAuthAmount,
};
