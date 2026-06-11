const whatsappApprovalService = require("./whatsappApprovalService");

const getBaseUrl = () => {
  return "https://dashboard.bharatspecialsteels.com";
};

const cleanNumber = (number = "") => {
  return String(number || "").replace(/\D/g, "");
};

const toChatId = (number = "") => {
  const cleaned = cleanNumber(number);
  if (!cleaned) return null;

  if (cleaned.length === 10) return `91${cleaned}@c.us`;
  return `${cleaned}@c.us`;
};

const formatCurrency = (value = 0) => {
  return Number(value || 0).toLocaleString("en-IN");
};

const getPdfLink = (salesOrder) => {
  if (!salesOrder?.pdf?.fileUrl) return "";
  const baseUrl = process.env.BACKEND_URL || "";
  const fileUrl = salesOrder.pdf.fileUrl.startsWith("/")
    ? salesOrder.pdf.fileUrl
    : `/${salesOrder.pdf.fileUrl}`;

  return `${baseUrl.replace(/\/$/, "")}${fileUrl}`;
};

const getDashboardLink = () => {
  const baseUrl = getBaseUrl();
  return baseUrl ? `${baseUrl}/dashboard#sales-order` : "";
};

const buildOrderBlock = (salesOrder) => {
  return `🏢 *Company:* ${salesOrder.companyName || "-"}
👤 *Sales Person:* ${salesOrder.salesPersonName || "-"}
📄 *PO No:* ${salesOrder.poNumber || "-"}
🧾 *Checklist:* ${salesOrder.checklistNumber || "-"}
💰 *Order Value:* ₹${formatCurrency(salesOrder.orderValue)}
📌 *Status:* ${String(salesOrder.approvalStatus || "-").replaceAll("_", " ")}

📦 *Material / Grade / Qty / Rate:*
${salesOrder.sizeGradeQuantityRate || "-"}`;
};

const sendToNumber = async (number, message) => {
  const chatId = toChatId(number);

  if (!chatId) {
    throw new Error("WhatsApp number missing");
  }

  return whatsappApprovalService.sendPlainWhatsappMessage(chatId, message);
};

const sendToSalesPerson = async (salesOrder, message) => {
  const number =
    salesOrder.salesPersonWhatsappNumber ||
    salesOrder.salesPersonMobile ||
    salesOrder.salesPersonId?.whatsappNumber ||
    salesOrder.salesPersonId?.mobileNumber;

  return sendToNumber(number, message);
};

const sendSalesOrderCreatedToAdminWhatsapp = async (salesOrder) => {
  if (!process.env.ADMIN_WHATSAPP_NUMBER) {
    throw new Error("ADMIN_WHATSAPP_NUMBER missing in env");
  }

  const message = `🚨 *New Sales Order Created*

Sonia ji, a new Sales Order is pending for your checking.

${buildOrderBlock(salesOrder)}

✅ Please approve or put on hold from Bharat RMS dashboard.
${getDashboardLink()}`;

  return sendToNumber(process.env.ADMIN_WHATSAPP_NUMBER, message);
};

const sendAdminApprovedToSalesPersonWhatsapp = async (salesOrder) => {
  const message = `✅ *Sales Order Checked by Sonia*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order has been checked by Sonia ji and sent to *MD Sir* for final approval.

${buildOrderBlock(salesOrder)}

⏳ Current Status: Pending MD Sir Approval`;

  return sendToSalesPerson(salesOrder, message);
};

const sendAdminHoldToSalesPersonWhatsapp = async (salesOrder, reason) => {
  const message = `⛔ *Sales Order Put On Hold by Sonia*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order has been put on hold by Sonia ji.

${buildOrderBlock(salesOrder)}

📝 *Reason:*
${reason || "-"}

Please revise and resubmit from Bharat RMS.`;

  return sendToSalesPerson(salesOrder, message);
};

const sendMdApprovedWhatsapp = async (salesOrder) => {
  const pdfLink = getPdfLink(salesOrder);

  const userMessage = `🎉 *Sales Order Finally Approved by MD Sir*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

Your Sales Order is now fully approved.

${buildOrderBlock(salesOrder)}

${pdfLink ? `📎 *PDF:* ${pdfLink}` : ""}

You can proceed with the next process.`;

  await sendToSalesPerson(salesOrder, userMessage);

  if (process.env.ADMIN_WHATSAPP_NUMBER) {
    const adminMessage = `✅ *MD Sir Approved Sales Order*

${buildOrderBlock(salesOrder)}

${pdfLink ? `📎 *PDF:* ${pdfLink}` : ""}`;

    await sendToNumber(process.env.ADMIN_WHATSAPP_NUMBER, adminMessage);
  }
};

const sendMdHoldWhatsapp = async (salesOrder, reason) => {
  const userMessage = `⛔ *Sales Order Put On Hold by MD Sir*

Hello *${salesOrder.salesPersonName || "Sales Team"}*,

MD Sir has put your Sales Order on hold.

${buildOrderBlock(salesOrder)}

📝 *MD Sir Reason:*
${reason || "-"}

Please revise and resubmit from Bharat RMS.`;

  await sendToSalesPerson(salesOrder, userMessage);

  if (process.env.ADMIN_WHATSAPP_NUMBER) {
    const adminMessage = `⚠️ *MD Sir Put Sales Order On Hold*

${buildOrderBlock(salesOrder)}

📝 *Reason:*
${reason || "-"}

Please coordinate with the salesperson.`;

    await sendToNumber(process.env.ADMIN_WHATSAPP_NUMBER, adminMessage);
  }
};

module.exports = {
  sendSalesOrderCreatedToAdminWhatsapp,
  sendAdminApprovedToSalesPersonWhatsapp,
  sendAdminHoldToSalesPersonWhatsapp,
  sendMdApprovedWhatsapp,
  sendMdHoldWhatsapp,
};