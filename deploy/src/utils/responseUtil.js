function successResponse(message) {
  return {
    message: message,
    status: 200,
    timestamp: new Date(),
  };
}

module.exports = { successResponse };
