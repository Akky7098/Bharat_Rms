const express = require("express");
const router = express.Router();

const dashboardController = require("../controller/dashboardController");
const authMiddleware = require("../util/auth");

router.get(
  "/summary",
  authMiddleware,
  dashboardController.getDashboardSummary
);

module.exports = router;