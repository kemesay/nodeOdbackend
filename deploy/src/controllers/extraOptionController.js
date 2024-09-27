const {
  createExtraOption,
  updateExtraOption,
  getAllExtraOptions,
  getAllActiveExtraOptions,
  deleteExtraOption,
  toggleExtraOptionStatus,
} = require("../services/booking/extraOptionService.js");

const { successResponse } = require("../utils/responseUtil.js");

async function createExtraOptionController(req, res, _next) {
  const extraOption = await createExtraOption(req.body);
  return res.status(201).json(extraOption);
}

async function updateExtraOptionController(req, res, _next) {
  const extraOptionId = req.params.extraOptionId;
  const updatedExtraOptionData = req.body;

  const updatedExtraOption = await updateExtraOption(
    extraOptionId,
    updatedExtraOptionData
  );

  return res.json(updatedExtraOption);
}

async function toggleExtraOptionStatusController(req, res, _next) {
  const extraOptionId = req.params.extraOptionId;
  const updatedExtraOption = await toggleExtraOptionStatus(extraOptionId);
  return res.json(updatedExtraOption);
}

async function getAllExtraOptionsController(_req, res, _next) {
  const extraOptions = await getAllExtraOptions();
  return res.json(extraOptions);
}

async function getAllActiveExtraOptionsController(_req, res, _next) {
  const extraOptions = await getAllActiveExtraOptions();
  return res.json(extraOptions);
}

async function deleteExtraOptionController(req, res, _next) {
  await deleteExtraOption(req.params.extraOptionId);
  const response = successResponse("Extra Option deleted successfully");
  return res.json(response);
}

module.exports = {
  createExtraOptionController,
  updateExtraOptionController,
  getAllExtraOptionsController,
  getAllActiveExtraOptionsController,
  toggleExtraOptionStatusController,
  deleteExtraOptionController,
};
