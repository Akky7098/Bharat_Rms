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

module.exports = router;