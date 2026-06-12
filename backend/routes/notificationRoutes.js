const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const notificationController = require("../controller/notificationController");

// Get notifications
router.get(
  "/",
  authMiddleware,
  notificationController.getNotifications
);

// Mark all as read
router.patch(
  "/read-all",
  authMiddleware,
  notificationController.markAllAsRead
);

// Mark single notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markAsRead
);
router.patch(
  "/:id/clear",
  authMiddleware,
  notificationController.clearNotification
);

module.exports = router;