// const { Op, ValidationError } = require("sequelize");
// const { HourlyCharterBook } = require("../../models/HourlyCharterBook.js");
// const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
// const { getCarById } = require("../booking/carService.js");
// const HourlyCharterBookExtraOption = require("../../models/HourlyCharterBookExtraOption.js");
// const { ExtraOption } = require("../../models/ExtraOption.js");
// const { Car } = require("../../models/Car.js");
// const { Gratuity } = require("../../models/Gratuity.js");
// const { getGratuityById } = require("../booking/gratuityService.js");
// const { addOrUpdatePaymentDetail, getPrimaryCard, getFromExistingCards, createPaymentDetail } = require("../paymentDetailService.js");
// const { PaymentDetail } = require("../../models/PaymentDetail.js");
// const {
//   calculateHourlyCharterTotalTripPrice,
// } = require("../utilTripService.js");

// const { bookingNotification } = require("../../utils/emailSender");
// const generateConfirmationNumber = require("../bookingUtils.js");

// async function createHourlyCharterBook(hourlyCharterBookData) {
//   const {
//     carId,
//     gratuityId,
//     extraOptions,
//     creditCardNumber,
//     expirationDate,
//     securityCode,
//     zipCode,
//     cardOwnerName,
//     paymentMethod,
//     paymentDetailId,
//     userId,
//     cardDetails,
//     isGuestBooking,
//     ...otherData
//   } = hourlyCharterBookData;

//   if (!paymentMethod) {
//     throw new ValidationError("Payment method is required");
//   }

//   if ((paymentMethod === 'PRIMARY_CARD' || paymentMethod === 'EXISTING_CARD')) {
//     if (!userId) {
//       throw new ValidationError("User authentication required for saved payment methods");
//     }
//   }
//   const confirmationNumber = await generateConfirmationNumber();

//   let hourlyCharterBook = await HourlyCharterBook.create({
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

//     await hourlyCharterBook.setPaymentDetail(paymentDetail);


//     if (carId) {
//       const existingCar = await getCarById(carId);
//       await hourlyCharterBook.setCar(existingCar);
//       await hourlyCharterBook.save();
//     }

//     if (gratuityId) {
//       const gratuity = await getGratuityById(gratuityId);
//       await hourlyCharterBook.setGratuity(gratuity);
//       // await hourlyCharterBook.save();
//     }


//     if (extraOptions && extraOptions.length > 0) {
//       const validExtraOptions = extraOptions.filter(option => option.extraOptionId && option.quantity);
//       if (validExtraOptions.length > 0) {
//         const associations = validExtraOptions.map(({ extraOptionId, quantity }) => ({
//           extraOptionId,
//           hourlyCharterBookId: hourlyCharterBook.hourlyCharterBookId,
//           quantity,
//           bookType: "Hourly-Charter",
//         }));

//         await HourlyCharterBookExtraOption.bulkCreate(associations);
//       }
//     }


//       hourlyCharterBook = await getHourlyCharterBookById(
//         hourlyCharterBook.hourlyCharterBookId
//       );

//       //calculate total trip fee
//       const totalTripFee = await calculateHourlyCharterTotalTripPrice(
//         hourlyCharterBook
//       );
//       hourlyCharterBook.totalTripFeeInDollars = totalTripFee;
//       await hourlyCharterBook.save();

//       //notify admin and user
//       bookingNotification("Hourly Charter", hourlyCharterBook);

//       return  await getHourlyCharterBookById(hourlyCharterBook.hourlyCharterBookId);
//     } catch(error){
//       await hourlyCharterBook.destroy();
//       if (error instanceof ValidationError){
//         throw error 
//       }
//       throw new Error (`payment processing failed: ${error.message}`);

//     }
//   }

//     async function updateHourlyCharterBook(hourlyCharterBookId, updatedData) {
//       const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
//       return await hourlyCharterBook.update(updatedData);
//     }

//     async function getHourlyCharterBooks({
//       page = 1,
//       pageSize = 10,
//       paymentStatus,
//       bookingStatus,
//       sortDirection = "DESC",
//     }) {
//       const options = {
//         order: [["createdAt", sortDirection.toUpperCase()]],
//         limit: +pageSize, // Convert pageSize to a number
//         offset: (page - 1) * +pageSize, // Convert pageSize to a number
//         where: {},
//         attributes: { exclude: ["deletedAt"] },
//       };

//       if (paymentStatus && bookingStatus) {
//         options.where.paymentStatus = paymentStatus;
//         options.where.bookingStatus = bookingStatus;
//       } else if (paymentStatus) {
//         options.where.paymentStatus = { [Op.eq]: paymentStatus };
//       } else if (bookingStatus) {
//         options.where.bookingStatus = { [Op.eq]: bookingStatus };
//       }

//       const { count, rows } = await HourlyCharterBook.findAndCountAll(options);

//       const totalElements = count;
//       const totalPages = Math.ceil(totalElements / pageSize);

//       return {
//         pageNumber: +page,
//         pageSize: +pageSize,
//         totalElements,
//         totalPages,
//         data: rows,
//       };
//     }

//     async function deleteHourlyCharterBook(hourlyCharterBookId) {
//       const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
//       await hourlyCharterBook.destroy();
//     }

//     async function updatePaymentStatus(hourlyCharterBookId, paymentStatus) {
//       const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

//       hourlyCharterBook.paymentStatus = paymentStatus;
//       return await hourlyCharterBook.save();
//     }

//     async function updateBookingStatus(hourlyCharterBookId, bookingStatus) {
//       const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

//       hourlyCharterBook.bookingStatus = bookingStatus;
//       return await hourlyCharterBook.save();
//     }

//     async function getHourlyCharterBookById(hourlyCharterBookId) {
//       const hourlyCharterBook = await HourlyCharterBook.findByPk(
//         hourlyCharterBookId,
//         {
//           attributes: {
//             exclude: ["carId" ,"createdAt", "updatedAt", "deletedAt"],
//           },
//           include: [
//             {
//               model: PaymentDetail,
//               attributes: [
//                 "creditCardNumber",
//                 "expirationDate",
//                 "securityCode",
//                 "zipCode",
//                 "cardOwnerName",
//               ],
//             },
//             {
//               model: Gratuity,
//               attributes: ["percentage", "description"],
//             },
//             {
//               model: Car,
//               attributes: [
//                 "carId",
//                 "carName",
//                 "carImageUrl",
//                 "pricePerMile",
//                 "pricePerHour",
//                 "minimumStartFee",
//                 "currency",
//               ],
//             },

//             {
//               model: ExtraOption,
//               attributes: ["extraOptionId", "name", "description", "pricePerItem"],
//             },
//           ],
//         }
//       );

//       if (!hourlyCharterBook)
//         throw new ResourceNotFoundError(
//           `Hourly Charter Book with ID ${hourlyCharterBookId} not found`
//         );
//       return hourlyCharterBook;
//     }

//     module.exports = {
//       createHourlyCharterBook,
//       updateHourlyCharterBook,
//       getHourlyCharterBooks,
//       getHourlyCharterBookById,
//       deleteHourlyCharterBook,
//       updateBookingStatus,
//       updatePaymentStatus,
//     };


const { Op } = require("sequelize");
const { HourlyCharterBook } = require("../../models/HourlyCharterBook.js");
const {
  ResourceNotFoundError,
  ValidationError,
} = require("../../errors/CustomErrors.js");
const { getCarById } = require("../booking/carService.js");
const HourlyCharterBookExtraOption = require("../../models/HourlyCharterBookExtraOption.js");
const { ExtraOption } = require("../../models/ExtraOption.js");
const { Car } = require("../../models/Car.js");
const { Gratuity } = require("../../models/Gratuity.js");
const { getGratuityById } = require("../booking/gratuityService.js");
const {
  processBookingPayment,
  reconcilePaymentOnBookingUpdate,
} = require("../payments/bookingSquarePayment.js");
const { signBookingRoomToken } = require("../../realtime/socketRoomToken.js");
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
  calculateHourlyCharterTotalTripPrice,
  calculateHourlyCharterSubtotal,
} = require("../utilTripService.js");
const {
  calculateExtraTimeFare,
  calculateLiveModePreAuthAmount,
  roundMoney,
  asMoney,
} = require("../../utils/bookingFareCalculator.js");

const { bookingNotification, bookingUpdateNotification } = require("../../utils/emailSender");
const generateConfirmationNumber = require("../bookingUtils.js");
const {
  validatePromoCode,
  redeemPromoCode,
  creditReferralRewardIfCompleted,
} = require("../promoCodeService.js");

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
    square,
    squareCardId,
    isGuestBooking,
    promoCode,
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
    if (carId) {
      const existingCar = await getCarById(carId);
      await hourlyCharterBook.setCar(existingCar);
      await hourlyCharterBook.save();
    }

    if (gratuityId) {
      const gratuity = await getGratuityById(gratuityId);
      await hourlyCharterBook.setGratuity(gratuity);
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

    // LIVE mode: pre-authorize (selectedHours + bufferHours) so the hold
    // covers potential overtime — actual capture happens at trip end.
    const billingMode = hourlyCharterBook.billingMode || "PRE_BOOKED";

    // A LIVE pre-auth hold is sized off selectedHours+buffer, not
    // totalTripFee, so a fare discount doesn't translate into a smaller hold
    // in any well-defined way. Promo codes are PRE_BOOKED-only for now.
    if (promoCode && billingMode === "LIVE") {
      throw new ValidationError(
        "Promo codes can only be applied to pre-booked hourly charters, not live-metered ones."
      );
    }

    // Promo code, if provided, is validated against the ride's own
    // pre-gratuity subtotal — never the gratuity-inclusive total — so a
    // discount can never eat into gratuity, and gratuity (below) can then
    // be computed on the discounted ride cost rather than the pre-discount
    // sticker price.
    let appliedPromoCode = null;
    let discountAmount = 0;
    if (promoCode) {
      const subtotal = await calculateHourlyCharterSubtotal(hourlyCharterBook);
      const result = await validatePromoCode({
        code: promoCode,
        userId,
        guestEmail: userId ? undefined : hourlyCharterBook.passengerEmail,
        guestPhone: userId ? undefined : hourlyCharterBook.passengerCellPhone,
        bookingType: "Hourly Charter",
        fareAmount: subtotal,
        bookingId: hourlyCharterBook.hourlyCharterBookId,
      });
      appliedPromoCode = result.promoCode;
      discountAmount = result.discount;
    }

    // The actual charge — gratuity is computed inside here on the
    // discounted ride cost when discountAmount > 0, and exactly as before
    // (on the full ride cost) when it's 0. (LIVE mode always has
    // discountAmount === 0 here, since it's rejected above.)
    const discountedTripFee = await calculateHourlyCharterTotalTripPrice(hourlyCharterBook, {
      discount: discountAmount,
    });

    hourlyCharterBook.totalTripFeeInDollars = discountedTripFee;
    if (appliedPromoCode) {
      hourlyCharterBook.promoDiscountAmountInDollars = discountAmount;
      hourlyCharterBook.hasDiscountApplied = true;
    }
    await hourlyCharterBook.save();

    let chargeAmount = discountedTripFee;
    if (billingMode === "LIVE" && hourlyCharterBook.Car) {
      const bufferHours = hourlyCharterBook.preAuthBufferHours || 2;
      const gratuityPct = asMoney(hourlyCharterBook.Gratuity?.percentage);
      chargeAmount = calculateLiveModePreAuthAmount({
        car: hourlyCharterBook.Car,
        selectedHours: hourlyCharterBook.selectedHours,
        bufferHours,
        gratuityPercentage: gratuityPct,
      });
    }

    const paymentResult = await processBookingPayment({
      bookingType: "HOURLY",
      bookingId: hourlyCharterBook.hourlyCharterBookId,
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
      await hourlyCharterBook.setPaymentDetail(paymentResult.paymentDetail);
    }
    hourlyCharterBook.paymentStatus = paymentResult.paymentStatus;
    await hourlyCharterBook.save();

    if (appliedPromoCode) {
      await redeemPromoCode({
        promoCode: appliedPromoCode,
        userId,
        guestEmail: userId ? undefined : hourlyCharterBook.passengerEmail,
        guestPhone: userId ? undefined : hourlyCharterBook.passengerCellPhone,
        bookingId: hourlyCharterBook.hourlyCharterBookId,
        bookingType: "Hourly Charter",
        discountApplied: discountAmount,
      });
    }
  } catch (error) {
    // Payment (or anything else in this block) failed — the booking must
    // not survive as a payment-less "PENDING_APPROVAL" row the customer can
    // see. Destroy it rather than leaving it committed.
    await hourlyCharterBook.destroy();
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error(`payment processing failed: ${error.message}`);
  }

  const full = await getHourlyCharterBookById(hourlyCharterBook.hourlyCharterBookId);
  bookingNotification("Hourly Charter", full);
  return {
    ...full.toJSON(),
    realtime: {
      provider: "socket.io",
      event: "payment.transaction.updated",
      roomToken: signBookingRoomToken({
        bookingType: "HOURLY",
        bookingId: full.hourlyCharterBookId,
        userId: full.userId,
      }),
    },
  };
}

    async function updateHourlyCharterBook(hourlyCharterBookId, updatedData) {
      const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
      return await hourlyCharterBook.update(updatedData);
    }

    async function updateHourlyCharterBookForUser(hourlyCharterBookId, userId, updatedData, opts = {}) {
      const isAdmin = Boolean(opts.isAdmin);
      const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
      const previousTotal = Number(hourlyCharterBook.totalTripFeeInDollars) || 0;

      if (!isAdmin) {
        if (!hourlyCharterBook.userId || Number(hourlyCharterBook.userId) !== Number(userId)) {
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
        if (lockedStatuses.has(hourlyCharterBook.bookingStatus)) {
          throw new ValidationError("This booking can no longer be updated.");
        }
      }

      const { extraOptions, square, squareCardId, ...data } = updatedData || {};
      if (Array.isArray(extraOptions)) {
        await HourlyCharterBookExtraOption.destroy({ where: { hourlyCharterBookId } });
        const validExtraOptions = extraOptions.filter(
          (o) => o && o.extraOptionId && o.quantity
        );
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

      if (Object.prototype.hasOwnProperty.call(data, "carId") && data.carId) {
        const existingCar = await getCarById(data.carId);
        if (existingCar) await hourlyCharterBook.setCar(existingCar);
        delete data.carId;
      }
      if (Object.prototype.hasOwnProperty.call(data, "gratuityId") && data.gratuityId) {
        const gratuity = await getGratuityById(data.gratuityId);
        if (gratuity) await hourlyCharterBook.setGratuity(gratuity);
        delete data.gratuityId;
      }

      await hourlyCharterBook.update(data);

      const reloaded = await getHourlyCharterBookById(hourlyCharterBook.hourlyCharterBookId);
      const totalTripFee = await calculateHourlyCharterTotalTripPrice(reloaded);
      reloaded.totalTripFeeInDollars = totalTripFee;
      await reloaded.save();
      const finalBook = await getHourlyCharterBookById(hourlyCharterBook.hourlyCharterBookId);
      const newTotal = Number(finalBook.totalTripFeeInDollars);
      if (
        previousTotal > 0 &&
        newTotal > 0 &&
        Math.abs(previousTotal - newTotal) > 0.009
      ) {
        const paymentUpdate = await reconcilePaymentOnBookingUpdate({
          bookingType: "HOURLY",
          bookingId: finalBook.hourlyCharterBookId,
          confirmationNumber: finalBook.confirmationNumber,
          newAmountDollars: newTotal,
          paymentMethod: finalBook.paymentMethod,
          paymentDetailId: finalBook.paymentDetailId,
          userId: finalBook.userId,
          square,
          squareCardId,
        });
        if (paymentUpdate?.paymentStatus) {
          finalBook.paymentStatus = paymentUpdate.paymentStatus;
          await finalBook.save();
        }
      }

      await bookingUpdateNotification("Hourly Charter", finalBook);
      return finalBook;
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
      const saved = await hourlyCharterBook.save();

      if (updatedData.bookingStatus === "COMPLETED") {
        await creditReferralRewardIfCompleted("Hourly Charter", hourlyCharterBookId);
      }

      return saved;
    }

    async function applyDiscountToHourlyCharterBook(hourlyCharterBookId, discountAmount) {
      const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);

      if (discountAmount < 0) {
        throw new ValidationError("Discount amount cannot be negative.");
      }

      // Recompute the true fare fresh each time, feeding the already-applied
      // promo discount (if any) back in so gratuity still reflects it — see
      // the P2P equivalent of this function for why (idempotency + additive
      // with any promo-code discount instead of overwriting it).
      const promoDiscount = Number(hourlyCharterBook.promoDiscountAmountInDollars) || 0;
      const remainingAfterPromo = await calculateHourlyCharterTotalTripPrice(hourlyCharterBook, {
        discount: promoDiscount,
      });

      if (discountAmount > remainingAfterPromo) {
        throw new ValidationError(
          "Discount amount cannot exceed the fare remaining after any promo discount."
        );
      }

      hourlyCharterBook.totalTripFeeInDollars = remainingAfterPromo - discountAmount;
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
                ...PAYMENT_DETAIL_SAFE_ATTRIBUTES,
              ],
            },
            {
              model: Gratuity,
              attributes: ["percentage", "description"],
            },
            {
              model: Car,
              // Car is paranoid (soft-delete); without this, a booking made
              // with a since-retired car comes back with Car: null.
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
              model: ExtraOption,
              attributes: ["extraOptionId", "name", "description", "pricePerItem"],
              through: { attributes: ["quantity"] },
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

    /**
     * Start the trip clock.
     * LIVE mode: starts immediately.
     * PRE_BOOKED mode: only if convertToLive=true (Feature 2 — convert fixed to live at start).
     * Records `servingDriverId` as whoever (driver or admin) actually starts the
     * trip, so a driver's personal trip history can be scoped to trips they served.
     */
    async function startHourlyTrip(hourlyCharterBookId, { convertToLive = false } = {}, servingUserId = null) {
      const booking = await getHourlyCharterBookById(hourlyCharterBookId);

      if (booking.billingMode === "PRE_BOOKED" && !convertToLive) {
        throw new ValidationError(
          "This is a fixed-rate booking. Pass convertToLive:true to switch it to a live meter before starting."
        );
      }
      if (booking.actualStartTime) {
        throw new ValidationError("Trip has already been started.");
      }
      const allowedStatuses = new Set(["ACCEPTED", "AWAITING_PICKUP", "PICKUP_COMPLETED"]);
      if (!allowedStatuses.has(booking.bookingStatus)) {
        throw new ValidationError(`Cannot start trip from status: ${booking.bookingStatus}`);
      }

      if (convertToLive && booking.billingMode === "PRE_BOOKED") {
        booking.billingMode = "LIVE";
        booking.convertedToLiveAt = new Date();
      }

      booking.actualStartTime = new Date();
      booking.bookingStatus = "EN_ROUTE";
      if (servingUserId != null) {
        booking.servingDriverId = servingUserId;
      }
      await booking.save();
      return booking;
    }

    /**
     * Feature 1 — Extend a PRE_BOOKED trip with a live meter after booked hours expire.
     * Preserves the original fixed fare and starts counting extension time at live rates.
     */
    async function extendWithLiveMeter(hourlyCharterBookId) {
      const booking = await getHourlyCharterBookById(hourlyCharterBookId);

      if (booking.billingMode !== "PRE_BOOKED") {
        throw new ValidationError("Only PRE_BOOKED bookings can be extended with a live meter.");
      }
      if (booking.liveExtensionStartedAt) {
        throw new ValidationError("Live extension has already been activated for this booking.");
      }
      const allowedStatuses = new Set(["ACCEPTED", "EN_ROUTE", "AWAITING_PICKUP", "PICKUP_COMPLETED"]);
      if (!allowedStatuses.has(booking.bookingStatus)) {
        throw new ValidationError(`Cannot extend from status: ${booking.bookingStatus}`);
      }

      booking.liveExtensionBaseFare  = asMoney(booking.totalTripFeeInDollars);
      booking.liveExtensionStartedAt = new Date();
      booking.billingMode            = "LIVE";   // switch so end-trip controls work
      booking.bookingStatus          = "EN_ROUTE";
      await booking.save();
      return booking;
    }

    /**
     * End the trip, compute final fare, and reconcile payment.
     * Handles three cases:
     *   A) Pure LIVE booking (standard)
     *   B) PRE_BOOKED converted to LIVE at start (Feature 2)
     *   C) PRE_BOOKED extended with live meter (Feature 1) — liveExtensionStartedAt is set
     */
    async function endHourlyTrip(hourlyCharterBookId) {
      const booking = await getHourlyCharterBookById(hourlyCharterBookId);

      if (booking.billingMode !== "LIVE") {
        throw new ValidationError("end-trip is only valid for LIVE billing mode bookings.");
      }
      if (!booking.actualStartTime) {
        throw new ValidationError("Trip has not been started yet.");
      }
      if (booking.actualEndTime) {
        throw new ValidationError("Trip has already been ended.");
      }

      const now = new Date();
      const pricePerHour = asMoney(booking.Car?.pricePerHour);

      let finalTotal, overtimeHours, overtimeAmount, actualHoursUsed, extensionFare;

      if (booking.liveExtensionStartedAt) {
        // ── Case C: PRE_BOOKED extended — bill only the extension time,
        // to the exact minute, at the plain hourly rate. The dollar math uses
        // the full-precision hour fraction; only the stored/reported hour
        // values are rounded to 2dp, so a 6h32m trip bills as exactly
        // 32 minutes of extra time, not a rounded-off approximation.
        const extMs        = now - new Date(booking.liveExtensionStartedAt);
        const extMinutes   = Math.round(extMs / 60000);
        const extHoursRaw  = extMinutes / 60;

        extensionFare   = calculateExtraTimeFare(pricePerHour, extHoursRaw);
        const baseFare  = asMoney(booking.liveExtensionBaseFare);

        finalTotal      = roundMoney(baseFare + extensionFare);
        overtimeHours   = roundMoney(extHoursRaw);
        overtimeAmount  = extensionFare;
        actualHoursUsed = roundMoney(asMoney(booking.selectedHours) + extHoursRaw);

        booking.liveExtensionFareInDollars = extensionFare;
      } else {
        // ── Cases A & B: standard LIVE meter from actualStartTime. Minimum
        // charge is the booked hours; time beyond that is billed at the same
        // plain hourly rate (no overtime premium), to the exact minute ──────
        const elapsedMs       = now - new Date(booking.actualStartTime);
        const elapsedMinutes  = Math.round(elapsedMs / 60000);
        const elapsedHoursRaw = elapsedMinutes / 60;

        const bookedHours     = asMoney(booking.selectedHours);
        const actualHoursUsedRaw = Math.max(elapsedHoursRaw, bookedHours);
        const overtimeHoursRaw   = Math.max(actualHoursUsedRaw - bookedHours, 0);
        overtimeAmount        = calculateExtraTimeFare(pricePerHour, overtimeHoursRaw);
        actualHoursUsed       = roundMoney(actualHoursUsedRaw);
        overtimeHours         = roundMoney(overtimeHoursRaw);

        const originalFare    = asMoney(booking.totalTripFeeInDollars);
        finalTotal            = roundMoney(originalFare + overtimeAmount);
      }

      const previousTotal = asMoney(booking.totalTripFeeInDollars);
      booking.actualEndTime             = now;
      booking.actualHoursUsed           = actualHoursUsed;
      booking.overtimeHours             = overtimeHours;
      booking.overtimeAmountInDollars   = overtimeAmount;
      booking.totalTripFeeInDollars     = finalTotal;
      booking.bookingStatus             = "COMPLETED";
      await booking.save();

      if (finalTotal !== previousTotal) {
        try {
          await reconcilePaymentOnBookingUpdate({
            bookingType: "HOURLY",
            bookingId: booking.hourlyCharterBookId,
            previousTotal,
            newTotal: finalTotal,
            paymentDetailId: booking.paymentDetailId,
            squareCardId: booking.squareCardId,
          });
        } catch (_) {}
      }

      return await getHourlyCharterBookById(hourlyCharterBookId);
    }

    /**
     * Returns elapsed time + running fare.
     * Works for: LIVE, converted-to-LIVE (Feature 2), and PRE_BOOKED+extension (Feature 1).
     * Also returns static fare summary for plain PRE_BOOKED trips (no live clock).
     */
    function getLiveTripStatus(booking) {
      const pricePerHour = asMoney(booking.Car?.pricePerHour);
      const bookedHours  = asMoney(booking.selectedHours);

      // ── PRE_BOOKED (no extension, no conversion) — static fare summary ──────
      if (booking.billingMode === "PRE_BOOKED" && !booking.liveExtensionStartedAt) {
        return {
          status: "FIXED_RATE",
          bookedHours,
          fixedFare: asMoney(booking.totalTripFeeInDollars),
          pricePerHour,
          bookingStatus: booking.bookingStatus,
          convertedToLiveAt: booking.convertedToLiveAt || null,
        };
      }

      if (booking.actualEndTime) {
        return {
          status: "COMPLETED",
          mode: booking.liveExtensionStartedAt ? "EXTENDED" : "LIVE",
          elapsedMinutes: Math.round(
            (new Date(booking.actualEndTime) - new Date(booking.actualStartTime)) / 60000
          ),
          actualHoursUsed:   Number(booking.actualHoursUsed),
          overtimeHours:     Number(booking.overtimeHours),
          overtimeAmount:    Number(booking.overtimeAmountInDollars),
          extensionFare:     Number(booking.liveExtensionFareInDollars || 0),
          baseFare:          booking.liveExtensionStartedAt ? Number(booking.liveExtensionBaseFare) : null,
          finalTotal:        Number(booking.totalTripFeeInDollars),
        };
      }

      if (!booking.actualStartTime) {
        return { status: "NOT_STARTED", elapsedMinutes: 0, runningFare: 0 };
      }

      // ── Feature 1: PRE_BOOKED extended — clock runs from liveExtensionStartedAt,
      // but the *displayed* total continues from the booked hours already used ──
      if (booking.liveExtensionStartedAt) {
        const extMs        = Date.now() - new Date(booking.liveExtensionStartedAt).getTime();
        const extMinutes   = Math.floor(extMs / 60000);
        const extHoursRaw  = extMs / (1000 * 60 * 60);
        const baseFare     = asMoney(booking.liveExtensionBaseFare);
        const extFare      = roundMoney(calculateExtraTimeFare(pricePerHour, extHoursRaw));

        return {
          status: "IN_PROGRESS",
          mode: "EXTENDED",
          bookedHours,
          baseFare,
          extensionMinutes:   extMinutes,
          extensionHoursRaw:  roundMoney(extHoursRaw),
          extensionFare:      extFare,
          runningFare:        roundMoney(baseFare + extFare),
          // Continuous "total time" counter for the UI clock: starts at the
          // booked hours (already used under the fixed rate) and keeps
          // ticking up through the extension, instead of resetting to zero.
          totalElapsedMinutes: bookedHours * 60 + extMinutes,
          pricePerHour,
          liveExtensionStartedAt: booking.liveExtensionStartedAt,
        };
      }

      // ── Standard LIVE / converted-to-LIVE. Minimum charge is the booked
      // hours; time beyond that is billed at the same plain hourly rate ──────
      const elapsedMs      = Date.now() - new Date(booking.actualStartTime).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedHoursRaw = elapsedMs / (1000 * 60 * 60);

      let runningFare  = asMoney(booking.totalTripFeeInDollars);
      let overtimeHrs  = 0;
      if (elapsedHoursRaw > bookedHours) {
        const overtimeHoursRaw = elapsedHoursRaw - bookedHours;
        overtimeHrs = roundMoney(overtimeHoursRaw);
        runningFare = roundMoney(runningFare + calculateExtraTimeFare(pricePerHour, overtimeHoursRaw));
      }

      return {
        status: "IN_PROGRESS",
        mode: booking.convertedToLiveAt ? "CONVERTED" : "LIVE",
        elapsedMinutes,
        elapsedHoursRaw:      roundMoney(elapsedHoursRaw),
        bookedHours,
        isOvertime:           elapsedHoursRaw > bookedHours,
        overtimeHours:        overtimeHrs,
        runningFare,
        pricePerHour,
        convertedToLiveAt:    booking.convertedToLiveAt || null,
      };
    }

    /**
     * Returns all LIVE-mode bookings that are CONFIRMED or EN_ROUTE.
     * Used by the driver dashboard to show actionable trips.
     */
    async function getActiveLiveTrips() {
      const bookings = await HourlyCharterBook.findAll({
        where: {
          billingMode: "LIVE",
          bookingStatus: { [Op.in]: ["ACCEPTED", "EN_ROUTE"] },
        },
        order: [["pickupDateTime", "ASC"]],
        attributes: { exclude: ["deletedAt"] },
        include: [{ model: Car, attributes: ["carId", "carName", "pricePerHour", "carImageUrl"], paranoid: false }],
      });
      return bookings;
    }

    /**
     * All actionable trips for the driver dashboard:
     * — LIVE trips (ACCEPTED or EN_ROUTE)
     * — PRE_BOOKED trips (ACCEPTED or EN_ROUTE) — driver may convert or extend
     */
    async function getActiveDriverTrips() {
      const bookings = await HourlyCharterBook.findAll({
        where: {
          bookingStatus: { [Op.in]: ["ACCEPTED", "EN_ROUTE"] },
        },
        order: [["pickupDateTime", "ASC"]],
        attributes: { exclude: ["deletedAt"] },
        include: [{ model: Car, attributes: ["carId", "carName", "pricePerHour", "carImageUrl"], paranoid: false }],
      });
      return bookings;
    }

    /**
     * Past trips for the driver history page: completed, cancelled, or
     * rejected bookings, most recent first. Scoped to trips the requesting
     * driver actually served (via servingDriverId, set when they start a
     * trip) — admins see the full platform-wide history instead, since they
     * oversee every driver (mirrors getActiveDriverTrips, which stays
     * unscoped for the *active* queue any driver/admin can pick up).
     */
    async function getDriverTripHistory({ page = 1, pageSize = 10 }, requestingUser = null) {
      const where = {
        bookingStatus: { [Op.in]: ["COMPLETED", "CANCELLED", "REJECTED"] },
      };
      if (requestingUser && requestingUser.role !== "admin") {
        where.servingDriverId = requestingUser.userId;
      }
      const options = {
        where,
        order: [["pickupDateTime", "DESC"]],
        limit: +pageSize,
        offset: (page - 1) * +pageSize,
        attributes: { exclude: ["deletedAt"] },
        include: [{ model: Car, attributes: ["carId", "carName", "pricePerHour", "carImageUrl"], paranoid: false }],
      };

      const { count, rows } = await HourlyCharterBook.findAndCountAll(options);

      return {
        pageNumber: +page,
        pageSize: +pageSize,
        totalElements: count,
        totalPages: Math.ceil(count / pageSize),
        data: rows,
      };
    }

    module.exports = {
      createHourlyCharterBook,
      updateHourlyCharterBook,
      updateHourlyCharterBookForUser,
      getHourlyCharterBooks,
      getHourlyCharterBookById,
      deleteHourlyCharterBook,
      updateBookingStatus,
      updatePaymentStatus,
      applyDiscountToHourlyCharterBook,
      startHourlyTrip,
      endHourlyTrip,
      extendWithLiveMeter,
      getLiveTripStatus,
      getActiveLiveTrips,
      getActiveDriverTrips,
      getDriverTripHistory,
    };
