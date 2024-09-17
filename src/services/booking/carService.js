const { Car } = require("../../models/Car.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");
const { upload } = require("../../utils/fileService.js");

async function createCar(carData) {
  return await Car.create(carData);
}

async function updateCar(carId, updatedCarData) {
  const car = await getCarById(carId);
  return await car.update(updatedCarData);
}

async function toggleCarStatus(carId) {
  const car = await getCarById(carId);

  car.status = car.status === "Active" ? "Inactive" : "Active";
  await car.save();
  return car;
}

async function getAllActiveCars() {
  return await Car.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

//For admin
async function getAllCars() {
  return await Car.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function uploadCarImage(carId, filePath) {
  const car = await getCarById(carId);
  const imageUrl = `https://api.odatransportation.com/uploads/${filePath}`;
  car.carImageUrl = imageUrl;
  await car.save();
  return car;
}

async function deleteCar(carId) {
  const car = await getCarById(carId);
  await car.destroy();
}

async function getCarById(carId) {
  const car = await Car.findByPk(carId);
  if (!car) throw new ResourceNotFoundError(`Car with ID ${carId} not found`);
  return car;
}

module.exports = {
  createCar,
  updateCar,
  getAllCars,
  getAllActiveCars,
  deleteCar,
  getCarById,
  toggleCarStatus,
  uploadCarImage,
};
