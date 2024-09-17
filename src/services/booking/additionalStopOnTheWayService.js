const {
  AdditionalStopOnTheWay,
} = require("../../models/booking/AdditionalStopOnTheWay.js");
const { ResourceNotFoundError } = require("../../errors/CustomErrors.js");

async function createAdditionalStopOnTheWay(additionalStopOnTheWayData) {
  return await AdditionalStopOnTheWay.create(additionalStopOnTheWayData);
}

async function updateAdditionalStopOnTheWay(
  additionalStopId,
  updatedAdditionalStopOnTheWayData
) {
  const additionalStopOnTheWay = await getAdditionalStopOnTheWayById(
    additionalStopId
  );
  return await additionalStopOnTheWay.update(updatedAdditionalStopOnTheWayData);
}

async function getAllAdditionalStopOnTheWays() {
  // return await AdditionalStopOnTheWay.findAll();
  return await AdditionalStopOnTheWay.findAll();
}

async function getAdditionalStopOnTheWayById(additionalStopId) {
  const additionalStopOnTheWay = await AdditionalStopOnTheWay.findByPk(
    additionalStopId
  );
  if (!additionalStopOnTheWay)
    throw new ResourceNotFoundError(
      `Additional Stop On TheWay with ID ${additionalStopId} not found`
    );
  return additionalStopOnTheWay;
}

module.exports = {
  createAdditionalStopOnTheWay,
  updateAdditionalStopOnTheWay,
  getAllAdditionalStopOnTheWays,
  getAdditionalStopOnTheWayById,
};
