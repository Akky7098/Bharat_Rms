const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const pushSubscriptionController = require("../controller/pushSubscriptionController");

router.get(
  "/public-key",
  authMiddleware,
  pushSubscriptionController.getPublicKey
);

router.post(
  "/subscribe",
  authMiddleware,
  pushSubscriptionController.subscribe
);

router.post(
  "/unsubscribe",
  authMiddleware,
  pushSubscriptionController.unsubscribe
);

module.exports = router;