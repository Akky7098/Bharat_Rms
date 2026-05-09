// const salesOrderService = require("../services/salesOrderService");

// const createSalesOrder = async (req, res) => {
//   try {
//     const salesOrder = await salesOrderService.createSalesOrder(
//       req.body,
//       req.user
//     );

//     res.status(201).json({
//       success: true,
//       message: "Sales order created successfully",
//       data: salesOrder,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getAllSalesOrders = async (req, res) => {
//   try {
//     const result = await salesOrderService.getAllSalesOrders(
//       req.query,
//       req.user
//     );

//     res.status(200).json({
//       success: true,
//       data: result.salesOrders,
//       pagination: result.pagination,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// const searchPendingDispatchSalesOrders = async (req, res) => {
//   try {
//     const data = await salesOrderService.searchPendingDispatchSalesOrders(
//       req.query,
//       req.user
//     );
    
//     res.status(200).json({
//       success: true,
//       data,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// module.exports = {
//   createSalesOrder,
//   getAllSalesOrders,
//   searchPendingDispatchSalesOrders,
// };

const salesOrderService = require("../services/salesOrderService");

// ===============================
// CREATE SALES ORDER
// Salesperson only
// ===============================
const createSalesOrder = async (req, res) => {
  try {
    const salesOrder = await salesOrderService.createSalesOrder(
     JSON.parse(req.body.data),
      req.user,
      req.file,
    );

    return res.status(201).json({
      success: true,
      message: "Sales order created successfully",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const generateSalesOrderPdf = async (req, res) => {
  try {
    const salesOrder =
      await salesOrderService.generateSalesOrderPdfById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message: "Sales order PDF generated successfully",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// ===============================
// GET ALL SALES ORDERS
// Admin gets all
// Salesperson gets own
// ===============================
const getAllSalesOrders = async (req, res) => {
  try {
    const result = await salesOrderService.getAllSalesOrders(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.salesOrders || result,
      pagination: result.pagination || null,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET SINGLE SALES ORDER
// ===============================
const getSalesOrderById = async (req, res) => {
  try {
    const salesOrder = await salesOrderService.getSalesOrderById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: salesOrder,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE / RESUBMIT SALES ORDER
// Only when rejected/editable
// ===============================
const updateSalesOrder = async (req, res) => {
  try {
    const salesOrder = await salesOrderService.updateSalesOrder(
      req.params.id,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Sales order updated and resubmitted successfully",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// ADMIN APPROVE
// ===============================
const approveSalesOrderByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can approve sales order",
      });
    }

    const salesOrder =
      await salesOrderService.approveSalesOrderByAdmin(
        req.params.id,
        req.user
      );

    return res.status(200).json({
      success: true,
      message:
        "Sales order approved by admin and sent for manager approval",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// ADMIN REJECT
// ===============================
const rejectSalesOrderByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can reject sales order",
      });
    }

    const { rejectionComment } = req.body;

    if (!rejectionComment) {
      return res.status(400).json({
        success: false,
        message: "Rejection comment is required",
      });
    }

    const salesOrder =
      await salesOrderService.rejectSalesOrderByAdmin(
        req.params.id,
        rejectionComment,
        req.user
      );

    return res.status(200).json({
      success: true,
      message: "Sales order rejected by admin",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// MANAGER APPROVE
// Later this can be called from WhatsApp webhook
// ===============================
const approveSalesOrderByManager = async (req, res) => {
  try {
    const salesOrder =
      await salesOrderService.approveSalesOrderByManager(
        req.params.id,
        {
          managerName: req.body.managerName || "Manager",
        }
      );

    return res.status(200).json({
      success: true,
      message: "Sales order approved by manager",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// MANAGER REJECT
// Later this can be called from WhatsApp webhook
// ===============================
const rejectSalesOrderByManager = async (req, res) => {
  try {
    const { rejectionComment } = req.body;

    if (!rejectionComment) {
      return res.status(400).json({
        success: false,
        message: "Rejection comment is required",
      });
    }

    const salesOrder =
      await salesOrderService.rejectSalesOrderByManager(
        req.params.id,
        rejectionComment,
        {
          managerName: req.body.managerName || "Manager",
        }
      );

    return res.status(200).json({
      success: true,
      message: "Sales order rejected by manager",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE PDF DETAILS
// System use after PDF generated
// ===============================
const updatePdfDetails = async (req, res) => {
  try {
    const salesOrder = await salesOrderService.updatePdfDetails(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Sales order PDF details updated",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE WHATSAPP GROUP STATUS
// System use after WhatsApp group sent
// ===============================
const updateWhatsappGroupStatus = async (req, res) => {
  try {
    const salesOrder =
      await salesOrderService.updateWhatsappGroupStatus(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "WhatsApp group status updated",
      data: salesOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// SEARCH PENDING DISPATCH
// Keep old dashboard support
// ===============================
const searchPendingDispatchSalesOrders = async (req, res) => {
  try {
    const data =
      await salesOrderService.searchPendingDispatchSalesOrders(
        req.query,
        req.user
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// DELETE SALES ORDER
// Admin only
// ===============================
const deleteSalesOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete sales order",
      });
    }

    await salesOrderService.deleteSalesOrder(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Sales order deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const verifyWhatsappWebhook = (req, res) => {
  const verifyToken = "bharat_sales_order_token";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const handleWhatsappWebhook = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const buttonId = message.interactive?.button_reply?.id;

    if (!buttonId) {
      return res.sendStatus(200);
    }

    const [action, salesOrderId] = buttonId.split("_");

    if (action === "approve") {
      await salesOrderService.approveSalesOrderByManager(salesOrderId, {
        managerName: "Super Admin",
      });
    }

    if (action === "reject") {
      await salesOrderService.rejectSalesOrderByManager(
        salesOrderId,
        "Rejected from WhatsApp",
        {
          managerName: "Super Admin",
        }
      );
    }

    return res.sendStatus(200);
  } catch (error) {
    console.log("WHATSAPP WEBHOOK ERROR =>", error);
    return res.sendStatus(200);
  }
};
module.exports = {
  createSalesOrder,
  generateSalesOrderPdf,
  getAllSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  approveSalesOrderByAdmin,
  rejectSalesOrderByAdmin,
  approveSalesOrderByManager,
  rejectSalesOrderByManager,
  updatePdfDetails,
  updateWhatsappGroupStatus,
  searchPendingDispatchSalesOrders,
  deleteSalesOrder,
  handleWhatsappWebhook,
  verifyWhatsappWebhook
};