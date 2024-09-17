const { Op } = require("sequelize");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { AirportBook } = require("../../models/airportBooking/AirportBook.js");
const AirportBookExtraOption = require("../../models/airportBooking/AirportBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { getCarById } = require("../booking/carService.js");
const { Airport } = require("../../models/airportBooking/Airport.js");
const { getAirportById } = require("./airportService");
const addOrUpdatePaymentDetail = require("../paymentDetailService.js");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");

const {
  AirportPickupPreference,
} = require("../../models/airportBooking/AirportPickupPreference.js");
const {
  getAirportPickupPreferenceById,
} = require("./airportPickupPreferenceService");

const {
  AdditionalStopOnTheWay,
} = require("../../models/booking/AdditionalStopOnTheWay.js");
const {
  getAdditionalStopOnTheWayById,
} = require("../booking/additionalStopOnTheWayService");

const { calculateAirportBookingTotalTripPrice } = require("../utilTripService");

const { bookingNotification } = require("../../utils/emailSender");
const generateConfirmationNumber = require("../bookingUtils.js");

async function createAirportBook(airportBookData) {
  const {
    carId,
    gratuityId,
    airportId,
    pickupPreferenceId,
    additionalStopId,
    extraOptions,
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName,
    ...otherData
  } = airportBookData;

  const confirmationNumber = await generateConfirmationNumber();

  let airportBook = await AirportBook.create({
    confirmationNumber,
    ...otherData,
  });

  if (extraOptions) {
    const associations = extraOptions.map(({ extraOptionId, quantity }) => ({
      extraOptionId,
      airportBookId: airportBook.airportBookId,
      quantity,
    }));

    await AirportBookExtraOption.bulkCreate(associations);
  }

  if (carId) {
    const existingCar = await getCarById(carId);
    await airportBook.setCar(existingCar);
    await airportBook.save();
  }

  if (gratuityId) {
    const gratuity = await getGratuityById(gratuityId);
    await airportBook.setGratuity(gratuity);
    // await airportBook.save();
  }

  if (airportId) {
    const existingAirport = await getAirportById(airportId);
    await airportBook.setAirport(existingAirport);
    await airportBook.save();
  }

  if (pickupPreferenceId) {
    const pickupPreference = await getAirportPickupPreferenceById(
      pickupPreferenceId
    );
    await airportBook.setAirportPickupPreference(pickupPreference);
    await airportBook.save();
  }

  if (additionalStopId) {
    const additionalStop = await getAdditionalStopOnTheWayById(
      additionalStopId
    );
    await airportBook.setAdditionalStopOnTheWay(additionalStop);
    await airportBook.save();
  }

  //set payment info
  const paymentInfo = await addOrUpdatePaymentDetail(
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName
  );

  await airportBook.setPaymentDetail(paymentInfo);
  // await airportBook.save();

  airportBook = await getAirportBookById(airportBook.airportBookId);

  //calculate total trip fee
  const totalTripFee = await calculateAirportBookingTotalTripPrice(airportBook);
  airportBook.totalTripFeeInDollars = totalTripFee;
  await airportBook.save();

  //notify admin and user
  bookingNotification("Airport Service", airportBook);

  return airportBook;
}

async function updateAirportBook(airportBookId, updatedData) {
  const airportBook = await getAirportBookById(airportBookId);
  return await airportBook.update(updatedData);
}

async function updatePaymentStatus(airportBookId, paymentStatus) {
  const airportBook = await getAirportBookById(airportBookId);

  airportBook.paymentStatus = paymentStatus;
  return await airportBook.save();
}

async function updateBookingStatus(airportBookId, bookingStatus) {
  const airportBook = await getAirportBookById(airportBookId);

  airportBook.bookingStatus = bookingStatus;
  return await airportBook.save();
}

async function getAllAirportBooks() {
  return await AirportBook.findAll({
    attributes: {
      exclude: ["deletedAt"],
    },
  });
}

async function getAirportBooks({
  page = 1,
  pageSize = 10,
  paymentStatus,
  bookingStatus,
  sortDirection = "DESC",
}) {
  const options = {
    order: [["createdAt", sortDirection.toUpperCase()]],
    limit: +pageSize, // Convert pageSize to a number
    offset: (page - 1) * +pageSize, // Convert pageSize to a number
    where: {},
    attributes: { exclude: ["deletedAt"] },
  };

  if (paymentStatus && bookingStatus) {
    options.where.paymentStatus = paymentStatus;
    options.where.bookingStatus = bookingStatus;
  } else if (paymentStatus) {
    options.where.paymentStatus = { [Op.eq]: paymentStatus };
  } else if (bookingStatus) {
    options.where.bookingStatus = { [Op.eq]: bookingStatus };
  }

  const { count, rows } = await AirportBook.findAndCountAll(options);

  const totalElements = count;
  const totalPages = Math.ceil(totalElements / pageSize);

  return {
    pageNumber: +page,
    pageSize: +pageSize,
    totalElements,
    totalPages,
    data: rows,
  };
}

async function deleteAirportBook(airportBookId) {
  const airportBook = await getAirportBookById(airportBookId);
  await airportBook.destroy();
}

async function getAirportBookById(airportBookId) {
  const airportBook = await AirportBook.findByPk(airportBookId, {
    attributes: {
      exclude: ["airportId", "carId", "createdAt", "updatedAt", "deletedAt"],
    },
    include: [
      {
        model: PaymentDetail,
        attributes: [
          "creditCardNumber",
          "expirationDate",
          "securityCode",
          "zipCode",
          "cardOwnerName",
        ],
      },
      {
        model: Gratuity,
        attributes: ["percentage", "description"],
      },
      {
        model: Airport,
        attributes: ["airportId", "airportName", "airportAddress"],
      },
      {
        model: AdditionalStopOnTheWay,
        attributes: [
          "additionalStopId",
          "stopType",
          "additionalStopPrice",
          "currency",
        ],
      },

      {
        model: Car,
        attributes: [
          "carId",
          "carName",
          "carImageUrl",
          "pricePerMile",
          "pricePerHour",
          "minimumStartFee",
          "currency",
        ],
      },

      {
        model: AirportPickupPreference,
        attributes: [
          "pickupPreferenceId",
          "preferenceName",
          "preferencePrice",
          "currency",
        ],
      },

      {
        model: ExtraOption,
        attributes: ["extraOptionId", "name", "description", "pricePerItem"],
      },
    ],
  });

  if (!airportBook)
    throw new ResourceNotFoundError(
      `Airport Book with ID ${airportBookId} not found`
    );
  return airportBook;
}

module.exports = {
  createAirportBook,
  updateAirportBook,
  getAirportBookById,
  deleteAirportBook,
  getAirportBooks,
  updatePaymentStatus,
  updateBookingStatus,
};
