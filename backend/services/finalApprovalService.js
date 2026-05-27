const emailService = require("./emailService");
const pdfService = require("./pdfService");
const whatsappApprovalService = require("./whatsappApprovalService");

const { initWhatsappClient } = require("../util/whatsappClient");

const fixApprovalHistoryRoles = (salesOrder) => {
  salesOrder.approvalHistory = (salesOrder.approvalHistory || []).map((item) => {
    const plain = item?.toObject ? item.toObject() : item;

    return {
      ...plain,
      role: plain.role || "system",
    };
  });
};

const safeSaveSalesOrder = async (salesOrder) => {
  fixApprovalHistoryRoles(salesOrder);
  return await salesOrder.save();
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

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  if (salesOrder.approvalStatus !== "pending_manager_approval") {
    throw new Error("Sales order is not pending MD Sir approval");
  }

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

  if (source === "email") {
    salesOrder.managerEmailApproval.approvedByEmailLinkAt = new Date();
  }

  if (source === "whatsapp") {
    salesOrder.managerEmailApproval.approvedByWhatsappLinkAt = new Date();
  }

  salesOrder.approvalHistory.push({
    actionBy: managerData.managerId || undefined,
    role: "manager",
    action: "manager_approved",
    comment: `Sales order approved by MD Sir from ${source}`,
  });

  await safeSaveSalesOrder(salesOrder);

  try {
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

    await safeSaveSalesOrder(salesOrder);
  } catch (pdfError) {
    console.log("PDF GENERATION FAILED =>", pdfError.message);

    salesOrder.approvalHistory.push({
      role: "system",
      action: "failed",
      comment: `PDF generation failed: ${pdfError.message}`,
    });

    await safeSaveSalesOrder(salesOrder);
    throw pdfError;
  }

  try {
    const emailResult = await emailService.sendSalesOrderApprovedEmail(
      salesOrder,
      "MD Sir"
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
      comment: "Final approval email sent to salesperson",
    });

    await safeSaveSalesOrder(salesOrder);
  } catch (emailError) {
    console.log("FINAL APPROVAL EMAIL ERROR =>", emailError.message);

    salesOrder.approvalHistory.push({
      role: "system",
      action: "failed",
      comment: `Final approval email failed: ${emailError.message}`,
    });

    await safeSaveSalesOrder(salesOrder);
  }

  try {
    console.log("RESUMING WHATSAPP AFTER PDF GENERATION...");
    initWhatsappClient();

    await new Promise((resolve) => setTimeout(resolve, 15000));

    await whatsappApprovalService.sendFinalPdfToSalesGroup(salesOrder);

    salesOrder.whatsappGroupStatus = {
      ...salesOrder.whatsappGroupStatus,
      sent: true,
      sentAt: new Date(),
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
      errorMessage: waError.message,
    };

    salesOrder.approvalHistory.push({
      role: "system",
      action: "failed",
      comment: `WhatsApp group PDF sending failed: ${waError.message}`,
    });

    await safeSaveSalesOrder(salesOrder);
  }

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
  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  if (salesOrder.approvalStatus !== "pending_manager_approval") {
    throw new Error("Sales order is not pending MD Sir approval");
  }

  if (!rejectionComment || !rejectionComment.trim()) {
    throw new Error("Hold comment is required");
  }

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

  if (source === "email") {
    salesOrder.managerEmailApproval.rejectedByEmailLinkAt = new Date();
  }

  if (source === "whatsapp") {
    salesOrder.managerEmailApproval.rejectedByWhatsappLinkAt = new Date();
  }

  salesOrder.approvalHistory.push({
    actionBy: managerData.managerId || undefined,
    role: "manager",
    action: "manager_rejected",
    comment: rejectionComment.trim(),
  });

  await safeSaveSalesOrder(salesOrder);

  try {
    const emailResult = await emailService.sendSalesOrderRejectedEmail(
      salesOrder,
      rejectionComment.trim()
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
      comment: "Hold email sent to salesperson",
    });

    await safeSaveSalesOrder(salesOrder);
  } catch (emailError) {
    console.log("HOLD EMAIL ERROR =>", emailError.message);

    salesOrder.approvalHistory.push({
      role: "system",
      action: "failed",
      comment: `Hold email failed: ${emailError.message}`,
    });

    await safeSaveSalesOrder(salesOrder);
  }

  return salesOrder;
};

module.exports = {
  finalApproveSalesOrder,
  holdSalesOrderByMd,
};