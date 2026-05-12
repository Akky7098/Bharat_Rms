const transporter = require("../util/mailTransporter");

const sendSalesOrderApprovedEmail = async (salesOrder, approvedBy = "Management") => {
  if (!salesOrder.salesPersonEmail) return null;

  const pdfLink = salesOrder.pdf?.fileUrl
    ? `${process.env.BACKEND_URL || "http://localhost:5000"}${salesOrder.pdf.fileUrl}`
    : "";

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: salesOrder.salesPersonEmail,
    subject: `Sales Order Approved - ${salesOrder.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111;">
        <h2 style="color:green;">Sales Order Approved</h2>
        <p>Hello <b>${salesOrder.salesPersonName}</b>,</p>
        <p>Your sales order has been approved by <b>${approvedBy}</b>.</p>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:700px;">
          <tr><td><b>Company Name</b></td><td>${salesOrder.companyName || ""}</td></tr>
          <tr><td><b>Order Date</b></td><td>${new Date(salesOrder.orderDate).toLocaleDateString("en-IN")}</td></tr>
          <tr><td><b>PO Number</b></td><td>${salesOrder.poNumber || ""}</td></tr>
          <tr><td><b>Order Value</b></td><td>₹ ${salesOrder.orderValue || 0}</td></tr>
          <tr><td><b>Size / Grade / Qty / Rate</b></td><td style="white-space:pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td></tr>
          <tr><td><b>Payment Terms</b></td><td>${salesOrder.paymentTerms || ""}</td></tr>
          <tr><td><b>Status</b></td><td><b>${salesOrder.approvalStatus}</b></td></tr>
        </table>

        ${pdfLink ? `<p style="margin-top:20px;"><b>PDF:</b><br/><a href="${pdfLink}">Open Sales Order PDF</a></p>` : ""}

        <p style="margin-top:30px;">Bharat Special Steel Pvt Ltd</p>
      </div>
    `,
  });
};

const sendAdminApprovalNotification = async (salesOrder, actionText, comment = "") => {
  const adminEmail =
  salesOrder.adminApproval?.adminEmail;
   if (!adminEmail) return null;
  const pdfLink = salesOrder.pdf?.fileUrl
    ? `${process.env.BACKEND_URL || "http://localhost:5000"}${salesOrder.pdf.fileUrl}`
    : "";

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: adminEmail,
    subject: `${actionText} - ${salesOrder.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111;">
        <h2>${actionText}</h2>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:700px;">
          <tr><td><b>Company Name</b></td><td>${salesOrder.companyName || ""}</td></tr>
          <tr><td><b>Sales Person</b></td><td>${salesOrder.salesPersonName || ""}</td></tr>
          <tr><td><b>Order Date</b></td><td>${new Date(salesOrder.orderDate).toLocaleDateString("en-IN")}</td></tr>
          <tr><td><b>PO Number</b></td><td>${salesOrder.poNumber || ""}</td></tr>
          <tr><td><b>Order Value</b></td><td>₹ ${salesOrder.orderValue || 0}</td></tr>
          <tr><td><b>Size / Grade / Qty / Rate</b></td><td style="white-space:pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td></tr>
          <tr><td><b>Payment Terms</b></td><td>${salesOrder.paymentTerms || ""}</td></tr>
          ${comment ? `<tr><td><b>Comment</b></td><td>${comment}</td></tr>` : ""}
        </table>

        ${pdfLink ? `<p style="margin-top:20px;"><b>PDF:</b><br/><a href="${pdfLink}">Open Sales Order PDF</a></p>` : ""}
      </div>
    `,
  });
};

const sendSalesOrderRejectedEmail = async (
  salesOrder,
  rejectionComment
) => {
  if (!salesOrder.salesPersonEmail) {
    return null;
  }

  const pdfLink =
    salesOrder.pdf?.fileUrl
      ? `${process.env.BACKEND_URL || "http://localhost:5000"}${salesOrder.pdf.fileUrl}`
      : "";

  const mailOptions = {
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,

    to: salesOrder.salesPersonEmail,

    subject: `Sales Order Rejected - ${salesOrder.companyName}`,

    html: `
      <div style="font-family: Arial, sans-serif; color:#111;">

        <h2 style="color: red;">
          Sales Order Rejected
        </h2>

        <p>
          Hello <b>${salesOrder.salesPersonName}</b>,
        </p>

        <p>
          Your sales order has been rejected by manager.
          Please check the reason below, edit the order and resubmit.
        </p>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse; width:100%; max-width:700px;">

          <tr>
            <td><b>Company Name</b></td>
            <td>${salesOrder.companyName || ""}</td>
          </tr>

          <tr>
            <td><b>Order Date</b></td>
            <td>${new Date(salesOrder.orderDate).toLocaleDateString("en-IN")}</td>
          </tr>

          <tr>
            <td><b>PO Number</b></td>
            <td>${salesOrder.poNumber || ""}</td>
          </tr>

          <tr>
            <td><b>Order Value</b></td>
            <td>₹ ${salesOrder.orderValue || 0}</td>
          </tr>

          <tr>
            <td><b>Size / Grade / Qty / Rate</b></td>
            <td style="white-space: pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td>
          </tr>

          <tr>
            <td><b>Payment Terms</b></td>
            <td>${salesOrder.paymentTerms || ""}</td>
          </tr>

          <tr>
            <td><b>Manager Comment</b></td>
            <td style="color:red;"><b>${rejectionComment}</b></td>
          </tr>

        </table>

        ${
          pdfLink
            ? `<p style="margin-top:20px;">
                <b>PDF:</b><br/>
                <a href="${pdfLink}">Open Rejected Sales Order PDF</a>
              </p>`
            : ""
        }

        <p style="margin-top:20px;">
          Please edit and resubmit the sales order.
        </p>

        <p style="margin-top:30px;">
          Bharat Special Steel Pvt Ltd
        </p>

      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
const sendAdminRejectionNotification = async (
  salesOrder,
  rejectionComment
) => {
  const adminEmail = process.env.ADMIN_EMAIL || "YOUR_ADMIN_EMAIL@gmail.com";

  const pdfLink =
    salesOrder.pdf?.fileUrl
      ? `${process.env.BACKEND_URL || "http://localhost:5000"}${salesOrder.pdf.fileUrl}`
      : "";

  const mailOptions = {
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,

    to: adminEmail,

    subject: `Manager Rejected Sales Order - ${salesOrder.companyName}`,

    html: `
      <div style="font-family: Arial, sans-serif; color:#111;">

        <h2 style="color: red;">
          Manager Rejected Sales Order
        </h2>

        <p>
          A sales order checked by admin has been rejected by manager.
        </p>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse; width:100%; max-width:700px;">

          <tr>
            <td><b>Company Name</b></td>
            <td>${salesOrder.companyName || ""}</td>
          </tr>

          <tr>
            <td><b>Sales Person</b></td>
            <td>${salesOrder.salesPersonName || ""}</td>
          </tr>

          <tr>
            <td><b>Order Date</b></td>
            <td>${new Date(salesOrder.orderDate).toLocaleDateString("en-IN")}</td>
          </tr>

          <tr>
            <td><b>PO Number</b></td>
            <td>${salesOrder.poNumber || ""}</td>
          </tr>

          <tr>
            <td><b>Order Value</b></td>
            <td>₹ ${salesOrder.orderValue || 0}</td>
          </tr>

          <tr>
            <td><b>Size / Grade / Qty / Rate</b></td>
            <td style="white-space: pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td>
          </tr>

          <tr>
            <td><b>Payment Terms</b></td>
            <td>${salesOrder.paymentTerms || ""}</td>
          </tr>

          <tr>
            <td><b>Manager Comment</b></td>
            <td style="color:red;"><b>${rejectionComment}</b></td>
          </tr>

        </table>

        ${
          pdfLink
            ? `<p style="margin-top:20px;">
                <b>PDF:</b><br/>
                <a href="${pdfLink}">Open Rejected Sales Order PDF</a>
              </p>`
            : ""
        }

        <p style="margin-top:20px;">
          Please coordinate with the salesperson for correction.
        </p>

      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
const sendManagerApprovalRequestEmail = async (salesOrder) => {
  const managerEmail = process.env.MANAGER_EMAIL;

  if (!managerEmail) {
    throw new Error("MANAGER_EMAIL missing in env");
  }

  const baseUrl =
    process.env.BACKEND_URL || "http://localhost:5000";

  const approveLink = `${baseUrl}/api/sales-order/email-approve/${salesOrder._id}/${salesOrder.managerEmailApproval.token}`;

  const rejectLink = `${baseUrl}/api/sales-order/email-reject-form/${salesOrder._id}/${salesOrder.managerEmailApproval.token}`;

  const pdfLink = salesOrder.pdf?.fileUrl
    ? `${baseUrl}${salesOrder.pdf.fileUrl}`
    : "";

  return transporter.sendMail({
    from: `"Bharat Special Steel" <bsspl97@gmail.com>`,
    to: managerEmail,
    subject: `Manager Approval Required - ${salesOrder.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111;">
        <h2>Sales Order Approval Required</h2>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:700px;">
          <tr><td><b>Company Name</b></td><td>${salesOrder.companyName || ""}</td></tr>
          <tr><td><b>Sales Person</b></td><td>${salesOrder.salesPersonName || ""}</td></tr>
          <tr><td><b>Order Date</b></td><td>${new Date(salesOrder.orderDate).toLocaleDateString("en-IN")}</td></tr>
          <tr><td><b>PO Number</b></td><td>${salesOrder.poNumber || ""}</td></tr>
          <tr><td><b>Order Value</b></td><td>Rs. ${salesOrder.orderValue || 0}</td></tr>
          <tr><td><b>Size / Grade / Qty / Rate</b></td><td style="white-space:pre-line;">${salesOrder.sizeGradeQuantityRate || ""}</td></tr>
          <tr><td><b>Payment Terms</b></td><td>${salesOrder.paymentTerms || ""}</td></tr>
        </table>

        ${pdfLink ? `<p><b>PDF:</b><br/><a href="${pdfLink}">Open Sales Order PDF</a></p>` : ""}

        <p style="margin-top:25px;">
          <a href="${approveLink}" style="background:#16a34a;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">
            Approve
          </a>

          &nbsp;&nbsp;

          <a href="${rejectLink}" style="background:#dc2626;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">
            Reject
          </a>
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
  sendManagerApprovalRequestEmail
};