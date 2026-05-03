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

module.exports = {
  getDashboardSummary,
};