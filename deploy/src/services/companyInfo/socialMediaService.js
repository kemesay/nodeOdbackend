const { SocialMedia } = require("../../models/companyInfo/SocialMedia.js");
const {
  ResourceNotFoundError,
  ConflictError,
} = require("../../errors/CustomErrors.js");
const { Op } = require("sequelize");

async function createSocialMedia(data) {
  const existingSocialMedia = await SocialMedia.findOne({
    where: {
      [Op.or]: [{ link: data.link }, { title: data.title }],
    },
  });

  if (existingSocialMedia) {
    if (existingSocialMedia.link === data.link)
      throw new ConflictError("Link is already registed.");
    else throw new ConflictError("Title is registed.");
  }

  return await SocialMedia.create(data);
}

async function updateSocialMedia(socialMediaId, updatedSocialMediaData) {
  const socialMedia = await getSocialMediaById(socialMediaId);
  return await socialMedia.update(updatedSocialMediaData);
}

async function toggleSocialMediaStatus(id) {
  const socialMedia = await getSocialMediaById(id);
  // Toggle the status
  socialMedia.status = socialMedia.status === "Active" ? "Inactive" : "Active";
  await socialMedia.save();
  return socialMedia;
}

async function getAllActiveSocialMedias() {
  return await SocialMedia.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: [
        "socialMediaId",
        "status",
        "deletedAt",
        "createdAt",
        "updatedAt",
      ],
    },
  });
}

async function getAllSocialMedias() {
  return await SocialMedia.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function deleteSocialMedia(id) {
  const socialMedia = await getSocialMediaById(d);
  await socialMedia.destroy();
}

async function getSocialMediaById(id) {
  const socialMedia = await SocialMedia.findByPk(id);
  if (!socialMedia)
    throw new ResourceNotFoundError(`SocialMedia with ID ${id} not found`);
  return socialMedia;
}

module.exports = {
  createSocialMedia,
  updateSocialMedia,
  getAllSocialMedias,
  getAllActiveSocialMedias,
  deleteSocialMedia,
  getSocialMediaById,
  toggleSocialMediaStatus,
};
