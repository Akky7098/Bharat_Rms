const receivableService = require("../services/receivableService");

const getReceivableSummary = async (req, res) => {
  try {
    const data = await receivableService.getReceivableSummary(req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getReceivables = async (req, res) => {
  try {
    const data = await receivableService.getReceivables(req.query, req.user);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCompanyLedger = async (req, res) => {
  try {
    const data = await receivableService.getCompanyLedger(
      req.params.receivableId,
      req.user
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const createFromDispatch = async (req, res) => {
  try {
    const data = await receivableService.createOrUpdateFromDispatch(
      req.params.dispatchId,
      req.user
    );
    res.status(201).json({
      success: true,
      message: "Receivable created from dispatch successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addManualPaymentReceipt = async (req, res) => {
  try {
    const data = await receivableService.addManualPaymentReceipt(
      req.params.receivableId,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Payment receipt updated successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const syncFromTallyReceivables = async (req, res) => {
  try {
    const data = await receivableService.syncFromTallyReceivables(
      req.body.tallyData,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Tally receivables synced successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const checkCustomerRisk = async (req, res) => {
  try {
    const data = await receivableService.checkCustomerRisk(
      req.query.companyName,
      req.user
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const autoMapSalesPersonToReceivable = async (req, res) => {
  try {
    const data = await receivableService.autoMapSalesPersonToReceivable(
      req.params.salesOrderId
    );

    res.status(200).json({
      success: true,
      message: data.matched
        ? "Salesperson mapped to receivable successfully"
        : "No strong receivable match found",
      data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getReceivableSummary,
  getReceivables,
  getCompanyLedger,
  createFromDispatch,
  addManualPaymentReceipt,
  syncFromTallyReceivables,
  checkCustomerRisk,
  autoMapSalesPersonToReceivable,
};