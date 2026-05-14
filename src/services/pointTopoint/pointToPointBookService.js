// const { Op, ValidationError } = require("sequelize");
// const { PointToPointBook } = require("../../models/PointToPointBook.js");
// const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
// const { getCarById } = require("../booking/carService.js");
// const PointToPointBookExtraOption = require("../../models/PointToPointBookExtraOption.js");
// const { ExtraOption } = require("../../models/ExtraOption.js");
// const { Car } = require("../../models/Car.js");
// const { Gratuity } = require("../../models/Gratuity.js");
// const { getGratuityById } = require("../booking/gratuityService.js");

// const { bookingNotification } = require("../../utils/emailSender");
// const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
// const { PaymentDetail } = require("../../models/PaymentDetail.js");
// const {
//   AdditionalStopOnTheWay,
// } = require("../../models/booking/AdditionalStopOnTheWay.js");
// const {
//   getAdditionalStopOnTheWayById,
// } = require("../booking/additionalStopOnTheWayService.js");

// const { calculateP2PTotalTripPrice } = require("../utilTripService.js");
// const generateConfirmationNumber = require("../bookingUtils.js");
// const { AirportBook } = require("../../models/airportBooking/AirportBook.js");

// async function createPointToPointBook(pointToPointBookData) {
//   const {
//     carId,
//     gratuityId,
//     additionalStopId,
//     paymentMethod,
//     paymentDetailId,
//     extraOptions,
//     isGuestBooking,
//     userId,
//     cardDetails,
//     ...otherData
//   } = pointToPointBookData;

//   const confirmationNumber = await generateConfirmationNumber();

//   let pointToPointBook = await PointToPointBook.create({
//     confirmationNumber,
//     paymentMethod,
//     bookingStatus: 'PENDING_APPROVAL',
//     paymentStatus: 'NOT_PAID',
//     isGuestBooking: isGuestBooking || false,
//     userId,
//     ...otherData
//   });

//   try {
//     let paymentDetail;

//     switch (paymentMethod) {
//       case 'PRIMARY_CARD':
//         try {
//           paymentDetail = await getPrimaryCard(userId);
//         } catch (error) {
//           throw new ValidationError(error.message);
//         }
//         break;

//       case 'EXISTING_CARD':
//         if (!paymentDetailId) {
//           throw new ValidationError("Payment detail ID is required for existing card");
//         }
//         try {
//           paymentDetail = await getFromExistingCards(paymentDetailId, userId);
//         } catch (error) {
//           throw new ValidationError(error.message);
//         }
//         break;

//       case 'NEW_CARD':
//         if (!cardDetails) {
//           throw new ValidationError("Card details are required for new card payment");
//         }

//         if (!cardDetails.creditCardNumber || !cardDetails.expirationDate ||
//           !cardDetails.securityCode || !cardDetails.zipCode ||
//           !cardDetails.cardOwnerName) {
//           throw new ValidationError("Incomplete card details provided");
//         }

//         try {
//           paymentDetail = await createPaymentDetail({
//             ...cardDetails,
//             userId: isGuestBooking ? null : userId
//           });
//         } catch (error) {
//           throw new ValidationError(`Failed to create payment detail: ${error.message}`);
//         }
//         break;

//       default:
//         throw new ValidationError("Invalid payment method");
//     }

//     if (!paymentDetail) {
//       throw new ValidationError("Failed to process payment details");
//     }
    
//     await pointToPointBook.setPaymentDetail(paymentDetail);


//   if (carId) {
//     const existingCar = await getCarById(carId);
//     if (existingCar) {
//       await pointToPointBook.setCar(existingCar);
//       await pointToPointBook.reload();
//     } else {
//       throw new Error('Invalid car ID provided');
//     }
//   }

//   if (gratuityId) {
//     const gratuity = await getGratuityById(gratuityId);
//     if (gratuity) {
//       await pointToPointBook.setGratuity(gratuity);
//       await pointToPointBook.reload();
//     }
//   }
//   if (additionalStopId) {
//     const additionalStop = await getAdditionalStopOnTheWayById(additionalStopId);
//     if (additionalStop) {
//       await pointToPointBook.setAdditionalStopOnTheWay(additionalStop);
//     }
//   }

//   if (extraOptions && extraOptions.length > 0) {
//     const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
//     if (validExtraOptions.length > 0) {
//       const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
//         extraOptionId,
//         pointToPointBookId: pointToPointBook.pointToPointBookId,
//         quantity,
//       }));
//       await PointToPointBookExtraOption.bulkCreate(associations);
//     }
//   }
  
//   //to get other booking related informations
//   pointToPointBook = await getPointToPointBookById(
//     pointToPointBook.pointToPointBookId
//   );

//   //calculate total trip fee
//   const totalTripFee = await calculateP2PTotalTripPrice(pointToPointBook);
//   pointToPointBook.totalTripFeeInDollars = totalTripFee;
//   pointToPointBook = await pointToPointBook.save();

//   //notify admin and user
//   bookingNotification("Point to point", pointToPointBook);

//   return  await getPointToPointBookById(pointToPointBook.pointToPointBookId);
// }
// catch(error){
// if (error instanceof ValidationError){
//   throw error;
// }
// throw new Error (`payment processing failed: ${error.message}`);
// }
// }

// async function updatePointToPointBook(pointToPointBookId, updatedData) {
//   const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
//   return await pointToPointBook.update(updatedData);
// }

// async function getPointToPointBooks({
//   page = 1,
//   pageSize = 10,
//   paymentStatus,
//   bookingStatus,
//   sortDirection = "DESC",
// }) {
//   const options = {
//     order: [["createdAt", sortDirection.toUpperCase()]],
//     limit: +pageSize, // Convert pageSize to a number
//     offset: (page - 1) * +pageSize, // Convert pageSize to a number
//     where: {},
//     attributes: { exclude: ["deletedAt"] },
//   };

//   if (paymentStatus && bookingStatus) {
//     options.where.paymentStatus = paymentStatus;
//     options.where.bookingStatus = bookingStatus;
//   } else if (paymentStatus) {
//     options.where.paymentStatus = { [Op.eq]: paymentStatus };
//   } else if (bookingStatus) {
//     options.where.bookingStatus = { [Op.eq]: bookingStatus };
//   }

//   const { count, rows } = await PointToPointBook.findAndCountAll(options);

//   const totalElements = count;
//   const totalPages = Math.ceil(totalElements / pageSize);

//   return {
//     pageNumber: +page,
//     pageSize: +pageSize,
//     totalElements,
//     totalPages,
//     data: rows,
//   };
// }

// async function updatePaymentStatus(pointToPointBookId, paymentStatus) {
//   const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

//   pointToPointBook.paymentStatus = paymentStatus;
//   return await pointToPointBook.save();
// }

// async function updateBookingStatus(pointToPointBookId, bookingStatus) {
//   const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

//   pointToPointBook.bookingStatus = bookingStatus;
//   return await pointToPointBook.save();
// }

// async function deletePointToPointBook(pointToPointBookId) {
//   const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
//   await pointToPointBook.destroy();
// }

// async function getPointToPointBookById(pointToPointBookId) {
//   const pointToPointBook = await PointToPointBook.findByPk(pointToPointBookId, {
//     attributes: {
//       exclude: ["createdAt", "updatedAt", "deletedAt"],
//     },
//     include: [
//       {
//         model: PaymentDetail,
//         attributes: [
//           "creditCardNumber",
//           "expirationDate",
//           "securityCode",
//           "zipCode",
//           "cardOwnerName",
//         ],
//       },
//       {
//         model: Gratuity,
//         attributes: ["percentage", "description"],
//       },
//       {
//         model: Car,
//         attributes: [
//           "carId",
//           "carName",
//           "carImageUrl",
//           "pricePerMile",
//           "pricePerHour",
//           "minimumStartFee",
//           "currency",
//         ],
//       },
//       {
//         model: AdditionalStopOnTheWay,
//         attributes: [
//           "additionalStopId",
//           "stopType",
//           "additionalStopPrice",
//           "currency",
//         ],
//       },

//       {
//         model: ExtraOption,
//         attributes: ["extraOptionId", "name", "description", "pricePerItem"],
//       },
//     ],
//   });

//   if (!pointToPointBook)
//     throw new ResourceNotFoundError(
//       `Point To Point Book with ID ${pointToPointBookId} not found`
//     );
//   return pointToPointBook;
// }

// module.exports = {
//   createPointToPointBook,
//   updatePointToPointBook,
//   getPointToPointBooks,
//   getPointToPointBookById,
//   deletePointToPointBook,
//   updateBookingStatus,
//   updatePaymentStatus,
// };




const { Op, ValidationError } = require("sequelize");
const { PointToPointBook } = require("../../models/PointToPointBook.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const PointToPointBookExtraOption = require("../../models/PointToPointBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");

const { bookingNotification } = require("../../utils/emailSender");
const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const {
  AdditionalStopOnTheWay,
} = require("../../models/booking/AdditionalStopOnTheWay.js");
const {
  getAdditionalStopOnTheWayById,
} = require("../booking/additionalStopOnTheWayService.js");

const { calculateP2PTotalTripPrice } = require("../utilTripService.js");
const generateConfirmationNumber = require("../bookingUtils.js");
const { AirportBook } = require("../../models/airportBooking/AirportBook.js");

async function createPointToPointBook(pointToPointBookData) {
  const {
    carId,
    gratuityId,
    additionalStopId,
    paymentMethod,
    paymentDetailId,
    extraOptions,
    isGuestBooking,
    userId,
    cardDetails,
    ...otherData
  } = pointToPointBookData;

  const confirmationNumber = await generateConfirmationNumber();

  let pointToPointBook = await PointToPointBook.create({
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
    
    await pointToPointBook.setPaymentDetail(paymentDetail);


  if (carId) {
    const existingCar = await getCarById(carId);
    if (existingCar) {
      await pointToPointBook.setCar(existingCar);
      await pointToPointBook.reload();
    } else {
      throw new Error('Invalid car ID provided');
    }
  }

  if (gratuityId) {
    const gratuity = await getGratuityById(gratuityId);
    if (gratuity) {
      await pointToPointBook.setGratuity(gratuity);
      await pointToPointBook.reload();
    }
  }
  if (additionalStopId) {
    const additionalStop = await getAdditionalStopOnTheWayById(additionalStopId);
    if (additionalStop) {
      await pointToPointBook.setAdditionalStopOnTheWay(additionalStop);
    }
  }

  if (extraOptions && extraOptions.length > 0) {
    const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
    if (validExtraOptions.length > 0) {
      const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
        extraOptionId,
        pointToPointBookId: pointToPointBook.pointToPointBookId,
        quantity,
      }));
      await PointToPointBookExtraOption.bulkCreate(associations);
    }
  }
  
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

  return  await getPointToPointBookById(pointToPointBook.pointToPointBookId);
}
catch(error){
if (error instanceof ValidationError){
  throw error;
}
throw new Error (`payment processing failed: ${error.message}`);
}
}

async function updatePointToPointBook(pointToPointBookId, updatedData) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
  return await pointToPointBook.update(updatedData);
}

async function updatePointToPointBookForUser(pointToPointBookId, userId, updatedData, opts = {}) {
  const isAdmin = Boolean(opts.isAdmin);
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

  if (!isAdmin) {
    if (!pointToPointBook.userId || Number(pointToPointBook.userId) !== Number(userId)) {
      throw new ResourceNotFoundError("Booking not found.");
    }
    const lockedStatuses = new Set([
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "COMPLETED",
      "PICKUP_COMPLETED",
      "RETURN_PICKUP_COMPLETED",
    ]);
    if (lockedStatuses.has(pointToPointBook.bookingStatus)) {
      throw new ValidationError("This booking can no longer be updated.");
    }
  }

  const { extraOptions, ...data } = updatedData || {};
  if (Array.isArray(extraOptions)) {
    await PointToPointBookExtraOption.destroy({ where: { pointToPointBookId } });
    const validExtraOptions = extraOptions.filter(
      (o) => o && o.extraOptionId && o.quantity
    );
    if (validExtraOptions.length > 0) {
      const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
        extraOptionId,
        pointToPointBookId: pointToPointBook.pointToPointBookId,
        quantity,
      }));
      await PointToPointBookExtraOption.bulkCreate(associations);
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "carId") && data.carId) {
    const existingCar = await getCarById(data.carId);
    if (existingCar) await pointToPointBook.setCar(existingCar);
    delete data.carId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "gratuityId") && data.gratuityId) {
    const gratuity = await getGratuityById(data.gratuityId);
    if (gratuity) await pointToPointBook.setGratuity(gratuity);
    delete data.gratuityId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "additionalStopId") && data.additionalStopId) {
    const stop = await getAdditionalStopOnTheWayById(data.additionalStopId);
    if (stop) await pointToPointBook.setAdditionalStopOnTheWay(stop);
    delete data.additionalStopId;
  }

  await pointToPointBook.update(data);

  const reloaded = await getPointToPointBookById(pointToPointBook.pointToPointBookId);
  const totalTripFee = await calculateP2PTotalTripPrice(reloaded);
  reloaded.totalTripFeeInDollars = totalTripFee;
  await reloaded.save();
  return await getPointToPointBookById(pointToPointBook.pointToPointBookId);
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

async function applyDiscountToPointToPointBook(pointToPointBookId, discountAmount) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

  if (discountAmount < 0) {
    throw new ValidationError("Discount amount cannot be negative.");
  }

  if (discountAmount > pointToPointBook.totalTripFeeInDollars) {
    throw new ValidationError("Discount amount cannot exceed total trip fee.");
  }

  pointToPointBook.totalTripFeeInDollars -= discountAmount;
  pointToPointBook.discountAmountInDollars = discountAmount;
  pointToPointBook.hasDiscountApplied = true;
  // pointToPointBook.paymentStatus = 'DISCOUNT_APPLIED';

  return await pointToPointBook.save();
}

async function updateBookingStatus(pointToPointBookId, updatedData) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);

  pointToPointBook.bookingStatus = updatedData.bookingStatus;

  if (updatedData.discountAmount && updatedData.bookingStatus === 'ACCEPTED') {
    await applyDiscountToPointToPointBook(pointToPointBookId, updatedData.discountAmount);
  }
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
  updatePointToPointBookForUser,
  getPointToPointBooks,
  getPointToPointBookById,
  deletePointToPointBook,
  updateBookingStatus,
  updatePaymentStatus,
  applyDiscountToPointToPointBook,
};
