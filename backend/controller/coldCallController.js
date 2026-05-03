const coldCallService = require("../services/coldCallService");

const createColdCall = async (req, res) => {
  try {
    const coldCall = await coldCallService.createColdCall(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: "Cold call record created successfully",
      data: coldCall,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllColdCalls = async (req, res) => {
  try {
    const result = await coldCallService.getAllColdCalls(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      data: result.coldCalls,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createColdCall,
  getAllColdCalls,
};