const dispatchService = require("../services/dispatchService");

const parseBodyData = (req) => {
  if (!req.body?.data) return req.body || {};

  try {
    return JSON.parse(req.body.data);
  } catch (error) {
    throw new Error("Invalid request data format.");
  }
};

/* =========================
   SEARCH APPROVED SALES ORDERS
========================= */

const searchPendingDispatchSalesOrders = async (req, res) => {
  try {
    const result = await dispatchService.searchPendingDispatchSalesOrders(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Approved sales orders fetched successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   CREATE DISPATCH
========================= */

const createDispatch = async (req, res) => {
  try {
    const body = parseBodyData(req);

    const dispatch = await dispatchService.createDispatch(
      body,
      req.files,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Dispatch created successfully.",
      data: dispatch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET ALL DISPATCHES
========================= */

const getAllDispatches = async (req, res) => {
  try {
    const result = await dispatchService.getAllDispatches(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Dispatches fetched successfully.",
      data: result.dispatches,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET DISPATCH BY ID
========================= */

const getDispatchById = async (req, res) => {
  try {
    const dispatch = await dispatchService.getDispatchById(
      req.params.dispatchId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Dispatch fetched successfully.",
      data: dispatch,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   UPDATE PAYMENT
========================= */

const updateDispatchPayment = async (req, res) => {
  try {
    const body = parseBodyData(req);

    const dispatch = await dispatchService.updateDispatchPayment(
      req.params.dispatchId,
      body,
      req.file,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully.",
      data: dispatch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   DELETE DISPATCH
========================= */

const deleteDispatch = async (req, res) => {
  try {
    const dispatch = await dispatchService.deleteDispatch(
      req.params.dispatchId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Dispatch deleted successfully.",
      data: dispatch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDispatchStatus = async (req, res) => {
  try {
    const dispatch = await dispatchService.updateDispatchStatus(
      req.params.dispatchId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Dispatch status updated successfully.",
      data: dispatch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  searchPendingDispatchSalesOrders,
  createDispatch,
  getAllDispatches,
  getDispatchById,
  updateDispatchPayment,
  deleteDispatch,
  updateDispatchStatus,
};