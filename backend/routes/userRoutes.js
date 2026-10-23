const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");
const authMiddleware = require("../util/auth");
const roleAuth = require("../util/role");

router.get(
  "/sales-persons",
  authMiddleware,
  roleAuth("admin", "super_admin"),
  userController.getSalesPersons
);

router.get("/", authMiddleware, roleAuth("super_admin"), userController.getUserAccounts);
router.patch("/:id/status", authMiddleware, roleAuth("super_admin"), userController.setUserStatus);

module.exports = router;