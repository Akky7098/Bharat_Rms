const SalesOrder = require("../model/salesOrderModel");
const pdfService = require("./pdfService");
const whatsappApprovalService = require("./whatsappApprovalService");
const mongoose = require("mongoose");
const finalApprovalService = require("./finalApprovalService");
const crypto = require("crypto");

let notificationService = null;

try {
  notificationService = require("./notificationService");
} catch (error) {
  console.log("Notification service not loaded =>", error.message);
}

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) return;
    await notificationService.createNotification(payload);
  } catch (error) {
    console.log("NOTIFICATION ERROR =>", error.message);
  }
};

// ========================================
// SAFE WHATSAPP QUEUE
// Prevents 2-3 WhatsApp messages firing at exact same time
// ========================================
const whatsappQueue = [];
let whatsappQueueRunning = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runWhatsappQueue = async () => {
  if (whatsappQueueRunning) return;

  whatsappQueueRunning = true;

  while (whatsappQueue.length > 0) {
    const job = whatsappQueue.shift();

    try {
      await job();
    } catch (error) {
      console.log("WHATSAPP QUEUE JOB ERROR =>", error.message);
    }

    await sleep(1500);
  }

  whatsappQueueRunning = false;
};

const enqueueWhatsapp = (job) => {
  whatsappQueue.push(job);
  runWhatsappQueue();
};

const cleanWhatsappNumber = (number = "") => {
  const cleaned = String(number || "").replace(/\D/g, "");

  if (!cleaned) return "";

  if (cleaned.length === 10) return `91${cleaned}`;

  return cleaned;
};

const getWhatsappChatId = (number = "") => {
  const cleaned = cleanWhatsappNumber(number);

  if (!cleaned) return "";

  return `${cleaned}@c.us`;
};

const sendSafeWhatsappMessage = async (number, message) => {
  const chatId = getWhatsappChatId(number);

  if (!chatId) {
    throw new Error("WhatsApp number missing");
  }

  return whatsappApprovalService.sendPlainWhatsappMessage(chatId, message);
};

const getBaseUrl = () => {
  return "https://dashboard.bharatspecialsteels.com";
};

const getBackendUrl = () => {
  return (
    process.env.BACKEND_URL ||
    "https://bharatspecialsteels.bharatspecialsteels.com"
  ).replace(/\/$/, "");
};

const getDashboardLink = () => {
  return `${getBaseUrl()}/dashboard#sales-order`;
};

const getPdfLink = (salesOrder) => {
  const fileUrl =
    salesOrder?.pdf?.fileUrl ||
    salesOrder?.finalSalesOrderPackage?.fileUrl ||
    "";

  if (!fileUrl) return "";

  const cleanFileUrl = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;

  return `${getBackendUrl()}${cleanFileUrl}`;
};

const formatCurrency = (value = 0) => {
  return Number(value || 0).toLocaleString("en-IN");
};

const formatStatus = (status = "") => {
  return String(status || "-").replaceAll("_", " ").toUpperCase();
};

const getSalesPersonWhatsappNumber = (salesOrder) => {
  return (
    salesOrder?.salesPersonWhatsappNumber ||
    salesOrder?.salesPersonMobile ||
    salesOrder?.salesPersonId?.whatsappNumber ||
    salesOrder?.salesPersonId?.mobileNumber ||
    ""
  );
};

const buildSalesOrderWhatsappBlock = (salesOrder) => {
  return `🏢 *Company:* ${salesOrder.companyName || "-"}
👤 *Sales Person:* ${salesOrder.salesPersonName || "-"}
📄 *PO No:* ${salesOrder.poNumber || "-"}
🧾 *Checklist:* ${salesOrder.checklistNumber || "-"}
💰 *Order Value:* ₹${formatCurrency(salesOrder.orderValue)}
📌 *Status:* ${formatStatus(salesOrder.approvalStatus)}
`;
};

const addHistoryAndSave = async (salesOrder, action, comment) => {
  try {
    salesOrder.approvalHistory.push({
      role: "system",
      action,
      comment,
    });

    await salesOrder.save();
  } catch (error) {
    console.log("APPROVAL HISTORY SAVE ERROR =>", error.message);
  }
};

const sendSalesOrderCreatedToAdminWhatsapp = async (salesOrder) => {
  if (!process.env.ADMIN_WHATSAPP_NUMBER) {
    throw new Error("ADMIN_WHATSAPP_NUMBER missing in env");
  }

  const message = `🚨 *New Sales Order Created*

 Sonia ji, a new Sales Order is pending for your checking.

 ${buildSalesOrderWhatsappBlock(salesOrder)}

 ✅ Please approve or put on hold from Bharat RMS dashboard.

 🔗 ${getDashboardLink()}`;

  return sendSafeWhatsappMessage(process.env.ADMIN_WHATSAPP_NUMBER, message);
};

 const sendAdminApprovedToSalesPersonWhatsapp = async (salesOrder) => {
  const number = getSalesPersonWhatsappNumber(salesOrder);

  const message = `✅ *Sales Order Checked by Sonia ji*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order has been checked by Sonia ji and sent to *MD Sir* for final approval.

${buildSalesOrderWhatsappBlock(salesOrder)}

⏳ Current Status: *Pending MD Sir Approval*`;

  return sendSafeWhatsappMessage(number, message);
};

const sendAdminHoldToSalesPersonWhatsapp = async (
  salesOrder,
  rejectionComment
) => {
  const number = getSalesPersonWhatsappNumber(salesOrder);

  const message = `⛔ *Sales Order Put On Hold by Sonia ji*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order has been put on hold by Sonia ji.

${buildSalesOrderWhatsappBlock(salesOrder)}

📝 *Reason:*
${rejectionComment || "-"}

Please revise and resubmit from Bharat RMS.`;

  return sendSafeWhatsappMessage(number, message);
};

const sendMdApprovedToSalesPersonAndAdminWhatsapp = async (salesOrder) => {
  const pdfLink = getPdfLink(salesOrder);
  const salesPersonNumber = getSalesPersonWhatsappNumber(salesOrder);

  const salesPersonMessage = `🎉 *Sales Order Finally Approved by MD Sir*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order is now fully approved by MD Sir.

${buildSalesOrderWhatsappBlock(salesOrder)}

${pdfLink ? `📎 *PDF:* ${pdfLink}` : ""}

You can proceed with the next process.`;

  await sendSafeWhatsappMessage(salesPersonNumber, salesPersonMessage);

  if (process.env.ADMIN_WHATSAPP_NUMBER) {
    const adminMessage = `✅ *MD Sir Approved Sales Order*

Sonia ji, MD Sir has finally approved this Sales Order.

${buildSalesOrderWhatsappBlock(salesOrder)}

${pdfLink ? `📎 *PDF:* ${pdfLink}` : ""}`;

    await sendSafeWhatsappMessage(process.env.ADMIN_WHATSAPP_NUMBER, adminMessage);
  }
};

const sendMdHoldToSalesPersonAndAdminWhatsapp = async (
  salesOrder,
  rejectionComment
) => {
  const salesPersonNumber = getSalesPersonWhatsappNumber(salesOrder);

  const salesPersonMessage = `⛔ *Sales Order Put On Hold by MD Sir*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

MD Sir has put your Sales Order on hold.

${buildSalesOrderWhatsappBlock(salesOrder)}

📝 *MD Sir Reason:*
${rejectionComment || "-"}

Please revise and resubmit from Bharat RMS.`;

  await sendSafeWhatsappMessage(salesPersonNumber, salesPersonMessage);

  if (process.env.ADMIN_WHATSAPP_NUMBER) {
    const adminMessage = `⚠️ *MD Sir Put Sales Order On Hold*

Sonia ji, MD Sir has put this Sales Order on hold.

${buildSalesOrderWhatsappBlock(salesOrder)}

📝 *Reason:*
${rejectionComment || "-"}

Please coordinate with the salesperson.`;

    await sendSafeWhatsappMessage(process.env.ADMIN_WHATSAPP_NUMBER, adminMessage);
  }
};

// ========================================
// CREATE SALES ORDER
// ========================================
const createSalesOrder = async (
  payload,
  loggedInUser,
  uploadedPOFile,
  uploadedFeasibilityReportFile
) => {
  try {
    const salesOrder = new SalesOrder({
      ...payload,

      orderType: payload.orderType || "domestic",

      salesPersonId: loggedInUser._id,
      salesPersonName: loggedInUser.name,
      salesPersonEmail: loggedInUser.email,
      salesPersonMobile: loggedInUser.mobileNumber,

      customerPOFile: uploadedPOFile
        ? {
            originalName: uploadedPOFile.originalname,
            fileName: uploadedPOFile.filename,
            filePath: uploadedPOFile.path,
            fileUrl: `/uploads/customer-po/${uploadedPOFile.filename}`,
            uploadedAt: new Date(),
          }
        : undefined,

      feasibilityReportFile: uploadedFeasibilityReportFile
        ? {
            originalName: uploadedFeasibilityReportFile.originalname,
            fileName: uploadedFeasibilityReportFile.filename,
            filePath: uploadedFeasibilityReportFile.path,
            fileUrl: `/uploads/feasibility-report/${uploadedFeasibilityReportFile.filename}`,
            uploadedAt: new Date(),
          }
        : undefined,

      approvalHistory: [
        {
          actionBy: loggedInUser._id,
          role: "salesperson",
          action: "created",
          comment:
            uploadedPOFile && uploadedFeasibilityReportFile
              ? "Sales order created with customer PO file and feasibility report"
              : uploadedPOFile
              ? "Sales order created with customer PO file"
              : uploadedFeasibilityReportFile
              ? "Sales order created with feasibility report"
              : "Sales order created without customer PO file and feasibility report",
        },
      ],
    });

    const savedOrder = await salesOrder.save();

    await safeCreateNotification({
      module: "sales_order",
      event: "created",
      title: "New Sales Order Created",
      message: `${loggedInUser.name} created a sales order for ${savedOrder.companyName}`,
      priority: "high",
      targetRoles: ["admin"],
      createdBy: loggedInUser._id,
      referenceId: savedOrder._id,
      referenceModel: "SalesOrder",
      actionUrl: "/dashboard#sales-order",
      meta: {
        companyName: savedOrder.companyName,
        poNumber: savedOrder.poNumber,
        salesPersonName: loggedInUser.name,
        orderType: savedOrder.orderType,
      },
    });

    setImmediate(() => {
      enqueueWhatsapp(async () => {
        const freshOrder = await SalesOrder.findById(savedOrder._id);

        if (!freshOrder) return;

        try {
          await sendSalesOrderCreatedToAdminWhatsapp(freshOrder);

          await addHistoryAndSave(
            freshOrder,
            "whatsapp_sent",
            "Sales order creation WhatsApp sent to Sonia"
          );
        } catch (waError) {
          console.log(
            "SALES ORDER CREATE ADMIN WHATSAPP ERROR =>",
            waError.message
          );

          await addHistoryAndSave(
            freshOrder,
            "failed",
            `Sales order creation admin WhatsApp failed: ${waError.message}`
          );
        }
      });
    });

    return savedOrder;
  } catch (error) {
    throw error;
  }
};

const generateSalesOrderPdfById = async (salesOrderId) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (!salesOrder.customerPOFile?.filePath) {
      throw new Error("Customer PO file is required before generating final PDF");
    }

    const pdfDetails = await pdfService.generateSalesOrderPdf(salesOrder);

    salesOrder.pdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.finalSalesOrderPackage = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.preShipmentInspectionPdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: "Final sales order package PDF generated",
    });

    await salesOrder.save();

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// GET ALL SALES ORDERS
// ========================================
const getAllSalesOrders = async (query, user) => {
  try {
    const {
      page = 1,
      limit = 20,
      salesPersonId,
      fromDate,
      toDate,
      approvalStatus,
      approvalTab,
      customerType,
      companyName,
      poNumber,
    } = query;

    const filter = {
  isActive: { $ne: false },
};

    if (user.role === "admin" || user.role === "super_admin") {
      if (salesPersonId) {
        filter.salesPersonId = new mongoose.Types.ObjectId(salesPersonId);
      }
    } else {
      filter.salesPersonId = new mongoose.Types.ObjectId(user.id);
    }

    if (approvalTab === "approved") {
      filter.approvalStatus = "approved";
    } else if (approvalTab === "pending_rejected") {
      filter.approvalStatus = { $ne: "approved" };
    } else if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    if (customerType) filter.customerType = customerType;

    if (companyName) {
      filter.companyName = { $regex: companyName, $options: "i" };
    }

    if (poNumber) {
      filter.poNumber = { $regex: poNumber, $options: "i" };
    }

    if (fromDate || toDate) {
      filter.orderDate = {};

      if (fromDate) filter.orderDate.$gte = new Date(fromDate);

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.orderDate.$lte = endDate;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalRecords = await SalesOrder.countDocuments(filter);

    const buildApprovedSummary = async (dateFilter = null) => {
      const summaryFilter = {
        ...filter,
        approvalStatus: "approved",
      };

      delete summaryFilter.orderDate;

      if (dateFilter) {
        summaryFilter["managerApproval.approvedAt"] = dateFilter;
      } else if (fromDate || toDate) {
        summaryFilter["managerApproval.approvedAt"] = {};

        if (fromDate) {
          summaryFilter["managerApproval.approvedAt"].$gte = new Date(fromDate);
        }

        if (toDate) {
          const endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
          summaryFilter["managerApproval.approvedAt"].$lte = endDate;
        }
      }

      const result = await SalesOrder.aggregate([
        { $match: summaryFilter },
        {
          $group: {
            _id: null,
            totalApprovedOrders: { $sum: 1 },
            totalApprovedValue: {
              $sum: {
                $convert: {
                  input: "$orderValue",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
      ]);

      return {
        totalApprovedOrders: result[0]?.totalApprovedOrders || 0,
        totalApprovedValue: result[0]?.totalApprovedValue || 0,
      };
    };

    const now = new Date();

    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const todayStart = new Date(istNow);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(istNow);
    todayEnd.setHours(23, 59, 59, 999);

    const todayApprovedSummary = await buildApprovedSummary({
      $gte: todayStart,
      $lte: todayEnd,
    });

    const monthStart = new Date(
  istNow.getFullYear(),
  istNow.getMonth(),
  1,
  0,
  0,
  0,
  0
);

const monthEnd = new Date(
  istNow.getFullYear(),
  istNow.getMonth() + 1,
  0,
  23,
  59,
  59,
  999
);

const filteredApprovedSummary =
  fromDate || toDate
    ? await buildApprovedSummary()
    : await buildApprovedSummary({
        $gte: monthStart,
        $lte: monthEnd,
      });

    const salesOrders = await SalesOrder.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "salesPersonId",
          foreignField: "_id",
          as: "salesPersonId",
        },
      },
      {
        $unwind: {
          path: "$salesPersonId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "checkedByAdminId",
          foreignField: "_id",
          as: "checkedByAdminId",
        },
      },
      {
        $unwind: {
          path: "$checkedByAdminId",
          preserveNullAndEmptyArrays: true,
        },
      },
     {
  $addFields: {
    latestActivityDate: {
      $switch: {
        branches: [
          {
            case: { $eq: ["$approvalStatus", "approved"] },
            then: { $ifNull: ["$managerApproval.approvedAt", "$updatedAt"] },
          },
          {
            case: { $eq: ["$approvalStatus", "pending_manager_approval"] },
            then: { $ifNull: ["$checkedAt", "$updatedAt"] },
          },
          {
            case: { $eq: ["$approvalStatus", "pending_admin_review"] },
            then: { $ifNull: ["$lastSubmittedAt", "$createdAt"] },
          },
          {
            case: { $eq: ["$approvalStatus", "rejected_by_admin"] },
            then: { $ifNull: ["$adminApproval.rejectedAt", "$updatedAt"] },
          },
          {
            case: { $eq: ["$approvalStatus", "rejected_by_manager"] },
            then: { $ifNull: ["$managerApproval.rejectedAt", "$updatedAt"] },
          },
        ],
        default: { $ifNull: ["$updatedAt", "$createdAt"] },
      },
    },
  },
},
{
  $sort: {
    latestActivityDate: -1,
    updatedAt: -1,
    createdAt: -1,
  },
},
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          orderDate: 1,
          createdAt: 1,
          updatedAt: 1,
          companyName: 1,
          companyAddress: 1,
          gstinNumber: 1,
          poNumber: 1,
          checklistNumber: 1,
          customerType: 1,
          paymentTerms: 1,
          otherPaymentTerms: 1,
          orderValue: 1,
          isPaymentTermsApprovedByManagement: 1,
          paymentTermsApprovedBy: 1,
          previousPaymentStatus: 1,
          previousPaymentRemark: 1,
          specialNote: 1,
          poAsPerQuotation: 1,
          billingAddress: 1,
          shippingAddress: 1,
          enquiryFormFilled: 1,
          enquiryNumber: 1,
          sizeGradeQuantityRate: 1,
          supplyCondition: 1,
          otherSupplyConditions: 1,
          cutLengthRequired: 1,
          cuttingCost: 1,
          cuttingExtraCharges: 1,
          freight: 1,
          freightExtraCharges: 1,
          tolerance: 1,
          deliveryTime: 1,
          endUseOfCustomer: 1,
          testCertificateRequired: 1,
          approvalStatus: 1,
          isEditableBySalesPerson: 1,
          revisionCount: 1,
          lastSubmittedAt: 1,
          contactPersonName: 1,
          contactPersonNumber: 1,
          contactPersonEmail: 1,
          contactPersonEmailId: 1,
          pdf: 1,
          finalSalesOrderPackage: 1,
          preShipmentInspectionPdf: 1,
          customerPOFile: 1,
          managerApproval: 1,
          adminApproval: 1,
          approvalHistory: 1,
          "salesPersonId._id": 1,
          "salesPersonId.name": 1,
          "salesPersonId.email": 1,
          "salesPersonId.mobileNumber": 1,
          "salesPersonId.whatsappNumber": 1,
          "checkedByAdminId._id": 1,
          "checkedByAdminId.name": 1,
          "checkedByAdminId.email": 1,
        },
      },
    ]);

    return {
      salesOrders,
      summary: {
        todayApproved: todayApprovedSummary,
        filteredApproved: filteredApprovedSummary,
      },
      pagination: {
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / Number(limit)),
        limit: Number(limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

// ========================================
// GET SINGLE SALES ORDER
// ========================================
const getSalesOrderById = async (salesOrderId) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId)
      .populate("salesPersonId", "name email mobileNumber whatsappNumber")
      .populate("checkedByAdminId", "name email");

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// UPDATE SALES ORDER
// ========================================
const updateSalesOrder = async (
  salesOrderId,
  payload,
  loggedInUser,
  uploadedPOFile,
  uploadedFeasibilityReportFile
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (!salesOrder.isEditableBySalesPerson) {
      throw new Error("Sales order cannot be edited right now");
    }

    const preservedCustomerPOFile = salesOrder.customerPOFile;
    const preservedFeasibilityReportFile = salesOrder.feasibilityReportFile;

    Object.keys(payload).forEach((key) => {
      if (key === "pdf") return;
      if (key === "finalSalesOrderPackage") return;
      if (key === "preShipmentInspectionPdf") return;
      if (key === "customerPOFile") return;
      if (key === "feasibilityReportFile") return;
      if (key === "approvalHistory") return;
      if (key === "approvalStatus") return;
      if (key === "isEditableBySalesPerson") return;

      if (payload[key] !== undefined && payload[key] !== null) {
        salesOrder[key] = payload[key];
      }
    });

    if (!salesOrder.orderType) {
      salesOrder.orderType = "domestic";
    }

    if (uploadedPOFile) {
      salesOrder.customerPOFile = {
        originalName: uploadedPOFile.originalname,
        fileName: uploadedPOFile.filename,
        filePath: uploadedPOFile.path,
        fileUrl: `/uploads/customer-po/${uploadedPOFile.filename}`,
        uploadedAt: new Date(),
      };
    } else {
      salesOrder.customerPOFile = preservedCustomerPOFile;
    }

    if (uploadedFeasibilityReportFile) {
      salesOrder.feasibilityReportFile = {
        originalName: uploadedFeasibilityReportFile.originalname,
        fileName: uploadedFeasibilityReportFile.filename,
        filePath: uploadedFeasibilityReportFile.path,
        fileUrl: `/uploads/feasibility-report/${uploadedFeasibilityReportFile.filename}`,
        uploadedAt: new Date(),
      };
    } else {
      salesOrder.feasibilityReportFile = preservedFeasibilityReportFile;
    }

    salesOrder.approvalStatus = "pending_admin_review";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.adminApproval = {};
    salesOrder.managerApproval = {};
    salesOrder.checkedByAdminId = null;
    salesOrder.checkedByAdminName = null;
    salesOrder.checkedAt = null;

    salesOrder.revisionCount = (salesOrder.revisionCount || 0) + 1;
    salesOrder.lastSubmittedAt = new Date();

    salesOrder.approvalHistory.push({
      actionBy: loggedInUser._id,
      role: "salesperson",
      action: "resubmitted",
      comment:
        uploadedPOFile && uploadedFeasibilityReportFile
          ? "Sales order updated with new customer PO file and feasibility report and resubmitted after hold"
          : uploadedPOFile
          ? "Sales order updated with new customer PO file and resubmitted after hold"
          : uploadedFeasibilityReportFile
          ? "Sales order updated with new feasibility report and resubmitted after hold"
          : "Sales order updated and resubmitted after hold",
    });

    const updatedOrder = await salesOrder.save();

    await safeCreateNotification({
      module: "sales_order",
      event: "resubmitted",
      title: "Sales Order Resubmitted",
      message: `${loggedInUser.name} resubmitted sales order for ${updatedOrder.companyName}`,
      priority: "high",
      targetRoles: ["admin"],
      createdBy: loggedInUser._id,
      referenceId: updatedOrder._id,
      referenceModel: "SalesOrder",
      actionUrl: "/dashboard#sales-order",
      meta: {
        companyName: updatedOrder.companyName,
        poNumber: updatedOrder.poNumber,
        salesPersonName: loggedInUser.name,
        orderType: updatedOrder.orderType,
      },
    });

    const pdfDetails = await pdfService.generateSalesOrderPdf(updatedOrder);

    updatedOrder.pdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
      revisionNo: updatedOrder.revisionCount || 0,
    };

    updatedOrder.finalSalesOrderPackage = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    updatedOrder.preShipmentInspectionPdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    updatedOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: "Fresh PDF generated after sales order resubmission",
    });

    await updatedOrder.save();

    setImmediate(() => {
      enqueueWhatsapp(async () => {
        const freshOrder = await SalesOrder.findById(updatedOrder._id);

        if (!freshOrder) return;

        try {
          await sendSalesOrderCreatedToAdminWhatsapp(freshOrder);

          await addHistoryAndSave(
            freshOrder,
            "whatsapp_sent",
            "Sales order resubmission WhatsApp sent to Sonia"
          );
        } catch (waError) {
          console.log(
            "SALES ORDER RESUBMIT ADMIN WHATSAPP ERROR =>",
            waError.message
          );

          await addHistoryAndSave(
            freshOrder,
            "failed",
            `Sales order resubmission admin WhatsApp failed: ${waError.message}`
          );
        }
      });
    });

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// ADMIN APPROVE BACKGROUND TASK
// ========================================
const runAdminApprovalBackgroundTasks = (SalesOrderModel, salesOrderId) => {
  setImmediate(() => {
    enqueueWhatsapp(async () => {
      const salesOrder = await SalesOrderModel.findById(salesOrderId).populate(
        "salesPersonId",
        "name email mobileNumber whatsappNumber"
      );

      if (!salesOrder) {
        console.log("ADMIN APPROVAL BACKGROUND: Sales order not found");
        return;
      }

      try {
        await sendAdminApprovedToSalesPersonWhatsapp(salesOrder);

        await addHistoryAndSave(
          salesOrder,
          "whatsapp_sent",
          "Sonia approval WhatsApp sent to salesperson"
        );
      } catch (waError) {
        console.log("SALESPERSON WHATSAPP ERROR =>", waError.message);

        await addHistoryAndSave(
          salesOrder,
          "failed",
          `Salesperson WhatsApp failed after Sonia approval: ${waError.message}`
        );
      }

      // try {
      //   await whatsappApprovalService.sendMdApprovalWhatsapp(salesOrder);

      //   await addHistoryAndSave(
      //     salesOrder,
      //     "whatsapp_group_sent",
      //     "WhatsApp approval request sent to MD Sir"
      //   );
      // } catch (waError) {
      //   console.log("MD WHATSAPP REQUEST ERROR =>", waError.message);

      //   await addHistoryAndSave(
      //     salesOrder,
      //     "failed",
      //     `MD WhatsApp request failed: ${waError.message}`
      //   );
      // }
    });
  });
};

// ========================================
// ADMIN HOLD BACKGROUND TASK
// ========================================
const runAdminRejectBackgroundTasks = (
  SalesOrderModel,
  salesOrderId,
  rejectionComment
) => {
  setImmediate(() => {
    enqueueWhatsapp(async () => {
      const salesOrder = await SalesOrderModel.findById(salesOrderId).populate(
        "salesPersonId",
        "name email mobileNumber whatsappNumber"
      );

      if (!salesOrder) {
        console.log("ADMIN REJECT BACKGROUND: Sales order not found");
        return;
      }

      try {
        await sendAdminHoldToSalesPersonWhatsapp(
          salesOrder,
          rejectionComment
        );

        await addHistoryAndSave(
          salesOrder,
          "whatsapp_sent",
          "Sonia hold WhatsApp sent to salesperson"
        );
      } catch (waError) {
        console.log("ADMIN HOLD WHATSAPP ERROR =>", waError.message);

        await addHistoryAndSave(
          salesOrder,
          "failed",
          `Sonia hold WhatsApp failed: ${waError.message}`
        );
      }
    });
  });
};

// ========================================
// ADMIN APPROVE
// ========================================
// ========================================
// ADMIN APPROVE
// Admin approval only moves order to MD approval.
// Final approval is always done by MD / super_admin.
// ========================================
const approveSalesOrderByAdmin = async (salesOrderId, loggedInAdmin) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (salesOrder.approvalStatus !== "pending_admin_review") {
      throw new Error("Sales order is not pending Sonia review.");
    }

    salesOrder.approvalStatus = "pending_manager_approval";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.checkedByAdminId = loggedInAdmin._id;
    salesOrder.checkedByAdminName = loggedInAdmin.name;
    salesOrder.checkedAt = new Date();

    salesOrder.adminApproval = {
      ...salesOrder.adminApproval,
      approvedBy: loggedInAdmin._id,
      approvedAt: new Date(),
      rejectionComment: "",
    };

    const approvalToken = crypto.randomBytes(32).toString("hex");

    salesOrder.managerEmailApproval = {
      token: approvalToken,
      tokenCreatedAt: new Date(),
    };

    salesOrder.approvalHistory.push({
      actionBy: loggedInAdmin._id,
      role: "admin",
      action: "admin_approved",
      comment: "Sales order approved by Sonia and sent for MD Sir approval",
    });

    await salesOrder.save();

    await safeCreateNotification({
      module: "sales_order",
      event: "admin_approved",
      title: "Sales Order Ready for MD Approval",
      message: `${loggedInAdmin.name} approved ${salesOrder.companyName}. MD Sir approval required.`,
      priority: "urgent",
      targetRoles: ["super_admin"],
      createdBy: loggedInAdmin._id,
      referenceId: salesOrder._id,
      referenceModel: "SalesOrder",
      actionUrl: "/dashboard#sales-order",
      meta: {
        companyName: salesOrder.companyName,
        poNumber: salesOrder.poNumber,
        adminName: loggedInAdmin.name,
        salesPersonName: salesOrder.salesPersonName,
      },
    });

    runAdminApprovalBackgroundTasks(salesOrder.constructor, salesOrder._id);

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// ADMIN HOLD
// Admin can hold only before MD final review.
// Salesperson can edit and resubmit.
// ========================================
const rejectSalesOrderByAdmin = async (
  salesOrderId,
  rejectionComment,
  loggedInAdmin
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (salesOrder.approvalStatus !== "pending_admin_review") {
      throw new Error("Sales order is not pending Sonia review.");
    }

    salesOrder.approvalStatus = "rejected_by_admin";
    salesOrder.isEditableBySalesPerson = true;

    salesOrder.adminApproval = {
      ...salesOrder.adminApproval,
      rejectedBy: loggedInAdmin._id,
      rejectedAt: new Date(),
      rejectionComment,
    };

    salesOrder.approvalHistory.push({
      actionBy: loggedInAdmin._id,
      role: "admin",
      action: "admin_rejected",
      comment: rejectionComment,
    });

    await salesOrder.save();

    await safeCreateNotification({
      module: "sales_order",
      event: "admin_rejected",
      title: "Sales Order Put On Hold by Admin",
      message: `${salesOrder.companyName} sales order was put on hold by ${loggedInAdmin.name}`,
      priority: "high",
      targetUserIds: [salesOrder.salesPersonId],
      createdBy: loggedInAdmin._id,
      referenceId: salesOrder._id,
      referenceModel: "SalesOrder",
      actionUrl: "/dashboard#sales-order",
      meta: {
        companyName: salesOrder.companyName,
        poNumber: salesOrder.poNumber,
        rejectionComment,
        rejectedBy: loggedInAdmin.name,
      },
    });

    runAdminRejectBackgroundTasks(
      salesOrder.constructor,
      salesOrder._id,
      rejectionComment
    );

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// MANAGER / MD APPROVE
// MD approval is always final.
// MD can approve directly from pending_admin_review
// OR after Sonia approval from pending_manager_approval.
// ========================================
const approveSalesOrderByManager = async (salesOrderId, loggedInManager) => {
  const salesOrder = await SalesOrder.findById(salesOrderId).populate(
    "salesPersonId",
    "name email mobileNumber whatsappNumber"
  );

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  if (
    !["pending_admin_review", "pending_manager_approval"].includes(
      salesOrder.approvalStatus
    )
  ) {
    throw new Error("Sales order is not pending MD Sir approval.");
  }

  const wasDirectMdApproval =
    salesOrder.approvalStatus === "pending_admin_review";

  salesOrder.approvalHistory.push({
    actionBy: loggedInManager._id,
    role: "manager",
    action: wasDirectMdApproval
      ? "manager_approved"
      : "manager_approved",
    comment: wasDirectMdApproval
      ? "MD Sir directly approved sales order without Sonia review"
      : "MD Sir finally approved sales order",
  });

  await salesOrder.save();

  const approvedOrder = await finalApprovalService.finalApproveSalesOrder(
    salesOrder,
    {
      managerId: loggedInManager._id,
      managerName: "MD Sir",
      managerEmail: loggedInManager.email,
    },
    "dashboard"
  );

  await safeCreateNotification({
    module: "sales_order",
    event: "manager_approved",
    title: "Sales Order Approved by MD Sir",
    message: `${approvedOrder.companyName} sales order has been finally approved by MD Sir`,
    priority: "high",
    targetUserIds: [approvedOrder.salesPersonId || salesOrder.salesPersonId],
    targetRoles: ["admin"],
    createdBy: loggedInManager._id,
    referenceId: approvedOrder._id,
    referenceModel: "SalesOrder",
    actionUrl: "/dashboard#sales-order",
    meta: {
      companyName: approvedOrder.companyName,
      poNumber: approvedOrder.poNumber,
      salesPersonName: approvedOrder.salesPersonName,
      managerName: "MD Sir",
      directApproval: wasDirectMdApproval,
    },
  });

  setImmediate(() => {
    enqueueWhatsapp(async () => {
      const freshOrder = await SalesOrder.findById(approvedOrder._id).populate(
        "salesPersonId",
        "name email mobileNumber whatsappNumber"
      );

      if (!freshOrder) return;

      try {
        await sendMdApprovedToSalesPersonAndAdminWhatsapp(freshOrder);

        await addHistoryAndSave(
          freshOrder,
          "whatsapp_sent",
          "MD Sir approval WhatsApp sent to salesperson and Sonia"
        );
      } catch (waError) {
        console.log("MD APPROVAL WHATSAPP ERROR =>", waError.message);

        await addHistoryAndSave(
          freshOrder,
          "failed",
          `MD Sir approval WhatsApp failed: ${waError.message}`
        );
      }
    });
  });

  return approvedOrder;
};

// ========================================
// MANAGER / MD HOLD
// MD can hold directly from pending_admin_review
// OR after Sonia approval from pending_manager_approval.
// After MD hold, delete button can appear only for super_admin.
// ========================================
const rejectSalesOrderByManager = async (
  salesOrderId,
  rejectionComment,
  managerData
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId).populate(
      "salesPersonId",
      "name email mobileNumber whatsappNumber"
    );

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (
      !["pending_admin_review", "pending_manager_approval"].includes(
        salesOrder.approvalStatus
      )
    ) {
      throw new Error("Sales order is not pending MD Sir review.");
    }

    const wasDirectMdHold = salesOrder.approvalStatus === "pending_admin_review";

    salesOrder.approvalStatus = "rejected_by_manager";
    salesOrder.isEditableBySalesPerson = true;

    salesOrder.managerApproval = {
      ...salesOrder.managerApproval,
      rejectedAt: new Date(),
      managerId: managerData.managerId,
      managerName: managerData.managerName || "MD Sir",
      managerEmail: managerData.managerEmail,
      rejectionComment,
      directHold: wasDirectMdHold,
    };

    salesOrder.approvalHistory.push({
      actionBy: managerData.managerId,
      role: "manager",
      action: wasDirectMdHold
        ? "manager_rejected"
        : "manager_rejected",
      comment: rejectionComment,
    });

    await salesOrder.save();

    await safeCreateNotification({
      module: "sales_order",
      event: "manager_rejected",
      title: "Sales Order Put on Hold by MD Sir",
      message: `${salesOrder.companyName} sales order was put on hold by MD Sir`,
      priority: "urgent",
      targetUserIds: [salesOrder.salesPersonId],
      targetRoles: ["admin"],
      createdBy: managerData.managerId || null,
      referenceId: salesOrder._id,
      referenceModel: "SalesOrder",
      actionUrl: "/dashboard#sales-order",
      meta: {
        companyName: salesOrder.companyName,
        poNumber: salesOrder.poNumber,
        rejectionComment,
        managerName: managerData.managerName || "MD Sir",
        directHold: wasDirectMdHold,
      },
    });

    setImmediate(() => {
      enqueueWhatsapp(async () => {
        const freshOrder = await SalesOrder.findById(salesOrder._id).populate(
          "salesPersonId",
          "name email mobileNumber whatsappNumber"
        );

        if (!freshOrder) return;

        try {
          await sendMdHoldToSalesPersonAndAdminWhatsapp(
            freshOrder,
            rejectionComment
          );

          await addHistoryAndSave(
            freshOrder,
            "whatsapp_sent",
            "MD Sir hold WhatsApp sent to salesperson and Sonia"
          );
        } catch (waError) {
          console.log("MD HOLD WHATSAPP ERROR =>", waError.message);

          await addHistoryAndSave(
            freshOrder,
            "failed",
            `MD Sir hold WhatsApp failed: ${waError.message}`
          );
        }
      });
    });

    return salesOrder;
  } catch (error) {
    throw error;
  }
};
const updatePdfDetails = async (salesOrderId, pdfData) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    salesOrder.pdf = {
      generated: true,
      fileName: pdfData.fileName,
      filePath: pdfData.filePath,
      fileUrl: pdfData.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: "PDF generated successfully",
    });

    const updatedOrder = await salesOrder.save();

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// UPDATE WHATSAPP STATUS
// ========================================
const updateWhatsappGroupStatus = async (salesOrderId, whatsappData) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    salesOrder.whatsappGroupStatus = {
      ...salesOrder.whatsappGroupStatus,
      sent: true,
      sentAt: new Date(),
      messageId: whatsappData.messageId,
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "whatsapp_group_sent",
      comment: "PDF sent to WhatsApp group",
    });

    const updatedOrder = await salesOrder.save();

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// DELETE SALES ORDER
// ========================================
const deleteSalesOrder = async (salesOrderId, user) => {
  const isSuperAdmin = user?.role === "super_admin";

  if (!isSuperAdmin) {
    throw new Error("Only super admin can delete sales order.");
  }

  const order = await SalesOrder.findById(salesOrderId);

  if (!order) {
    throw new Error("Sales order not found.");
  }

  if (order.approvalStatus !== "rejected_by_manager") {
    throw new Error("Only MD hold/rejected sales orders can be deleted.");
  }

  order.isActive = false;
  order.deletedAt = new Date();
  order.deletedBy = user._id || user.id;

  await order.save();

  return order;
};

// ========================================
// OLD EMAIL-LINK APPROVAL ROUTES
// Kept for route compatibility.
// No email is sent from this service now.
// ========================================
// const approveSalesOrderFromEmail = async (salesOrderId, token) => {
//   const salesOrder = await SalesOrder.findById(salesOrderId).populate(
//     "salesPersonId",
//     "name email mobileNumber whatsappNumber"
//   );

//   if (!salesOrder) {
//     throw new Error("Sales order not found");
//   }

//   if (salesOrder.approvalStatus !== "pending_manager_approval") {
//     throw new Error("Sales order is not pending md sir approval");
//   }

//   if (salesOrder.managerEmailApproval?.token !== token) {
//     throw new Error("Invalid approval link");
//   }

//   const approvedOrder = await finalApprovalService.finalApproveSalesOrder(
//     salesOrder,
//     {
//       managerName: "MD Sir",
//       managerEmail: process.env.MANAGER_EMAIL,
//       managerId: null,
//     },
//     "email"
//   );

//   await safeCreateNotification({
//     module: "sales_order",
//     event: "manager_approved",
//     title: "Sales Order Approved by MD Sir",
//     message: `${approvedOrder.companyName} sales order has been finally approved by MD Sir`,
//     priority: "high",
//     targetUserIds: [approvedOrder.salesPersonId || salesOrder.salesPersonId],
//     targetRoles: ["admin"],
//     createdBy: null,
//     referenceId: approvedOrder._id,
//     referenceModel: "SalesOrder",
//     actionUrl: "/dashboard#sales-order",
//     meta: {
//       companyName: approvedOrder.companyName,
//       poNumber: approvedOrder.poNumber,
//       salesPersonName: approvedOrder.salesPersonName,
//       managerName: "MD Sir",
//       source: "email_link",
//     },
//   });

//   setImmediate(() => {
//     enqueueWhatsapp(async () => {
//       const freshOrder = await SalesOrder.findById(approvedOrder._id).populate(
//         "salesPersonId",
//         "name email mobileNumber whatsappNumber"
//       );

//       if (!freshOrder) return;

//       try {
//         await sendMdApprovedToSalesPersonAndAdminWhatsapp(freshOrder);

//         await addHistoryAndSave(
//           freshOrder,
//           "whatsapp_sent",
//           "MD Sir approval WhatsApp sent to salesperson and Sonia from old email link"
//         );
//       } catch (waError) {
//         console.log("EMAIL LINK MD APPROVAL WHATSAPP ERROR =>", waError.message);

//         await addHistoryAndSave(
//           freshOrder,
//           "failed",
//           `Email link MD approval WhatsApp failed: ${waError.message}`
//         );
//       }
//     });
//   });

//   return approvedOrder;
// };

// const rejectSalesOrderFromEmail = async (
//   salesOrderId,
//   token,
//   rejectionComment
// ) => {
//   const salesOrder = await SalesOrder.findById(salesOrderId).populate(
//     "salesPersonId",
//     "name email mobileNumber whatsappNumber"
//   );

//   if (!salesOrder) {
//     throw new Error("Sales order not found");
//   }

//   if (salesOrder.approvalStatus !== "pending_manager_approval") {
//     throw new Error("Sales order is not pending md sir approval");
//   }

//   if (salesOrder.managerEmailApproval?.token !== token) {
//     throw new Error("Invalid rejection link");
//   }

//   const rejectedOrder = await finalApprovalService.holdSalesOrderByMd(
//     salesOrder,
//     rejectionComment,
//     {
//       managerName: "MD Sir",
//       managerEmail: process.env.MANAGER_EMAIL,
//       managerId: null,
//     },
//     "email"
//   );

//   await safeCreateNotification({
//     module: "sales_order",
//     event: "manager_rejected",
//     title: "Sales Order Put on Hold by MD Sir",
//     message: `${rejectedOrder.companyName} sales order was put on hold by MD Sir`,
//     priority: "urgent",
//     targetUserIds: [rejectedOrder.salesPersonId || salesOrder.salesPersonId],
//     targetRoles: ["admin"],
//     createdBy: null,
//     referenceId: rejectedOrder._id,
//     referenceModel: "SalesOrder",
//     actionUrl: "/dashboard#sales-order",
//     meta: {
//       companyName: rejectedOrder.companyName,
//       poNumber: rejectedOrder.poNumber,
//       rejectionComment,
//       managerName: "MD Sir",
//       source: "email_link",
//     },
//   });

//   setImmediate(() => {
//     enqueueWhatsapp(async () => {
//       const freshOrder = await SalesOrder.findById(rejectedOrder._id).populate(
//         "salesPersonId",
//         "name email mobileNumber whatsappNumber"
//       );

//       if (!freshOrder) return;

//       try {
//         await sendMdHoldToSalesPersonAndAdminWhatsapp(
//           freshOrder,
//           rejectionComment
//         );

//         await addHistoryAndSave(
//           freshOrder,
//           "whatsapp_sent",
//           "MD Sir hold WhatsApp sent to salesperson and Sonia from old email link"
//         );
//       } catch (waError) {
//         console.log("EMAIL LINK MD HOLD WHATSAPP ERROR =>", waError.message);

//         await addHistoryAndSave(
//           freshOrder,
//           "failed",
//           `Email link MD hold WhatsApp failed: ${waError.message}`
//         );
//       }
//     });
//   });

//   return rejectedOrder;
// };

module.exports = {
  createSalesOrder,
  generateSalesOrderPdfById,
  getAllSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  approveSalesOrderByAdmin,
  rejectSalesOrderByAdmin,
  approveSalesOrderByManager,
  rejectSalesOrderByManager,
  updatePdfDetails,
  updateWhatsappGroupStatus,
  deleteSalesOrder,
  // approveSalesOrderFromEmail,
  // rejectSalesOrderFromEmail,
};