const {
  createHourlyCharterBook,
  updateHourlyCharterBook,
  getHourlyCharterBooks,
  getHourlyCharterBookById,
  deleteHourlyCharterBook,
  updateBookingStatus,
  updatePaymentStatus,
} = require("../services/hourlyCharter/hourlyCharterBookService.js");

const authenticateToken = require("../utils/getUserFromToken.js");

const { successResponse } = require("../utils/responseUtil.js");

async function createHourlyCharterBookController(req, res, _next) {
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
  try{
  const hourlyCharterBook = await createHourlyCharterBook(req.body);
  return res.status(201).json(hourlyCharterBook);
  } catch(error){
    return res.status(400).json({
      error: error.message
    })
  }
}

async function updateHourlyCharterBookController(req, res, _next) {
  const hourlyCharterBookId = req.params.hourlyCharterBookId;
  const updatedHourlyCharterBookData = req.body;

  const updatedHourlyCharterBook = await updateHourlyCharterBook(
    hourlyCharterBookId,
    updatedHourlyCharterBookData
  );

  return res.json(updatedHourlyCharterBook);
}

async function getAllHourlyCharterBooksController(req, res, _next) {
  let { page, pageSize, paymentStatus, bookingStatus, sortDirection } =
    req.query;

  // Default sortDirection to DESC if not provided or invalid
  sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const airportBooks = await getHourlyCharterBooks({
    page,
    pageSize,
    paymentStatus,
    bookingStatus,
    sortDirection,
  });
  return res.status(200).json(airportBooks);
}

async function getHourlyCharterBookController(req, res, _next) {
  const hourlyCharterBook = await getHourlyCharterBookById(
    req.params.hourlyCharterBookId
  );
  return res.json(hourlyCharterBook);
}

async function deleteHourlyCharterBookController(req, res, _next) {
  await deleteHourlyCharterBook(req.params.hourlyCharterBookId);
  const response = successResponse("Hourly Charter book deleted successfully");
  return res.json(response);
}

async function updatePaymentStatusController(req, res, _next) {
  const hourlyCharterBookId = req.params.hourlyCharterBookId;
  const { status } = req.body;
  const updatedAirportBook = await updatePaymentStatus(
    hourlyCharterBookId,
    status
  );
  return res.json(updatedAirportBook);
}

async function updateBookingStatusController(req, res, _next) {
  const hourlyCharterBookId = req.params.hourlyCharterBookId;
  const { status } = req.body;
  const updatedAirportBook = await updateBookingStatus(
    hourlyCharterBookId,
    status
  );
  return res.json(updatedAirportBook);
}

module.exports = {
  createHourlyCharterBookController,
  updateHourlyCharterBookController,
  getAllHourlyCharterBooksController,
  getHourlyCharterBookController,
  deleteHourlyCharterBookController,
  updatePaymentStatusController,
  updateBookingStatusController,
};
