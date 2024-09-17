const { Op } = require("sequelize");
const { HourlyCharterBook } = require("../../models/HourlyCharterBook.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const HourlyCharterBookExtraOption = require("../../models/HourlyCharterBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");
const addOrUpdatePaymentDetail = require("../paymentDetailService.js");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const {
  calculateHourlyCharterTotalTripPrice,
} = require("../utilTripService.js");

const { bookingNotification } = require("../../utils/emailSender");
const generateConfirmationNumber = require("../bookingUtils.js");

async function createHourlyCharterBook(hourlyCharterBookData) {
  const {
    carId,
    gratuityId,
    extraOptions,
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName,
    ...otherData
  } = hourlyCharterBookData;

  const confirmationNumber = await generateConfirmationNumber();

  let hourlyCharterBook = await HourlyCharterBook.create({
    confirmationNumber,
    ...otherData,
  });

  if (extraOptions) {
    const associations = extraOptions.map(({ extraOptionId, quantity }) => ({
      extraOptionId,
      hourlyCharterBookId: hourlyCharterBook.hourlyCharterBookId,
      quantity,
      bookType: "Hourly-Charter",
    }));

    await HourlyCharterBookExtraOption.bulkCreate(associations);
  }

  if (carId) {
    const existingCar = await getCarById(carId);
    await hourlyCharterBook.setCar(existingCar);
    await hourlyCharterBook.save();
  }

  if (gratuityId) {
    const gratuity = await getGratuityById(gratuityId);
    await hourlyCharterBook.setGratuity(gratuity);
    // await hourlyCharterBook.save();
  }

  //set payment info
  const paymentInfo = await addOrUpdatePaymentDetail(
    creditCardNumber,
    expirationDate,
    securityCode,
    zipCode,
    cardOwnerName
  );

  await hourlyCharterBook.setPaymentDetail(paymentInfo);
  // await hourlyCharterBook.save();

  hourlyCharterBook = await getHourlyCharterBookById(
    hourlyCharterBook.hourlyCharterBookId
  );

  //calculate total trip fee
  const totalTripFee = await calculateHourlyCharterTotalTripPrice(
    hourlyCharterBook
  );
  hourlyCharterBook.totalTripFeeInDollars = totalTripFee;
  await hourlyCharterBook.save();

  //notify admin and user
  bookingNotification("Hourly Charter", hourlyCharterBook);

  return hourlyCharterBook;
}

async function updateHourlyCharterBook(hourlyCharterBookId, updatedData) {
  const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
  return await hourlyCharterBook.update(updatedData);
}

async function getHourlyCharterBooks({
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

  const { count, rows } = await HourlyCharterBook.findAndCountAll(options);

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

async function deleteHourlyCharterBook(hourlyCharterBookId) {
  const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
  await hourlyCharterBook.destroy();
}

async function updatePaymentStatus(hourlyCharterBookId, paymentStatus) {
  const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

  hourlyCharterBook.paymentStatus = paymentStatus;
  return await hourlyCharterBook.save();
}

async function updateBookingStatus(hourlyCharterBookId, bookingStatus) {
  const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

  hourlyCharterBook.bookingStatus = bookingStatus;
  return await hourlyCharterBook.save();
}

async function getHourlyCharterBookById(hourlyCharterBookId) {
  const hourlyCharterBook = await HourlyCharterBook.findByPk(
    hourlyCharterBookId,
    {
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
          model: ExtraOption,
          attributes: ["extraOptionId", "name", "description", "pricePerItem"],
        },
      ],
    }
  );

  if (!hourlyCharterBook)
    throw new ResourceNotFoundError(
      `Hourly Charter Book with ID ${hourlyCharterBookId} not found`
    );
  return hourlyCharterBook;
}

module.exports = {
  createHourlyCharterBook,
  updateHourlyCharterBook,
  getHourlyCharterBooks,
  getHourlyCharterBookById,
  deleteHourlyCharterBook,
  updateBookingStatus,
  updatePaymentStatus,
};
