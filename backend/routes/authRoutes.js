const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");

router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/google/link", require("../util/auth"), authController.linkGoogle);

module.exports = router;
