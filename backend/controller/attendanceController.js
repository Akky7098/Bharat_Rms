const attendanceService = require("../services/attendanceService");

const checkIn = async (req, res) => {
  try {
    const data = await attendanceService.checkIn(req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Checked in successfully.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const checkOut = async (req, res) => {
  try {
    const data = await attendanceService.checkOut(req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Checked out successfully.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const data = await attendanceService.getTodayAttendance(req.user);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getAttendanceList = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceList(req.query, req.user);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const requestRegularization = async (req, res) => {
  try {
    const data = await attendanceService.requestRegularization(
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Regularization request submitted.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const approveRegularization = async (req, res) => {
  try {
    const data = await attendanceService.approveRegularization(
      req.params.attendanceId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Regularization approved.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const rejectRegularization = async (req, res) => {
  try {
    const data = await attendanceService.rejectRegularization(
      req.params.attendanceId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Regularization rejected.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceList,
  requestRegularization,
  approveRegularization,
  rejectRegularization,
};