const express = require("express");
const router = express.Router();

const dashboardController = require("../controller/dashboardController");
const authMiddleware = require("../util/auth");

/* DASHBOARD SUMMARY */
router.get(
  "/summary",
  authMiddleware,
  dashboardController.getDashboardSummary
);

/* ACTION REQUIRED INSIGHTS */
router.get(
  "/action-required",
  authMiddleware,
  dashboardController.getActionRequiredInsights
);

/* CASHFLOW SUMMARY */
router.get(
  "/cashflow",
  authMiddleware,
  dashboardController.getCashflowSummary
);

module.exports = router;