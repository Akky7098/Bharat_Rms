const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  shortName: "Bharat Special Steels",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",

  // Add this in .env
  // COMPANY_LOGO_URL=https://dashboard.bharatspecialsteels.com/logo.png
  logoUrl:
    process.env.COMPANY_LOGO_URL ||
    "https://dashboard.bharatspecialsteels.com/logo.png",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const cleanEmails = (emails = []) => [
  ...new Set(
    emails
      .filter(Boolean)
      .map((e) => String(e).trim().toLowerCase())
      .filter((e) => e.includes("@"))
  ),
];

const getReminderMeta = (type, overdueDays) => {
  if (type === "before_due_date") {
    return {
      title: "Upcoming Payment Reminder",
      badge: "Upcoming",
      badgeBg: "#ecfdf5",
      badgeColor: "#047857",
      message:
        "This is a gentle reminder that the payment for the below invoice is approaching its due date.",
      note:
        "We request you to kindly keep this invoice scheduled for payment as per agreed terms.",
    };
  }

  if (type === "due_date") {
    return {
      title: "Payment Due Today",
      badge: "Due Today",
      badgeBg: "#fff7ed",
      badgeColor: "#c2410c",
      message:
        "This is a courteous reminder that the payment for the below invoice is due today.",
      note:
        "Kindly arrange the payment as per the agreed terms. If already processed, please ignore this message.",
    };
  }

  return {
    title: "Payment Follow-up",
    badge: `${overdueDays} Days Overdue`,
    badgeBg: "#fef2f2",
    badgeColor: "#b91c1c",
    message:
      "This is a polite follow-up regarding the pending payment for the below invoice.",
    note:
      "We request you to kindly process the pending payment at the earliest. If payment has already been made, please share the details with our team.",
  };
};

const baseEmailTemplate = ({
  preHeader = "",
  title,
  subtitle,
  badge,
  badgeBg,
  badgeColor,
  bodyContent,
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
    ${preHeader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:16px 0;">
    <tr>
      <td align="center" style="padding:0 10px;">

        <table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">

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
                      Accounts Reminder
                    </div>
                  </td>

                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:${badgeBg};color:${badgeColor};border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;white-space:nowrap;">
                      ${badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 24px 12px;background:#ffffff;">
              <div style="font-size:26px;line-height:1.22;font-weight:900;color:#0f172a;">
                ${title}
              </div>
              <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#64748b;">
                ${subtitle}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 26px;">
              ${bodyContent}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;font-weight:900;color:#0f172a;">
                ${COMPANY.name}
              </div>

              <div style="margin-top:6px;font-size:12px;color:#64748b;line-height:1.6;">
                ${COMPANY.address}
              </div>

              <div style="margin-top:14px;font-size:11px;color:#94a3b8;line-height:1.6;">
                This is an automated accounts reminder from Bharat RMS. Please do not reply directly to this email.
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

const amountCard = (label, value, bg, border, color) => {
  return `
<td width="50%" style="padding:6px;vertical-align:top;">
  <div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;">
    <div style="font-size:10px;letter-spacing:.5px;text-transform:uppercase;font-weight:900;color:${color};">
      ${label}
    </div>
    <div style="margin-top:8px;font-size:21px;line-height:1.2;font-weight:900;color:${color};word-break:break-word;">
      ${value}
    </div>
  </div>
</td>
`;
};

const infoCard = (label, value, color = "#111827") => {
  return `
<td width="50%" style="padding:6px;vertical-align:top;">
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;min-height:62px;">
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

const messageBox = (html, bg = "#f0fdfa", border = "#99f6e4", color = "#115e59") => {
  return `
<div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:${color};">
  ${html}
</div>
`;
};

const buildReminderTemplate = (dispatch, type, overdueDays = 0) => {
  const meta = getReminderMeta(type, overdueDays);

  return baseEmailTemplate({
    preHeader: `${meta.title} for invoice ${dispatch.invoiceNumber}.`,
    title: meta.title,
    subtitle: `Invoice ${dispatch.invoiceNumber || "-"} · ${
      dispatch.companyName || "-"
    }`,
    badge: meta.badge,
    badgeBg: meta.badgeBg,
    badgeColor: meta.badgeColor,
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        ${meta.message}`,
        type === "overdue" ? "#fff7ed" : "#f0fdfa",
        type === "overdue" ? "#fed7aa" : "#99f6e4",
        type === "overdue" ? "#9a3412" : "#115e59"
      )}

      <div style="margin:22px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
        Payment Overview
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
            "Pending Amount",
            formatCurrency(dispatch.pendingAmount),
            "#fff7ed",
            "#fed7aa",
            "#c2410c"
          )}
        </tr>
      </table>

      <div style="margin:18px 0 8px;font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">
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

      <div style="margin-top:18px;">
        ${messageBox(
          meta.note,
          "#ffffff",
          "#e5e7eb",
          "#475569"
        )}
      </div>
    `,
  });
};

const getReminderTitle = (type, overdueDays) => {
  return getReminderMeta(type, overdueDays).title;
};

const sendPaymentReminderEmail = async (dispatch, type, overdueDays = 0) => {
  const cc = cleanEmails([
    dispatch.salesPersonEmail,
    ...(dispatch.notificationEmail?.cc || []),
  ]);

  return transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to: dispatch.contactPersonEmail,
    cc,
    subject: `${getReminderTitle(type, overdueDays)} | Invoice ${
      dispatch.invoiceNumber
    } | Pending ${formatCurrency(dispatch.pendingAmount)}`,
    html: buildReminderTemplate(dispatch, type, overdueDays),
    inReplyTo: dispatch.notificationEmail?.messageId || undefined,
    references: dispatch.notificationEmail?.messageId || undefined,
  });
};

module.exports = {
  sendPaymentReminderEmail,
};