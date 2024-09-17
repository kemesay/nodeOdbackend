const {
  createCar,
  updateCar,
  getAllCars,
  getAllActiveCars,
  deleteCar,
  toggleCarStatus,
  uploadCarImage,
} = require("../services/booking/carService.js");

const { successResponse } = require("../utils/responseUtil.js");
const path = require("path");

async function createCarController(req, res, _next) {
  const car = await createCar(req.body);
  return res.status(201).json(car);
}

async function updateCarController(req, res, _next) {
  const carId = req.params.carId;
  const updatedCarData = req.body;

  const updatedCar = await updateCar(carId, updatedCarData);
  return res.json(updatedCar);
}

async function toggleCarStatusController(req, res, _next) {
  const carId = req.params.carId;
  const updatedCar = await toggleCarStatus(carId);
  return res.json(updatedCar);
}

async function getAllCarsController(_req, res, _next) {
  const cars = await getAllCars();
  return res.json(cars);
}

async function getAllActiveCarsController(_req, res, _next) {
  const cars = await getAllActiveCars();
  return res.json(cars);
}

async function deleteCarController(req, res, _next) {
  await deleteCar(req.params.carId);
  const response = successResponse("Car deleted successfully");
  return res.json(response);
}

async function uploadCarImageController(req, res, _next) {
  const filePath = path.basename(req.file.path);

  const { carId } = req.params;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const car = await uploadCarImage(carId, filePath);
  return res.json(car);
}

module.exports = {
  createCarController,
  updateCarController,
  toggleCarStatusController,
  getAllCarsController,
  getAllActiveCarsController,
  deleteCarController,
  uploadCarImageController,
};
