const fs = require("fs");
const path = require("path");
const runWithChromiumLock = require("../util/chromiumLock");

const {
  getWhatsappClient,
  isWhatsappReady,
  MessageMedia,
} = require("../util/whatsappClient");

const getBaseUrl = () => {
  return (process.env.BACKEND_URL || "http://localhost:5000").replace(
    /\/$/,
    ""
  );
};

const getOrderRef = (salesOrder) => {
  return (
    salesOrder.poNumber ||
    salesOrder.checklistNumber ||
    String(salesOrder._id).slice(-6)
  );
};

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("en-IN");
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getPdfFileUrl = (salesOrder) => {
  return (
    salesOrder.finalSalesOrderPackage?.fileUrl ||
    salesOrder.pdf?.fileUrl ||
    salesOrder.preShipmentInspectionPdf?.fileUrl ||
    ""
  );
};

const getPdfFilePath = (salesOrder) => {
  return (
    salesOrder.finalSalesOrderPackage?.filePath ||
    salesOrder.pdf?.filePath ||
    salesOrder.preShipmentInspectionPdf?.filePath ||
    ""
  );
};

const getFullPdfLink = (fileUrl) => {
  if (!fileUrl) return "";

  const cleanFileUrl = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${getBaseUrl()}${cleanFileUrl}`;
};

const getSafeFilePath = (filePath) => {
  if (!filePath) return "";

  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.join(__dirname, "..", filePath);
};

const sendMdApprovalWhatsapp = async (salesOrder) => {
  return runWithChromiumLock("MD_WHATSAPP_APPROVAL", async () => {
    console.log("===== MD WHATSAPP SEND START =====");

    if (!process.env.MD_WHATSAPP_NUMBER) {
      throw new Error("MD_WHATSAPP_NUMBER missing in env");
    }

    const ready = await isWhatsappReady();

    if (!ready) {
      throw new Error("WhatsApp client is not ready.");
    }

    const client = getWhatsappClient();
    const mdChatId = `${process.env.MD_WHATSAPP_NUMBER}@c.us`;

    const rawPdfPath = getPdfFilePath(salesOrder);
    const pdfFilePath = getSafeFilePath(rawPdfPath);

    const approveLink = `${getBaseUrl()}/api/whatsapp-approval/approve/${
      salesOrder._id
    }/${salesOrder.managerEmailApproval.token}`;

    const holdLink = `${getBaseUrl()}/api/whatsapp-approval/hold-form/${
      salesOrder._id
    }/${salesOrder.managerEmailApproval.token}`;

    const caption = `*Bharat Special Steel*

*Sales Order Approval Required*

*Company:* ${salesOrder.companyName || "-"}
*Sales Person:* ${salesOrder.salesPersonName || "-"}
*Order Date:* ${formatDate(salesOrder.orderDate || salesOrder.createdAt)}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Ref:* ${getOrderRef(salesOrder)}
*Order Value:* Rs. ${formatCurrency(salesOrder.orderValue)}

✅ *Approve Sales Order:*
${approveLink}

⏸ *Put On Hold / Revise:*
${holdLink}`;

    if (pdfFilePath && fs.existsSync(pdfFilePath)) {
      const media = MessageMedia.fromFilePath(pdfFilePath);

      await client.sendMessage(mdChatId, media, {
        caption,
      });

      console.log("MD PDF WHATSAPP SENT SUCCESS");
      return true;
    }

    await client.sendMessage(mdChatId, caption);

    console.log("MD TEXT WHATSAPP SENT SUCCESS");
    return true;
  });
};

const sendFinalPdfToSalesGroup = async (salesOrder) => {
  return runWithChromiumLock("WHATSAPP_GROUP_PDF_SEND", async () => {
    console.log("===== GROUP PDF SEND START =====");

    if (!process.env.SALES_WHATSAPP_GROUP_ID) {
      throw new Error("SALES_WHATSAPP_GROUP_ID missing in env");
    }

    const ready = await isWhatsappReady();

    if (!ready) {
      throw new Error("WhatsApp client is not ready.");
    }

    const client = getWhatsappClient();

    const rawPdfPath = getPdfFilePath(salesOrder);
    const pdfFilePath = getSafeFilePath(rawPdfPath);
    const pdfLink = getFullPdfLink(getPdfFileUrl(salesOrder));

    const caption = `*Bharat Special Steel*

✅ *Sales Order Approved by MD Sir*

*Company:* ${salesOrder.companyName || "-"}
*Sales Person:* ${salesOrder.salesPersonName || "-"}
*Order Date:* ${formatDate(salesOrder.orderDate || salesOrder.createdAt)}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Ref:* ${getOrderRef(salesOrder)}
*Order Value:* Rs. ${formatCurrency(salesOrder.orderValue)}`;

    if (pdfFilePath && fs.existsSync(pdfFilePath)) {
      const media = MessageMedia.fromFilePath(pdfFilePath);

      await client.sendMessage(process.env.SALES_WHATSAPP_GROUP_ID, media, {
        caption,
      });

      console.log("GROUP PDF SENT SUCCESS");
      return true;
    }

    await client.sendMessage(
      process.env.SALES_WHATSAPP_GROUP_ID,
      `${caption}\n\n📄 PDF Link:\n${pdfLink || "-"}`
    );

    console.log("GROUP LINK SENT SUCCESS");
    return true;
  });
};

module.exports = {
  sendMdApprovalWhatsapp,
  sendFinalPdfToSalesGroup,
};