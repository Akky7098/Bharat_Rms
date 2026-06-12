const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const appPushController = require("../controller/appPushController");

router.post("/register", authMiddleware, appPushController.registerToken);
router.post("/unregister", authMiddleware, appPushController.unregisterToken);

module.exports = router;