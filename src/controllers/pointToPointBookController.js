const {
  createPointToPointBook,
  updatePointToPointBook,
  getPointToPointBooks,
  getPointToPointBookById,
  deletePointToPointBook,
  updateBookingStatus,
  updatePaymentStatus,
} = require("../services/pointTopoint/pointToPointBookService.js");

const { successResponse } = require("../utils/responseUtil.js");
const authenticateToken = require("../utils/getUserFromToken.js");

async function createPointToPointBookController(req, res, _next) {
  const tokenHeader = req.header("Authorization");
  const { paymentMethod, isGuestBooking } = req.body;
  // Check if payment method requires authentication
  if ((paymentMethod === 'PRIMARY_CARD' || paymentMethod === 'EXISTING_CARD')) {
    if (!tokenHeader) {
      return res.status(401).json({ 
        error: "Authentication required for using saved payment methods" 
      });
    }

    try {
      const user = await authenticateToken(tokenHeader);
      req.body.userId = user.userId;
    } catch (error) {
      return res.status(401).json({ 
        error: "Invalid authentication token" 
      });
    }
  } else if (!isGuestBooking && tokenHeader) {
    // If user is logged in but using NEW_CARD, still attach userId
    try {
      const user = await authenticateToken(tokenHeader);
      req.body.userId = user.userId;
    } catch (error) {
      // Ignore token error for NEW_CARD as it's optional
      console.log("Invalid token for NEW_CARD payment, continuing as guest");
    }
  }

 try {

  const pointToPointBook = await createPointToPointBook(req.body);
  return res.status(201).json(pointToPointBook);

 }catch (error) {
  return res.status(400).json({ 
    error: error.message 
  })
}
}

async function updatePointToPointBookController(req, res, _next) {
  const pointToPointBookId = req.params.pointToPointBookId;
  const updatedPointToPointBookData = req.body;

  const updatedPointToPointBook = await updatePointToPointBook(
    pointToPointBookId,
    updatedPointToPointBookData
  );

  return res.json(updatedPointToPointBook);
}

async function getPointToPointBooksController(req, res, _next) {
  let { page, pageSize, paymentStatus, bookingStatus, sortDirection } =
    req.query;

  // Default sortDirection to DESC if not provided or invalid
  sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const airportBooks = await getPointToPointBooks({
    page,
    pageSize,
    paymentStatus,
    bookingStatus,
    sortDirection,
  });
  res.status(200).json(airportBooks);
}

async function getPointToPointBookController(req, res, _next) {
  const pointToPointBook = await getPointToPointBookById(
    req.params.pointToPointBookId
  );
  return res.json(pointToPointBook);
}

async function deletePointToPointBookController(req, res, _next) {
  await deletePointToPointBook(req.params.pointToPointBookId);
  const response = successResponse("Point To Point Book deleted successfully");
  return res.json(response);
}

async function updatePaymentStatusController(req, res, _next) {
  const pointToPointBookId = req.params.pointToPointBookId;
  const { status } = req.body;
  const updatedAirportBook = await updatePaymentStatus(
    pointToPointBookId,
    status
  );
  return res.json(updatedAirportBook);
}

async function updateBookingStatusController(req, res, _next) {
  const pointToPointBookId = req.params.pointToPointBookId;
  const { status } = req.body;
  const updatedAirportBook = await updateBookingStatus(
    pointToPointBookId,
    status
  );
  return res.json(updatedAirportBook);
}

module.exports = {
  createPointToPointBookController,
  updatePointToPointBookController,
  getPointToPointBooksController,
  getPointToPointBookController,
  deletePointToPointBookController,
  updatePaymentStatusController,
  updateBookingStatusController,
};
