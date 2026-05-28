const dashboardService = require("../services/dashboardService");

const getDashboardSummary = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardSummary(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getActionRequiredInsights = async (req, res) => {
  try {
    const data = await dashboardService.getActionRequiredInsights(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getCashflowSummary = async (req, res) => {
  try {
    const data = await dashboardService.getCashflowSummary(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Tally receivable cashflow summary fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to fetch Tally receivable cashflow summary",
    });
  }
};
const getMisScoring = async (req, res) => {
  try {
    const data = await dashboardService.getMisScoring(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  getDashboardSummary,
  getActionRequiredInsights,
  getCashflowSummary,
  getMisScoring,
};