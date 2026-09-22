const { getCarById } = require("../services/booking/carService.js");
const { getGratuityById } = require("../services/booking/gratuityService.js");
const { quoteFare } = require("../utils/bookingFareCalculator.js");
const { ValidationError } = require("../errors/CustomErrors.js");

async function quoteBookingFareController(req, res, next) {
  try {
    const {
      bookingKind,
      carId,
      tripType,
      distanceInMiles,
      selectedHours,
      gratuityId,
      gratuityPercentage,
      additionalStopPrice,
      airportPickupPreferencePrice,
      extraOptionsPerLeg,
    } = req.body || {};

    if (!carId) {
      throw new ValidationError("carId is required to quote a fare.");
    }

    const car = await getCarById(carId);
    let pct = Number(gratuityPercentage);
    if (!Number.isFinite(pct) && gratuityId) {
      const gratuity = await getGratuityById(gratuityId);
      pct = Number(gratuity?.percentage) || 0;
    }
    if (!Number.isFinite(pct)) pct = 0;

    const result = quoteFare({
      bookingKind,
      car: car.toJSON ? car.toJSON() : car,
      tripType,
      distanceInMiles,
      selectedHours,
      gratuityPercentage: pct,
      additionalStopPrice,
      airportPickupPreferencePrice,
      extraOptionsPerLeg,
    });

    return res.json({
      totalTripFeeInDollars: result.total,
      currency: car.currency || "USD",
      car: {
        carId: car.carId,
        carName: car.carName,
        pricePerMile: car.pricePerMile,
        pricePerHour: car.pricePerHour,
        minimumStartFee: car.minimumStartFee,
      },
      breakdown: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { quoteBookingFareController };
