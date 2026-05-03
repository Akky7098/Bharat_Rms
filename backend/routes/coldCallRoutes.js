const express = require("express");
const router = express.Router();

const coldCallController = require("../controller/coldCallController");
const authMiddleware = require("../util/auth");

router.post(
  "/create",
  authMiddleware,
  coldCallController.createColdCall
);

router.get(
  "/",
  authMiddleware,
  coldCallController.getAllColdCalls
);

module.exports = router;