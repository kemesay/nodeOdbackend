const { Op, ValidationError } = require("sequelize");
const { HourlyCharterBook } = require("../../models/HourlyCharterBook.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const HourlyCharterBookExtraOption = require("../../models/HourlyCharterBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");
const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
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
    paymentMethod,
    paymentDetailId,
    userId,
    cardDetails,
    isGuestBooking,
    ...otherData
  } = hourlyCharterBookData;

  if (!paymentMethod) {
    throw new ValidationError("Payment method is required");
  }

  if ((paymentMethod === 'PRIMARY_CARD' || paymentMethod === 'EXISTING_CARD')) {
    if (!userId) {
      throw new ValidationError("User authentication required for saved payment methods");
    }
  }
  const confirmationNumber = await generateConfirmationNumber();

  let hourlyCharterBook = await HourlyCharterBook.create({
    confirmationNumber,
    paymentMethod,
    bookingStatus: 'PENDING_APPROVAL',
    paymentStatus: 'NOT_PAID',
    isGuestBooking: isGuestBooking || false,
    userId,
    ...otherData
  });

  try {

    let paymentDetail;

    switch (paymentMethod) {
      case 'PRIMARY_CARD':
        try {
          paymentDetail = await getPrimaryCard(userId);
        } catch (error) {
          throw new ValidationError(error.message);
        }
        break;

      case 'EXISTING_CARD':
        if (!paymentDetailId) {
          throw new ValidationError("Payment detail ID is required for existing card");
        }
        try {
          paymentDetail = await getFromExistingCards(paymentDetailId, userId);
        } catch (error) {
          throw new ValidationError(error.message);
        }
        break;

      case 'NEW_CARD':
        if (!cardDetails) {
          throw new ValidationError("Card details are required for new card payment");
        }

        if (!cardDetails.creditCardNumber || !cardDetails.expirationDate ||
          !cardDetails.securityCode || !cardDetails.zipCode ||
          !cardDetails.cardOwnerName) {
          throw new ValidationError("Incomplete card details provided");
        }

        try {
          paymentDetail = await createPaymentDetail({
            ...cardDetails,
            userId: isGuestBooking ? null : userId
          });
        } catch (error) {
          throw new ValidationError(`Failed to create payment detail: ${error.message}`);
        }
        break;

      default:
        throw new ValidationError("Invalid payment method");
    }
    if (!paymentDetail) {
      throw new ValidationError("Failed to process payment details");
    }

    await hourlyCharterBook.setPaymentDetail(paymentDetail);


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


    if (extraOptions && extraOptions.length > 0) {
      const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
      if (validExtraOptions.length > 0) {
        const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
          extraOptionId,
          hourlyCharterBookId: hourlyCharterBook.hourlyCharterBookId,
          quantity,
          bookType: "Hourly-Charter",
        }));

        await HourlyCharterBookExtraOption.bulkCreate(associations);
      }
    }


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

      return  await getHourlyCharterBookById(hourlyCharterBook.hourlyCharterBookId);
    } catch(error){
      await hourlyCharterBook.destroy();
      if (error instanceof ValidationError){
        throw error 
      }
      throw new Error (`payment processing failed: ${error.message}`);

    }
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

    async function updateBookingStatus(hourlyCharterBookId, updatedData) {
      const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

      hourlyCharterBook.bookingStatus = updatedData.bookingStatus;

      if (updatedData.discountAmount && updatedData.bookingStatus === 'ACCEPTED') {
        await applyDiscountToHourlyCharterBook(hourlyCharterBookId, updatedData.discountAmount);
      }
      return await hourlyCharterBook.save();
    }

    async function applyDiscountToHourlyCharterBook(hourlyCharterBookId, discountAmount) {
      const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

      if (discountAmount < 0) {
        throw new ValidationError("Discount amount cannot be negative.");
      }

      if (discountAmount > hourlyCharterBook.totalTripFeeInDollars) {
        throw new ValidationError("Discount amount cannot exceed total trip fee.");
      }

      hourlyCharterBook.totalTripFeeInDollars -= discountAmount;
      hourlyCharterBook.discountAmountInDollars = discountAmount;
      hourlyCharterBook.hasDiscountApplied = true;
      // hourlyCharterBook.paymentStatus = 'DISCOUNT_APPLIED';

      return await hourlyCharterBook.save();
    }

    async function getHourlyCharterBookById(hourlyCharterBookId) {
      const hourlyCharterBook = await HourlyCharterBook.findByPk(
        hourlyCharterBookId,
        {
          attributes: {
            exclude: ["carId" ,"createdAt", "updatedAt", "deletedAt"],
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
      applyDiscountToHourlyCharterBook,
    };
