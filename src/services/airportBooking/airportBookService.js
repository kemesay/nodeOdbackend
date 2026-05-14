// const { Op } = require("sequelize");
// const { ResourceNotFoundError, ValidationError } = require("../../errors/CustomErrors.js");
// const { AirportBook } = require("../../models/airportBooking/AirportBook.js");
// const AirportBookExtraOption = require("../../models/airportBooking/AirportBookExtraOption.js");
// const { ExtraOption } = require("../../models/ExtraOption.js");
// const { Car } = require("../../models/Car.js");
// const { getCarById } = require("../booking/carService.js");
// const { Airport } = require("../../models/airportBooking/Airport.js");
// const { getAirportById } = require("./airportService");
// const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
// const { PaymentDetail } = require("../../models/PaymentDetail.js");
// const { Gratuity } = require("../../models/Gratuity.js");
// const { getGratuityById } = require("../booking/gratuityService.js");

// const {
//   AirportPickupPreference,
// } = require("../../models/airportBooking/AirportPickupPreference.js");
// const {
//   getAirportPickupPreferenceById,
// } = require("./airportPickupPreferenceService");

// const {
//   AdditionalStopOnTheWay,
// } = require("../../models/booking/AdditionalStopOnTheWay.js");
// const {
//   getAdditionalStopOnTheWayById,
// } = require("../booking/additionalStopOnTheWayService");

// const { calculateAirportBookingTotalTripPrice } = require("../utilTripService");

// const { bookingNotification } = require("../../utils/emailSender");
// const generateConfirmationNumber = require("../bookingUtils.js");

// async function createAirportBook(airportBookData) {
//   const {
//     carId,
//     gratuityId,
//     airportId,
//     pickupPreferenceId,
//     additionalStopId,
//     extraOptions,
//     paymentDetailId,
//     paymentMethod,
//     isGuestBooking,
//     userId,
//     cardDetails,
//     ...otherData
//   } = airportBookData;

// //   if (!paymentMethod) {
// //     throw new ValidationError("Payment method is required");
// //   }

// //   if ((paymentMethod === 'PRIMARY_CARD' || paymentMethod === 'EXISTING_CARD')) {
// //     if (!userId) {
// //       throw new ValidationError("User authentication required for saved payment methods");
// //     }
// //   }

//   const confirmationNumber = await generateConfirmationNumber();

//   let airportBook = await AirportBook.create({
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

//     await airportBook.setPaymentDetail(paymentDetail);

//     if (carId) {
//       const existingCar = await getCarById(carId);
//       if (existingCar) {
//         await airportBook.setCar(existingCar);
//         await airportBook.reload();
//       } else {
//         throw new Error('Invalid car ID provided');
//       }
//     }

//     if (gratuityId) {
//       const gratuity = await getGratuityById(gratuityId);
//       if (gratuity) {
//         await airportBook.setGratuity(gratuity);
//         await airportBook.reload();
//       }
//     }

//     if (airportId) {
//       const existingAirport = await getAirportById(airportId);
//       if (existingAirport) {
//         await airportBook.setAirport(existingAirport);
//       }
//     }

//     if (pickupPreferenceId) {
//       const pickupPreference = await getAirportPickupPreferenceById(pickupPreferenceId);
//       if (pickupPreference) {
//         await airportBook.setAirportPickupPreference(pickupPreference);
//       }
//     }

//     if (additionalStopId) {
//       const additionalStop = await getAdditionalStopOnTheWayById(additionalStopId);
//       if (additionalStop) {
//         await airportBook.setAdditionalStopOnTheWay(additionalStop);
//       }
//     }

//     if (extraOptions && extraOptions.length > 0) {
//       const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
//       if (validExtraOptions.length > 0) {
//         const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
//           extraOptionId,
//           airportBookId: airportBook.airportBookId,
//           quantity,
//         }));
//         await AirportBookExtraOption.bulkCreate(associations);
//       }
//     }

//     airportBook = await getAirportBookById(airportBook.airportBookId);

//     const totalTripFee = await calculateAirportBookingTotalTripPrice(airportBook);
//     airportBook.totalTripFeeInDollars = totalTripFee;
//     await airportBook.save();

//     await bookingNotification("Airport Service", airportBook);

//     return await getAirportBookById(airportBook.airportBookId);

//   } catch (error) {
//     await airportBook.destroy();
//     if (error instanceof ValidationError) {
//       throw error;
//     }
//     throw new Error(`Payment processing failed: ${error.message}`);
//   }
// }

// async function updateAirportBook(airportBookId, updatedData) {
//   const airportBook = await getAirportBookById(airportBookId);
//   return await airportBook.update(updatedData);
// }

// async function updatePaymentStatus(airportBookId, paymentStatus) {
//   const airportBook = await getAirportBookById(airportBookId);

//   airportBook.paymentStatus = paymentStatus;
//   return await airportBook.save();
// }

// async function updateBookingStatus(airportBookId, bookingStatus) {
//   const airportBook = await getAirportBookById(airportBookId);

//   airportBook.bookingStatus = bookingStatus;
//   return await airportBook.save();
// }

// async function getAllAirportBooks() {
//   return await AirportBook.findAll({
//     attributes: {
//       exclude: ["deletedAt"],
//     },
//   });
// }

// async function getAirportBooks({
//   page = 1,
//   pageSize = 10,
//   paymentStatus,
//   bookingStatus,
//   sortDirection = "DESC",
// }) {
//   const options = {
//     order: [["createdAt", sortDirection.toUpperCase()]],
//     limit: +pageSize,
//     offset: (page - 1) * +pageSize,
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

//   const { count, rows } = await AirportBook.findAndCountAll(options);

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

// async function deleteAirportBook(airportBookId) {
//   const airportBook = await getAirportBookById(airportBookId);
//   await airportBook.destroy();
// }

// async function getAirportBookById(airportBookId) {
//   const airportBook = await AirportBook.findByPk(airportBookId, {
//     attributes: {
//       exclude: ["airportId", "carId", "createdAt", "updatedAt", "deletedAt"],
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
//         model: Airport,
//         attributes: ["airportId", "airportName", "airportAddress"],
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
//         model: AirportPickupPreference,
//         attributes: [
//           "pickupPreferenceId",
//           "preferenceName",
//           "preferencePrice",
//           "currency",
//         ],
//       },

//       {
//         model: ExtraOption,
//         attributes: ["extraOptionId", "name", "description", "pricePerItem"],
//       },
//     ],
//   });

//   if (!airportBook)
//     throw new ResourceNotFoundError(
//       `Airport Book with ID ${airportBookId} not found`
//     );
//   return airportBook;
// }

// module.exports = {
//   createAirportBook,
//   updateAirportBook,
//   getAirportBookById,
//   deleteAirportBook,
//   getAirportBooks,
//   updatePaymentStatus,
//   updateBookingStatus,
// };




const { Op } = require("sequelize");
const { ResourceNotFoundError, ValidationError } = require("../../errors/CustomErrors.js");
const { AirportBook } = require("../../models/airportBooking/AirportBook.js");
const AirportBookExtraOption = require("../../models/airportBooking/AirportBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { getCarById } = require("../booking/carService.js");
const { Airport } = require("../../models/airportBooking/Airport.js");
const { getAirportById } = require("./airportService");
const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
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
    airportLocationAddress,
    airportLocationLatitude,
    airportLocationLongitude,
    pickupPreferenceId,
    additionalStopId,
    extraOptions,
    paymentDetailId,
    paymentMethod,
    isGuestBooking,
    userId,
    cardDetails,
    ...otherData
  } = airportBookData;

  const normalizedAirportId =
    airportId !== undefined && airportId !== null && airportId !== ""
      ? Number(airportId)
      : null;
  const hasCatalogAirport =
    normalizedAirportId !== null && !Number.isNaN(normalizedAirportId);

  const terminalGeo = hasCatalogAirport
    ? {
        airportLocationAddress: null,
        airportLocationLatitude: null,
        airportLocationLongitude: null,
      }
    : {
        airportLocationAddress:
          typeof airportLocationAddress === "string"
            ? airportLocationAddress.trim()
            : null,
        airportLocationLatitude:
          airportLocationLatitude != null
            ? Number(airportLocationLatitude)
            : null,
        airportLocationLongitude:
          airportLocationLongitude != null
            ? Number(airportLocationLongitude)
            : null,
      };

  const confirmationNumber = await generateConfirmationNumber();

  let airportBook = await AirportBook.create({
    confirmationNumber,
    paymentMethod,
    bookingStatus: 'PENDING_APPROVAL',
    paymentStatus: 'NOT_PAID',
    isGuestBooking: isGuestBooking || false,
    userId,
    ...otherData,
    airportId: hasCatalogAirport ? normalizedAirportId : null,
    ...terminalGeo,
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

    await airportBook.setPaymentDetail(paymentDetail);

    if (carId) {
      const existingCar = await getCarById(carId);
      if (existingCar) {
        await airportBook.setCar(existingCar);
        await airportBook.reload();
      } else {
        throw new Error('Invalid car ID provided');
      }
    }

    if (gratuityId) {
      const gratuity = await getGratuityById(gratuityId);
      if (gratuity) {
        await airportBook.setGratuity(gratuity);
        await airportBook.reload();
      }
    }

    if (hasCatalogAirport) {
      const existingAirport = await getAirportById(normalizedAirportId);
      if (existingAirport) {
        await airportBook.setAirport(existingAirport);
      }
    }

    if (pickupPreferenceId) {
      const pickupPreference = await getAirportPickupPreferenceById(pickupPreferenceId);
      if (pickupPreference) {
        await airportBook.setAirportPickupPreference(pickupPreference);
      }
    }

    if (additionalStopId) {
      const additionalStop = await getAdditionalStopOnTheWayById(additionalStopId);
      if (additionalStop) {
        await airportBook.setAdditionalStopOnTheWay(additionalStop);
      }
    }

    if (extraOptions && extraOptions.length > 0) {
      const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
      if (validExtraOptions.length > 0) {
        const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
          extraOptionId,
          airportBookId: airportBook.airportBookId,
          quantity,
        }));
        await AirportBookExtraOption.bulkCreate(associations);
      }
    }

    airportBook = await getAirportBookById(airportBook.airportBookId);

    const totalTripFee = await calculateAirportBookingTotalTripPrice(airportBook);
    airportBook.totalTripFeeInDollars = totalTripFee;
    await airportBook.save();

    await bookingNotification("Airport Service", airportBook);

    return await getAirportBookById(airportBook.airportBookId);

  } catch (error) {
    await airportBook.destroy();
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

async function updateAirportBook(airportBookId, updatedData) {
  const airportBook = await getAirportBookById(airportBookId);
  return await airportBook.update(updatedData);
}

async function updateAirportBookForUser(airportBookId, userId, updatedData, opts = {}) {
  const isAdmin = Boolean(opts.isAdmin);
  const airportBook = await getAirportBookById(airportBookId);

  if (!isAdmin) {
    if (!airportBook.userId || Number(airportBook.userId) !== Number(userId)) {
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
    if (lockedStatuses.has(airportBook.bookingStatus)) {
      throw new ValidationError("This booking can no longer be updated.");
    }
  }

  // Handle extra options update (replace)
  const { extraOptions, ...data } = updatedData || {};
  if (Array.isArray(extraOptions)) {
    await AirportBookExtraOption.destroy({ where: { airportBookId } });
    const validExtraOptions = extraOptions.filter(
      (o) => o && o.extraOptionId && o.quantity
    );
    if (validExtraOptions.length > 0) {
      const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
        extraOptionId,
        airportBookId: airportBook.airportBookId,
        quantity,
      }));
      await AirportBookExtraOption.bulkCreate(associations);
    }
  }

  // Airport selection: catalog airport OR free-form terminal
  if (Object.prototype.hasOwnProperty.call(data, "airportId") ||
      Object.prototype.hasOwnProperty.call(data, "airportLocationAddress") ||
      Object.prototype.hasOwnProperty.call(data, "airportLocationLatitude") ||
      Object.prototype.hasOwnProperty.call(data, "airportLocationLongitude")) {
    const normalizedAirportId =
      data.airportId !== undefined && data.airportId !== null && data.airportId !== ""
        ? Number(data.airportId)
        : null;
    const hasCatalogAirport =
      normalizedAirportId !== null && !Number.isNaN(normalizedAirportId);

    if (hasCatalogAirport) {
      const existingAirport = await getAirportById(normalizedAirportId);
      if (existingAirport) await airportBook.setAirport(existingAirport);
      data.airportLocationAddress = null;
      data.airportLocationLatitude = null;
      data.airportLocationLongitude = null;
    } else {
      // Free-form terminal: clear association
      data.airportId = null;
    }
  }

  // Associations that user can change
  if (Object.prototype.hasOwnProperty.call(data, "carId") && data.carId) {
    const existingCar = await getCarById(data.carId);
    if (existingCar) await airportBook.setCar(existingCar);
    delete data.carId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "gratuityId") && data.gratuityId) {
    const gratuity = await getGratuityById(data.gratuityId);
    if (gratuity) await airportBook.setGratuity(gratuity);
    delete data.gratuityId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "pickupPreferenceId") && data.pickupPreferenceId) {
    const pref = await getAirportPickupPreferenceById(data.pickupPreferenceId);
    if (pref) await airportBook.setAirportPickupPreference(pref);
    delete data.pickupPreferenceId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "additionalStopId") && data.additionalStopId) {
    const stop = await getAdditionalStopOnTheWayById(data.additionalStopId);
    if (stop) await airportBook.setAdditionalStopOnTheWay(stop);
    delete data.additionalStopId;
  }

  await airportBook.update(data);

  // Recalculate total after update
  const reloaded = await getAirportBookById(airportBook.airportBookId);
  const totalTripFee = await calculateAirportBookingTotalTripPrice(reloaded);
  reloaded.totalTripFeeInDollars = totalTripFee;
  await reloaded.save();
  return await getAirportBookById(airportBook.airportBookId);
}

async function updatePaymentStatus(airportBookId, paymentStatus) {
  const airportBook = await getAirportBookById(airportBookId);

  airportBook.paymentStatus = paymentStatus;
  return await airportBook.save();
}

async function updateBookingStatus(airportBookId, updatedData) {
  const airportBook = await getAirportBookById(airportBookId);

  airportBook.bookingStatus = updatedData.bookingStatus;

  if (updatedData.discountAmount && updatedData.bookingStatus === 'ACCEPTED') {
    await applyDiscountToAirportBook(airportBookId, updatedData.discountAmount);
  }

  return await airportBook.save();
}

async function applyDiscountToAirportBook(airportBookId, discountAmount) {
  const airportBook = await getAirportBookById(airportBookId);

  if (discountAmount < 0) {
    throw new ValidationError("Discount amount cannot be negative.");
  }

  if (discountAmount > airportBook.totalTripFeeInDollars) {
    throw new ValidationError("Discount amount cannot exceed total trip fee.");
  }

  airportBook.totalTripFeeInDollars -= discountAmount;
  airportBook.discountAmountInDollars = discountAmount;
  airportBook.hasDiscountApplied = true;
  // airportBook.paymentStatus = 'DISCOUNT_APPLIED';

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
    limit: +pageSize,
    offset: (page - 1) * +pageSize,
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
        required: false,
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
  updateAirportBookForUser,
  getAirportBookById,
  deleteAirportBook,
  getAirportBooks,
  updatePaymentStatus,
  updateBookingStatus,
  applyDiscountToAirportBook,
};
