// const mongoose = require("mongoose");
// const SalesOrder = require("../model/salesOrderModel");
// const productGrades = require("../constants/productGrades");

// const isValidEmail = (email) => {
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// };

// const cleanAdditionalEmails = (additionalEmails = []) => {
//   if (!Array.isArray(additionalEmails)) return [];

//   return additionalEmails
//     .map((email) => String(email).trim().toLowerCase())
//     .filter(Boolean);
// };

// const createSalesOrder = async (body, user) => {
//   const {
//     orderDate,
//     companyName,
//     location,
//     contactPersonName,
//     contactPersonNumber,
//     contactPersonEmailId,
//     additionalEmails = [],
//     productCategory,
//     grade,
//     size,
//     quantityInKg,
//     valueInRupees,
//     paymentTerms,
//   } = body;

//   if (!Object.prototype.hasOwnProperty.call(productGrades, productCategory)) {
//     throw new Error("Invalid product category");
//   }

//   if (!grade || !String(grade).trim()) {
//     throw new Error("Grade is required");
//   }

//   if (
//     productCategory !== "other" &&
//     !productGrades[productCategory].includes(grade)
//   ) {
//     throw new Error("Invalid grade selected for this product category");
//   }

//   const qty = Number(quantityInKg);
//   const value = Number(valueInRupees);

//   if (!qty || qty <= 0) {
//     throw new Error("Quantity must be greater than 0");
//   }

//   if (!value || value <= 0) {
//     throw new Error("Order value must be greater than 0");
//   }

//   const cleanedAdditionalEmails = cleanAdditionalEmails(additionalEmails);

//   for (const email of cleanedAdditionalEmails) {
//     if (!isValidEmail(email)) {
//       throw new Error(`Invalid additional email: ${email}`);
//     }
//   }

//   const ratePerKg = Number((value / qty).toFixed(2));

//   const salesOrder = await SalesOrder.create({
//     salesPersonId: user.id,

//     orderDate,
//     companyName,
//     location,
//     contactPersonName,
//     contactPersonNumber,
//     contactPersonEmailId,
//     additionalEmails: cleanedAdditionalEmails,

//     productCategory,
//     grade: String(grade).trim(),
//     size,

//     quantityInKg: qty,
//     valueInRupees: value,
//     ratePerKg,

//     paymentTerms,

//     totalDispatchedQty: 0,
//     pendingDispatchQty: qty,
//     orderStatus: "pending_dispatch",
//   });

//   return salesOrder;
// };

// const getAllSalesOrders = async (query, user) => {
//   const {
//     page = 1,
//     limit = 10,
//     salesPersonId,
//     companyName,
//     productCategory,
//     grade,
//     fromDate,
//     toDate,
//   } = query;

//   const filter = {};

//   if (user.role === "admin" || user.role === "super_admin") {
//     if (salesPersonId) {
//       filter.salesPersonId = new mongoose.Types.ObjectId(salesPersonId);
//     }
//   } else {
//     filter.salesPersonId = new mongoose.Types.ObjectId(user.id);
//   }

//   if (companyName) {
//     filter.companyName = { $regex: companyName, $options: "i" };
//   }

//   if (productCategory) {
//     filter.productCategory = productCategory;
//   }

//   if (grade) {
//     filter.grade = grade;
//   }

//   if (fromDate || toDate) {
//     filter.orderDate = {};

//     if (fromDate) {
//       filter.orderDate.$gte = new Date(fromDate);
//     }

//     if (toDate) {
//       const endDate = new Date(toDate);
//       endDate.setHours(23, 59, 59, 999);
//       filter.orderDate.$lte = endDate;
//     }
//   }

//   const skip = (Number(page) - 1) * Number(limit);

//   const totalRecords = await SalesOrder.countDocuments(filter);

//   const salesOrders = await SalesOrder.aggregate([
//     { $match: filter },

//     {
//       $lookup: {
//         from: "users",
//         localField: "salesPersonId",
//         foreignField: "_id",
//         as: "salesPersonId",
//       },
//     },
//     {
//       $unwind: {
//         path: "$salesPersonId",
//         preserveNullAndEmptyArrays: true,
//       },
//     },

//     {
//       $lookup: {
//         from: "dispatches",
//         localField: "_id",
//         foreignField: "salesOrderId",
//         as: "dispatchDetails",
//       },
//     },

//     {
//       $addFields: {
//         dispatchCount: { $size: "$dispatchDetails" },
//       },
//     },

//     { $sort: { orderDate: -1, createdAt: -1 } },
//     { $skip: skip },
//     { $limit: Number(limit) },

//     {
//       $project: {
//         orderDate: 1,
//         companyName: 1,
//         location: 1,
//         contactPersonName: 1,
//         contactPersonNumber: 1,
//         contactPersonEmailId: 1,
//         additionalEmails: 1,
//         productCategory: 1,
//         grade: 1,
//         size: 1,
//         quantityInKg: 1,
//         valueInRupees: 1,
//         ratePerKg: 1,
//         paymentTerms: 1,

//         totalDispatchedQty: 1,
//         pendingDispatchQty: 1,
//         orderStatus: 1,
//         dispatchCount: 1,
//         dispatchDetails: 1,

//         createdAt: 1,
//         updatedAt: 1,

//         "salesPersonId._id": 1,
//         "salesPersonId.name": 1,
//         "salesPersonId.email": 1,
//         "salesPersonId.role": 1,
//       },
//     },
//   ]);

//   return {
//     salesOrders,
//     pagination: {
//       totalRecords,
//       currentPage: Number(page),
//       totalPages: Math.ceil(totalRecords / Number(limit)),
//       limit: Number(limit),
//     },
//   };
// };
// const escapeRegex = (text = "") => {
//   return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// };

// const searchPendingDispatchSalesOrders = async (query, user) => {
//   const { search = "", limit = 20 } = query;

//   const keyword = String(search || "")
//     .trim()
//     .replace(/\s+/g, " ");

//   const safeLimit = Math.min(Number(limit) || 20, 50);

//   const filter = {};

//   /* ROLE FILTER */
//   if (
//     user.role !== "admin" &&
//     user.role !== "super_admin" &&
//     user.role !== "dispatch"
//   ) {
//     filter.salesPersonId = user.id;
//   }

//   /* COMPANY NAME START-WITH SEARCH ONLY */
//   if (keyword) {
//     filter.companyName = {
//       $regex: "^" + escapeRegex(keyword),
//       $options: "i",
//     };
//   }

//   const salesOrders = await SalesOrder.find(filter)
//     .populate("salesPersonId", "name email role")
//     .sort({
//       companyName: 1,
//       createdAt: -1,
//     })
//     .limit(safeLimit)
//     .select(
//       `
//       orderDate
//       companyName
//       location
//       contactPersonName
//       contactPersonNumber
//       contactPersonEmailId
//       additionalEmails
//       productCategory
//       grade
//       size
//       quantityInKg
//       valueInRupees
//       ratePerKg
//       paymentTerms
//       totalDispatchedQty
//       pendingDispatchQty
//       orderStatus
//       salesPersonId
//       createdAt
//       updatedAt
//       `
//     )
//     .lean();

//   const formatted = salesOrders.map((item) => {
//     const totalQty = Number(item.quantityInKg || 0);
//     const dispatchedQty = Number(item.totalDispatchedQty || 0);

//     let pendingQty = totalQty;

//     /* OLD DATA SUPPORT */
//     if (totalQty <= 0) {
//       pendingQty = item.pendingDispatchQty
//         ? Number(item.pendingDispatchQty)
//         : 1;
//     }

//     /* NEW DATA SUPPORT */
//     if (
//       item.pendingDispatchQty !== undefined &&
//       item.pendingDispatchQty !== null
//     ) {
//       pendingQty = Number(item.pendingDispatchQty || 0);
//     }

//     /* PARTIAL DISPATCH SUPPORT */
//     if (
//       (item.pendingDispatchQty === undefined ||
//         item.pendingDispatchQty === null) &&
//       dispatchedQty > 0 &&
//       totalQty > 0
//     ) {
//       pendingQty = totalQty - dispatchedQty;
//     }

//     const finalStatus =
//       item.orderStatus ||
//       (pendingQty <= 0
//         ? "fully_dispatched"
//         : dispatchedQty > 0
//         ? "partial_dispatch"
//         : "pending_dispatch");

//     return {
//       ...item,
//       totalDispatchedQty: dispatchedQty,
//       pendingDispatchQty: Math.max(Number(pendingQty || 0), 0),
//       orderStatus: finalStatus,
//     };
//   });

//   return formatted.filter((item) => {
//     return item.orderStatus !== "fully_dispatched";
//   });
// };
// module.exports = {
//   createSalesOrder,
//   getAllSalesOrders,
//   searchPendingDispatchSalesOrders,
// };



const SalesOrder = require("../model/salesOrderModel");
const pdfService = require("./pdfService");
const whatsappService = require("./whatsappService");
const emailService = require("./emailService");
const mongoose = require("mongoose");
// ========================================
// CREATE SALES ORDER
// ========================================
const createSalesOrder = async (
  payload,
  loggedInUser,
  uploadedPOFile
) => {
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
      limit = 10,
      salesPersonId,
      fromDate,
      toDate,
      approvalStatus,
      customerType,
      companyName,
      poNumber,
    } = query;

    const filter = {};

    // ROLE FILTER
    if (user.role === "admin" || user.role === "super_admin") {
      if (salesPersonId) {
        filter.salesPersonId = new mongoose.Types.ObjectId(
          salesPersonId
        );
      }
    } else {
      filter.salesPersonId = new mongoose.Types.ObjectId(user.id);
    }

    // STATUS
    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    // CUSTOMER TYPE
    if (customerType) {
      filter.customerType = customerType;
    }

    // COMPANY SEARCH
    if (companyName) {
      filter.companyName = {
        $regex: companyName,
        $options: "i",
      };
    }

    // PO SEARCH
    if (poNumber) {
      filter.poNumber = {
        $regex: poNumber,
        $options: "i",
      };
    }

    // DATE FILTER
    if (fromDate || toDate) {
      filter.orderDate = {};

      if (fromDate) {
        filter.orderDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.orderDate.$lte = endDate;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const totalRecords =
      await SalesOrder.countDocuments(filter);

    const salesOrders = await SalesOrder.aggregate([
      {
        $match: filter,
      },

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
        $sort: {
          createdAt: -1,
        },
      },

      {
        $skip: skip,
      },

      {
        $limit: Number(limit),
      },

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
          orderValue: 1,

          sizeGradeQuantityRate: 1,
          supplyCondition: 1,
          cutLengthRequired: 1,
          cuttingCost: 1,
          freight: 1,
          tolerance: 1,
          deliveryTime: 1,
          endUseOfCustomer: 1,
          approvalStatus: 1,
          isEditableBySalesPerson: 1,

          contactPersonName: 1,
          contactPersonNumber: 1,
          contactPersonEmailId: 1,

          pdf: 1,
          finalSalesOrderPackage: 1,
          preShipmentInspectionPdf: 1,
          customerPOFile: 1,

          managerApproval: 1,
          adminApproval: 1,

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
        totalPages: Math.ceil(
          totalRecords / Number(limit)
        ),
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
  loggedInUser
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    // ALLOW EDIT ONLY WHEN REJECTED
    if (!salesOrder.isEditableBySalesPerson) {
      throw new Error(
        "Sales order cannot be edited right now"
      );
    }

    Object.assign(salesOrder, payload);

    salesOrder.revisionCount += 1;

    salesOrder.lastSubmittedAt = new Date();

    salesOrder.approvalStatus =
      "pending_admin_review";

    salesOrder.isEditableBySalesPerson = false;

    salesOrder.approvalHistory.push({
      actionBy: loggedInUser._id,
      role: "salesperson",
      action: "resubmitted",
      comment: "Sales order updated and resubmitted",
    });

    const updatedOrder = await salesOrder.save();

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ========================================
// ADMIN APPROVE
// ========================================
const crypto = require("crypto");

// ========================================
// ADMIN APPROVE
// ========================================
// ========================================
// ADMIN APPROVE
// ========================================
const approveSalesOrderByAdmin = async (
  salesOrderId,
  loggedInAdmin
) => {
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
      comment:
        "Sales order approved by admin and sent for manager approval",
    });

    await salesOrder.save();

    // 1. Mail to salesperson
    try {
      await emailService.sendSalesOrderApprovedEmail(
        salesOrder,
        "Admin. It is now sent for manager approval"
      );

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "Admin approval notification sent to salesperson",
      });

      await salesOrder.save();
    } catch (emailError) {
      console.log(
        "SALESPERSON ADMIN APPROVAL EMAIL ERROR =>",
        emailError.message
      );

      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Salesperson admin approval email failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

    // 2. Mail to manager with approve/reject buttons
    try {
      await emailService.sendManagerApprovalRequestEmail(salesOrder);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment: "Manager approval request email sent",
      });

      await salesOrder.save();
    } catch (emailError) {
      console.log(
        "MANAGER APPROVAL REQUEST EMAIL ERROR =>",
        emailError.message
      );

      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Manager approval request email failed: ${emailError.message}`,
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

    try {
      await emailService.sendSalesOrderRejectedEmail(
        salesOrder,
        rejectionComment
      );

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
const approveSalesOrderByManager = async (
  salesOrderId,
  managerData
) => {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    if (salesOrder.approvalStatus !== "pending_manager_approval") {
      throw new Error("Sales order is not pending manager approval");
    }

    salesOrder.approvalStatus = "approved";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.managerApproval.approvedAt = new Date();
    salesOrder.managerApproval.managerId = managerData.managerId;
    salesOrder.managerApproval.managerName = managerData.managerName;
    salesOrder.managerApproval.managerEmail = managerData.managerEmail;

    // final checked by manager
    salesOrder.checkedByAdminName = managerData.managerName;

    salesOrder.approvalHistory.push({
      actionBy: managerData.managerId,
      role: "manager",
      action: "manager_approved",
      comment: "Sales order approved by manager",
    });

    await salesOrder.save();

    const pdfDetails = await pdfService.generateSalesOrderPdf(salesOrder);

    salesOrder.pdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: "Final approved PDF generated",
    });

    await salesOrder.save();

    try {
      const emailResult =
        await emailService.sendSalesOrderApprovedEmail(
          salesOrder,
          managerData.managerName
        );

      salesOrder.emailStatus = {
        sent: true,
        sentAt: new Date(),
        sentTo: [salesOrder.salesPersonEmail],
        ccTo: [
          salesOrder.adminApproval?.adminEmail,
          salesOrder.managerApproval?.managerEmail,
        ].filter(Boolean),
        messageId: emailResult?.messageId,
      };

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment:
          "Approval email sent to salesperson with admin and manager in CC",
      });

      await salesOrder.save();
    } catch (emailError) {
      console.log("MANAGER APPROVAL EMAIL ERROR =>", emailError.message);

      salesOrder.approvalHistory.push({
        role: "system",
        action: "failed",
        comment: `Manager approval email failed: ${emailError.message}`,
      });

      await salesOrder.save();
    }

    return salesOrder;
  } catch (error) {
    throw error;
  }
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
      throw new Error("Sales order is not pending manager approval");
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

    const pdfDetails = await pdfService.generateSalesOrderPdf(salesOrder);

    salesOrder.pdf = {
      generated: true,
      fileName: pdfDetails.fileName,
      filePath: pdfDetails.filePath,
      fileUrl: pdfDetails.fileUrl,
      generatedAt: new Date(),
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: "Rejected PDF generated",
    });

    await salesOrder.save();

    try {
      const emailResult =
        await emailService.sendSalesOrderRejectedEmail(
          salesOrder,
          rejectionComment
        );

      salesOrder.emailStatus = {
        sent: true,
        sentAt: new Date(),
        sentTo: [salesOrder.salesPersonEmail],
        ccTo: [
          salesOrder.adminApproval?.adminEmail,
          salesOrder.managerApproval?.managerEmail,
        ].filter(Boolean),
        messageId: emailResult?.messageId,
      };

      salesOrder.approvalHistory.push({
        role: "system",
        action: "email_sent",
        comment:
          "Rejection email sent to salesperson with admin and manager in CC",
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
const updatePdfDetails = async (
  salesOrderId,
  pdfData
) => {
  try {
    const salesOrder = await SalesOrder.findById(
      salesOrderId
    );

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
const updateWhatsappGroupStatus = async (
  salesOrderId,
  whatsappData
) => {
  try {
    const salesOrder = await SalesOrder.findById(
      salesOrderId
    );

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
    const deletedOrder = await SalesOrder.findByIdAndDelete(
      salesOrderId
    );

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
    throw new Error("Sales order is not pending manager approval");
  }

  if (salesOrder.managerEmailApproval?.token !== token) {
    throw new Error("Invalid approval link");
  }

  salesOrder.approvalStatus = "approved";
  salesOrder.isEditableBySalesPerson = false;

  salesOrder.managerApproval.approvedAt = new Date();
  salesOrder.managerApproval.managerName = "Manager";
  salesOrder.managerApproval.managerEmail = process.env.MANAGER_EMAIL;

  salesOrder.managerEmailApproval.approvedByEmailLinkAt = new Date();

  salesOrder.approvalHistory.push({
    role: "manager",
    action: "manager_approved",
    comment: "Sales order approved from email link",
  });

  await salesOrder.save();

  await emailService.sendSalesOrderApprovedEmail(
    salesOrder,
    "Manager"
  );

  return salesOrder;
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
    throw new Error("Sales order is not pending manager approval");
  }

  if (salesOrder.managerEmailApproval?.token !== token) {
    throw new Error("Invalid rejection link");
  }

  salesOrder.approvalStatus = "rejected_by_manager";
  salesOrder.isEditableBySalesPerson = true;

  salesOrder.managerApproval.rejectedAt = new Date();
  salesOrder.managerApproval.managerName = "Manager";
  salesOrder.managerApproval.managerEmail = process.env.MANAGER_EMAIL;
  salesOrder.managerApproval.rejectionComment = rejectionComment;

  salesOrder.managerEmailApproval.rejectedByEmailLinkAt = new Date();

  salesOrder.approvalHistory.push({
    role: "manager",
    action: "manager_rejected",
    comment: rejectionComment,
  });

  await salesOrder.save();

  await emailService.sendSalesOrderRejectedEmail(
    salesOrder,
    rejectionComment
  );

  return salesOrder;
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