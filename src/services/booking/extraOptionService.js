const { ExtraOption } = require("../../models/ExtraOption.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

async function createExtraOption(extraOptionData) {
  return await ExtraOption.create(extraOptionData);
}

async function updateExtraOption(extraOptionId, updatedextraOptionData) {
  const extraOption = await findExtraOptionById(extraOptionId);
  return await extraOption.update(updatedextraOptionData);
}

async function toggleExtraOptionStatus(extraOptionId) {
  const extraOption = await findExtraOptionById(extraOptionId);
  // Toggle the status
  extraOption.status = extraOption.status === "Active" ? "Inactive" : "Active";
  await extraOption.save();
  return extraOption;
}

async function getAllActiveExtraOptions() {
  return await ExtraOption.findAll({
    where: {
      status: "Active",
    },
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

//For admin
async function getAllExtraOptions() {
  return await ExtraOption.findAll({
    attributes: {
      exclude: ["deletedAt", "createdAt", "updatedAt"],
    },
  });
}

async function deleteExtraOption(extraOptionId) {
  const extraOption = await findExtraOptionById(extraOptionId);
  await extraOption.destroy();
}

async function findExtraOptionById(extraOptionId) {
  const extraOption = await ExtraOption.findByPk(extraOptionId);

  if (!extraOption)
    throw new ResourceNotFoundError(
      `Extra Option with ID ${extraOptionId} not found`
    );
  return extraOption;
}

module.exports = {
  createExtraOption,
  updateExtraOption,
  getAllExtraOptions,
  getAllActiveExtraOptions,
  deleteExtraOption,
  toggleExtraOptionStatus,
};
