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




const { Op } = require("sequelize");
const { PointToPointBook } = require("../../models/PointToPointBook.js");
const { ResourceNotFoundError, ValidationError } = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const PointToPointBookExtraOption = require("../../models/PointToPointBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");

const { bookingNotification, bookingUpdateNotification } = require("../../utils/emailSender");
const {
  processBookingPayment,
  reconcilePaymentOnBookingUpdate,
} = require("../payments/bookingSquarePayment.js");
const { findTransactionHistory } = require("../payments/squarePaymentService.js");
const { PaymentDetail } = require("../../models/PaymentDetail.js");

const PAYMENT_DETAIL_SAFE_ATTRIBUTES = [
  "paymentDetailId",
  "cardBrand",
  "last4",
  "expMonth",
  "expYear",
  "cardOwnerName",
  "zipCode",
  "isPrimary",
  "squareCardId",
];
const {
  AdditionalStopOnTheWay,
} = require("../../models/booking/AdditionalStopOnTheWay.js");
const {
  getAdditionalStopOnTheWayById,
} = require("../booking/additionalStopOnTheWayService.js");
const { SidePickDetour } = require("../../models/booking/SidePickDetour.js");

const { calculateP2PTotalTripPrice, calculateP2PSubtotal } = require("../utilTripService.js");
const { sideDetourFeeFor } = require("../../utils/bookingFareCalculator.js");
const { getSideDetourSettings } = require("../sideDetourSettingsService.js");
const generateConfirmationNumber = require("../bookingUtils.js");
const { signBookingRoomToken } = require("../../realtime/socketRoomToken.js");
const { AirportBook } = require("../../models/airportBooking/AirportBook.js");
const {
  validatePromoCode,
  redeemPromoCode,
  updateBookingPromoCode,
  getAppliedPromoCodeForBooking,
  creditReferralRewardIfCompleted,
} = require("../promoCodeService.js");
const {
  getWalletBalance,
  redeemWalletCredit,
  reverseRedemptionForBooking,
} = require("../walletService.js");
const { creditLoyaltyMilestoneIfEligible } = require("../loyaltyService.js");

async function createPointToPointBook(pointToPointBookData) {
  const {
    carId,
    gratuityId,
    additionalStopId,
    paymentMethod,
    paymentDetailId,
    extraOptions,
    sidePicks,
    isGuestBooking,
    userId,
    cardDetails,
    square,
    squareCardId,
    promoCode,
    useWalletCredit,
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

    if (sidePicks && sidePicks.length > 0) {
      const picks = sidePicks.map((sp, idx) => ({
        ...sp,
        sortOrder: sp.sortOrder != null ? sp.sortOrder : idx,
        pointToPointBookId: pointToPointBook.pointToPointBookId,
      }));
      await SidePickDetour.bulkCreate(picks);
    }

    //to get other booking related informations
    pointToPointBook = await getPointToPointBookById(
      pointToPointBook.pointToPointBookId
    );

    // Promo code, if provided, is validated against the ride's own
    // pre-gratuity subtotal — never the gratuity-inclusive total — so a
    // discount can never eat into gratuity, and gratuity (below) can then
    // be computed on the discounted ride cost rather than the pre-discount
    // sticker price.
    const subtotal = await calculateP2PSubtotal(pointToPointBook);
    let appliedPromoCode = null;
    let discountAmount = 0;
    if (promoCode) {
      const result = await validatePromoCode({
        code: promoCode,
        userId,
        guestEmail: userId ? undefined : pointToPointBook.passengerEmail,
        guestPhone: userId ? undefined : pointToPointBook.passengerCellPhone,
        bookingType: "Point to point",
        fareAmount: subtotal,
        bookingId: pointToPointBook.pointToPointBookId,
      });
      appliedPromoCode = result.promoCode;
      discountAmount = result.discount;
    }

    // Wallet credit auto-applies (fully or partially) toward whatever's left
    // of the fare after any promo discount — a third, independent discount
    // bucket, additive with the promo discount, only for signed-in users
    // (guests have no wallet). `useWalletCredit: false` opts out entirely.
    let walletCreditAmount = 0;
    if (userId && useWalletCredit !== false) {
      const remainingAfterPromo = Math.max(subtotal - discountAmount, 0);
      const walletBalance = await getWalletBalance(userId);
      walletCreditAmount = Math.round(Math.min(walletBalance, remainingAfterPromo) * 100) / 100;
    }

    // The actual charge — gratuity is computed inside here on the
    // discounted ride cost when the combined discount > 0, and exactly as
    // before (on the full ride cost) when it's 0.
    const chargeAmount = await calculateP2PTotalTripPrice(pointToPointBook, {
      discount: discountAmount + walletCreditAmount,
    });

    pointToPointBook.totalTripFeeInDollars = chargeAmount;
    if (appliedPromoCode) {
      pointToPointBook.promoDiscountAmountInDollars = discountAmount;
      pointToPointBook.hasDiscountApplied = true;
    }
    if (walletCreditAmount > 0) {
      pointToPointBook.walletCreditAppliedInDollars = walletCreditAmount;
      pointToPointBook.hasDiscountApplied = true;
    }
    pointToPointBook = await pointToPointBook.save();

    const paymentResult = await processBookingPayment({
      bookingType: "P2P",
      bookingId: pointToPointBook.pointToPointBookId,
      confirmationNumber,
      amountDollars: chargeAmount,
      paymentMethod,
      square,
      squareCardId,
      paymentDetailId,
      userId,
      isGuestBooking,
      cardDetails,
    });

    if (paymentResult.paymentDetail) {
      await pointToPointBook.setPaymentDetail(paymentResult.paymentDetail);
    }
    // The customer chose "add new card," but resolveSquareSourceId now saves
    // it as a real card-on-file before charging it (see bookingSquarePayment.js)
    // — the booking's own paymentMethod label should reflect that reality
    // immediately, not wait for a later recharge to back-fill it.
    if (paymentMethod === "SQUARE_NEW_CARD" && paymentResult.paymentDetail?.squareCardId) {
      pointToPointBook.paymentMethod = "SQUARE_SAVED_CARD";
    }
    pointToPointBook.paymentStatus = paymentResult.paymentStatus;
    await pointToPointBook.save();

    if (appliedPromoCode) {
      await redeemPromoCode({
        promoCode: appliedPromoCode,
        userId,
        guestEmail: userId ? undefined : pointToPointBook.passengerEmail,
        guestPhone: userId ? undefined : pointToPointBook.passengerCellPhone,
        bookingId: pointToPointBook.pointToPointBookId,
        bookingType: "Point to point",
        discountApplied: discountAmount,
      });
    }
    if (walletCreditAmount > 0) {
      await redeemWalletCredit({
        userId,
        bookingId: pointToPointBook.pointToPointBookId,
        bookingType: "Point to point",
        amount: walletCreditAmount,
      });
    }
  } catch (error) {
    // Payment (or anything else in this block) failed — the booking must
    // not survive as a payment-less "PENDING_APPROVAL" row the customer can
    // see. Destroy it rather than leaving it committed.
    await pointToPointBook.destroy();
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error(`payment processing failed: ${error.message}`);
  }

  const full = await getPointToPointBookById(pointToPointBook.pointToPointBookId);
  bookingNotification("Point to point", full);
  return {
    ...full.toJSON(),
    realtime: {
      provider: "socket.io",
      event: "payment.transaction.updated",
      // short-lived signed token to join the specific booking room
      roomToken: signBookingRoomToken({
        bookingType: "P2P",
        bookingId: full.pointToPointBookId,
        userId: full.userId,
      }),
    },
  };
}

async function updatePointToPointBook(pointToPointBookId, updatedData) {
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
  return await pointToPointBook.update(updatedData);
}

async function updatePointToPointBookForUser(pointToPointBookId, userId, updatedData, opts = {}) {
  const isAdmin = Boolean(opts.isAdmin);
  const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
  const previousTotal = Number(pointToPointBook.totalTripFeeInDollars) || 0;

  if (!isAdmin) {
    if (!pointToPointBook.userId || Number(pointToPointBook.userId) !== Number(userId)) {
      throw new ResourceNotFoundError("Booking not found.");
    }
    // A booking is only ever locked from customer self-service editing once
    // it's fully done AND paid — a trip that's already completed but still
    // owes money (e.g. cash due, or a failed/declined charge) stays editable
    // so the customer has a way to fix the payment method. Every other
    // status (ACCEPTED, EN_ROUTE, even CANCELLED/REJECTED) is intentionally
    // still editable — this replaces a much longer locked-status list that
    // blocked edits far earlier in the lifecycle than the business actually
    // needed.
    if (
      pointToPointBook.bookingStatus === "COMPLETED" &&
      pointToPointBook.paymentStatus === "PAID"
    ) {
      throw new ValidationError(
        "This booking is completed and paid, and can no longer be updated."
      );
    }
  }

  const promoCodeTouched = Object.prototype.hasOwnProperty.call(updatedData || {}, "promoCode");
  const walletTouched = Object.prototype.hasOwnProperty.call(updatedData || {}, "useWalletCredit");
  const {
    extraOptions,
    sidePicks: sidePicksUpdate,
    promoCode: promoCodeUpdate,
    useWalletCredit: useWalletCreditUpdate,
    square,
    squareCardId,
    paymentDetailId: paymentDetailIdUpdate,
    ...data
  } = updatedData || {};
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

  if (Array.isArray(sidePicksUpdate)) {
    await SidePickDetour.destroy({ where: { pointToPointBookId } });
    if (sidePicksUpdate.length > 0) {
      const picks = sidePicksUpdate.map((sp, idx) => ({
        ...sp,
        sortOrder: sp.sortOrder != null ? sp.sortOrder : idx,
        pointToPointBookId: pointToPointBook.pointToPointBookId,
      }));
      await SidePickDetour.bulkCreate(picks);
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

  // Carries forward whatever discount this booking already had (frozen at
  // creation, or from an earlier update) into this recompute by default —
  // otherwise ANY unrelated edit here (new car, new extras, ...) would
  // silently zero out an already-applied promo discount, since the fare
  // calculator only ever applies the discount it's explicitly given.
  let discountAmount = Number(reloaded.promoDiscountAmountInDollars) || 0;
  let walletCreditAmount = Number(reloaded.walletCreditAppliedInDollars) || 0;
  const subtotal =
    promoCodeTouched || walletTouched ? await calculateP2PSubtotal(reloaded) : null;

  if (promoCodeTouched) {
    const result = await updateBookingPromoCode({
      code: promoCodeUpdate,
      userId,
      guestEmail: reloaded.passengerEmail,
      guestPhone: reloaded.passengerCellPhone,
      bookingType: "Point to point",
      bookingId: reloaded.pointToPointBookId,
      fareAmount: subtotal,
    });
    discountAmount = result.discountAmount;
    reloaded.promoDiscountAmountInDollars = discountAmount;
    reloaded.hasDiscountApplied = discountAmount > 0;
  }

  // Same "touched" idiom as promo code: the key must be present in the PATCH
  // body at all to act on it. Reverses any wallet credit this booking
  // already drew first (so the balance is accurate before recomputing —
  // same reason updateBookingPromoCode reverses the existing redemption
  // first), then re-applies up to the current balance, unless the customer
  // explicitly opted out (useWalletCredit: false) or this is a guest booking.
  if (walletTouched) {
    await reverseRedemptionForBooking({
      bookingId: reloaded.pointToPointBookId,
      bookingType: "Point to point",
    });
    if (useWalletCreditUpdate === false || !reloaded.userId) {
      walletCreditAmount = 0;
    } else {
      const remainingAfterPromo = Math.max(subtotal - discountAmount, 0);
      const balance = await getWalletBalance(reloaded.userId);
      walletCreditAmount = Math.round(Math.min(balance, remainingAfterPromo) * 100) / 100;
    }
    reloaded.walletCreditAppliedInDollars = walletCreditAmount;
    reloaded.hasDiscountApplied = reloaded.hasDiscountApplied || walletCreditAmount > 0;
  }

  const totalTripFee = await calculateP2PTotalTripPrice(reloaded, {
    discount: discountAmount + walletCreditAmount,
  });
  reloaded.totalTripFeeInDollars = totalTripFee;
  await reloaded.save();

  if (walletTouched && walletCreditAmount > 0) {
    await redeemWalletCredit({
      userId: reloaded.userId,
      bookingId: reloaded.pointToPointBookId,
      bookingType: "Point to point",
      amount: walletCreditAmount,
    });
  }
  const finalBook = await getPointToPointBookById(pointToPointBook.pointToPointBookId);
  const newTotal = Number(finalBook.totalTripFeeInDollars);
  // A customer switching cards sends `square` (a fresh nonce) or
  // `squareCardId` (a different saved card) with no fare change at all —
  // reconciliation must still run in that case, not just on a fare delta.
  const paymentMethodTouched = Boolean(square?.sourceId) || Boolean(squareCardId);
  if (
    previousTotal > 0 &&
    newTotal > 0 &&
    (Math.abs(previousTotal - newTotal) > 0.009 || paymentMethodTouched)
  ) {
    const paymentUpdate = await reconcilePaymentOnBookingUpdate({
      bookingType: "P2P",
      bookingId: finalBook.pointToPointBookId,
      confirmationNumber: finalBook.confirmationNumber,
      newAmountDollars: newTotal,
      paymentMethod: finalBook.paymentMethod,
      paymentDetailId: paymentDetailIdUpdate ?? finalBook.paymentDetailId,
      userId: finalBook.userId,
      square,
      squareCardId,
      booking: finalBook,
    });
    if (paymentUpdate) {
      if (paymentUpdate.paymentDetail) {
        await finalBook.setPaymentDetail(paymentUpdate.paymentDetail);
      }
      if (paymentMethodTouched && paymentUpdate.paymentMethod) {
        finalBook.paymentMethod = paymentUpdate.paymentMethod;
      }
      if (paymentUpdate.paymentStatus) {
        finalBook.paymentStatus = paymentUpdate.paymentStatus;
      }
      await finalBook.save();
    }
  }

  await bookingUpdateNotification("Point to point", finalBook);
  return finalBook;
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

  // Always recompute the true fare fresh rather than trusting the
  // currently-stored totalTripFeeInDollars — that column may already
  // reflect an earlier manual discount. Feeds the already-applied promo
  // discount (if any) back into the calculation so gratuity is still
  // computed on the promo-discounted ride cost, not the pre-discount
  // sticker price — recomputing from scratch each time makes this
  // idempotent (calling it twice with the same amount is a no-op) and
  // keeps the manual discount strictly additive on top of any promo
  // discount instead of one silently overwriting the other's effect on
  // the total.
  const promoDiscount = Number(pointToPointBook.promoDiscountAmountInDollars) || 0;
  const remainingAfterPromo = await calculateP2PTotalTripPrice(pointToPointBook, {
    discount: promoDiscount,
  });

  if (discountAmount > remainingAfterPromo) {
    throw new ValidationError(
      "Discount amount cannot exceed the fare remaining after any promo discount."
    );
  }

  pointToPointBook.totalTripFeeInDollars = remainingAfterPromo - discountAmount;
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
  const saved = await pointToPointBook.save();

  if (updatedData.bookingStatus === "COMPLETED") {
    // No-op unless this ride was the triggering ride for a pending referral reward.
    await creditReferralRewardIfCompleted("Point to point", pointToPointBookId);
    // No-op unless this ride is this customer's Nth completed ride and
    // qualifies for the loyalty milestone (see loyaltyService.js).
    await creditLoyaltyMilestoneIfEligible("Point to point", pointToPointBookId);
  }

  return saved;
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
        attributes: PAYMENT_DETAIL_SAFE_ATTRIBUTES,
      },
      {
        model: Gratuity,
        attributes: ["percentage", "description"],
      },
      {
        model: Car,
        // Car is paranoid (soft-delete); without this, a booking made with
        // a since-retired car comes back with Car: null.
        paranoid: false,
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
        through: { attributes: ["quantity"] },
      },
      {
        model: SidePickDetour,
        as: "SidePickDetours",
        attributes: ["sidePickId", "address", "latitude", "longitude", "sortOrder"],
      },
    ],
  });

  if (!pointToPointBook)
    throw new ResourceNotFoundError(
      `Point To Point Book with ID ${pointToPointBookId} not found`
    );

  // Side detour fee isn't its own persisted column (see SideDetourSettings) —
  // computed here, best-effort, from the stops actually on this booking and
  // the CURRENT admin setting, same approximation the confirmation email
  // already makes. Set as a plain (undeclared) data value so it round-trips
  // through res.json() without becoming a real, persisted model attribute —
  // it's display-only and never written back on .save().
  if (pointToPointBook.SidePickDetours?.length > 0) {
    const settings = await getSideDetourSettings();
    pointToPointBook.setDataValue(
      "sideDetourFee",
      sideDetourFeeFor(pointToPointBook, {
        sideDetourCount: pointToPointBook.SidePickDetours.length,
        sideDetourSettings: settings,
      })
    );
  } else {
    pointToPointBook.setDataValue("sideDetourFee", 0);
  }

  // Same reasoning as sideDetourFee above — not its own column, sourced
  // from the confirmed PromoCodeRedemption row for this booking, display-only.
  // Skipped entirely when there's no discount at all, to avoid a redemption
  // lookup on every single booking fetch.
  pointToPointBook.setDataValue(
    "appliedPromoCode",
    pointToPointBook.hasDiscountApplied
      ? await getAppliedPromoCodeForBooking(pointToPointBook.pointToPointBookId, "Point to point")
      : null
  );

  // Same display-only pattern as sideDetourFee/appliedPromoCode above — the
  // full Square transaction trail for this booking, oldest first, so an
  // admin (or the customer's own booking detail view) can see when a
  // payment hold was renewed (see renewAuthorizationForBooking) or
  // reconciled after a fare change, not just the single current status.
  pointToPointBook.setDataValue(
    "paymentHistory",
    await findTransactionHistory("P2P", pointToPointBook.pointToPointBookId)
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
