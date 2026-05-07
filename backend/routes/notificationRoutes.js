const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const notificationController = require("../controller/notificationController");

router.get("/", authMiddleware, notificationController.getNotifications);

module.exports = router;