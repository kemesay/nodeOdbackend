const {
  createOrUpdateGratuity,
  getAllGratuities,
  getAllActiveGratuities,
  deleteGratuity,
  toggleGratuityStatus,
} = require("../services/booking/gratuityService.js");

const { successResponse } = require("../utils/responseUtil.js");

async function createOrUpdateGratuityController(req, res, _next) {
  const gratuity = await createOrUpdateGratuity(req.body);
  return res.status(201).json(gratuity);
}

async function toggleGratuityStatusController(req, res, _next) {
  const gratuityId = req.params.gratuityId;
  const gratuity = await toggleGratuityStatus(gratuityId);
  return res.json(gratuity);
}

async function getAllGratuitiesController(_req, res, _next) {
  const gratuities = await getAllGratuities();
  return res.json(gratuities);
}

async function getAllActiveGratuitiesController(_req, res, _next) {
  const gratuities = await getAllActiveGratuities();
  return res.json(gratuities);
}

async function deleteGratuityController(req, res, _next) {
  await deleteGratuity(req.params.gratuityId);
  const response = successResponse("Gratuity deleted successfully");
  return res.json(response);
}

module.exports = {
  createOrUpdateGratuityController,
  toggleGratuityStatusController,
  getAllGratuitiesController,
  getAllActiveGratuitiesController,
  deleteGratuityController,
};
