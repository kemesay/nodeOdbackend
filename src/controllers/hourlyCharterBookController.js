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
  let user;
  if (tokenHeader) {
    user = await authenticateToken(tokenHeader);
    req.body.userId = user.userId;
  }

  const hourlyCharterBook = await createHourlyCharterBook(req.body);
  return res.status(201).json(hourlyCharterBook);
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
