const fs = require("fs");
const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  shortName: "Bharat Special Steels",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",
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

const isExistingFile = (fileObject) => {
  return Boolean(
    fileObject?.filePath &&
      fs.existsSync(fileObject.filePath)
  );
};

const getPaymentAttachments = (dispatch, paymentBillPdf) => {
  const attachments = [];

  if (isExistingFile(paymentBillPdf)) {
    attachments.push({
      filename:
        paymentBillPdf.originalName ||
        paymentBillPdf.fileName ||
        "payment-receipt.pdf",
      path: paymentBillPdf.filePath,
      contentType: paymentBillPdf.mimeType || "application/pdf",
    });
  }

  return attachments;
};

const getDispatchAttachments = (dispatch) => {
  const attachments = [];

  if (isExistingFile(dispatch.billPdf)) {
    attachments.push({
      filename:
        dispatch.billPdf.originalName ||
        dispatch.billPdf.fileName ||
        "bill.pdf",
      path: dispatch.billPdf.filePath,
      contentType: dispatch.billPdf.mimeType || "application/pdf",
    });
  }

  if (isExistingFile(dispatch.lrCopyPdf)) {
    attachments.push({
      filename:
        dispatch.lrCopyPdf.originalName ||
        dispatch.lrCopyPdf.fileName ||
        "lr-copy.pdf",
      path: dispatch.lrCopyPdf.filePath,
      contentType: dispatch.lrCopyPdf.mimeType || "application/pdf",
    });
  }

  /*
   * Attach MTC / TC only when:
   * 1. TC is marked applicable, and
   * 2. The actual file exists on the server.
   */
  if (
    dispatch.tcApplicable === "applicable" &&
    isExistingFile(dispatch.tcCertificatePdf)
  ) {
    attachments.push({
      filename:
        dispatch.tcCertificatePdf.originalName ||
        dispatch.tcCertificatePdf.fileName ||
        "mtc-tc-certificate.pdf",
      path: dispatch.tcCertificatePdf.filePath,
      contentType:
        dispatch.tcCertificatePdf.mimeType || "application/pdf",
    });
  }

  return attachments;
};

const getDispatchAttachmentNames = (dispatch) => {
  const names = [];

  if (isExistingFile(dispatch.billPdf)) {
    names.push("Bill PDF");
  }

  if (isExistingFile(dispatch.lrCopyPdf)) {
    names.push("LR Copy");
  }

  if (
    dispatch.tcApplicable === "applicable" &&
    isExistingFile(dispatch.tcCertificatePdf)
  ) {
    names.push("MTC / TC Certificate");
  }

  return names;
};

const getReadableAttachmentText = (dispatch) => {
  const names = getDispatchAttachmentNames(dispatch);

  if (names.length === 0) {
    return "No document attachment is available with this email.";
  }

  if (names.length === 1) {
    return `${names[0]} is attached with this email.`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are attached with this email.`;
  }

  const lastName = names[names.length - 1];
  const firstNames = names.slice(0, -1).join(", ");

  return `${firstNames}, and ${lastName} are attached with this email.`;
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

const getTcStatusText = (dispatch) => {
  if (
    dispatch.tcApplicable === "applicable" &&
    isExistingFile(dispatch.tcCertificatePdf)
  ) {
    return "Applicable — Certificate Attached";
  }

  if (dispatch.tcApplicable === "applicable") {
    return "Applicable — Certificate Unavailable";
  }

  return "Not Applicable";
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

  if (value.includes("overdue") || value.includes("cancelled")) {
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
        padding: 13px 12px !important;
      }

      .desktop-badge-cell {
        display: none !important;
        width: 0 !important;
        overflow: hidden !important;
      }

      .mobile-badge-row {
        display: table-row !important;
      }

      .mobile-badge-cell {
        display: table-cell !important;
        padding-top: 9px !important;
      }

      .brand-logo-cell {
        width: 42px !important;
      }

      .brand-logo-box {
        width: 36px !important;
        height: 36px !important;
        border-radius: 9px !important;
      }

      .brand-logo-img {
        width: 29px !important;
        max-width: 29px !important;
      }

      .brand-name {
        font-size: 15px !important;
        line-height: 18px !important;
        white-space: nowrap !important;
      }

      .brand-subtitle {
        font-size: 9px !important;
        line-height: 12px !important;
      }

      .badge-pill {
        font-size: 9px !important;
        line-height: 12px !important;
        padding: 6px 8px !important;
        white-space: nowrap !important;
      }

      .email-title-section {
        padding: 18px 13px 8px !important;
      }

      .email-title {
        font-size: 23px !important;
        line-height: 29px !important;
      }

      .email-subtitle {
        font-size: 12px !important;
        line-height: 18px !important;
      }

      .email-content {
        padding: 0 13px 18px !important;
      }

      .mobile-card-padding {
        padding: 4px !important;
      }

      .card-box {
        padding: 10px !important;
        min-height: 52px !important;
        border-radius: 12px !important;
      }

      .amount-box {
        padding: 11px !important;
        border-radius: 12px !important;
      }

      .amount-value {
        font-size: 18px !important;
        line-height: 23px !important;
      }

      .email-footer {
        padding: 14px 13px !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
    ${preHeader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;margin:0;padding:0;">
    <tr>
      <td align="center" class="email-outer-padding" style="padding:14px 6px;">

        <table width="760" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:760px;max-width:760px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ee;box-shadow:0 12px 34px rgba(15,23,42,0.10);">

          <tr>
            <td class="brand-header" style="padding:14px 18px;background:#0f172a;border-bottom:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="brand-logo-cell" width="48" style="width:48px;vertical-align:middle;">
                    <table width="40" height="40" cellpadding="0" cellspacing="0" border="0" class="brand-logo-box" style="width:40px;height:40px;background:#ffffff;border-radius:10px;border:1px solid #334155;">
                      <tr>
                        <td align="center" valign="middle">
                          <img
                            class="brand-logo-img"
                            src="${COMPANY.logoUrl}"
                            width="32"
                            alt="${COMPANY.shortName}"
                            style="display:block;width:32px;max-width:32px;height:auto;border:0;outline:none;text-decoration:none;"
                          />
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td style="vertical-align:middle;">
                    <div class="brand-name" style="font-size:18px;line-height:22px;font-weight:900;color:#ffffff;white-space:nowrap;">
                      ${COMPANY.shortName}
                    </div>

                    <div class="brand-subtitle" style="font-size:11px;line-height:15px;color:#cbd5e1;margin-top:1px;">
                      Automated Customer Notification
                    </div>
                  </td>

                  ${
                    badge
                      ? `
                        <td class="desktop-badge-cell" align="right" style="vertical-align:middle;width:1%;white-space:nowrap;">
                          <span class="badge-pill" style="display:inline-block;background:${badgeTheme.bg};border:1px solid ${badgeTheme.border};color:${badgeTheme.color};border-radius:999px;padding:7px 10px;font-size:10px;line-height:13px;font-weight:900;white-space:nowrap;">
                            ${badge}
                          </span>
                        </td>
                      `
                      : ""
                  }
                </tr>

                ${
                  badge
                    ? `
                      <tr class="mobile-badge-row" style="display:none;">
                        <td class="mobile-badge-cell" colspan="3" style="display:none;">
                          <span class="badge-pill" style="display:inline-block;background:${badgeTheme.bg};border:1px solid ${badgeTheme.border};color:${badgeTheme.color};border-radius:999px;padding:7px 10px;font-size:10px;line-height:13px;font-weight:900;white-space:nowrap;">
                            ${badge}
                          </span>
                        </td>
                      </tr>
                    `
                    : ""
                }
              </table>
            </td>
          </tr>

          <tr>
            <td class="email-title-section" style="padding:22px 22px 8px;background:#ffffff;">
              <div class="email-title" style="font-size:28px;line-height:34px;font-weight:900;color:#0f172a;letter-spacing:-0.4px;">
                ${title}
              </div>

              <div class="email-subtitle" style="margin-top:5px;font-size:14px;line-height:20px;color:#64748b;">
                ${subtitle}
              </div>
            </td>
          </tr>

          <tr>
            <td class="email-content" style="padding:0 22px 22px;">
              ${bodyContent}
            </td>
          </tr>

          <tr>
            <td class="email-footer" style="padding:16px 22px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;line-height:19px;font-weight:900;color:#0f172a;">
                ${COMPANY.name}
              </div>

              <div style="margin-top:4px;font-size:12px;line-height:17px;color:#64748b;">
                ${COMPANY.address}
              </div>

              <div style="margin-top:9px;font-size:11px;line-height:15px;color:#94a3b8;">
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
<div style="margin:18px 0 7px;font-size:12px;line-height:16px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.4px;">
  ${title}
</div>
`;
};

const infoCard = (label, value, color = "#111827") => {
  return `
<td width="50%" class="mobile-card-padding" style="padding:4px;vertical-align:top;">
  <div class="card-box" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:13px;padding:11px;min-height:54px;box-sizing:border-box;">
    <div style="font-size:9px;line-height:12px;letter-spacing:.4px;text-transform:uppercase;font-weight:900;color:#64748b;">
      ${label}
    </div>

    <div style="margin-top:5px;font-size:13px;line-height:18px;font-weight:900;color:${color};word-break:break-word;">
      ${value || "-"}
    </div>
  </div>
</td>
`;
};

const amountCard = (label, value, bg, border, color) => {
  return `
<td width="50%" class="mobile-card-padding" style="padding:4px;vertical-align:top;">
  <div class="amount-box" style="background:${bg};border:1px solid ${border};border-radius:13px;padding:12px;box-sizing:border-box;">
    <div style="font-size:9px;line-height:12px;letter-spacing:.4px;text-transform:uppercase;font-weight:900;color:${color};">
      ${label}
    </div>

    <div class="amount-value" style="margin-top:6px;font-size:20px;line-height:25px;font-weight:900;color:${color};word-break:break-word;">
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
<div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:13px 14px;font-size:13px;line-height:21px;color:${color};">
  ${html}
</div>
`;
};

const attachmentBox = (text) => {
  return `
<div style="margin-top:13px;background:#ffffff;border:1px solid #e5e7eb;border-radius:13px;padding:11px 13px;font-size:12px;line-height:19px;color:#475569;">
  <strong style="color:#0f172a;">Attachments:</strong> ${text}
</div>
`;
};

const buildDispatchCreatedTemplate = (dispatch) => {
  const attachmentText = getReadableAttachmentText(dispatch);

  return baseEmailTemplate({
    preHeader: `Material dispatched. Invoice ${dispatch.invoiceNumber}.`,
    title: "Material Dispatched",
    subtitle: `Invoice ${dispatch.invoiceNumber || "-"} · ${
      dispatch.companyName || "-"
    }`,
    badge: getDispatchStatusText(dispatch.dispatchStatus),

    bodyContent: `
      ${messageBox(
        `Dear <strong>${
          dispatch.contactPersonName || "Customer"
        }</strong>,<br/><br/>
        Your order has been dispatched from
        <strong>Bharat Special Steels Pvt. Ltd.</strong>.
        ${attachmentText}`,
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
  ${infoCard(
    "Dispatch Date",
    formatDate(dispatch.dispatchDate),
    "#0f766e"
  )}

  ${infoCard(
    "Invoice Number",
    dispatch.invoiceNumber || "-"
  )}
</tr>

<tr>
  ${infoCard(
    "Invoice Date",
    formatDate(dispatch.invoiceDate)
  )}

  ${infoCard(
    "Payment Due Date",
    formatDate(dispatch.paymentDueDate),
    "#b45309"
  )}
</tr>

<tr>
  ${infoCard(
    "TC / MTC Status",
    getTcStatusText(dispatch),
    dispatch.tcApplicable === "applicable"
      ? "#166534"
      : "#64748b"
  )}

  ${infoCard(
    "Dispatch Status",
    getDispatchStatusText(dispatch.dispatchStatus),
    "#0f766e"
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

      ${attachmentBox(attachmentText)}
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
        `Dear <strong>${
          dispatch.contactPersonName || "Customer"
        }</strong>,<br/><br/>
        Thank you. We have recorded your payment against invoice
        <strong>${dispatch.invoiceNumber || "-"}</strong>.
        Please find the updated payment summary below.`,
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
          ? `
            <div style="margin-top:13px;">
              ${messageBox(
                `<strong>Remark:</strong> ${payment.remark}`,
                "#ffffff",
                "#e5e7eb",
                "#475569"
              )}
            </div>
          `
          : ""
      }

      <div style="margin-top:13px;">
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
  const attachments = getDispatchAttachments(dispatch);

  const mail = await transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject: `Dispatch Confirmation | Invoice ${
      dispatch.invoiceNumber
    } | ${dispatch.companyName}`,
    html: buildDispatchCreatedTemplate(dispatch),
    attachments,
  });

  return mail;
};

const sendPaymentUpdateEmail = async (dispatch, payment) => {
  const to = dispatch.contactPersonEmail;

  const mail = await transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject: `Re: Payment Update | Invoice ${
      dispatch.invoiceNumber
    } | ${dispatch.companyName}`,
    html: buildPaymentUpdateTemplate(dispatch, payment),
    attachments: getPaymentAttachments(
      dispatch,
      payment.paymentBillPdf
    ),
    inReplyTo:
      dispatch.notificationEmail?.messageId || undefined,
    references:
      dispatch.notificationEmail?.messageId || undefined,
  });

  return mail;
};

module.exports = {
  sendDispatchCreatedEmail,
  sendPaymentUpdateEmail,
};