const timesheetService = require("../services/timesheetService");

const createTimesheet = async (req, res) => {
  try {
    const data = await timesheetService.createTimesheet(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "Timesheet submitted successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getTimesheets = async (req, res) => {
  try {
    const data = await timesheetService.getTimesheets(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTimesheet,
  getTimesheets,
};
