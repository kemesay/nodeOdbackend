const {
  createSocialMedia,
  updateSocialMedia,
  getAllSocialMedias,
  getAllActiveSocialMedias,
  deleteSocialMedia,
  toggleSocialMediaStatus,
} = require("../../services/companyInfo/socialMediaService.js");

const { successResponse } = require("../../utils/responseUtil.js");

async function createSocialMediaController(req, res, _next) {
  const socialMedia = await createSocialMedia(req.body);
  return res.status(201).json(socialMedia);
}

async function updateSocialMediaController(req, res, _next) {
  const socialMediaId = req.params.socialMediaId;
  const updatedsocialMediaData = req.body;

  const updatedsocialMedia = await updateSocialMedia(
    socialMediaId,
    updatedsocialMediaData
  );
  return res.json(updatedsocialMedia);
}

async function toggleSocialMediaStatusController(req, res, _next) {
  const socialMediaId = req.params.socialMediaId;
  const updatedsocialMedia = await toggleSocialMediaStatus(socialMediaId);
  return res.json(updatedsocialMedia);
}

async function getAllSocialMediasController(_req, res, _next) {
  const socialMedias = await getAllSocialMedias();
  return res.json(socialMedias);
}

async function getAllActiveSocialMediasController(_req, res, _next) {
  const socialMedias = await getAllActiveSocialMedias();
  return res.json(socialMedias);
}

async function deleteSocialMediaController(req, res, _next) {
  await deleteSocialMedia(req.params.socialMediaId);
  const response = successResponse("socialMedia deleted successfully");
  return res.json(response);
}

module.exports = {
  createSocialMediaController,
  updateSocialMediaController,
  toggleSocialMediaStatusController,
  getAllSocialMediasController,
  getAllActiveSocialMediasController,
  deleteSocialMediaController,
};
