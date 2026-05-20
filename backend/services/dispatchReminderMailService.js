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
      badgeBorder: "#bbf7d0",
      badgeColor: "#047857",
      message:
        "This is a gentle reminder that the payment for the below invoice is approaching its due date.",
      note:
        "We request you to kindly keep this invoice scheduled for payment as per agreed terms.",
      boxBg: "#ecfdf5",
      boxBorder: "#bbf7d0",
      boxColor: "#166534",
    };
  }

  if (type === "due_date") {
    return {
      title: "Payment Due Today",
      badge: "Due Today",
      badgeBg: "#fff7ed",
      badgeBorder: "#fed7aa",
      badgeColor: "#c2410c",
      message:
        "This is a courteous reminder that the payment for the below invoice is due today.",
      note:
        "Kindly arrange the payment as per the agreed terms. If already processed, please ignore this message.",
      boxBg: "#fff7ed",
      boxBorder: "#fed7aa",
      boxColor: "#9a3412",
    };
  }

  return {
    title: "Payment Follow-up",
    badge: `${overdueDays || 0} Days Overdue`,
    badgeBg: "#fef2f2",
    badgeBorder: "#fecaca",
    badgeColor: "#b91c1c",
    message:
      "This is a polite follow-up regarding the pending payment for the below invoice.",
    note:
      "We request you to kindly process the pending payment at the earliest. If payment has already been made, please share the details with our team.",
    boxBg: "#fef2f2",
    boxBorder: "#fecaca",
    boxColor: "#991b1b",
  };
};

const baseEmailTemplate = ({
  preHeader = "",
  title,
  subtitle,
  badge,
  badgeBg,
  badgeBorder,
  badgeColor,
  bodyContent,
}) => {
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

      .brand-logo-cell {
        width: 58px !important;
      }

      .badge-cell {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        padding-top: 12px !important;
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
                      Accounts Reminder
                    </div>
                  </td>

                  <td class="badge-cell" align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:${badgeBg};border:1px solid ${badgeBorder};color:${badgeColor};border-radius:999px;padding:8px 13px;font-size:11px;line-height:14px;font-weight:900;white-space:nowrap;">
                      ${badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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

          <tr>
            <td class="email-content" style="padding:0 24px 28px;">
              ${bodyContent}
            </td>
          </tr>

          <tr>
            <td class="email-footer" style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;line-height:20px;font-weight:900;color:#0f172a;">
                ${COMPANY.name}
              </div>
              <div style="margin-top:5px;font-size:12px;line-height:19px;color:#64748b;">
                ${COMPANY.address}
              </div>
              <div style="margin-top:12px;font-size:11px;line-height:17px;color:#94a3b8;">
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

const sectionTitle = (title) => {
  return `
<div style="margin:24px 0 10px;font-size:13px;line-height:18px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.45px;">
  ${title}
</div>
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

const messageBox = (
  html,
  bg = "#ecfdf5",
  border = "#bbf7d0",
  color = "#166534"
) => {
  return `
<div style="background:${bg};border:1px solid ${border};border-radius:18px;padding:17px 18px;font-size:14px;line-height:23px;color:${color};">
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
    badgeBorder: meta.badgeBorder,
    badgeColor: meta.badgeColor,
    bodyContent: `
      ${messageBox(
        `Dear <strong>${dispatch.contactPersonName || "Customer"}</strong>,<br/><br/>
        ${meta.message}`,
        meta.boxBg,
        meta.boxBorder,
        meta.boxColor
      )}

      ${sectionTitle("Payment Overview")}

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
            "Pending Amount",
            formatCurrency(dispatch.pendingAmount),
            "#fff7ed",
            "#fed7aa",
            "#c2410c"
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