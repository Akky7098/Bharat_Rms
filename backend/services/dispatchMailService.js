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

const baseEmailTemplate = ({
  preHeader = "",
  title,
  subtitle,
  badge = "",
  badgeBg = "#dcfce7",
  badgeColor = "#166534",
  bodyContent,
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
    ${preHeader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f9;padding:18px 0;">
    <tr>
      <td align="center" style="padding:0 10px;">

        <table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- BRAND HEADER -->
          <tr>
            <td style="padding:18px 22px;background:#ffffff;border-bottom:1px solid #eef2f7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="52" style="vertical-align:middle;">
                    <img src="${COMPANY.logoUrl}" width="44" height="44" alt="Bharat Special Steels" style="display:block;border-radius:10px;border:1px solid #e5e7eb;object-fit:contain;" />
                  </td>

                  <td style="vertical-align:middle;">
                    <div style="font-size:16px;font-weight:900;color:#0f172a;line-height:1.25;">
                      ${COMPANY.shortName}
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;">
                      Automated Customer Notification
                    </div>
                  </td>

                  <td align="right" style="vertical-align:middle;">
                    ${
                      badge
                        ? `<span style="display:inline-block;background:${badgeBg};color:${badgeColor};border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;white-space:nowrap;">
                            ${badge}
                          </span>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TITLE -->
          <tr>
            <td style="padding:26px 24px 18px;background:#ffffff;">
              <div style="font-size:28px;line-height:1.2;font-weight:900;color:#0f172a;">
                ${title}
              </div>
              <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#64748b;">
                ${subtitle}
              </div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:0 24px 26px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;font-weight:900;color:#0f172a;">
                ${COMPANY.name}
              </div>
              <div style="margin-top:6px;font-size:12px;color:#64748b;line-height:1.6;">
                ${COMPANY.address}
              </div>
              <div style="margin-top:14px;font-size:11px;color:#94a3b8;line-height:1.6;">
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

const infoCard = (label, value, color = "#111827") => {
  return `
<td width="50%" style="padding:6px;vertical-align:top;">
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;min-height:66px;">
    <div style="font-size:10px;letter-spacing:.5px;text-transform:uppercase;font-weight:900;color:#64748b;">
      ${label}
    </div>
    <div style="margin-top:7px;font-size:15px;line-height:1.35;font-weight:900;color:${color};word-break:break-word;">
      ${value || "-"}
    </div>
  </div>
</td>
`;
};

const amountCard = (label, value, bg, border, color) => {
  return `
<td width="50%" style="padding:6px;vertical-align:top;">
  <div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;">
    <div style="font-size:10px;letter-spacing:.5px;text-transform:uppercase;font-weight:900;color:${color};">
      ${label}
    </div>
    <div style="margin-top:8px;font-size:22px;line-height:1.2;font-weight:900;color:${color};word-break:break-word;">
      ${value}
    </div>
  </div>
</td>
`;
};

const messageBox = (html, bg = "#f8fafc", border = "#e5e7eb", color = "#334155") => {
  return `
<div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:${color};">
  ${html}
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
    badgeBg: "#ecfeff",
    badgeColor: "#0f766e",
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Your order has been dispatched from <strong>Bharat Special Steels Pvt. Ltd.</strong>.
        The bill PDF and LR copy are attached with this email for your records.`,
        "#f0fdfa",
        "#99f6e4",
        "#115e59"
      )}

      <div style="margin:22px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
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

      <div style="margin-top:18px;">
        ${messageBox(
          `<strong>Attachments included:</strong><br/>Bill PDF and LR copy are attached with this email.`,
          "#ffffff",
          "#e5e7eb",
          "#475569"
        )}
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
    badge: isFullyPaid ? "Paid" : "Partial Payment",
    badgeBg: isFullyPaid ? "#dcfce7" : "#fef3c7",
    badgeColor: isFullyPaid ? "#166534" : "#92400e",
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        Thank you. We have recorded your payment against invoice
        <strong>${dispatch.invoiceNumber || "-"}</strong>. Please find the updated payment summary below.`,
        "#f0fdf4",
        "#bbf7d0",
        "#166534"
      )}

      <div style="margin:22px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Payment Summary
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
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

      <div style="margin:22px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
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
          isFullyPaid ? "#f0fdf4" : "#fff7ed",
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