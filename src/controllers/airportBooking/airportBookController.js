const {
  createAirportBook,
  updateAirportBook,
  getAirportBookById,
  deleteAirportBook,
  getAirportBooks,
  updatePaymentStatus,
  updateBookingStatus,
} = require("../../services/airportBooking/airportBookService.js");

const authenticateToken = require("../../utils/getUserFromToken.js");

const { successResponse } = require("../../utils/responseUtil.js");

async function createAirportBookController(req, res, _next) {
  const tokenHeader = req.header("Authorization");
  let user;
  if (tokenHeader) {
    user = await authenticateToken(tokenHeader);
    req.body.userId = user.userId;
  }

  const airportBook = await createAirportBook(req.body);
  return res.status(201).json(airportBook);
}

async function updateAirportBookController(req, res, _next) {
  const airportBookId = req.params.airportBookId;
  const updatedAirportBookData = req.body;

  const updatedAirportBook = await updateAirportBook(
    airportBookId,
    updatedAirportBookData
  );

  return res.json(updatedAirportBook);
}

async function updatePaymentStatusController(req, res, _next) {
  const airportBookId = req.params.airportBookId;
  const { status } = req.body;
  const updatedAirportBook = await updatePaymentStatus(airportBookId, status);
  return res.json(updatedAirportBook);
}

async function updateBookingStatusController(req, res, _next) {
  const airportBookId = req.params.airportBookId;
  const { status } = req.body;
  const updatedAirportBook = await updateBookingStatus(airportBookId, status);
  return res.json(updatedAirportBook);
}

async function getAirportBookController(req, res, _next) {
  const airportBook = await getAirportBookById(req.params.airportBookId);
  return res.json(airportBook);
}

async function getAirportBooksController(req, res, _next) {
  let { page, pageSize, paymentStatus, bookingStatus, sortDirection } =
    req.query;

  // Default sortDirection to DESC if not provided or invalid
  sortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const airportBooks = await getAirportBooks({
    page,
    pageSize,
    paymentStatus,
    bookingStatus,
    sortDirection,
  });
  res.status(200).json(airportBooks);
}

async function deleteAirportBookController(req, res, _next) {
  await deleteAirportBook(req.params.airportBookId);
  const response = successResponse("Airport Book deleted successfully");
  return res.json(response);
}

module.exports = {
  createAirportBookController,
  updateAirportBookController,
  getAirportBookController,
  deleteAirportBookController,
  getAirportBooksController,
  updatePaymentStatusController,
  updateBookingStatusController,
};
