const {
  createAdditionalStopOnTheWay,
  updateAdditionalStopOnTheWay,
  getAllAdditionalStopOnTheWays,
} = require("../../services/booking/additionalStopOnTheWayService.js");

async function createAdditionalStopOnTheWayController(req, res, _next) {
  const additionalStopOnTheWay = await createAdditionalStopOnTheWay(req.body);
  return res.status(201).json(additionalStopOnTheWay);
}

async function updateAdditionalStopOnTheWayController(req, res, _next) {
  const additionalStopId = req.params.additionalStopId;
  const updatedAdditionalStopOnTheWayData = req.body;

  const updatedAdditionalStopOnTheWay = await updateAdditionalStopOnTheWay(
    additionalStopId,
    updatedAdditionalStopOnTheWayData
  );
  return res.json(updatedAdditionalStopOnTheWay);
}

async function getAllAdditionalStopOnTheWaysController(_req, res, _next) {
  const additionalStopOnTheWays = await getAllAdditionalStopOnTheWays();
  return res.json(additionalStopOnTheWays);
}

module.exports = {
  createAdditionalStopOnTheWayController,
  updateAdditionalStopOnTheWayController,
  getAllAdditionalStopOnTheWaysController,
};
