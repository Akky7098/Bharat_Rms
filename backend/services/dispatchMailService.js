const fs = require("fs");
const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const cleanEmails = (emails = []) => {
  return [
    ...new Set(
      emails
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase())
        .filter((email) => email.includes("@"))
    ),
  ];
};
const getPaymentAttachments = (dispatch, paymentBillPdf) => {
  const attachments = [];

  if (paymentBillPdf?.filePath && fs.existsSync(paymentBillPdf.filePath)) {
    attachments.push({
      filename: paymentBillPdf.originalName || paymentBillPdf.fileName,
      path: paymentBillPdf.filePath,
    });
  }

  return attachments;
};
const getDispatchAttachments = (dispatch) => {
  const attachments = [];

  if (dispatch.billPdf?.filePath && fs.existsSync(dispatch.billPdf.filePath)) {
    attachments.push({
      filename: dispatch.billPdf.originalName || dispatch.billPdf.fileName,
      path: dispatch.billPdf.filePath,
    });
  }

  if (
    dispatch.lrCopyPdf?.filePath &&
    fs.existsSync(dispatch.lrCopyPdf.filePath)
  ) {
    attachments.push({
      filename: dispatch.lrCopyPdf.originalName || dispatch.lrCopyPdf.fileName,
      path: dispatch.lrCopyPdf.filePath,
    });
  }

  return attachments;
};

const getPaymentBadge = (status) => {
  if (status === "paid") return "Payment Complete";
  if (status === "partial") return "Partial Payment";
  if (status === "overdue") return "Payment Overdue";
  return "Payment Pending";
};

const getDispatchStatusText = (status) => {
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  return "Dispatched";
};

const baseEmailTemplate = ({
  preHeader = "",
  title,
  subtitle,
  badge,
  badgeColor = "#facc15",
  bodyContent,
}) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>

    <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
        ${preHeader}
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:28px 0;">
        <tr>
          <td align="center">
            <table width="680" cellpadding="0" cellspacing="0" style="width:94%;max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dfe7f1;box-shadow:0 22px 60px rgba(15,23,42,0.12);">

              <tr>
                <td style="padding:0;background:#0f172a;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:28px 30px;background:linear-gradient(135deg,#0f172a 0%,#123f6d 52%,#0f766e 100%);">
                        <div style="font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#b7f7e5;">
                          Bharat Special Steels
                        </div>

                        <h1 style="margin:10px 0 6px;font-size:26px;line-height:1.25;color:#ffffff;font-weight:900;">
                          ${title}
                        </h1>

                        <div style="font-size:14px;line-height:1.5;color:#dbeafe;">
                          ${subtitle}
                        </div>

                        ${
                          badge
                            ? `<div style="margin-top:18px;">
                                <span style="display:inline-block;background:${badgeColor};color:#111827;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:900;letter-spacing:.2px;">
                                  ${badge}
                                </span>
                              </div>`
                            : ""
                        }
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:30px;">
                  ${bodyContent}
                </td>
              </tr>

              <tr>
                <td style="padding:22px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <div style="font-size:14px;font-weight:900;color:#0f172a;">
                    ${COMPANY.name}
                  </div>

                  <div style="margin-top:6px;font-size:12px;color:#64748b;line-height:1.6;">
                    ${COMPANY.address}
                  </div>

                  <div style="margin-top:16px;padding:12px 14px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;font-size:11px;color:#94a3b8;line-height:1.6;">
                    This is an automated notification generated by Bharat RMS. Please do not reply directly to this email.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const infoCard = (label, value, color = "#0f172a") => {
  return `
    <td style="width:50%;padding:8px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;min-height:74px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:900;color:#64748b;">
          ${label}
        </div>
        <div style="margin-top:8px;font-size:17px;line-height:1.3;font-weight:900;color:${color};">
          ${value || "-"}
        </div>
      </div>
    </td>
  `;
};

const amountCard = (label, value, bg, border, color) => {
  return `
    <td style="width:50%;padding:8px;">
      <div style="background:${bg};border:1px solid ${border};border-radius:18px;padding:18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:900;color:${color};">
          ${label}
        </div>
        <div style="margin-top:8px;font-size:22px;line-height:1.2;font-weight:900;color:${color};">
          ${value}
        </div>
      </div>
    </td>
  `;
};

const buildDispatchCreatedTemplate = (dispatch) => {
  return baseEmailTemplate({
    preHeader: `Your material has been dispatched. Invoice ${dispatch.invoiceNumber}.`,
    title: "Your Material Has Been Dispatched",
    subtitle: `Invoice ${dispatch.invoiceNumber || "-"} · ${
      dispatch.companyName || "-"
    }`,
    badge: getDispatchStatusText(dispatch.dispatchStatus),
    badgeColor: "#facc15",
    bodyContent: `
      <div style="font-size:15px;line-height:1.7;color:#334155;">
        Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Your order has been dispatched from <strong>Bharat Special Steels Pvt. Ltd.</strong>.
        The bill PDF and LR copy are attached with this email for your records.
      </div>

      <div style="margin:24px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Dispatch Summary
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${infoCard("Company", dispatch.companyName)}
          ${infoCard("PO Number", dispatch.poNumber || "-")}
        </tr>
        <tr>
          ${infoCard("Sales Order", dispatch.salesOrderNo || "-")}
          ${infoCard("Dispatch Date", formatDate(dispatch.dispatchDate), "#0f766e")}
        </tr>
        <tr>
          ${infoCard("Invoice Number", dispatch.invoiceNumber || "-")}
          ${infoCard("Invoice Date", formatDate(dispatch.invoiceDate))}
        </tr>
        <tr>
          ${infoCard("Dispatch Quantity", `${dispatch.dispatchQty || 0} Kg`, "#0f766e")}
          ${infoCard("Payment Due Date", formatDate(dispatch.paymentDueDate), "#b45309")}
        </tr>
      </table>

      <div style="margin:22px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Payment Snapshot
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${amountCard(
            "Invoice Amount",
            formatCurrency(dispatch.invoiceValue),
            "#eff6ff",
            "#bfdbfe",
            "#1d4ed8"
          )}
          ${amountCard(
            "Paid Amount",
            formatCurrency(dispatch.paidAmount),
            "#f0fdf4",
            "#bbf7d0",
            "#15803d"
          )}
        </tr>
        <tr>
          ${amountCard(
            "Pending Amount",
            formatCurrency(dispatch.pendingAmount),
            "#fff7ed",
            "#fed7aa",
            "#c2410c"
          )}
          ${amountCard(
            "Payment Status",
            getPaymentBadge(dispatch.paymentStatus),
            "#f8fafc",
            "#e2e8f0",
            "#334155"
          )}
        </tr>
      </table>

      <div style="margin-top:24px;background:#ecfeff;border:1px solid #99f6e4;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#115e59;">
        <strong>Attachments included:</strong><br/>
        Bill PDF and LR copy are attached with this email.
      </div>
    `,
  });
};

const buildPaymentUpdateTemplate = (dispatch, payment) => {
  const isFullyPaid = Number(dispatch.pendingAmount || 0) <= 0;

  return baseEmailTemplate({
    preHeader: `Payment received for invoice ${dispatch.invoiceNumber}.`,
    title: isFullyPaid ? "Payment Completed" : "Payment Received",
    subtitle: `Invoice ${dispatch.invoiceNumber || "-"} · ${
      dispatch.companyName || "-"
    }`,
    badge: isFullyPaid ? "PAID" : "PARTIAL PAYMENT",
    badgeColor: isFullyPaid ? "#22c55e" : "#facc15",
    bodyContent: `
      <div style="font-size:15px;line-height:1.7;color:#334155;">
        Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Thank you. We have recorded your payment against invoice
        <strong>${dispatch.invoiceNumber || "-"}</strong>.
        Please find the updated payment summary below.
      </div>

      <div style="margin:24px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Payment Summary
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${amountCard(
            "Invoice Amount",
            formatCurrency(dispatch.invoiceValue),
            "#eff6ff",
            "#bfdbfe",
            "#1d4ed8"
          )}
          ${amountCard(
            "Payment Received Now",
            formatCurrency(payment.amount),
            "#f0fdf4",
            "#bbf7d0",
            "#15803d"
          )}
        </tr>
        <tr>
          ${amountCard(
            "Total Paid Amount",
            formatCurrency(dispatch.paidAmount),
            "#ecfdf5",
            "#86efac",
            "#166534"
          )}
          ${amountCard(
            "Pending Amount",
            formatCurrency(dispatch.pendingAmount),
            isFullyPaid ? "#ecfdf5" : "#fff7ed",
            isFullyPaid ? "#86efac" : "#fed7aa",
            isFullyPaid ? "#166534" : "#c2410c"
          )}
        </tr>
      </table>

      <div style="margin:24px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Invoice Details
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${infoCard("Company", dispatch.companyName)}
          ${infoCard("Invoice Number", dispatch.invoiceNumber || "-")}
        </tr>
        <tr>
          ${infoCard("Invoice Date", formatDate(dispatch.invoiceDate))}
          ${infoCard("Payment Due Date", formatDate(dispatch.paymentDueDate), "#b45309")}
        </tr>
      </table>

      ${
        payment.remark
          ? `<div style="margin-top:24px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:14px;padding:15px 16px;font-size:14px;line-height:1.7;color:#334155;">
              <strong>Remark:</strong> ${payment.remark}
            </div>`
          : ""
      }

      <div style="margin-top:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#166534;">
        ${
          isFullyPaid
            ? "This invoice is now marked as fully paid in our records."
            : "The balance amount remains pending as shown above."
        }
      </div>
    `,
  });
};

const sendDispatchCreatedEmail = async (dispatch) => {
  const to = dispatch.contactPersonEmail;
  const cc = cleanEmails(dispatch.notificationEmail?.cc || []);
  const attachments = getDispatchAttachments(dispatch);

  const mail = await transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to,
    cc,
    subject: `Dispatch Confirmation | Invoice ${dispatch.invoiceNumber} | ${dispatch.companyName}`,
    html: buildDispatchCreatedTemplate(dispatch),
    attachments,
  });

  return mail;
};

const sendPaymentUpdateEmail = async (dispatch, payment) => {
  const to = dispatch.contactPersonEmail;

  const cc = cleanEmails([
    dispatch.salesPersonEmail,
    ...(dispatch.notificationEmail?.cc || []),
  ]);

  const mail = await transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to,
    cc,
    subject: `Re: Payment Update | Invoice ${dispatch.invoiceNumber} | ${dispatch.companyName}`,
    html: buildPaymentUpdateTemplate(dispatch, payment),
    attachments: getPaymentAttachments(dispatch, payment.paymentBillPdf),
    inReplyTo: dispatch.notificationEmail?.messageId || undefined,
    references: dispatch.notificationEmail?.messageId || undefined,
  });

  return mail;
};
module.exports = {
  sendDispatchCreatedEmail,
  sendPaymentUpdateEmail,
};