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

const getEffectivePaymentDueDate = (
  dispatch
) => {
  return (
    dispatch?.revisedPaymentDueDate ||
    dispatch?.paymentDueDate ||
    null
  );
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

        <table width="700" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:700px;max-width:700px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ee;box-shadow:0 12px 34px rgba(15,23,42,0.10);">

          <tr>
            <td class="brand-header" style="padding:14px 18px;background:#0f172a;border-bottom:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="brand-logo-cell" width="48" style="width:48px;vertical-align:middle;">
                    <table width="40" height="40" cellpadding="0" cellspacing="0" border="0" class="brand-logo-box" style="width:40px;height:40px;background:#ffffff;border-radius:10px;border:1px solid #334155;">
                      <tr>
                        <td align="center" valign="middle">
                          <img class="brand-logo-img" src="${COMPANY.logoUrl}" width="32" alt="${COMPANY.shortName}" style="display:block;width:32px;max-width:32px;height:auto;border:0;outline:none;text-decoration:none;" />
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td style="vertical-align:middle;">
                    <div class="brand-name" style="font-size:18px;line-height:22px;font-weight:900;color:#ffffff;white-space:nowrap;">
                      ${COMPANY.shortName}
                    </div>
                    <div class="brand-subtitle" style="font-size:11px;line-height:15px;color:#cbd5e1;margin-top:1px;">
                      Accounts Reminder
                    </div>
                  </td>

                  <td class="desktop-badge-cell" align="right" style="vertical-align:middle;width:1%;white-space:nowrap;">
                    <span class="badge-pill" style="display:inline-block;background:${badgeBg};border:1px solid ${badgeBorder};color:${badgeColor};border-radius:999px;padding:7px 10px;font-size:10px;line-height:13px;font-weight:900;white-space:nowrap;">
                      ${badge}
                    </span>
                  </td>
                </tr>

                <tr class="mobile-badge-row" style="display:none;">
                  <td class="mobile-badge-cell" colspan="3" style="display:none;">
                    <span class="badge-pill" style="display:inline-block;background:${badgeBg};border:1px solid ${badgeBorder};color:${badgeColor};border-radius:999px;padding:7px 10px;font-size:10px;line-height:13px;font-weight:900;white-space:nowrap;">
                      ${badge}
                    </span>
                  </td>
                </tr>
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
<div style="margin:18px 0 7px;font-size:12px;line-height:16px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:.4px;">
  ${title}
</div>
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

const messageBox = (
  html,
  bg = "#ecfdf5",
  border = "#bbf7d0",
  color = "#166534"
) => {
  return `
<div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:13px 14px;font-size:13px;line-height:21px;color:${color};">
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
          ${
  dispatch.revisedPaymentDueDate
    ? `
      <div style="margin-top:13px;">
        ${messageBox(
          `<strong>Original Due Date:</strong> ${formatDate(
            dispatch.paymentDueDate
          )}<br/>
          <strong>Revised Due Date:</strong> ${formatDate(
            dispatch.revisedPaymentDueDate
          )}<br/>
          <strong>Revision Remark:</strong> ${
            dispatch.revisedPaymentRemark ||
            "-"
          }`,
          "#fff7ed",
          "#fed7aa",
          "#9a3412"
        )}
      </div>
    `
    : ""
}
        </tr>
      </table>

      <div style="margin-top:13px;">
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

const sendPaymentReminderEmail = async (
  dispatch,
  type,
  overdueDays = 0
) => {
  const to = cleanEmails([
    dispatch.contactPersonEmail,
  ]);

  /*
   * CC ONLY:
   * 1. Info
   * 2. Concerned Salesperson
   * 3. Finance
   *
   * No admin.
   * No super admin.
   * No old notification CC list.
   * No sales@bharatspecialsteels.com.
   */
  const cc = cleanEmails([
  dispatch.salesPersonEmail,
  "finance@bharatspecialsteels.com",
]).filter(
  (email) =>
    ![
      "info@bharatspecialsteels.com",
      "sales@bharatspecialsteels.com",
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase(),
      process.env.SUPER_ADMIN_EMAIL
        ?.trim()
        .toLowerCase(),
    ]
      .filter(Boolean)
      .includes(email)
);

  if (!to.length) {
    throw new Error(
      `Customer email is missing for invoice ${
        dispatch.invoiceNumber || "-"
      }.`
    );
  }

  return transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,

    to,
    cc,

    subject: `${getReminderTitle(
      type,
      overdueDays
    )} | Invoice ${
      dispatch.invoiceNumber
    } | Pending ${formatCurrency(
      dispatch.pendingAmount
    )}`,

    html: buildReminderTemplate(
      dispatch,
      type,
      overdueDays
    ),

    inReplyTo:
      dispatch.notificationEmail?.messageId || undefined,

    references:
      dispatch.notificationEmail?.messageId || undefined,
  });
};

module.exports = {
  sendPaymentReminderEmail,
};