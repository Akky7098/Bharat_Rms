const fs = require("fs");
const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  shortName: "Bharat Special Steels",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",

  // Put this in .env:
  // COMPANY_LOGO_URL=https://dashboard.bharatspecialsteels.com/logo.png
  logoUrl:
    process.env.COMPANY_LOGO_URL ||
    "https://dashboard.bharatspecialsteels.com/logo.png",
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
  return "Dispatched";
};

const getBadgeTheme = (badge) => {
  const value = String(badge || "").toLowerCase();

  if (value.includes("partial")) {
    return {
      bg: "#fff7ed",
      border: "#fed7aa",
      color: "#9a3412",
    };
  }

  if (value.includes("paid") || value.includes("complete")) {
    return {
      bg: "#ecfdf5",
      border: "#bbf7d0",
      color: "#166534",
    };
  }

  if (value.includes("overdue")) {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#991b1b",
    };
  }

  return {
    bg: "#ecfeff",
    border: "#99f6e4",
    color: "#0f766e",
  };
};

const baseEmailTemplate = ({
  preHeader = "",
  title,
  subtitle,
  badge = "",
  bodyContent,
}) => {
  const badgeTheme = getBadgeTheme(badge);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @media only screen and (max-width: 620px) {
      .email-outer-padding {
        padding: 0 !important;
      }

      .email-shell {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
      }

      .brand-header {
        padding: 18px 16px !important;
      }

      .brand-name {
        font-size: 18px !important;
        line-height: 22px !important;
        white-space: nowrap !important;
      }

      .brand-subtitle {
        font-size: 11px !important;
      }

      .email-title-section {
        padding: 24px 18px 14px !important;
      }

      .email-title {
        font-size: 27px !important;
        line-height: 34px !important;
      }

      .email-subtitle {
        font-size: 14px !important;
        line-height: 21px !important;
      }

      .email-content {
        padding: 0 18px 24px !important;
      }

      .mobile-block {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      .mobile-card-padding {
        padding: 6px 0 !important;
      }

      .amount-value {
        font-size: 22px !important;
      }

      .email-footer {
        padding: 18px !important;
      }

      .badge-cell {
        text-align: left !important;
        padding-top: 12px !important;
      }

      .brand-logo-cell {
        width: 58px !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
    ${preHeader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;">
    <tr>
      <td align="center" class="email-outer-padding" style="padding:28px 12px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:600px;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dfe7f1;box-shadow:0 18px 48px rgba(15,23,42,0.12);">

          <!-- HEADER -->
          <tr>
            <td class="brand-header" style="padding:18px 22px;background:#0f172a;border-bottom:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="brand-logo-cell" width="58" style="width:58px;vertical-align:middle;">
                    <table width="48" height="48" cellpadding="0" cellspacing="0" border="0" style="width:48px;height:48px;background:#ffffff;border-radius:12px;border:1px solid #334155;">
                      <tr>
                        <td align="center" valign="middle">
                          <img src="${COMPANY.logoUrl}" width="40" alt="${COMPANY.shortName}" style="display:block;width:40px;max-width:40px;height:auto;border:0;outline:none;text-decoration:none;" />
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td style="vertical-align:middle;">
                    <div class="brand-name" style="font-size:20px;line-height:24px;font-weight:900;color:#ffffff;white-space:nowrap;">
                      ${COMPANY.shortName}
                    </div>
                    <div class="brand-subtitle" style="font-size:12px;line-height:18px;color:#cbd5e1;margin-top:2px;">
                      Automated Customer Notification
                    </div>
                  </td>

                  ${
                    badge
                      ? `<td class="badge-cell" align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;background:${badgeTheme.bg};border:1px solid ${badgeTheme.border};color:${badgeTheme.color};border-radius:999px;padding:8px 13px;font-size:11px;line-height:14px;font-weight:900;white-space:nowrap;">
                            ${badge}
                          </span>
                        </td>`
                      : ""
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- TITLE -->
          <tr>
            <td class="email-title-section" style="padding:28px 24px 16px;background:#ffffff;">
              <div class="email-title" style="font-size:30px;line-height:38px;font-weight:900;color:#0f172a;letter-spacing:-0.6px;">
                ${title}
              </div>
              <div class="email-subtitle" style="margin-top:7px;font-size:14px;line-height:22px;color:#64748b;">
                ${subtitle}
              </div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td class="email-content" style="padding:0 24px 28px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="email-footer" style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;line-height:20px;font-weight:900;color:#0f172a;">
                ${COMPANY.name}
              </div>
              <div style="margin-top:5px;font-size:12px;line-height:19px;color:#64748b;">
                ${COMPANY.address}
              </div>
              <div style="margin-top:12px;font-size:11px;line-height:17px;color:#94a3b8;">
                This is an automated notification from Bharat RMS. Please do not reply directly to this email.
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

const sectionTitle = (title) => {
  return `
<div style="margin:24px 0 10px;font-size:13px;line-height:18px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.45px;">
  ${title}
</div>
`;
};

const infoCard = (label, value, color = "#111827") => {
  return `
<td width="50%" class="mobile-block mobile-card-padding" style="padding:6px;vertical-align:top;">
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:15px;min-height:68px;box-sizing:border-box;">
    <div style="font-size:10px;line-height:14px;letter-spacing:.5px;text-transform:uppercase;font-weight:900;color:#64748b;">
      ${label}
    </div>
    <div style="margin-top:7px;font-size:15px;line-height:22px;font-weight:900;color:${color};word-break:break-word;">
      ${value || "-"}
    </div>
  </div>
</td>
`;
};

const amountCard = (label, value, bg, border, color) => {
  return `
<td width="50%" class="mobile-block mobile-card-padding" style="padding:6px;vertical-align:top;">
  <div style="background:${bg};border:1px solid ${border};border-radius:17px;padding:16px;box-sizing:border-box;">
    <div style="font-size:10px;line-height:14px;letter-spacing:.5px;text-transform:uppercase;font-weight:900;color:${color};">
      ${label}
    </div>
    <div class="amount-value" style="margin-top:8px;font-size:24px;line-height:30px;font-weight:900;color:${color};word-break:break-word;">
      ${value}
    </div>
  </div>
</td>
`;
};

const messageBox = (
  html,
  bg = "#f8fafc",
  border = "#e5e7eb",
  color = "#334155"
) => {
  return `
<div style="background:${bg};border:1px solid ${border};border-radius:18px;padding:17px 18px;font-size:14px;line-height:23px;color:${color};">
  ${html}
</div>
`;
};

const attachmentBox = (text) => {
  return `
<div style="margin-top:18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:15px 16px;font-size:13px;line-height:21px;color:#475569;">
  <strong style="color:#0f172a;">Attachment:</strong> ${text}
</div>
`;
};

const buildDispatchCreatedTemplate = (dispatch) => {
  return baseEmailTemplate({
    preHeader: `Material dispatched. Invoice ${dispatch.invoiceNumber}.`,
    title: "Material Dispatched",
    subtitle: `Invoice ${dispatch.invoiceNumber || "-"} · ${
      dispatch.companyName || "-"
    }`,
    badge: getDispatchStatusText(dispatch.dispatchStatus),
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Your order has been dispatched from <strong>Bharat Special Steels Pvt. Ltd.</strong>.
        The bill PDF and LR copy are attached with this email for your records.`,
        "#ecfdf5",
        "#bbf7d0",
        "#166534"
      )}

      ${sectionTitle("Dispatch Summary")}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${infoCard("Company", dispatch.companyName)}
          ${infoCard("PO Number", dispatch.poNumber || "-")}
        </tr>
        <tr>
          ${infoCard("Sales Order", dispatch.salesOrderNo || "-")}
          ${infoCard(
            "Dispatch Date",
            formatDate(dispatch.dispatchDate),
            "#0f766e"
          )}
        </tr>
        <tr>
          ${infoCard("Invoice Number", dispatch.invoiceNumber || "-")}
          ${infoCard("Invoice Date", formatDate(dispatch.invoiceDate))}
        </tr>
        <tr>
          ${infoCard(
            "Dispatch Quantity",
            `${dispatch.dispatchQty || 0} Kg`,
            "#0f766e"
          )}
          ${infoCard(
            "Payment Due Date",
            formatDate(dispatch.paymentDueDate),
            "#b45309"
          )}
        </tr>
      </table>

      ${sectionTitle("Payment Snapshot")}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
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

      ${attachmentBox("Bill PDF and LR copy are attached with this email.")}
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
    badge: isFullyPaid ? "Paid" : "Partial Payment",
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Thank you. We have recorded your payment against invoice
        <strong>${dispatch.invoiceNumber || "-"}</strong>. Please find the updated payment summary below.`,
        "#ecfdf5",
        "#bbf7d0",
        "#166534"
      )}

      ${sectionTitle("Payment Summary")}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${amountCard(
            "Invoice Amount",
            formatCurrency(dispatch.invoiceValue),
            "#f8fafc",
            "#e2e8f0",
            "#334155"
          )}
          ${amountCard(
            "Payment Received Now",
            formatCurrency(payment.amount),
            "#ecfdf5",
            "#86efac",
            "#15803d"
          )}
        </tr>
        <tr>
          ${amountCard(
            "Total Paid Amount",
            formatCurrency(dispatch.paidAmount),
            "#f0fdf4",
            "#bbf7d0",
            "#166534"
          )}
          ${amountCard(
            "Pending Amount",
            formatCurrency(dispatch.pendingAmount),
            isFullyPaid ? "#f0fdf4" : "#fff7ed",
            isFullyPaid ? "#bbf7d0" : "#fed7aa",
            isFullyPaid ? "#166534" : "#c2410c"
          )}
        </tr>
      </table>

      ${sectionTitle("Invoice Details")}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${infoCard("Company", dispatch.companyName)}
          ${infoCard("Invoice Number", dispatch.invoiceNumber || "-")}
        </tr>
        <tr>
          ${infoCard("Invoice Date", formatDate(dispatch.invoiceDate))}
          ${infoCard(
            "Payment Due Date",
            formatDate(dispatch.paymentDueDate),
            "#b45309"
          )}
        </tr>
      </table>

      ${
        payment.remark
          ? `<div style="margin-top:18px;">
              ${messageBox(
                `<strong>Remark:</strong> ${payment.remark}`,
                "#ffffff",
                "#e5e7eb",
                "#475569"
              )}
            </div>`
          : ""
      }

      <div style="margin-top:18px;">
        ${messageBox(
          isFullyPaid
            ? "This invoice is now marked as fully paid in our records."
            : "The balance amount remains pending as shown above.",
          isFullyPaid ? "#ecfdf5" : "#fff7ed",
          isFullyPaid ? "#bbf7d0" : "#fed7aa",
          isFullyPaid ? "#166534" : "#c2410c"
        )}
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