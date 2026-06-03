const SalesOrder = require("../model/salesOrderModel");
const pdfService = require("./pdfService");
const whatsappApprovalService = require("./whatsappApprovalService");
const emailService = require("./emailService");
const mongoose = require("mongoose");
const finalApprovalService = require("./finalApprovalService");

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
// CREATE SALES ORDER
// ========================================
const createSalesOrder = async (payload, loggedInUser, uploadedPOFile) => {
  try {
    const salesOrder = new SalesOrder({
      ...payload,

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

      approvalHistory: [
        {
          actionBy: loggedInUser._id,
          role: "salesperson",
          action: "created",
          comment: uploadedPOFile
            ? "Sales order created with customer PO file"
            : "Sales order created without customer PO file",
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
      },
    });

    try {
      await emailService.sendSalesOrderCreatedToAdminEmail(savedOrder);

      savedOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "Sales order creation email sent to admin",
      });

      await savedOrder.save();
    } catch (emailError) {
      console.log("SALES ORDER CREATE ADMIN EMAIL ERROR =>", emailError.message);

      savedOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Sales order creation admin email failed: ${emailError.message}`,
      });

      await savedOrder.save();
    }

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

    const filter = {};

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
      { $sort: { createdAt: -1 } },
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
          "checkedByAdminId._id": 1,
          "checkedByAdminId.name": 1,
          "checkedByAdminId.email": 1,
        },
      },
    ]);

    return {
      salesOrders,
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
      .populate("salesPersonId", "name email mobileNumber")
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
  uploadedPOFile
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

    Object.keys(payload).forEach((key) => {
      if (key === "pdf") return;
      if (key === "finalSalesOrderPackage") return;
      if (key === "preShipmentInspectionPdf") return;
      if (key === "customerPOFile") return;
      if (key === "approvalHistory") return;
      if (key === "approvalStatus") return;
      if (key === "isEditableBySalesPerson") return;

      if (payload[key] !== undefined && payload[key] !== null) {
        salesOrder[key] = payload[key];
      }
    });

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
      comment: uploadedPOFile
        ? "Sales order updated with new customer PO file and resubmitted after hold"
        : "Sales order updated and resubmitted after hold",
      actionAt: new Date(),
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
      actionAt: new Date(),
    });

    await updatedOrder.save();

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// ADMIN APPROVE
// ========================================
const crypto = require("crypto");

const approveSalesOrderByAdmin = async (salesOrderId, loggedInAdmin) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    salesOrder.approvalStatus = "pending_manager_approval";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.checkedByAdminId = loggedInAdmin._id;
    salesOrder.checkedByAdminName = loggedInAdmin.name;
    salesOrder.checkedAt = new Date();

    salesOrder.adminApproval = {
      adminId: loggedInAdmin._id,
      adminName: loggedInAdmin.name,
      adminEmail: loggedInAdmin.email,
      approvedAt: new Date(),
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
      comment: "Sales order approved by Manager and sent for MD Sir approval",
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

    try {
      await emailService.sendSalesOrderApprovedEmail(
        salesOrder,
        "Manager. It is now sent for MD Sir approval"
      );

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "Manager approval notification sent to salesperson",
      });

      await salesOrder.save();
    } catch (emailError) {
      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Salesperson email failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

    try {
      await emailService.sendManagerApprovalRequestEmail(salesOrder);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "MD Sir approval request email sent",
      });

      await salesOrder.save();
    } catch (emailError) {
      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `MD email approval request failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

    try {
      await whatsappApprovalService.sendMdApprovalWhatsapp(salesOrder);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "whatsapp_group_sent",
        comment: "WhatsApp approval request sent to MD Sir",
      });

      await salesOrder.save();
    } catch (waError) {
      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `MD WhatsApp request failed: ${waError.message}`,
      });

      await salesOrder.save();
    }

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// ADMIN REJECT
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

    salesOrder.approvalStatus = "rejected_by_admin";
    salesOrder.isEditableBySalesPerson = true;

    salesOrder.adminApproval = {
      adminId: loggedInAdmin._id,
      adminName: loggedInAdmin.name,
      adminEmail: loggedInAdmin.email,
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
      title: "Sales Order Rejected by Admin",
      message: `${salesOrder.companyName} sales order was rejected by ${loggedInAdmin.name}`,
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

    try {
      await emailService.sendSalesOrderRejectedEmail(salesOrder, rejectionComment);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "Admin rejection email sent to salesperson",
      });

      await salesOrder.save();
    } catch (emailError) {
      console.log("ADMIN REJECTION EMAIL ERROR =>", emailError.message);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Admin rejection email failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

    return salesOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// MANAGER APPROVE
// ========================================
const approveSalesOrderByManager = async (salesOrderId, loggedInManager) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  const approvedOrder = await finalApprovalService.finalApproveSalesOrder(
    salesOrder,
    {
      managerId: loggedInManager._id,
      managerName: "MD Sir",
      managerEmail: loggedInManager.email,
    },
    "dashboard"
  );

  // await safeCreateNotification({
  //   module: "sales_order",
  //   event: "manager_approved",
  //   title: "Sales Order Approved by MD Sir",
  //   message: `${approvedOrder.companyName} sales order has been finally approved by MD Sir`,
  //   priority: "high",
  //   targetUserIds: [approvedOrder.salesPersonId || salesOrder.salesPersonId],
  //   targetRoles: ["admin"],
  //   createdBy: loggedInManager._id,
  //   referenceId: approvedOrder._id,
  //   referenceModel: "SalesOrder",
  //   actionUrl: "/dashboard#sales-order",
  //   meta: {
  //     companyName: approvedOrder.companyName,
  //     poNumber: approvedOrder.poNumber,
  //     salesPersonName: approvedOrder.salesPersonName,
  //     managerName: "MD Sir",
  //   },
  // });

  return approvedOrder;
};

// ========================================
// MANAGER REJECT
// ========================================
const rejectSalesOrderByManager = async (
  salesOrderId,
  rejectionComment,
  managerData
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (salesOrder.approvalStatus !== "pending_manager_approval") {
      throw new Error("Sales order is not pending md sir approval");
    }

    salesOrder.approvalStatus = "rejected_by_manager";
    salesOrder.isEditableBySalesPerson = true;

    salesOrder.managerApproval.rejectedAt = new Date();
    salesOrder.managerApproval.managerId = managerData.managerId;
    salesOrder.managerApproval.managerName = managerData.managerName;
    salesOrder.managerApproval.managerEmail = managerData.managerEmail;
    salesOrder.managerApproval.rejectionComment = rejectionComment;

    salesOrder.approvalHistory.push({
      actionBy: managerData.managerId,
      role: "manager",
      action: "manager_rejected",
      comment: rejectionComment,
    });

    await salesOrder.save();

    // await safeCreateNotification({
    //   module: "sales_order",
    //   event: "manager_rejected",
    //   title: "Sales Order Put on Hold by MD Sir",
    //   message: `${salesOrder.companyName} sales order was put on hold by MD Sir`,
    //   priority: "urgent",
    //   targetUserIds: [salesOrder.salesPersonId],
    //   targetRoles: ["admin"],
    //   createdBy: managerData.managerId || null,
    //   referenceId: salesOrder._id,
    //   referenceModel: "SalesOrder",
    //   actionUrl: "/dashboard#sales-order",
    //   meta: {
    //     companyName: salesOrder.companyName,
    //     poNumber: salesOrder.poNumber,
    //     rejectionComment,
    //     managerName: managerData.managerName || "MD Sir",
    //   },
    // });

    try {
      const emailResult = await emailService.sendSalesOrderRejectedEmail(
        salesOrder,
        rejectionComment
      );

      salesOrder.emailStatus = {
        sent: true,
        sentAt: new Date(),
        sentTo: [salesOrder.salesPersonEmail],
        ccTo: [
          "sales@bharatspecialsteels.com",
          salesOrder.managerApproval?.managerEmail,
        ].filter(Boolean),
        messageId: emailResult?.messageId,
      };

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment:
          "Md sir rejection email sent to salesperson with sales and md sir in CC",
      });

      await salesOrder.save();
    } catch (emailError) {
      console.log("MANAGER REJECTION EMAIL ERROR =>", emailError.message);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Manager rejection email failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

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
const deleteSalesOrder = async (salesOrderId) => {
  try {
    const deletedOrder = await SalesOrder.findByIdAndDelete(salesOrderId);

    if (!deletedOrder) {
      throw new Error("Sales order not found");
    }

    return deletedOrder;
  } catch (error) {
    throw error;
  }
};

const approveSalesOrderFromEmail = async (salesOrderId, token) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  if (salesOrder.approvalStatus !== "pending_manager_approval") {
    throw new Error("Sales order is not pending md sir approval");
  }

  if (salesOrder.managerEmailApproval?.token !== token) {
    throw new Error("Invalid approval link");
  }

  const approvedOrder = await finalApprovalService.finalApproveSalesOrder(
    salesOrder,
    {
      managerName: "MD Sir",
      managerEmail: process.env.MANAGER_EMAIL,
      managerId: null,
    },
    "email"
  );

  await safeCreateNotification({
    module: "sales_order",
    event: "manager_approved",
    title: "Sales Order Approved by MD Sir",
    message: `${approvedOrder.companyName} sales order has been finally approved by MD Sir`,
    priority: "high",
    targetUserIds: [approvedOrder.salesPersonId || salesOrder.salesPersonId],
    targetRoles: ["admin"],
    createdBy: null,
    referenceId: approvedOrder._id,
    referenceModel: "SalesOrder",
    actionUrl: "/dashboard#sales-order",
    meta: {
      companyName: approvedOrder.companyName,
      poNumber: approvedOrder.poNumber,
      salesPersonName: approvedOrder.salesPersonName,
      managerName: "MD Sir",
      source: "email",
    },
  });

  return approvedOrder;
};

const rejectSalesOrderFromEmail = async (
  salesOrderId,
  token,
  rejectionComment
) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  if (salesOrder.approvalStatus !== "pending_manager_approval") {
    throw new Error("Sales order is not pending md sir approval");
  }

  if (salesOrder.managerEmailApproval?.token !== token) {
    throw new Error("Invalid rejection link");
  }

  const rejectedOrder = await finalApprovalService.holdSalesOrderByMd(
    salesOrder,
    rejectionComment,
    {
      managerName: "MD Sir",
      managerEmail: process.env.MANAGER_EMAIL,
      managerId: null,
    },
    "email"
  );

  await safeCreateNotification({
    module: "sales_order",
    event: "manager_rejected",
    title: "Sales Order Put on Hold by MD Sir",
    message: `${rejectedOrder.companyName} sales order was put on hold by MD Sir`,
    priority: "urgent",
    targetUserIds: [rejectedOrder.salesPersonId || salesOrder.salesPersonId],
    targetRoles: ["admin"],
    createdBy: null,
    referenceId: rejectedOrder._id,
    referenceModel: "SalesOrder",
    actionUrl: "/dashboard#sales-order",
    meta: {
      companyName: rejectedOrder.companyName,
      poNumber: rejectedOrder.poNumber,
      rejectionComment,
      managerName: "MD Sir",
      source: "email",
    },
  });

  return rejectedOrder;
};

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
  approveSalesOrderFromEmail,
  rejectSalesOrderFromEmail,
};