//const emailService = require("./emailService");
const pdfService = require("./pdfService");
const whatsappApprovalService = require("./whatsappApprovalService");
const customerOrderTrackingService =
  require(
    "./customerOrderTrackingService"
  );

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
    console.log("FINAL APPROVAL NOTIFICATION ERROR =>", error.message);
  }
};

const fixApprovalHistoryRoles = (salesOrder) => {
  salesOrder.approvalHistory = (salesOrder.approvalHistory || []).map((item) => {
    const plain = item?.toObject ? item.toObject() : item;
    return { ...plain, role: plain.role || "system" };
  });
};

const safeSaveSalesOrder = async (salesOrder) => {
  fixApprovalHistoryRoles(salesOrder);
  return await salesOrder.save();
};

const attachExistingPdfOrGenerate = async (salesOrder, source) => {
  try {
    const existingPdf =
      salesOrder.finalSalesOrderPackage?.generated &&
      salesOrder.finalSalesOrderPackage?.filePath
        ? salesOrder.finalSalesOrderPackage
        : salesOrder.pdf?.generated && salesOrder.pdf?.filePath
        ? salesOrder.pdf
        : null;

    if (existingPdf) {
      salesOrder.pdf = {
        generated: true,
        fileName: existingPdf.fileName,
        filePath: existingPdf.filePath,
        fileUrl: existingPdf.fileUrl,
        generatedAt: existingPdf.generatedAt || new Date(),
      };

      salesOrder.finalSalesOrderPackage = {
        generated: true,
        fileName: existingPdf.fileName,
        filePath: existingPdf.filePath,
        fileUrl: existingPdf.fileUrl,
        generatedAt: existingPdf.generatedAt || new Date(),
      };

      salesOrder.approvalHistory.push({
        role: "system",
        action: "pdf_generated",
        comment: `Existing sales order PDF reused for final approval from ${source}`,
      });

      await safeSaveSalesOrder(salesOrder);
      return true;
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

    salesOrder.approvalHistory.push({
      role: "system",
      action: "pdf_generated",
      comment: `Final approved PDF generated because no existing PDF was found from ${source}`,
    });

    await safeSaveSalesOrder(salesOrder);
    return true;
  } catch (pdfError) {
    console.log("PDF CHECK/GENERATION FAILED =>", pdfError.message);

    salesOrder.approvalHistory.push({
      role: "system",
      action: "failed",
      comment: `PDF check/generation failed: ${pdfError.message}`,
    });

    await safeSaveSalesOrder(salesOrder);
    return false;
  }
};

const runFinalApprovalBackgroundTasks = (SalesOrderModel, salesOrderId, source) => {
  setImmediate(async () => {
    let salesOrder = null;

    try {
      salesOrder = await SalesOrderModel.findById(salesOrderId);

      if (!salesOrder) {
        console.log("FINAL APPROVAL BACKGROUND: Sales order not found");
        return;
      }

      await attachExistingPdfOrGenerate(salesOrder, source);

      // try {
      //   const emailResult = await emailService.sendSalesOrderApprovedEmail(
      //     salesOrder,
      //     "MD Sir"
      //   );

      //   salesOrder.emailStatus = {
      //     sent: true,
      //     sentAt: new Date(),
      //     sentTo: [salesOrder.salesPersonEmail].filter(Boolean),
      //     ccTo: [
      //       salesOrder.adminApproval?.adminEmail,
      //       salesOrder.managerApproval?.managerEmail,
      //     ].filter(Boolean),
      //     messageId: emailResult?.messageId,
      //     errorMessage: "",
      //   };

      //   salesOrder.approvalHistory.push({
      //     role: "system",
      //     action: "email_sent",
      //     comment: "Final approval email sent to salesperson",
      //   });

      //   await safeSaveSalesOrder(salesOrder);
      // } catch (emailError) {
      //   console.log("FINAL APPROVAL EMAIL ERROR =>", emailError.message);

      //   salesOrder.emailStatus = {
      //     ...salesOrder.emailStatus,
      //     sent: false,
      //     errorMessage: emailError.message,
      //   };

      //   salesOrder.approvalHistory.push({
      //     role: "system",
      //     action: "failed",
      //     comment: `Final approval email failed: ${emailError.message}`,
      //   });

      //   await safeSaveSalesOrder(salesOrder);
      // }

      try {
        await whatsappApprovalService.sendFinalPdfToSalesGroup(salesOrder);

        salesOrder.whatsappGroupStatus = {
          ...salesOrder.whatsappGroupStatus,
          sent: true,
          sentAt: new Date(),
          errorMessage: "",
        };

        salesOrder.approvalHistory.push({
          role: "system",
          action: "whatsapp_group_sent",
          comment: "Final approved PDF sent to WhatsApp sales group",
        });

        await safeSaveSalesOrder(salesOrder);
      } catch (waError) {
        console.log("GROUP WHATSAPP ERROR =>", waError.message);

        salesOrder.whatsappGroupStatus = {
          ...salesOrder.whatsappGroupStatus,
          sent: false,
          errorMessage: waError.message,
        };

        salesOrder.approvalHistory.push({
          role: "system",
          action: "failed",
          comment: `WhatsApp group PDF sending failed: ${waError.message}`,
        });

        await safeSaveSalesOrder(salesOrder);
      }
    } catch (error) {
      console.log("FINAL APPROVAL BACKGROUND TASK ERROR =>", error.message);
    }
  });
};

const finalApproveSalesOrder = async (
  salesOrder,
  managerData = {
    managerName: "MD Sir",
    managerEmail: process.env.MANAGER_EMAIL,
    managerId: null,
  },
  source = "dashboard"
) => {
  console.log("===== FINAL APPROVAL SERVICE START =====");
  console.log("FINAL APPROVAL SOURCE =>", source);
  console.log("SALES ORDER ID =>", salesOrder?._id);

  if (!salesOrder) throw new Error("Sales order not found");

  const isDirectMdApproval =
  salesOrder.approvalStatus === "pending_admin_review";

if (
  !["pending_admin_review", "pending_manager_approval"].includes(
    salesOrder.approvalStatus
  )
) {
  throw new Error("Sales order is not pending MD Sir approval");
}

  salesOrder.managerEmailApproval = salesOrder.managerEmailApproval || {};

  salesOrder.approvalStatus = "approved";
  salesOrder.isEditableBySalesPerson = false;

  salesOrder.managerApproval = {
    ...salesOrder.managerApproval,
    approvedAt: new Date(),
    managerId: managerData.managerId || salesOrder.managerApproval?.managerId,
    managerName: managerData.managerName || "MD Sir",
    managerEmail:
      managerData.managerEmail ||
      salesOrder.managerApproval?.managerEmail ||
      process.env.MANAGER_EMAIL,
  };

  salesOrder.checkedByAdminName = managerData.managerName || "MD Sir";

  // if (source === "email") {
  //   salesOrder.managerEmailApproval.approvedByEmailLinkAt = new Date();
  // }

  if (source === "whatsapp") {
    salesOrder.managerEmailApproval.approvedByWhatsappLinkAt = new Date();
  }

  salesOrder.approvalHistory.push({
  actionBy: managerData.managerId || undefined,
  role: "manager",
  action: isDirectMdApproval
    ? "manager_direct_approved"
    : "manager_approved",
  comment: isDirectMdApproval
    ? `MD Sir directly approved sales order from ${source}`
    : `Sales order approved by MD Sir from ${source}`,
});

  await safeSaveSalesOrder(
  salesOrder
);

/* =====================================================
   EXISTING INTERNAL FINAL-APPROVAL TASKS

   PDF + WhatsApp remain exactly as before.
===================================================== */

runFinalApprovalBackgroundTasks(
  salesOrder.constructor,
  salesOrder._id,
  source
);


/* =====================================================
   CUSTOMER ORDER TRACKING

   IMPORTANT:
   Fire-and-forget background task.

   Customer email failure MUST NOT roll back
   MD approval.
===================================================== */

setImmediate(
  async () => {
    try {
      const result =
        await customerOrderTrackingService
          .issueCustomerTrackingAfterApproval({
            salesOrderId:
              salesOrder._id,

            approvedBy: {
              managerId:
                managerData
                  ?.managerId ||
                null,

              managerName:
                managerData
                  ?.managerName ||
                "MD Sir",

              managerEmail:
                managerData
                  ?.managerEmail ||
                "",
            },
          });

      console.log(
        "CUSTOMER TRACKING EMAIL SENT =>",
        salesOrder
          .companyName,
        result
          ?.customerEmail ||
          ""
      );
    } catch (
      error
    ) {
      /*
       * DO NOT THROW.
       *
       * Final Sales Order approval has already completed.
       */
      console.log(
        "CUSTOMER TRACKING BACKGROUND ERROR =>",
        error.message
      );
    }
  }
);


await safeCreateNotification({
    module: "sales_order",
    event: "manager_approved",
    title: "Sales Order Approved by MD Sir",
    message: `${salesOrder.companyName} sales order has been finally approved by MD Sir from ${source}`,
    priority: "high",
    targetUserIds: [salesOrder.salesPersonId],
    targetRoles: ["admin"],
    createdBy: managerData.managerId || null,
    referenceId: salesOrder._id,
    referenceModel: "SalesOrder",
    actionUrl: "/dashboard#sales-order",
    meta: {
      companyName: salesOrder.companyName,
      poNumber: salesOrder.poNumber,
      salesPersonName: salesOrder.salesPersonName,
      source,
    },
  });

  return salesOrder;
};

const holdSalesOrderByMd = async (
  salesOrder,
  rejectionComment,
  managerData = {
    managerName: "MD Sir",
    managerEmail: process.env.MANAGER_EMAIL,
    managerId: null,
  },
  source = "dashboard"
) => {
  if (!salesOrder) throw new Error("Sales order not found");

  const isDirectMdHold =
  salesOrder.approvalStatus === "pending_admin_review";

if (
  !["pending_admin_review", "pending_manager_approval"].includes(
    salesOrder.approvalStatus
  )
) {
  throw new Error("Sales order is not pending MD Sir approval");
}

  if (!rejectionComment || !rejectionComment.trim()) {
    throw new Error("Hold comment is required");
  }

  salesOrder.managerEmailApproval = salesOrder.managerEmailApproval || {};

  salesOrder.approvalStatus = "rejected_by_manager";
  salesOrder.isEditableBySalesPerson = true;
  salesOrder.revisionCount = (salesOrder.revisionCount || 0) + 1;

  salesOrder.managerApproval = {
    ...salesOrder.managerApproval,
    rejectedAt: new Date(),
    managerId: managerData.managerId || salesOrder.managerApproval?.managerId,
    managerName: managerData.managerName || "MD Sir",
    managerEmail:
      managerData.managerEmail ||
      salesOrder.managerApproval?.managerEmail ||
      process.env.MANAGER_EMAIL,
    rejectionComment: rejectionComment.trim(),
  };

  // if (source === "email") {
  //   salesOrder.managerEmailApproval.rejectedByEmailLinkAt = new Date();
  // }

  if (source === "whatsapp") {
    salesOrder.managerEmailApproval.rejectedByWhatsappLinkAt = new Date();
  }

  salesOrder.approvalHistory.push({
  actionBy: managerData.managerId || undefined,
  role: "manager",
  action: isDirectMdHold
    ? "manager_direct_rejected"
    : "manager_rejected",
  comment: rejectionComment.trim(),
});

  await safeSaveSalesOrder(salesOrder);

  // try {
  //   const emailResult = await emailService.sendSalesOrderRejectedEmail(
  //     salesOrder,
  //     rejectionComment.trim()
  //   );

  //   salesOrder.emailStatus = {
  //     sent: true,
  //     sentAt: new Date(),
  //     sentTo: [salesOrder.salesPersonEmail].filter(Boolean),
  //     ccTo: [
  //       salesOrder.adminApproval?.adminEmail,
  //       salesOrder.managerApproval?.managerEmail,
  //     ].filter(Boolean),
  //     messageId: emailResult?.messageId,
  //     errorMessage: "",
  //   };

  //   salesOrder.approvalHistory.push({
  //     role: "system",
  //     action: "email_sent",
  //     comment: "Hold email sent to salesperson",
  //   });

  //   await safeSaveSalesOrder(salesOrder);
  // } catch (emailError) {
  //   console.log("HOLD EMAIL ERROR =>", emailError.message);

  //   salesOrder.emailStatus = {
  //     ...salesOrder.emailStatus,
  //     sent: false,
  //     errorMessage: emailError.message,
  //   };

  //   salesOrder.approvalHistory.push({
  //     role: "system",
  //     action: "failed",
  //     comment: `Hold email failed: ${emailError.message}`,
  //   });

  //   await safeSaveSalesOrder(salesOrder);
  // }

  await safeCreateNotification({
    module: "sales_order",
    event: "manager_rejected",
    title: "Sales Order Put on Hold by MD Sir",
    message: `${salesOrder.companyName} sales order was put on hold by MD Sir from ${source}`,
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
      salesPersonName: salesOrder.salesPersonName,
      rejectionComment: rejectionComment.trim(),
      source,
    },
  });

  return salesOrder;
};

module.exports = {
  finalApproveSalesOrder,
  holdSalesOrderByMd,
};