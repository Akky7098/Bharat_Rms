const salesOrderService = require("../services/salesOrderService");

const createSalesOrder = async (req, res) => {
  try {
    const salesOrder = await salesOrderService.createSalesOrder(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: "Sales order created successfully",
      data: salesOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllSalesOrders = async (req, res) => {
  try {
    const result = await salesOrderService.getAllSalesOrders(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      data: result.salesOrders,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const searchPendingDispatchSalesOrders = async (req, res) => {
  try {
    const data = await salesOrderService.searchPendingDispatchSalesOrders(
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
  createSalesOrder,
  getAllSalesOrders,
  searchPendingDispatchSalesOrders,
};