const { FooterContent } = require("../../models/companyInfo/FooterContent.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

// Function to create or update footer content
async function createOrUpdateFooterContent(footerContentData) {
  // Check if any footer content exists
  let existingFooterContent = await FooterContent.findOne();

  // If footer content exists, update it
  if (existingFooterContent) {
    return await existingFooterContent.update(footerContentData);
  } else {
    // If no footer content exists, create it
    return await FooterContent.create(footerContentData);
  }
}

async function getFooterContent() {
  const footerContent = await FooterContent.findOne({
    attributes: {
      exclude: ["footerContentId", "createdAt", "updatedAt", "deletedAt"],
    },
  });
  if (!footerContent)
    throw new ResourceNotFoundError(`Footer Content not found.`);

  return footerContent;
}

module.exports = {
  createOrUpdateFooterContent,
  getFooterContent,
};
