const { Op } = require("sequelize");
const { PointToPointBook } = require("../../models/PointToPointBook.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const PointToPointBookExtraOption = require("../../models/PointToPointBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");

const { bookingNotification } = require("../../utils/emailSender");
const addOrUpdatePaymentDetail = require("../paymentDetailService.js");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const {
  AdditionalStopOnTheWay,
} = require("../../models/booking/AdditionalStopOnTheWay.js");
const {
  getAdditionalStopOnTheWayById,
} = require("../booking/additionalStopOnTheWayService.js");

const { calculateP2PTotalTripPrice } = require("../utilTripService.js");
const generateConfirmationNumber = require("../bookingUtils.js");

async function createPointToPointBook(pointToPointBookData) {
  const {
    carId,
    gratuityId,
    additionalStopId,
    extraOptions,
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName,
    ...otherData
  } = pointToPointBookData;

  const confirmationNumber = await generateConfirmationNumber();

  let pointToPointBook = await PointToPointBook.create({
    confirmationNumber,
    ...otherData,
  });

  if (extraOptions) {
    const associations = extraOptions.map(({ extraOptionId, quantity }) => ({
      extraOptionId,
      pointToPointBookId: pointToPointBook.pointToPointBookId,
      quantity,
    }));

    await PointToPointBookExtraOption.bulkCreate(associations);
  }

  if (carId) {
    const existingCar = await getCarById(carId);
    await pointToPointBook.setCar(existingCar);
    // await pointToPointBook.save();
  }

  if (gratuityId) {
    const gratuity = await getGratuityById(gratuityId);
    await pointToPointBook.setGratuity(gratuity);
    // await pointToPointBook.save();
  }

  if (additionalStopId) {
    const additionalStop = await getAdditionalStopOnTheWayById(
      additionalStopId
    );
    await pointToPointBook.setAdditionalStopOnTheWay(additionalStop);
    // await pointToPointBook.save();
  }

  //set payment info
  const paymentInfo = await addOrUpdatePaymentDetail(
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName
  );

  await pointToPointBook.setPaymentDetail(paymentInfo);
  // await pointToPointBook.save();

  //to get other booking related informations
  pointToPointBook = await getPointToPointBookById(
    pointToPointBook.pointToPointBookId
  );

  //calculate total trip fee
  const totalTripFee = await calculateP2PTotalTripPrice(pointToPointBook);
  pointToPointBook.totalTripFeeInDollars = totalTripFee;
  pointToPointBook = await pointToPointBook.save();

  //notify admin and user
  bookingNotification("Point to point", pointToPointBook);

  return pointToPointBook;
}

async function updatePointToPointBook(pointToPointBookId, updatedData) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
  return await pointToPointBook.update(updatedData);
}

async function getPointToPointBooks({
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

  const { count, rows } = await PointToPointBook.findAndCountAll(options);

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

async function updatePaymentStatus(pointToPointBookId, paymentStatus) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

  pointToPointBook.paymentStatus = paymentStatus;
  return await pointToPointBook.save();
}

async function updateBookingStatus(pointToPointBookId, bookingStatus) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

  pointToPointBook.bookingStatus = bookingStatus;
  return await pointToPointBook.save();
}

async function deletePointToPointBook(pointToPointBookId) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
  await pointToPointBook.destroy();
}

async function getPointToPointBookById(pointToPointBookId) {
  const pointToPointBook = await PointToPointBook.findByPk(pointToPointBookId, {
    attributes: {
      exclude: ["createdAt", "updatedAt", "deletedAt"],
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
        model: AdditionalStopOnTheWay,
        attributes: [
          "additionalStopId",
          "stopType",
          "additionalStopPrice",
          "currency",
        ],
      },

      {
        model: ExtraOption,
        attributes: ["extraOptionId", "name", "description", "pricePerItem"],
      },
    ],
  });

  if (!pointToPointBook)
    throw new ResourceNotFoundError(
      `Point To Point Book with ID ${pointToPointBookId} not found`
    );
  return pointToPointBook;
}

module.exports = {
  createPointToPointBook,
  updatePointToPointBook,
  getPointToPointBooks,
  getPointToPointBookById,
  deletePointToPointBook,
  updateBookingStatus,
  updatePaymentStatus,
};
