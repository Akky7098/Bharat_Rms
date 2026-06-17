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
    const payload = req.body.data ? JSON.parse(req.body.data) : { ...req.body };

    const uploadedPOFile = req.files?.customerPOFile?.[0] || null;
    const uploadedFeasibilityReportFile =
      req.files?.feasibilityReportFile?.[0] || null;

    const salesOrder = await salesOrderService.createSalesOrder(
      payload,
      req.user,
      uploadedPOFile,
      uploadedFeasibilityReportFile
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

    res.status(200).json({
      success: true,
      data: result.salesOrders,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    res.status(500).json({
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
    const payload = req.body.data ? JSON.parse(req.body.data) : { ...req.body };

    const uploadedPOFile = req.files?.customerPOFile?.[0] || null;
    const uploadedFeasibilityReportFile =
      req.files?.feasibilityReportFile?.[0] || null;

    const salesOrder = await salesOrderService.updateSalesOrder(
      req.params.id,
      payload,
      req.user,
      uploadedPOFile,
      uploadedFeasibilityReportFile
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
        "Sales order approved by sonia and sent for md sir approval",
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
          managerName: req.body.managerName || "Mdsir",
        }
      );

    return res.status(200).json({
      success: true,
      message: "Sales order approved by md sir",
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
          managerName: req.body.managerName || "Md sir",
        }
      );

    return res.status(200).json({
      success: true,
      message: "Sales order rejected by md sir",
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
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only super admin can delete sales order",
      });
    }

    const data = await salesOrderService.deleteSalesOrder(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Sales order deleted successfully.",
      data,
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
// const approveSalesOrderFromEmail = async (req, res) => {
//   try {
//     await salesOrderService.approveSalesOrderFromEmail(
//       req.params.id,
//       req.params.token
//     );

//     return res.send(`
//       <h2 style="font-family:Arial;color:green;">
//         Sales Order Approved Successfully
//       </h2>
//     `);
//   } catch (error) {
//     return res.send(`
//       <h2 style="font-family:Arial;color:red;">
//         ${error.message}
//       </h2>
//     `);
//   }
// };

// const showRejectForm = async (req, res) => {
//   return res.send(`
//     <form method="POST" action="/api/sales-order/email-reject/${req.params.id}/${req.params.token}" style="font-family:Arial;max-width:500px;margin:40px auto;">
//       <h2>Reject Sales Order</h2>

//       <textarea name="rejectionComment" required placeholder="Enter rejection reason" style="width:100%;height:120px;padding:10px;"></textarea>

//       <br/><br/>

//       <button type="submit" style="background:#dc2626;color:white;padding:10px 18px;border:none;border-radius:6px;">
//         Submit Rejection
//       </button>
//     </form>
//   `);
// };

// const rejectSalesOrderFromEmail = async (req, res) => {
//   try {
//     await salesOrderService.rejectSalesOrderFromEmail(
//       req.params.id,
//       req.params.token,
//       req.body.rejectionComment
//     );

//     return res.send(`
//       <h2 style="font-family:Arial;color:#dc2626;">
//         Sales Order Rejected Successfully
//       </h2>
//     `);
//   } catch (error) {
//     return res.send(`
//       <h2 style="font-family:Arial;color:red;">
//         ${error.message}
//       </h2>
//     `);
//   }
// };
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
  verifyWhatsappWebhook,
//   approveSalesOrderFromEmail,
// showRejectForm,
// rejectSalesOrderFromEmail,
};