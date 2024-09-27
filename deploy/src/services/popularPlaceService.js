const { PopularPlace } = require("../models/PopularPlace.js");
const { ResourceNotFoundError } = require("../errors/CustomErrors.js");
const { upload } = require("../utils/fileService.js");

async function createPopularPlace(popularPlaceData) {
  return await PopularPlace.create(popularPlaceData);
}

async function updatePopularPlace(popularPlaceId, updatedPopularPlaceData) {
  const popularPlace = await getPopularPlaceById(popularPlaceId);
  return await popularPlace.update(updatedPopularPlaceData);
}

async function togglePopularPlaceStatus(popularPlaceId) {
  const popularPlace = await getPopularPlaceById(popularPlaceId);

  popularPlace.status =
    popularPlace.status === "Active" ? "Inactive" : "Active";
  await popularPlace.save();
  return popularPlace;
}

async function getAllActivePopularPlaces() {
  return await PopularPlace.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

//For admin
async function getAllPopularPlaces() {
  return await PopularPlace.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function uploadPopularPlaceImage(popularPlaceId, filePath) {
  const popularPlace = await getPopularPlaceById(popularPlaceId);
  const imageUrl = `https://api.ethiosmartride.com/uploads/${filePath}`;
  popularPlace.image = imageUrl;
  await popularPlace.save();
  return popularPlace;
}

async function deletePopularPlace(popularPlaceId) {
  const popularPlace = await getPopularPlaceById(popularPlaceId);
  await popularPlace.destroy();
}

async function getPopularPlaceById(popularPlaceId) {
  const popularPlace = await PopularPlace.findByPk(popularPlaceId);
  if (!popularPlace)
    throw new ResourceNotFoundError(
      `Popular Place with ID ${popularPlaceId} not found`
    );
  return popularPlace;
}

module.exports = {
  createPopularPlace,
  updatePopularPlace,
  getAllPopularPlaces,
  getAllActivePopularPlaces,
  deletePopularPlace,
  getPopularPlaceById,
  togglePopularPlaceStatus,
  uploadPopularPlaceImage,
};
