const { Gratuity } = require("../../models/Gratuity.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

async function createOrUpdateGratuity(gratuityData) {
  const percentage = gratuityData.percentage;
  if (percentage === 0) gratuityData.description = "Will tip in cash";
  else gratuityData.description = `${percentage}%`;

  let existingGratuity = await Gratuity.findOne({ where: { percentage } });

  if (existingGratuity) return await existingGratuity.update(gratuityData);
  else return await Gratuity.create(gratuityData);
}

async function toggleGratuityStatus(gratuityId) {
  const gratuity = await getGratuityById(gratuityId);

  gratuity.status = gratuity.status === "Active" ? "Inactive" : "Active";
  return await gratuity.save();
}

async function getAllActiveGratuities() {
  return await Gratuity.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

//For admin
async function getAllGratuities() {
  return await Gratuity.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function deleteGratuity(gratuityId) {
  const gratuity = await getGratuityById(gratuityId);
  await gratuity.destroy();
}

async function getGratuityById(gratuityId) {
  const gratuity = await Gratuity.findByPk(gratuityId);
  if (!gratuity)
    throw new ResourceNotFoundError(`Gratuity with ID ${gratuityId} not found`);
  return gratuity;
}

module.exports = {
  createOrUpdateGratuity,
  getAllGratuities,
  getAllActiveGratuities,
  deleteGratuity,
  getGratuityById,
  toggleGratuityStatus,
};
