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

const escapeHtml = value => String(value ?? "-").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const { dayKey, daysLate, accountPaymentState } = require("../util/paymentReminderPolicy");
const getReminderMeta = (type, overdueDays = 0) => {
  const upcoming = type === "before_due_date";
  const today = type === "due_date";
  const escalated = !upcoming && !today && overdueDays >= 6;
  const critical = escalated && overdueDays >= 9;
  return {
    critical,
    headerBg: critical ? "#991b1b" : "#0f172a",
    title: upcoming ? "Payment Due Soon" : today ? "Payment Due Today" : critical ? "Critical Payment Overdue" : escalated ? "Urgent: Payment Overdue" : "Payment Overdue",
    badge: upcoming ? "PAYMENT APPROACHING" : today ? "ACTION REQUIRED TODAY" : `${overdueDays} ${overdueDays === 1 ? "DAY" : "DAYS"} OVERDUE`,
    badgeBg: upcoming ? "#fffbeb" : "#fef2f2", badgeBorder: upcoming ? "#fcd34d" : "#fca5a5", badgeColor: upcoming ? "#92400e" : "#b91c1c",
    boxBg: upcoming ? "#fffbeb" : critical ? "#b91c1c" : escalated ? "#991b1b" : "#fef2f2",
    boxBorder: upcoming ? "#fcd34d" : "#991b1b", boxColor: upcoming ? "#78350f" : escalated ? "#ffffff" : "#991b1b",
    message: upcoming ? "Please arrange payment on or before the due date to keep your account within the agreed credit terms." : today ? "Payment is due today. Please arrange settlement and share the payment reference with your sales contact." : critical ? "Your payment remains overdue despite earlier reminders. Settle the overdue balance immediately and share your payment reference today. Further delay may result in your team-approved credit facility being blocked, subject to review by our credit team." : escalated ? "Your account requires immediate attention. Outstanding payments remain overdue. Please settle the overdue balance immediately and confirm your payment plan with your sales contact." : "The agreed payment due date has passed. Please settle the overdue balance and share your remittance details promptly.",
    note: "Interest or late-payment charges may apply to overdue invoices in accordance with the agreed payment terms and company policy." + (critical ? " Further delay may affect credit approval and lead to a block on further credit by our team. New orders and dispatches on credit may be delayed pending settlement and credit review." : escalated ? " Continued non-payment may affect credit approval, processing of future orders and dispatch schedules. Please contact us immediately to avoid disruption." : " Please arrange timely settlement to avoid charges and potential delays in future order processing."),
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
  headerBg = "#0f172a",
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
            <td class="brand-header" style="padding:14px 18px;background:${headerBg};border-bottom:1px solid #1e293b;">
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
                Automated account statement from Bharat RMS. For payment confirmation or queries, contact your sales representative.
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

const buildReminderTemplate = (dispatch, type, overdueDays = 0, invoices = [dispatch], now = new Date()) => {
  const { outstanding, oldestDays } = accountPaymentState(invoices, now);
  if (oldestDays > 0) { type = "overdue"; overdueDays = oldestDays; }
  else if (oldestDays === 0) type = "due_date";
  const meta = getReminderMeta(type, overdueDays);
  if (oldestDays > 0) meta.badge = `OLDEST INVOICE: ${oldestDays} DAYS OVERDUE`;
  const total = outstanding.reduce((sum, item) => sum + Number(item.pendingAmount), 0);
  const overdue = outstanding.filter(item => daysLate(item, now) > 0).reduce((sum, item) => sum + Number(item.pendingAmount), 0);
  const invoiceCards = outstanding.map(item => {
    const late = daysLate(item, now);
    const status = late === null ? "Due date not available" : late > 0 ? `${late} ${late === 1 ? "day" : "days"} overdue` : late === 0 ? "Due today" : `Due in ${-late} days`;
    const color = late >= 0 ? "#b91c1c" : "#92400e";
    return `<div style="margin-top:12px;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:12px;padding:14px;break-inside:avoid;">
      <div style="font-size:14px;font-weight:800;overflow-wrap:anywhere;">${escapeHtml(item.invoiceNumber)}</div>
      <div style="color:${color};font-size:12px;font-weight:700;margin:5px 0 10px;">${status.toUpperCase()}</div>
      <table width="100%" style="font-size:12px;line-height:21px;table-layout:fixed;overflow-wrap:anywhere;">
        <tr><td>Invoice date</td><td align="right">${formatDate(item.invoiceDate)}</td></tr>
        <tr><td>Payment due</td><td align="right">${formatDate(getEffectivePaymentDueDate(item))}</td></tr>
        <tr><td>Invoice amount</td><td align="right">${formatCurrency(item.invoiceValue)}</td></tr>
        <tr><td>Outstanding</td><td align="right" style="font-weight:800;color:${color};">${formatCurrency(item.pendingAmount)}</td></tr>
      </table>
      <div style="font-size:11px;line-height:17px;color:#64748b;margin-top:8px;overflow-wrap:anywhere;">Payment terms: ${escapeHtml(item.paymentTerms || `${item.paymentDueDays || 0} days`)}</div>
      ${item.revisedPaymentDueDate ? `<div style="font-size:11px;line-height:17px;color:#64748b;">Original due: ${formatDate(item.paymentDueDate)} · Revised: ${formatDate(item.revisedPaymentDueDate)}<br/>${escapeHtml(item.revisedPaymentRemark || "Due date revised")}</div>` : ""}
    </div>`;
  }).join("");
  return baseEmailTemplate({
    preHeader: `${meta.title}: ${formatCurrency(overdue || total)} outstanding.`,
    title: meta.title, subtitle: `${escapeHtml(dispatch.companyName)} · Statement as of ${formatDate(now)}`,
    ...meta,
    bodyContent: `
      ${meta.critical ? `
      <div style="background:#b91c1c;border:1px solid #991b1b;border-radius:16px;overflow:hidden;">
        <div style="background:#7f1d1d;padding:12px 16px;font-size:12px;line-height:18px;letter-spacing:1px;font-weight:800;color:#ffffff;">CREDIT FACILITY AT RISK</div>
        <div style="padding:20px 16px;color:#ffffff;">
          <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:.5px;">OVERDUE BALANCE - IMMEDIATE SETTLEMENT REQUIRED</div>
          <div style="font-size:34px;line-height:42px;font-weight:900;margin:8px 0;overflow-wrap:anywhere;">${formatCurrency(overdue)}</div>
          <div style="font-size:14px;line-height:22px;">${meta.message}</div>
        </div>
        <div style="background:#fff1f2;padding:14px 16px;color:#9f1239;font-size:13px;line-height:21px;border-top:1px solid #fda4af;"><strong>Protect your credit eligibility.</strong> Clear the overdue balance or contact your sales representative today with a confirmed payment plan.</div>
      </div>` : messageBox(`Dear <strong>${escapeHtml(dispatch.contactPersonName || "Customer")}</strong>,<br/><br/>${meta.message}`, meta.boxBg, meta.boxBorder, meta.boxColor)}
      ${sectionTitle("Account payment overview")}
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${amountCard("Overdue balance", formatCurrency(overdue), "#fef2f2", "#fca5a5", "#b91c1c")}
        ${amountCard("Total outstanding", formatCurrency(total), "#f8fafc", "#e2e8f0", "#0f172a")}
      </tr></table>
      <div style="margin-top:14px;">${messageBox(`<strong>PAYMENT TERMS &amp; ORDER CONTINUITY</strong><br/>${meta.note}`, "#fff1f2", "#fda4af", "#9f1239")}</div>
      ${sectionTitle(`Outstanding invoices (${outstanding.length})`)}
      ${invoiceCards}
      <div style="margin-top:16px;font-size:13px;line-height:21px;color:#475569;"><strong>Already paid?</strong> Please share the UTR / bank reference, payment date and invoice allocation with your sales contact so we can reconcile your account. This statement reflects payments recorded as of ${formatDate(now)}.</div>
    `,
  });
};

const buildReminderSubject = (dispatch, type, overdueDays = 0, invoices = [dispatch], now = new Date()) => {
  const { outstanding, oldestDays } = accountPaymentState(invoices, now);
  if (oldestDays > 0) { type = "overdue"; overdueDays = oldestDays; }
  else if (oldestDays === 0) type = "due_date";
  const overdue = outstanding.filter(item => daysLate(item, now) > 0).reduce((sum, item) => sum + Number(item.pendingAmount), 0);
  const total = outstanding.reduce((sum, item) => sum + Number(item.pendingAmount), 0);
  const amount = formatCurrency(type === "overdue" ? overdue : total);
  const headline = type === "before_due_date" ? `Payment due soon: ${amount} outstanding - arrange payment before due date`
    : type === "due_date" ? `PAYMENT DUE TODAY: ${amount} outstanding - action required`
    : overdueDays >= 9 ? `CRITICAL PAYMENT OVERDUE: ${amount} overdue - further credit at risk`
    : overdueDays >= 6 ? `URGENT PAYMENT: ${amount} overdue - protect your credit approval`
    : `ACTION REQUIRED: ${amount} overdue - please settle now`;
  const company = String(dispatch.companyName || "Customer").replace(/[\r\n]+/g, " ");
  return `${headline} | ${type === "overdue" ? `${overdueDays} days overdue | ` : ""}${company} | ${dayKey(now)}`;
};

const sendPaymentReminderEmail = async (
  dispatch,
  type,
  overdueDays = 0,
  invoices = [dispatch]
) => {
  const to = cleanEmails([
    dispatch.contactPersonEmail,
  ]);

    /*
   * CC ONLY:
   * Concerned / created salesperson.
   *
   * No info.
   * No finance.
   * No sales ID.
   * No admin.
   * No super admin.
   * No old notification CC list.
   */
  const cc = cleanEmails([
    dispatch.salesPersonEmail,
  ]);

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

    // Fresh subject and no reply headers: do not append to old dispatch threads.
    subject: buildReminderSubject(dispatch, type, overdueDays, invoices),
    html: buildReminderTemplate(dispatch, type, overdueDays, invoices),

  });
};

module.exports = {
  sendPaymentReminderEmail,
  buildReminderTemplate,
  getReminderMeta,
  buildReminderSubject,
};