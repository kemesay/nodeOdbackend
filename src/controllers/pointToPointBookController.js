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
  let user;
  if (tokenHeader) {
    user = await authenticateToken(tokenHeader);
    req.body.userId = user.userId;
  }

  const pointToPointBook = await createPointToPointBook(req.body);
  return res.status(201).json(pointToPointBook);
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
