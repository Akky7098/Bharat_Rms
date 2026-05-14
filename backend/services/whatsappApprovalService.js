const fs = require("fs");
const path = require("path");
const {
  getWhatsappClient,
  isWhatsappReady,
  MessageMedia,
} = require("../util/whatsappClient");

const getBaseUrl = () => {
  const baseUrl = (
    process.env.BACKEND_URL || "http://localhost:5000"
  ).replace(/\/$/, "");

  console.log("BASE URL =>", baseUrl);

  return baseUrl;
};

const getOrderRef = (salesOrder) => {
  return (
    salesOrder.poNumber ||
    salesOrder.checklistNumber ||
    String(salesOrder._id).slice(-6)
  );
};

const getFullPdfLink = (fileUrl) => {
  if (!fileUrl) {
    console.log("NO PDF FILE URL FOUND");
    return "";
  }

  const cleanFileUrl = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  const fullUrl = `${getBaseUrl()}${cleanFileUrl}`;

  console.log("FULL PDF URL =>", fullUrl);

  return fullUrl;
};

const getPdfFileUrl = (salesOrder) => {
  const fileUrl =
    salesOrder.finalSalesOrderPackage?.fileUrl ||
    salesOrder.pdf?.fileUrl ||
    salesOrder.preShipmentInspectionPdf?.fileUrl ||
    "";

  console.log("RAW PDF FILE URL FROM DB =>", fileUrl);

  return fileUrl;
};

const getPdfFilePath = (salesOrder) => {
  const filePath =
    salesOrder.finalSalesOrderPackage?.filePath ||
    salesOrder.pdf?.filePath ||
    salesOrder.preShipmentInspectionPdf?.filePath ||
    "";

  console.log("RAW PDF FILE PATH FROM DB =>", filePath);

  return filePath;
};

const getSafeFilePath = (filePath) => {
  if (!filePath) {
    console.log("EMPTY FILE PATH");
    return "";
  }

  if (path.isAbsolute(filePath)) {
    console.log("ABSOLUTE FILE PATH =>", filePath);
    return filePath;
  }

  const resolvedPath = path.join(__dirname, "..", filePath);

  console.log("RESOLVED FILE PATH =>", resolvedPath);

  return resolvedPath;
};

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-IN");
};

const buildMdApprovalMessage = (salesOrder) => {
  console.log("BUILDING MD WHATSAPP MESSAGE");

  const orderRef = getOrderRef(salesOrder);
  const pdfLink = getFullPdfLink(getPdfFileUrl(salesOrder));

  const shortPdfLink = `${getBaseUrl()}/api/whatsapp-approval/pdf/${
  salesOrder._id
}/${salesOrder.managerEmailApproval.token}`;

const approveLink = `${getBaseUrl()}/api/whatsapp-approval/approve/${
  salesOrder._id
}/${salesOrder.managerEmailApproval.token}`;

const holdLink = `${getBaseUrl()}/api/whatsapp-approval/hold-form/${
  salesOrder._id
}/${salesOrder.managerEmailApproval.token}`;

  console.log("APPROVE LINK =>", approveLink);
  console.log("HOLD LINK =>", holdLink);

  return `*Bharat Special Steel*

*Sales Order Approval Required*

*Company:* ${salesOrder.companyName || "-"}
*Sales Person:* ${salesOrder.salesPersonName || "-"}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Value:* Rs. ${formatCurrency(salesOrder.orderValue)}

📄 *Open Sales Order PDF:*
${shortPdfLink}

✅ *Approve Sales Order:*
${approveLink}

⏸ *Put On Hold / Revise:*
${holdLink}`;
};

const sendMdApprovalWhatsapp = async (salesOrder) => {
  console.log("===== MD WHATSAPP SEND START =====");

  if (!process.env.MD_WHATSAPP_NUMBER) {
    throw new Error("MD_WHATSAPP_NUMBER missing in env");
  }

  console.log("MD NUMBER =>", process.env.MD_WHATSAPP_NUMBER);

  const ready = await isWhatsappReady();

  console.log("WHATSAPP READY STATUS =>", ready);

  if (!ready) {
    throw new Error("WhatsApp client is not ready.");
  }

  const client = getWhatsappClient();
  const mdChatId = `${process.env.MD_WHATSAPP_NUMBER}@c.us`;

  console.log("MD CHAT ID =>", mdChatId);

  const message = buildMdApprovalMessage(salesOrder);

  console.log("SENDING MD MESSAGE...");

  await client.sendMessage(mdChatId, message);

  console.log("MD WHATSAPP SENT SUCCESS");

  return true;
};

const sendFinalPdfToSalesGroup = async (salesOrder) => {
  console.log("===== GROUP PDF SEND START =====");

  if (!process.env.SALES_WHATSAPP_GROUP_ID) {
    throw new Error("SALES_WHATSAPP_GROUP_ID missing in env");
  }

  console.log("GROUP ID =>", process.env.SALES_WHATSAPP_GROUP_ID);

  const ready = await isWhatsappReady();

  console.log("WHATSAPP READY STATUS =>", ready);

  if (!ready) {
    throw new Error("WhatsApp client is not ready.");
  }

  const client = getWhatsappClient();

  const rawPdfPath = getPdfFilePath(salesOrder);
  const pdfFilePath = getSafeFilePath(rawPdfPath);
  const pdfLink = getFullPdfLink(getPdfFileUrl(salesOrder));

  console.log("FINAL PDF PATH =>", pdfFilePath);
  console.log("PDF EXISTS =>", fs.existsSync(pdfFilePath));

  const caption = `*Bharat Special Steel*

✅ *Sales Order Approved by MD Sir*

*Company:* ${salesOrder.companyName || "-"}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Value:* Rs. ${formatCurrency(salesOrder.orderValue)}

Dispatch / Billing team may proceed.`;

  if (pdfFilePath && fs.existsSync(pdfFilePath)) {
    console.log("SENDING PDF FILE TO GROUP...");

    const media = MessageMedia.fromFilePath(pdfFilePath);

    await client.sendMessage(process.env.SALES_WHATSAPP_GROUP_ID, media, {
      caption,
    });

    console.log("GROUP PDF SENT SUCCESS");

    return true;
  }

  console.log("PDF FILE NOT FOUND, SENDING LINK INSTEAD");

  await client.sendMessage(
    process.env.SALES_WHATSAPP_GROUP_ID,
    `${caption}\n\n📄 PDF Link:\n${pdfLink || "-"}`
  );

  console.log("GROUP LINK SENT SUCCESS");

  return true;
};

module.exports = {
  sendMdApprovalWhatsapp,
  sendFinalPdfToSalesGroup,
};