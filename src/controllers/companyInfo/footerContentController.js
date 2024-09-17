const {
  createOrUpdateFooterContent,
  getFooterContent,
} = require("../../services/companyInfo/footerContentService.js");

async function createFooterContentController(req, res, _next) {
  const response = await createOrUpdateFooterContent(req.body);
  return res.json(response);
}

async function getFooterContentController(_req, res, _next) {
  const footerContent = await getFooterContent();
  return res.json(footerContent);
}

module.exports = {
  createFooterContentController,
  getFooterContentController,
};
