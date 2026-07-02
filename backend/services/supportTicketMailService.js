const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",
};

const SUPPORT_CC = [
  "info@bharatspecialsteels.com",
  "manager@bharatspecialsteels.com",
];

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://dashboard.bharatspecialsteels.com"
).replace(/\/$/, "");

const BACKEND_URL = (
  process.env.BACKEND_URL || "https://bharatspecialsteels.bharatspecialsteels.com"
).replace(/\/$/, "");

const normalizeEmail = (email) =>
  String(email || "").trim().toLowerCase();

const uniqueEmails = (...groups) => {
  const emails = [];

  groups.flat().filter(Boolean).forEach((item) => {
    String(item)
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
      .forEach((email) => {
        if (!emails.includes(email)) emails.push(email);
      });
  });

  return emails;
};

const removeEmails = (list = [], removeList = []) => {
  const removeSet = new Set(uniqueEmails(removeList));
  return uniqueEmails(list).filter((email) => !removeSet.has(email));
};

const getAssignmentRecipients = (ticket) => {
  const to = uniqueEmails(ticket.assignedToEmail);

  const cc = removeEmails(
    uniqueEmails(SUPPORT_CC, ticket.createdByEmail),
    to
  );

  return { to, cc };
};

const getLoopRecipients = ({ ticket, senderEmail }) => {
  const to = removeEmails(
    uniqueEmails(ticket.assignedToEmail, ticket.createdByEmail),
    senderEmail
  );

  const cc = removeEmails(
    uniqueEmails(SUPPORT_CC),
    [...to, senderEmail]
  );

  return { to, cc };
};

const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const statusLabel = (status) =>
  ({
    open: "Open",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
    closed: "Closed",
  }[status] || status);

const priorityLabel = (priority) =>
  ({
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  }[priority] || priority);

const priorityColor = (priority) =>
  ({
    low: "#475569",
    medium: "#2563eb",
    high: "#ea580c",
    critical: "#dc2626",
  }[priority] || "#2563eb");

const statusColor = (status) =>
  ({
    open: "#2563eb",
    in_progress: "#d97706",
    on_hold: "#dc2626",
    completed: "#16a34a",
    closed: "#475569",
  }[status] || "#2563eb");

const fileUrl = (file) => {
  if (!file?.fileUrl) return "";
  if (file.fileUrl.startsWith("http")) return file.fileUrl;
  return `${BACKEND_URL}${file.fileUrl}`;
};

const infoRow = (label, value) => `
  <tr>
    <td style="padding:11px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:900;color:#64748b;width:36%;text-transform:uppercase;">
      ${label}
    </td>
    <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:800;color:#0f172a;">
      ${value || "-"}
    </td>
  </tr>
`;

const baseTemplate = ({ title, subtitle, badge, badgeColor = "#2563eb", body }) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:26px 0;background:#eef2f7;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="width:94%;max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:22px 26px;background:linear-gradient(135deg,#07111f,#13295f,#2563eb);color:#ffffff;">
              <div style="font-size:16px;font-weight:900;">Bharat Special Steels</div>
              <div style="font-size:12px;color:#dbeafe;margin-top:4px;">Support Desk</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 26px 10px;">
              ${
                badge
                  ? `<div style="display:inline-block;background:${badgeColor};color:#ffffff;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:900;text-transform:uppercase;">${badge}</div>`
                  : ""
              }
              <h2 style="margin:14px 0 6px;font-size:23px;line-height:1.25;color:#0f172a;">${title}</h2>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">${subtitle}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 26px 28px;">
              ${body}
            </td>
          </tr>

          <tr>
            <td style="padding:18px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <div style="font-size:13px;font-weight:900;color:#0f172a;">${COMPANY.name}</div>
              <div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:5px;">${COMPANY.address}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ticketButton = () => `
  <div style="margin-top:20px;">
    <a href="${FRONTEND_URL}/dashboard#support" style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;border-radius:14px;padding:14px 16px;font-size:14px;font-weight:900;">
      Open Dashboard
    </a>
  </div>
`;

const filesBlock = (attachments = []) => {
  if (!attachments.length) return "";

  return `
    <div style="margin-top:18px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <div style="background:#f8fafc;padding:12px 14px;font-size:13px;font-weight:900;color:#0f172a;">
        Attachments (${attachments.length})
      </div>

      ${attachments
        .map((file) => {
          const url = fileUrl(file);
          const name = file.originalName || file.fileName || "Attachment";

          return `
            <a href="${url}" target="_blank" style="display:block;padding:12px 14px;border-top:1px solid #e5e7eb;font-size:13px;color:#2563eb;font-weight:900;text-decoration:none;">
              📎 ${name}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
};

const getThreadHeaders = (ticket) => {
  const messageId = ticket?.emailThread?.messageId;
  const references = ticket?.emailThread?.references || [];

  if (!messageId) return {};

  return {
    inReplyTo: messageId,
    references: [...new Set([...references, messageId])],
  };
};

const taskTable = (ticket) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
    ${infoRow("Ticket No.", ticket.ticketNumber)}
    ${infoRow("Title", ticket.title)}
    ${infoRow("Priority", priorityLabel(ticket.priority))}
    ${infoRow("Status", statusLabel(ticket.status))}
    ${infoRow("Created Time", formatDateTime(ticket.createdAt))}
${infoRow("Due Date / Time", formatDateTime(ticket.dueDate))}
    ${infoRow("Assigned By", ticket.createdByName)}
  </table>
`;

const descriptionBlock = (description) => `
  <div style="margin-top:18px;background:#ffffff;border:1px solid #e5e7eb;border-left:5px solid #2563eb;border-radius:16px;padding:16px;font-size:13px;line-height:1.7;color:#334155;">
    <strong style="color:#0f172a;">Task Description</strong><br/>
    ${description || "-"}
  </div>
`;

const commentBlock = (message) => `
  <div style="margin-top:18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:16px;font-size:14px;line-height:1.7;color:#334155;">
    <strong style="color:#0f172a;">${message.senderName}</strong> added a comment:
    <div style="margin-top:12px;background:#ffffff;border-left:5px solid #2563eb;padding:14px;border-radius:12px;color:#111827;font-size:13px;font-weight:700;line-height:1.7;white-space:pre-wrap;word-break:break-word;">
      ${message.message || "Shared attachment(s)."}
    </div>
  </div>
`;

const sendTicketAssignedMailToEmployee = async (ticket) => {
  const { to, cc } = getAssignmentRecipients(ticket);

  return transporter.sendMail({
    from: `"${COMPANY.name} Support Desk" <${process.env.ADMIN_EMAIL}>`,
    to,
    cc,
    subject: `[${ticket.ticketNumber}] New Task Assigned - ${ticket.title}`,
    html: baseTemplate({
      title: "New Task Assigned",
      subtitle: `${ticket.ticketNumber} has been assigned to ${ticket.assignedToName}.`,
      badge: priorityLabel(ticket.priority),
      badgeColor: priorityColor(ticket.priority),
      body: `
        ${taskTable(ticket)}
        ${descriptionBlock(ticket.description)}
        ${filesBlock(ticket.attachments)}
        ${ticketButton()}
      `,
    }),
  });
};

const sendTicketMessageMail = async ({ ticket, message }) => {
  const senderEmail = normalizeEmail(message.senderEmail);

  const { to, cc } = getLoopRecipients({
    ticket,
    senderEmail,
  });

  return transporter.sendMail({
    from: `"${COMPANY.name} Support Desk" <${process.env.ADMIN_EMAIL}>`,
    to,
    cc,
    subject: `Re: [${ticket.ticketNumber}] ${ticket.title}`,
    ...getThreadHeaders(ticket),
    html: baseTemplate({
      title: "Ticket Comment Added",
      subtitle: `${message.senderName} commented on ${ticket.ticketNumber}.`,
      badge: "Comment",
      badgeColor: "#2563eb",
      body: `
        ${commentBlock(message)}
        ${filesBlock(message.attachments)}
        ${taskTable(ticket)}
        ${ticketButton()}
      `,
    }),
  });
};

const sendTicketStatusChangedMail = async ({
  ticket,
  oldStatus,
  changedBy,
  changedByEmail,
}) => {
  const { to, cc } = getLoopRecipients({
    ticket,
    senderEmail: changedByEmail,
  });

  return transporter.sendMail({
    from: `"${COMPANY.name} Support Desk" <${process.env.ADMIN_EMAIL}>`,
    to,
    cc,
    subject: `Re: [${ticket.ticketNumber}] Status Updated - ${statusLabel(ticket.status)}`,
    ...getThreadHeaders(ticket),
    html: baseTemplate({
      title: "Ticket Status Updated",
      subtitle: `${ticket.ticketNumber} status was updated by ${changedBy}.`,
      badge: statusLabel(ticket.status),
      badgeColor: statusColor(ticket.status),
      body: `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:18px;padding:16px;font-size:14px;line-height:1.7;color:#166534;">
          Status changed from <strong>${statusLabel(oldStatus)}</strong> to <strong>${statusLabel(ticket.status)}</strong>.
        </div>

        ${taskTable(ticket)}
        ${ticketButton()}
      `,
    }),
  });
};

module.exports = {
  sendTicketAssignedMailToEmployee,
  sendTicketMessageMail,
  sendTicketStatusChangedMail,
};