// const express = require("express");
// const router = express.Router();

// const {
//   createUserController,
//   createAdminUserController,
//   updateUserController,
//   getAllUsersController,
//   deleteUserController,
//   getMyInfoController,
// } = require("../../controllers/user/userController.js");

// const {
//   validateUser,
//   validateUserUpdate,
// } = require("../../models/user/User.js");

// const admin = require("../../middleware/admin.js");
// const auth = require("../../middleware/auth.js");
// const validate = require("../../middleware/validateReqBody.js");

// router.post("/", validate(validateUser), createUserController);
// router.post(
//   "/admin",
//   [auth, admin, validate(validateUser)],
//   createAdminUserController
// );
// router.put("/", [auth, validate(validateUserUpdate)], updateUserController);
// router.get("/", [auth, admin], getAllUsersController);
// router.delete("/:userId", [auth, admin], deleteUserController);
// router.get("/me", [auth], getMyInfoController);

// module.exports = router;


const express = require("express");
const router = express.Router();

const {
  createUserController,
  createAdminUserController,
  createDriverUserController,
  getDriverUsersController,
  updateUserController,
  updateUserWithIDController,
  getAllUsersController,
  deleteUserController,
  deleteMyAccountController,
  getMyInfoController,
} = require("../../controllers/user/userController.js");

const {
  validateUser,
  validateUserUpdate,
} = require("../../models/user/User.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

router.post("/", validate(validateUser), createUserController);
router.post(
  "/admin",
  [auth, admin, validate(validateUser)],
  createAdminUserController
);
router.post(
  "/driver",
  [auth, admin, validate(validateUser)],
  createDriverUserController
);
router.get("/drivers", [auth, admin], getDriverUsersController);
router.put("/", [auth, validate(validateUserUpdate)], updateUserController);
router.put(
  "/:userId",
  [auth, admin, validate(validateUserUpdate)],
  updateUserWithIDController
);
router.get("/", [auth, admin], getAllUsersController);
router.delete("/me", [auth], deleteMyAccountController);
router.get("/me", [auth], getMyInfoController);
router.delete("/:userId", [auth, admin], deleteUserController);

module.exports = router;
