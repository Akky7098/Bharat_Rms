const dispatchService = require("../services/dispatchService");

const createDispatch = async (req, res) => {
  try {
    const dispatch = await dispatchService.createDispatch(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: "Dispatch created successfully",
      data: dispatch,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDispatch = async (req, res) => {
  try {
    const dispatch = await dispatchService.updateDispatch(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Dispatch updated successfully",
      data: dispatch,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllDispatches = async (req, res) => {
  try {
    const data = await dispatchService.getAllDispatches(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      dispatches: data.dispatches,
      pagination: data.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getDispatchById = async (req, res) => {
  try {
    const dispatch = await dispatchService.getDispatchById(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      data: dispatch,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createDispatch,
  updateDispatch,
  getAllDispatches,
  getDispatchById,
};