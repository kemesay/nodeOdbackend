const {
  createPopularPlace,
  updatePopularPlace,
  getAllPopularPlaces,
  getAllActivePopularPlaces,
  deletePopularPlace,
  togglePopularPlaceStatus,
  uploadPopularPlaceImage,
} = require("../services/popularPlaceService.js");

const { successResponse } = require("../utils/responseUtil.js");
const path = require("path");

async function createPopularPlaceController(req, res, _next) {
  const popularPlace = await createPopularPlace(req.body);
  return res.status(201).json(popularPlace);
}

async function updatePopularPlaceController(req, res, _next) {
  const popularPlaceId = req.params.popularPlaceId;
  const updatedPopularPlaceData = req.body;

  const updatedPopularPlace = await updatePopularPlace(
    popularPlaceId,
    updatedPopularPlaceData
  );
  return res.json(updatedPopularPlace);
}

async function togglePopularPlaceStatusController(req, res, _next) {
  const popularPlaceId = req.params.popularPlaceId;
  const updatedPopularPlace = await togglePopularPlaceStatus(popularPlaceId);
  return res.json(updatedPopularPlace);
}

async function getAllPopularPlacesController(_req, res, _next) {
  const popularPlaces = await getAllPopularPlaces();
  return res.json(popularPlaces);
}

async function getAllActivePopularPlacesController(_req, res, _next) {
  const popularPlaces = await getAllActivePopularPlaces();
  return res.json(popularPlaces);
}

async function deletePopularPlaceController(req, res, _next) {
  await deletePopularPlace(req.params.popularPlaceId);
  const response = successResponse("Popular Place deleted successfully");
  return res.json(response);
}

async function uploadPopularPlaceImageController(req, res, _next) {
  const filePath = path.basename(req.file.path);

  const { popularPlaceId } = req.params;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const popularPlace = await uploadPopularPlaceImage(popularPlaceId, filePath);
  return res.json(popularPlace);
}

module.exports = {
  createPopularPlaceController,
  updatePopularPlaceController,
  togglePopularPlaceStatusController,
  getAllPopularPlacesController,
  getAllActivePopularPlacesController,
  deletePopularPlaceController,
  uploadPopularPlaceImageController,
};
