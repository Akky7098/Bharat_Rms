const fs = require("fs");
const path = require("path");

const {
  sendTextToPhone,
  sendTextToGroup,
  getBaileysSocket,
  normalizePhoneJid,
  normalizeGroupJid,
} = require("../util/baileysClient");

/* =========================================================
   BASE URL
========================================================= */

const getBaseUrl = () => {
  return (
    process.env.BACKEND_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
};

/* =========================================================
   ORDER HELPERS
========================================================= */

const getOrderRef = (salesOrder) => {
  return (
    salesOrder.poNumber ||
    salesOrder.checklistNumber ||
    String(salesOrder._id).slice(-6)
  );
};

const formatCurrency = (amount) => {
  return Number(
    amount || 0
  ).toLocaleString("en-IN");
};

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

/* =========================================================
   PDF HELPERS
========================================================= */

const getPdfFileUrl = (salesOrder) => {
  return (
    salesOrder.finalSalesOrderPackage
      ?.fileUrl ||
    salesOrder.pdf?.fileUrl ||
    salesOrder.preShipmentInspectionPdf
      ?.fileUrl ||
    ""
  );
};

const getPdfFilePath = (salesOrder) => {
  return (
    salesOrder.finalSalesOrderPackage
      ?.filePath ||
    salesOrder.pdf?.filePath ||
    salesOrder.preShipmentInspectionPdf
      ?.filePath ||
    ""
  );
};

const getFullPdfLink = (fileUrl) => {
  if (!fileUrl) {
    return "";
  }

  const cleanFileUrl =
    fileUrl.startsWith("/")
      ? fileUrl
      : `/${fileUrl}`;

  return `${getBaseUrl()}${cleanFileUrl}`;
};

const getSafeFilePath = (filePath) => {
  if (!filePath) {
    return "";
  }

  if (
    path.isAbsolute(filePath)
  ) {
    return filePath;
  }

  return path.join(
    __dirname,
    "..",
    filePath
  );
};

/* =========================================================
   BAILEYS CONNECTION CHECK
========================================================= */

const getConnectedSocket = () => {
  const socket =
    getBaileysSocket();

  if (!socket) {
    throw new Error(
      "Baileys WhatsApp is not connected."
    );
  }

  return socket;
};

/* =========================================================
   SEND PDF DOCUMENT

   Baileys can send documents directly.

   No Chromium.
   No MessageMedia.
   No whatsapp-web.js.
========================================================= */

const sendPdfDocument = async (
  jid,
  pdfFilePath,
  caption,
  fileName = "Sales_Order.pdf"
) => {
  const socket =
    getConnectedSocket();

  if (
    !pdfFilePath ||
    !fs.existsSync(pdfFilePath)
  ) {
    throw new Error(
      "PDF file not found."
    );
  }

  const pdfBuffer =
    fs.readFileSync(
      pdfFilePath
    );

  if (
    !pdfBuffer ||
    pdfBuffer.length === 0
  ) {
    throw new Error(
      "PDF file is empty."
    );
  }

  await socket.sendMessage(
    jid,
    {
      document:
        pdfBuffer,

      mimetype:
        "application/pdf",

      fileName,

      caption:
        caption || "",
    }
  );

  return true;
};

/* =========================================================
   MD APPROVAL WHATSAPP

   Keeps same function name as old service.

   Sends approval request directly to MD number.
========================================================= */

const sendMdApprovalWhatsapp =
  async (salesOrder) => {
    console.log(
      "===== MD BAILEYS APPROVAL SEND START ====="
    );

    if (
      !process.env
        .MD_WHATSAPP_NUMBER
    ) {
      throw new Error(
        "MD_WHATSAPP_NUMBER missing in env"
      );
    }

    const mdChatId =
      normalizePhoneJid(
        process.env
          .MD_WHATSAPP_NUMBER
      );

    const rawPdfPath =
      getPdfFilePath(
        salesOrder
      );

    const pdfFilePath =
      getSafeFilePath(
        rawPdfPath
      );

    const approveLink =
      `${getBaseUrl()}/api/whatsapp-approval/approve/` +
      `${salesOrder._id}/` +
      `${salesOrder.managerEmailApproval.token}`;

    const holdLink =
      `${getBaseUrl()}/api/whatsapp-approval/hold-form/` +
      `${salesOrder._id}/` +
      `${salesOrder.managerEmailApproval.token}`;

    const caption =
`*Bharat Special Steel*

*Sales Order Approval Required*

*Company:* ${salesOrder.companyName || "-"}
*Sales Person:* ${salesOrder.salesPersonName || "-"}
*Order Date:* ${formatDate(
  salesOrder.orderDate ||
  salesOrder.createdAt
)}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Ref:* ${getOrderRef(salesOrder)}
*Order Value:* Rs. ${formatCurrency(
  salesOrder.orderValue
)}

✅ *Approve Sales Order:*
${approveLink}

⏸ *Put On Hold / Revise:*
${holdLink}`;

    /*
     * If PDF exists, send PDF + caption.
     */
    if (
      pdfFilePath &&
      fs.existsSync(
        pdfFilePath
      )
    ) {
      const fileName =
        path.basename(
          pdfFilePath
        ) ||
        `Sales_Order_${getOrderRef(
          salesOrder
        )}.pdf`;

      await sendPdfDocument(
        mdChatId,
        pdfFilePath,
        caption,
        fileName
      );

      console.log(
        "MD PDF BAILEYS SENT SUCCESS"
      );

      return true;
    }

    /*
     * Fallback:
     * PDF unavailable → text only.
     */
    await sendTextToPhone(
      process.env
        .MD_WHATSAPP_NUMBER,
      caption
    );

    console.log(
      "MD TEXT BAILEYS SENT SUCCESS"
    );

    return true;
  };

/* =========================================================
   FINAL PDF TO SALES GROUP

   Keeps same function name as old service.
========================================================= */

const sendFinalPdfToSalesGroup =
  async (salesOrder) => {
    console.log(
      "===== BAILEYS GROUP PDF SEND START ====="
    );

    if (
      !process.env
        .SALES_WHATSAPP_GROUP_ID
    ) {
      throw new Error(
        "SALES_WHATSAPP_GROUP_ID missing in env"
      );
    }

    const groupJid =
      normalizeGroupJid(
        process.env
          .SALES_WHATSAPP_GROUP_ID
      );

    const rawPdfPath =
      getPdfFilePath(
        salesOrder
      );

    const pdfFilePath =
      getSafeFilePath(
        rawPdfPath
      );

    const pdfLink =
      getFullPdfLink(
        getPdfFileUrl(
          salesOrder
        )
      );

    const caption =
`*Bharat Special Steel*

✅ *Sales Order Approved by MD Sir*

*Company:* ${salesOrder.companyName || "-"}
*Sales Person:* ${salesOrder.salesPersonName || "-"}
*Order Date:* ${formatDate(
  salesOrder.orderDate ||
  salesOrder.createdAt
)}
*PO Number:* ${salesOrder.poNumber || "-"}
*Order Ref:* ${getOrderRef(salesOrder)}
*Order Value:* Rs. ${formatCurrency(
  salesOrder.orderValue
)}

Please proceed with the further process.`;

    /*
     * Preferred:
     * Actual PDF document to WhatsApp group.
     */
    if (
      pdfFilePath &&
      fs.existsSync(
        pdfFilePath
      )
    ) {
      const fileName =
        path.basename(
          pdfFilePath
        ) ||
        `Sales_Order_${getOrderRef(
          salesOrder
        )}.pdf`;

      await sendPdfDocument(
        groupJid,
        pdfFilePath,
        caption,
        fileName
      );

      console.log(
        "GROUP PDF BAILEYS SENT SUCCESS"
      );

      return true;
    }

    /*
     * Fallback:
     * Send text + PDF URL.
     */
    await sendTextToGroup(
      process.env
        .SALES_WHATSAPP_GROUP_ID,
      `${caption}

📄 *PDF Link:*
${pdfLink || "-"}`
    );

    console.log(
      "GROUP LINK BAILEYS SENT SUCCESS"
    );

    return true;
  };

/* =========================================================
   PLAIN WHATSAPP MESSAGE

   IMPORTANT:
   Existing Sales Order service already calls this function.

   Therefore we keep the exact same function name.
========================================================= */

const sendPlainWhatsappMessage =
  async (
    chatId,
    message
  ) => {
    if (!chatId) {
      throw new Error(
        "WhatsApp chat ID missing."
      );
    }

    if (!message) {
      throw new Error(
        "WhatsApp message missing."
      );
    }

    /*
     * Existing service may pass:
     *
     * 919876543210@c.us
     *
     * because whatsapp-web.js used @c.us.
     *
     * Convert that automatically for Baileys.
     */
    if (
      String(
        chatId
      ).endsWith(
        "@c.us"
      )
    ) {
      const number =
        String(
          chatId
        ).replace(
          "@c.us",
          ""
        );

      await sendTextToPhone(
        number,
        message
      );

      return true;
    }

    /*
     * Group
     */
    if (
      String(
        chatId
      ).endsWith(
        "@g.us"
      )
    ) {
      await sendTextToGroup(
        chatId,
        message
      );

      return true;
    }

    /*
     * Baileys direct JID.
     */
    if (
      String(
        chatId
      ).endsWith(
        "@s.whatsapp.net"
      )
    ) {
      const socket =
        getConnectedSocket();

      await socket.sendMessage(
        chatId,
        {
          text:
            message,
        }
      );

      return true;
    }

    /*
     * Plain mobile number fallback.
     */
    await sendTextToPhone(
      chatId,
      message
    );

    return true;
  };

/* =========================================================
   EXPORTS

   Keep these names EXACTLY the same as old service.
========================================================= */

module.exports = {
  sendMdApprovalWhatsapp,
  sendFinalPdfToSalesGroup,
  sendPlainWhatsappMessage,
};