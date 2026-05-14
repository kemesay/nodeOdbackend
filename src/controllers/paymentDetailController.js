// const { successResponse } = require("../utils/responseUtil.js");

// const authenticateToken = require("../utils/getUserFromToken.js");

// const {
//   addOrUpdatePaymentDetail,
//   createPaymentDetail,
//   updatePaymentDetail,
//   getPaymentDetails,
//   getPaymentDetailById,
//   deletePaymentDetail,
//   setPrimaryCard,
//   getFromExistingCards
// } = require("../services/paymentDetailService.js");
// const {
//   getPaymentDetailByUserId,
// } = require("../services/utilTripService.js");

// async function validatePaymentDetailController(req, res, next) {
//   try {
//     const tokenHeader = req.header("Authorization");
//     let user;
//     if (tokenHeader) {
//       user = await authenticateToken(tokenHeader);
//       req.body.userId = user.userId;
//     }

//     // First validate the card
//     const validationResponse = successResponse("Card validated successfully");

//     // Then save/update the payment details
//     const paymentDetail = await createPaymentDetail(req.body);

//     return res.status(201).json({
//       ...validationResponse,
//       paymentDetail
//     });
//   } catch (error) {
//     next(error);
//   }
// }
// async function setPrimaryCardController(req, res, next) {
//   try {
//     const { paymentDetailId } = req.params;
//     const tokenHeader = req.header("Authorization");
//     const user = await authenticateToken(tokenHeader);

//     const updatedCard = await setPrimaryCard(paymentDetailId, user.userId);

//     return res.status(200).json({
//       success: true,
//       message: "Primary card updated successfully",
//       card: {
//         paymentDetailId: updatedCard.paymentDetailId,
//         lastFourDigits: updatedCard.creditCardNumber.slice(-4),
//         cardOwnerName: updatedCard.cardOwnerName,
//         isPrimary: updatedCard.isPrimary,
//         expirationDate: updatedCard.expirationDate
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// async function addOrUpdatePaymentDetailController(req, res, _next) {
//   const paymentDetail = await addOrUpdatePaymentDetail(req.body);
//   return res.status(200).json(paymentDetail);
// }

// async function createPaymentDetailController(req, res, _next) {
//   const tokenHeader = req.header("Authorization");
//   let user;
//   if (tokenHeader) {
//     user = await authenticateToken(tokenHeader);
//     req.body.userId = user.userId;
//   }

//   const paymentDetail = await createPaymentDetail(req.body);
//   return res.status(201).json(paymentDetail);
// }

// async function updatePaymentDetailController(req, res, _next) {
//   const paymentDetail = await updatePaymentDetail(req.params.paymentDetailId, req.body);
//   return res.status(200).json(paymentDetail);
// }

// async function getPaymentDetailsController(req, res, _next) {
//   const { page, pageSize, sortDirection } = req.query;
//   sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

//   const paymentDetails = await getPaymentDetails(
//     page,
//     pageSize,
//     sortDirection
//   );
//   return res.status(200).json(paymentDetails);
// }

// async function getPaymentDetailByIdController(req, res, _next) {
//   const paymentDetailId = req.params.paymentDetailId;
//   const paymentDetail = await getPaymentDetailById(paymentDetailId);
//   return res.status(200).json(paymentDetail);
// }   

// async function deletePaymentDetailController(req, res, _next) {
//   await deletePaymentDetail(req.params.paymentDetailId);
//   return res.status(200).json({ message: "Payment detail deleted successfully" });
// }         

// async function getPaymentDetailByUserIdController(req, res, _next) {
//   const { userId } = req.user;
//   const response = await getPaymentDetailByUserId(userId);
//   return res.json(response);
// }


// module.exports = {
//   validatePaymentDetailController,
//   addOrUpdatePaymentDetailController,
//   createPaymentDetailController,
//   updatePaymentDetailController,
//   getPaymentDetailsController,
//   getPaymentDetailByIdController,
//   getPaymentDetailByUserIdController,
//   deletePaymentDetailController,
//   setPrimaryCardController
// };



const { successResponse } = require("../utils/responseUtil.js");

const authenticateToken = require("../utils/getUserFromToken.js");

const {
  addOrUpdatePaymentDetail,
  createPaymentDetail,
  updatePaymentDetail,
  getPaymentDetails,
  getPaymentDetailById,
  deletePaymentDetail,
  setPrimaryCard,
  getFromExistingCards
} = require("../services/paymentDetailService.js");
const {
  getPaymentDetailByUserId,
} = require("../services/utilTripService.js");

async function validatePaymentDetailController(req, res, next) {
  try {
    const tokenHeader = req.header("Authorization");
    let user;
    if (tokenHeader) {
      user = await authenticateToken(tokenHeader);
      req.body.userId = user.userId;
    }

    // First validate the card
    const validationResponse = successResponse("Card validated successfully");

    // Then save/update the payment details
    const paymentDetail = await createPaymentDetail(req.body);

    return res.status(201).json({
      ...validationResponse,
      paymentDetail
    });
  } catch (error) {
    next(error);
  }
}
async function setPrimaryCardController(req, res, next) {
  try {
    const { paymentDetailId } = req.params;
    const tokenHeader = req.header("Authorization");
    const user = await authenticateToken(tokenHeader);

    const updatedCard = await setPrimaryCard(paymentDetailId, user.userId);

    return res.status(200).json({
      success: true,
      message: "Primary card updated successfully",
      card: {
        paymentDetailId: updatedCard.paymentDetailId,
        lastFourDigits: updatedCard.creditCardNumber.slice(-4),
        cardOwnerName: updatedCard.cardOwnerName,
        isPrimary: updatedCard.isPrimary,
        expirationDate: updatedCard.expirationDate
      }
    });
  } catch (error) {
    next(error);
  }
}

async function addOrUpdatePaymentDetailController(req, res, _next) {
  const paymentDetail = await addOrUpdatePaymentDetail(req.body);
  return res.status(200).json(paymentDetail);
}

async function createPaymentDetailController(req, res, _next) {
  const tokenHeader = req.header("Authorization");
  let user;
  if (tokenHeader) {
    user = await authenticateToken(tokenHeader);
    req.body.userId = user.userId;
  }

  const paymentDetail = await createPaymentDetail(req.body);
  return res.status(201).json(paymentDetail);
}

async function updatePaymentDetailController(req, res, _next) {
  const paymentDetail = await updatePaymentDetail(req.params.paymentDetailId, req.body);
  return res.status(200).json(paymentDetail);
}

async function getPaymentDetailsController(req, res, _next) {
  const { page, pageSize, sortDirection } = req.query;
  sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const paymentDetails = await getPaymentDetails(
    page,
    pageSize,
    sortDirection
  );
  return res.status(200).json(paymentDetails);
}

async function getPaymentDetailByIdController(req, res, _next) {
  const paymentDetailId = req.params.paymentDetailId;
  const paymentDetail = await getPaymentDetailById(paymentDetailId);
  return res.status(200).json(paymentDetail);
}   

async function deletePaymentDetailController(req, res, _next) {
  await deletePaymentDetail(req.params.paymentDetailId);
  return res.status(200).json({ message: "Payment detail deleted successfully" });
}         

async function getPaymentDetailByUserIdController(req, res, _next) {
  const { userId } = req.user;
  const response = await getPaymentDetailByUserId(userId);
  return res.json(response);
}


module.exports = {
  validatePaymentDetailController,
  addOrUpdatePaymentDetailController,
  createPaymentDetailController,
  updatePaymentDetailController,
  getPaymentDetailsController,
  getPaymentDetailByIdController,
  getPaymentDetailByUserIdController,
  deletePaymentDetailController,
  setPrimaryCardController
};
