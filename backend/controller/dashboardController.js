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

module.exports = {
  getDashboardSummary,
  getActionRequiredInsights,
  getCashflowSummary,
};