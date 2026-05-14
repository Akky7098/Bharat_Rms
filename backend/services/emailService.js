const transporter = require("../util/mailTransporter");

const getBaseUrl = () => {
  return (process.env.BACKEND_URL || "http://localhost:5000").replace(
    /\/$/,
    ""
  );
};

const getFullPdfLink = (fileUrl) => {
  if (!fileUrl) return "";

  const cleanFileUrl = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;

  return `${getBaseUrl()}${cleanFileUrl}`;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN");
};

const formatStatus = (status) => {
  if (!status) return "";
  return String(status).replaceAll("_", " ").toUpperCase();
};

const getOrderRef = (salesOrder) => {
  return (
    salesOrder.poNumber ||
    salesOrder.checklistNumber ||
    String(salesOrder._id).slice(-6)
  );
};

const getUniqueMailHeaders = (salesOrder, type) => {
  const uniqueId = `${type}-${salesOrder._id}-${Date.now()}@bharatspecialsteel.local`;

  return {
    "Message-ID": `<${uniqueId}>`,
    "X-Entity-Ref-ID": uniqueId,
    "X-BSS-Sales-Order-ID": String(salesOrder._id),
  };
};

const getOrderRows = (salesOrder, extraRows = "") => {
  return `
    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:750px;font-size:14px;">
      <tr><td><b>Company Name</b></td><td>${salesOrder.companyName || ""}</td></tr>
      <tr><td><b>Sales Person</b></td><td>${salesOrder.salesPersonName || ""}</td></tr>
      <tr><td><b>Order Date</b></td><td>${formatDate(salesOrder.orderDate)}</td></tr>
      <tr><td><b>PO Number</b></td><td>${salesOrder.poNumber || ""}</td></tr>
      <tr><td><b>Checklist Number</b></td><td>${salesOrder.checklistNumber || ""}</td></tr>
      <tr><td><b>Order Value</b></td><td>Rs. ${salesOrder.orderValue || 0}</td></tr>
      <tr><td><b>Payment Terms</b></td><td>${salesOrder.paymentTerms || ""}</td></tr>
      <tr><td><b>Size / Grade / Qty / Rate</b></td><td style="white-space:pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td></tr>
      ${extraRows}
    </table>
  `;
};

const sendSalesOrderApprovedEmail = async (
  salesOrder,
  approvedBy = "Management"
) => {
  if (!salesOrder.salesPersonEmail) return null;

  const pdfLink = getFullPdfLink(salesOrder.pdf?.fileUrl);
  const orderRef = getOrderRef(salesOrder);

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: salesOrder.salesPersonEmail,

    subject: `Bharat Special Steel | Sales Order ${orderRef} Approved for ${salesOrder.companyName}`,

    headers: getUniqueMailHeaders(salesOrder, "salesperson-approved"),

    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2 style="color:#16a34a;margin-bottom:8px;">
          Sales Order Approved
        </h2>

        <p>Hello <b>${salesOrder.salesPersonName || "Sales Team"}</b>,</p>

        <p>
          Sales Order for <b>${salesOrder.companyName || ""}</b>
          has been approved by <b>${approvedBy}</b>.
        </p>

        ${getOrderRows(
          salesOrder,
          `<tr><td><b>Status</b></td><td><b>${formatStatus(
            salesOrder.approvalStatus
          )}</b></td></tr>`
        )}

        ${
          pdfLink
            ? `<p style="margin-top:20px;"><b>Sales Order PDF:</b><br/><a href="${pdfLink}" target="_blank">Open Sales Order PDF</a></p>`
            : ""
        }

        <p style="margin-top:30px;">
          Bharat Special Steel
        </p>
      </div>
    `,
  });
};

const sendSalesOrderRejectedEmail = async (salesOrder, rejectionComment) => {
  if (!salesOrder.salesPersonEmail) return null;

  const pdfLink = getFullPdfLink(salesOrder.pdf?.fileUrl);
  const orderRef = getOrderRef(salesOrder);

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: salesOrder.salesPersonEmail,

    subject: `Bharat Special Steel | Sales Order ${orderRef} Put On Hold for ${salesOrder.companyName}`,

    headers: getUniqueMailHeaders(salesOrder, "salesperson-put-on-hold"),

    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2 style="color:#dc2626;margin-bottom:8px;">
          Sales Order Put On Hold
        </h2>

        <p>Hello <b>${salesOrder.salesPersonName || "Sales Team"}</b>,</p>

        <p>
          Sales Order for <b>${salesOrder.companyName || ""}</b>
          has been put on hold. Please check the comment below, revise the Sales Order and resubmit.
        </p>

        ${getOrderRows(
          salesOrder,
          `<tr><td><b>Hold Comment</b></td><td style="color:#dc2626;"><b>${
            rejectionComment || ""
          }</b></td></tr>`
        )}

        ${
          pdfLink
            ? `<p style="margin-top:20px;"><b>Sales Order PDF:</b><br/><a href="${pdfLink}" target="_blank">Open Sales Order PDF</a></p>`
            : ""
        }

        <p style="margin-top:20px;">
          Please revise Sales Order and resubmit.
        </p>

        <p style="margin-top:30px;">
          Bharat Special Steel
        </p>
      </div>
    `,
  });
};

const sendAdminApprovalNotification = async (
  salesOrder,
  actionText,
  comment = ""
) => {
  const adminEmail = salesOrder.adminApproval?.adminEmail;

  if (!adminEmail) return null;

  const pdfLink = getFullPdfLink(salesOrder.pdf?.fileUrl);
  const orderRef = getOrderRef(salesOrder);

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: adminEmail,

    subject: `Bharat Special Steel | ${actionText} | Sales Order ${orderRef} | ${salesOrder.companyName}`,

    headers: getUniqueMailHeaders(salesOrder, "manager-approval-notification"),

    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2>${actionText}</h2>

        ${getOrderRows(
          salesOrder,
          comment
            ? `<tr><td><b>Comment</b></td><td>${comment}</td></tr>`
            : ""
        )}

        ${
          pdfLink
            ? `<p style="margin-top:20px;"><b>Sales Order PDF:</b><br/><a href="${pdfLink}" target="_blank">Open Sales Order PDF</a></p>`
            : ""
        }
      </div>
    `,
  });
};

const sendAdminRejectionNotification = async (
  salesOrder,
  rejectionComment
) => {
  const adminEmail =
    salesOrder.adminApproval?.adminEmail || process.env.ADMIN_EMAIL;

  if (!adminEmail) return null;

  const pdfLink = getFullPdfLink(salesOrder.pdf?.fileUrl);
  const orderRef = getOrderRef(salesOrder);

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: adminEmail,

    subject: `Bharat Special Steel | MD Sir Put Sales Order On Hold ${orderRef} | ${salesOrder.companyName}`,

    headers: getUniqueMailHeaders(salesOrder, "manager-md-put-on-hold"),

    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2 style="color:#dc2626;">
          MD Sir Put Sales Order On Hold
        </h2>

        <p>
          A sales order checked by Manager has been put on hold by MD Sir.
        </p>

        ${getOrderRows(
          salesOrder,
          `<tr><td><b>MD Sir Comment</b></td><td style="color:#dc2626;"><b>${
            rejectionComment || ""
          }</b></td></tr>`
        )}

        ${
          pdfLink
            ? `<p style="margin-top:20px;"><b>Sales Order PDF:</b><br/><a href="${pdfLink}" target="_blank">Open Sales Order PDF</a></p>`
            : ""
        }

        <p style="margin-top:20px;">
          Please coordinate with the salesperson to revise the Sales Order.
        </p>
      </div>
    `,
  });
};

const sendManagerApprovalRequestEmail = async (salesOrder) => {
  const managerEmail = process.env.MANAGER_EMAIL;

  if (!managerEmail) {
    throw new Error("MANAGER_EMAIL missing in env");
  }

  const baseUrl = getBaseUrl();

  const approveLink = `${baseUrl}/api/sales-order/email-approve/${salesOrder._id}/${salesOrder.managerEmailApproval.token}`;

  const holdLink = `${baseUrl}/api/sales-order/email-reject-form/${salesOrder._id}/${salesOrder.managerEmailApproval.token}`;

  const pdfLink = getFullPdfLink(salesOrder.pdf?.fileUrl);
  const orderRef = getOrderRef(salesOrder);

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: managerEmail,

    subject: `Bharat Special Steel | MD Sir Approval Required | Sales Order ${orderRef} | ${salesOrder.companyName}`,

    headers: getUniqueMailHeaders(salesOrder, "md-sir-approval-request"),

    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2 style="color:#0f172a;">
          Sales Order Approval Required
        </h2>

        <p>
          A new Sales Order Form for <b>${salesOrder.companyName || ""}</b>
          has been checked by Manager and is pending MD Sir approval.
        </p>

        ${getOrderRows(salesOrder)}

        ${
          pdfLink
            ? `<p style="margin-top:20px;"><b>Sales Order PDF:</b><br/><a href="${pdfLink}" target="_blank">Open Sales Order PDF</a></p>`
            : ""
        }

        <p style="margin-top:25px;">
          <a href="${approveLink}" target="_blank" style="background:#16a34a;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
            Approve Sales Order
          </a>

          &nbsp;&nbsp;

          <a href="${holdLink}" target="_blank" style="background:#dc2626;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
            Put On Hold
          </a>
        </p>

        <p style="font-size:12px;color:#666;margin-top:20px;">
          This approval link is unique for this Sales Order Form only.
        </p>

        <p style="margin-top:30px;">
          Bharat Special Steel
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendSalesOrderApprovedEmail,
  sendSalesOrderRejectedEmail,
  sendAdminRejectionNotification,
  sendAdminApprovalNotification,
  sendManagerApprovalRequestEmail,
};