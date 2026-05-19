const transporter = require("../util/mailTransporter");

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",
  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN");
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const baseTemplate = ({ title, subtitle, body }) => {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#f4f7fb;">
      <tr>
        <td align="center">
          <table width="640" cellpadding="0" cellspacing="0" style="width:94%;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:#ffffff;border-bottom:1px solid #eef2f7;">
                <div style="font-size:16px;font-weight:900;color:#0f172a;">Bharat Special Steels</div>
                <div style="font-size:12px;color:#64748b;margin-top:3px;">Attendance Notification</div>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 24px 12px;">
                <h2 style="margin:0;font-size:24px;color:#0f172a;">${title}</h2>
                <p style="margin:8px 0 0;font-size:14px;color:#64748b;">${subtitle}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 24px 28px;">
                ${body}
              </td>
            </tr>

            <tr>
              <td style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
                <div style="font-size:13px;font-weight:900;color:#0f172a;">${COMPANY.name}</div>
                <div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:5px;">${COMPANY.address}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:12px;">Automated message from Bharat RMS.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

const infoRow = (label, value) => `
  <tr>
    <td style="padding:11px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:800;color:#475569;width:38%;">${label}</td>
    <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:800;color:#111827;">${value || "-"}</td>
  </tr>
`;

const sendMissedCheckoutMailToUser = async (attendance) => {
  return transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to: attendance.employeeEmail,
    subject: `Attendance Regularization Required | ${formatDate(
      attendance.attendanceDate
    )}`,
    html: baseTemplate({
      title: "Checkout Missing",
      subtitle: `Attendance date: ${formatDate(attendance.attendanceDate)}`,
      body: `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#9a3412;">
          Dear <strong>${attendance.employeeName}</strong>,<br/><br/>
          Our system found that your check-out is missing for the below attendance record.
          Please submit a regularization request with the correct check-out time and reason.
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          ${infoRow("Date", formatDate(attendance.attendanceDate))}
          ${infoRow("Check-in Time", formatTime(attendance.checkIn?.time))}
          ${infoRow("Work Mode", attendance.workMode)}
          ${infoRow("Status", "Regularization Required")}
        </table>

        <div style="margin-top:18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;font-size:13px;line-height:1.6;color:#475569;">
          If you were on a client visit or forgot to check out, please regularize from the RMS attendance page.
        </div>
      `,
    }),
  });
};

const sendRegularizationRequestMailToAdmin = async (attendance) => {
  return transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    cc: process.env.SUPER_ADMIN_EMAIL || "",
    subject: `Attendance Regularization Approval Required | ${attendance.employeeName}`,
    html: baseTemplate({
      title: "Regularization Approval Required",
      subtitle: `${attendance.employeeName} submitted an attendance regularization request.`,
      body: `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
          A regularization request has been submitted. Please review and approve/reject from the RMS attendance panel.
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          ${infoRow("Employee", attendance.employeeName)}
          ${infoRow("Date", formatDate(attendance.attendanceDate))}
          ${infoRow("Type", attendance.regularization?.type)}
          ${infoRow("Reason", attendance.regularization?.reason)}
          ${infoRow("Requested Check-in", formatTime(attendance.regularization?.requestedCheckIn))}
          ${infoRow("Requested Check-out", formatTime(attendance.regularization?.requestedCheckOut))}
        </table>
      `,
    }),
  });
};

const sendRegularizationDecisionMailToUser = async (attendance, status) => {
  const approved = status === "approved";

  return transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.ADMIN_EMAIL}>`,
    to: attendance.employeeEmail,
    subject: `Attendance Regularization ${approved ? "Approved" : "Rejected"} | ${formatDate(
      attendance.attendanceDate
    )}`,
    html: baseTemplate({
      title: approved ? "Regularization Approved" : "Regularization Rejected",
      subtitle: `Attendance date: ${formatDate(attendance.attendanceDate)}`,
      body: `
        <div style="background:${
          approved ? "#f0fdf4" : "#fef2f2"
        };border:1px solid ${
        approved ? "#bbf7d0" : "#fecaca"
      };border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:${
        approved ? "#166534" : "#991b1b"
      };">
          Dear <strong>${attendance.employeeName}</strong>,<br/><br/>
          Your attendance regularization request has been <strong>${
            approved ? "approved" : "rejected"
          }</strong>.
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          ${infoRow("Date", formatDate(attendance.attendanceDate))}
          ${infoRow("Check-in", formatTime(attendance.checkIn?.time))}
          ${infoRow("Check-out", formatTime(attendance.checkOut?.time))}
          ${infoRow("Status", attendance.attendanceStatus)}
          ${
            !approved
              ? infoRow("Rejection Reason", attendance.regularization?.rejectionReason)
              : ""
          }
        </table>
      `,
    }),
  });
};

module.exports = {
  sendMissedCheckoutMailToUser,
  sendRegularizationRequestMailToAdmin,
  sendRegularizationDecisionMailToUser,
};