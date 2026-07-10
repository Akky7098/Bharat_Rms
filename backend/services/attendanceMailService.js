const transporter = require("../util/mailTransporter");

/* =====================================================
   COMPANY
===================================================== */

const COMPANY = {
  name: "Bharat Special Steels Pvt. Ltd.",

  address:
    "107, First Floor, SSR Corporate Tower, near NHPC Metro, Faridabad, Haryana 121003",
};

/* =====================================================
   EMAIL ADDRESSES

   These environment variables can override the defaults.
===================================================== */

const EMAILS = {
  admin:
    process.env.ATTENDANCE_ADMIN_EMAIL ||
    "sonia@bharatspecialsteels.com",

  superAdmin:
    process.env.SUPER_ADMIN_EMAIL ||
    "info@bharatspecialsteels.com",

  finance:
    process.env.FINANCE_EMAIL ||
    "finance@bharatspecialsteels.com",

  sender:
    process.env.ADMIN_EMAIL ||
    process.env.ATTENDANCE_ADMIN_EMAIL ||
    "info@bharatspecialsteels.com",
};

/* =====================================================
   LINKS
===================================================== */

const getFrontendUrl = () => {
  return (
    process.env.FRONTEND_URL ||
    "https://dashboard.bharatspecialsteels.com"
  ).replace(/\/$/, "");
};

const getAttendanceDashboardUrl = () => {
  return `${getFrontendUrl()}/dashboard#attendance`;
};

/* =====================================================
   COMMON HELPERS
===================================================== */

const cleanText = (value = "") => {
  return String(value || "").trim();
};

const normalizeRole = (role = "") => {
  return cleanText(role)
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const uniqueEmails = (emails = []) => {
  return Array.from(
    new Set(
      emails
        .flatMap((email) =>
          String(email || "").split(",")
        )
        .map((email) => email.trim())
        .filter(Boolean)
    )
  );
};

const joinEmails = (emails = []) => {
  return uniqueEmails(emails).join(",");
};

const escapeHtml = (value = "") => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/* =====================================================
   DATE / TIME

   Never use getUTCHours() here.
   Every displayed value is converted to Asia/Kolkata.
===================================================== */

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const formatTime = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

/*
 * Keep this function name because the current attendance service
 * and existing templates may already import/use it.
 *
 * It now correctly uses IST instead of getUTCHours().
 */
const formatRegularizedTime = (date) => {
  return formatTime(date);
};

const formatLabel = (value = "") => {
  return cleanText(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const formatLeaveType = (leaveType) => {
  if (leaveType === "paid_leave") {
    return "Paid Leave";
  }

  if (leaveType === "loss_of_pay") {
    return "Loss of Pay";
  }

  return formatLabel(leaveType);
};

const formatLeaveDuration = (duration) => {
  if (duration === "full_day") {
    return "Full Day";
  }

  if (duration === "first_half") {
    return "First Half";
  }

  if (duration === "second_half") {
    return "Second Half";
  }

  return formatLabel(duration);
};

const formatWorkMode = (workMode) => {
  return workMode === "work_from_home"
    ? "Work From Home"
    : "Office";
};

/* =====================================================
   RECIPIENT HIERARCHY
===================================================== */

/*
 * User request:
 * To: Sonia
 * CC: Super Admin + Finance
 *
 * Admin request:
 * To: Super Admin
 * CC: Finance
 */
const getApprovalRecipients = ({
  employeeRole,
}) => {
  const role = normalizeRole(employeeRole);

  if (role === "admin") {
    return {
      to: EMAILS.superAdmin,
      cc: joinEmails([
        EMAILS.finance,
      ]),
    };
  }

  return {
    to: EMAILS.admin,
    cc: joinEmails([
      EMAILS.superAdmin,
      EMAILS.finance,
    ]),
  };
};

/*
 * Decision email:
 * Employee receives the decision.
 * Finance and management remain in CC for audit visibility.
 */
const getDecisionCc = ({
  employeeRole,
  decidedByEmail,
}) => {
  const role = normalizeRole(employeeRole);

  if (role === "admin") {
    return joinEmails([
      EMAILS.superAdmin,
      EMAILS.finance,
      decidedByEmail,
    ]);
  }

  return joinEmails([
    EMAILS.admin,
    EMAILS.superAdmin,
    EMAILS.finance,
    decidedByEmail,
  ]);
};

/* =====================================================
   BASE EMAIL COMPONENTS
===================================================== */

const dashboardButton = ({
  label = "Open Bharat RMS Attendance",
} = {}) => {
  const dashboardUrl =
    getAttendanceDashboardUrl();

  return `
    <div style="margin-top:22px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:16px;">
      <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:12px;">
        Open Attendance Dashboard
      </div>

      <a
        href="${dashboardUrl}"
        target="_blank"
        rel="noopener noreferrer"
        style="display:block;background:#166534;color:#ffffff;text-decoration:none;text-align:center;border-radius:12px;padding:13px 16px;font-size:14px;font-weight:900;"
      >
        ${escapeHtml(label)}
      </a>

      <div style="margin-top:10px;font-size:12px;line-height:1.5;color:#64748b;">
        Log in to Bharat RMS to review attendance, regularization, leave and work-from-home requests.
      </div>
    </div>
  `;
};

const baseTemplate = ({
  title,
  subtitle,
  body,
}) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />
    </head>

    <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
        style="padding:24px 0;background:#f4f7fb;"
      >
        <tr>
          <td align="center">
            <table
              width="640"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="width:94%;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;"
            >
              <tr>
                <td
                  style="
                    padding:22px 24px;
                    background:
                      linear-gradient(
                        135deg,
                        #07111f,
                        #0f2f2a,
                        #14532d
                      );
                    border-bottom:1px solid #0f5132;
                  "
                >
                  <div style="font-size:16px;font-weight:900;color:#ffffff;">
                    Bharat Special Steels
                  </div>

                  <div style="font-size:12px;color:#bbf7d0;margin-top:3px;">
                    Attendance & Leave Notification
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:26px 24px 12px;">
                  <h2 style="margin:0;font-size:24px;color:#0f172a;">
                    ${escapeHtml(title)}
                  </h2>

                  <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.5;">
                    ${escapeHtml(subtitle)}
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 24px 28px;">
                  ${body}
                </td>
              </tr>

              <tr>
                <td style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
                  <div style="font-size:13px;font-weight:900;color:#0f172a;">
                    ${COMPANY.name}
                  </div>

                  <div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:5px;">
                    ${COMPANY.address}
                  </div>

                  <div style="font-size:11px;color:#94a3b8;margin-top:12px;">
                    Automated message from Bharat RMS. All times shown are Indian Standard Time.
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

const infoRow = (
  label,
  value
) => `
  <tr>
    <td
      style="
        padding:11px 14px;
        background:#f8fafc;
        border-bottom:1px solid #e5e7eb;
        font-size:13px;
        font-weight:800;
        color:#475569;
        width:38%;
        vertical-align:top;
      "
    >
      ${escapeHtml(label)}
    </td>

    <td
      style="
        padding:11px 14px;
        border-bottom:1px solid #e5e7eb;
        font-size:13px;
        font-weight:800;
        color:#111827;
        line-height:1.5;
        word-break:break-word;
      "
    >
      ${escapeHtml(value || "-")}
    </td>
  </tr>
`;

const statusPanel = ({
  approved,
  employeeName,
  entityName,
  status,
}) => {
  const background = approved
    ? "#f0fdf4"
    : "#fef2f2";

  const border = approved
    ? "#bbf7d0"
    : "#fecaca";

  const color = approved
    ? "#166534"
    : "#991b1b";

  return `
    <div
      style="
        background:${background};
        border:1px solid ${border};
        border-radius:16px;
        padding:16px;
        font-size:14px;
        line-height:1.7;
        color:${color};
      "
    >
      Dear <strong>${escapeHtml(employeeName)}</strong>,<br/><br/>

      Your ${escapeHtml(entityName)} request has been
      <strong>${escapeHtml(status)}</strong>.
    </div>
  `;
};

/* =====================================================
   MISSED CHECKOUT
===================================================== */

const sendMissedCheckoutMailToUser = async (
  attendance
) => {
  if (!attendance?.employeeEmail) {
    return null;
  }

  return transporter.sendMail({
    from: `"${COMPANY.name}" <${EMAILS.sender}>`,

    to: attendance.employeeEmail,

    subject: `Attendance Regularization Required | ${formatDate(
      attendance.attendanceDate
    )}`,

    html: baseTemplate({
      title: "Checkout Missing",

      subtitle: `Attendance date: ${formatDate(
        attendance.attendanceDate
      )}`,

      body: `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#9a3412;">
          Dear <strong>${escapeHtml(
            attendance.employeeName
          )}</strong>,<br/><br/>

          Our system found that your check-out is missing for the attendance record below.

          Please submit a regularization request with the exact check-out time and a clear reason.
        </div>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
        >
          ${infoRow(
            "Date",
            formatDate(attendance.attendanceDate)
          )}

          ${infoRow(
            "Check-in Time",
            formatTime(
              attendance.checkIn?.time
            )
          )}

          ${infoRow(
            "Work Mode",
            formatWorkMode(
              attendance.workMode
            )
          )}

          ${infoRow(
            "Status",
            "Regularization Required"
          )}
        </table>

        <div style="margin-top:18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;font-size:13px;line-height:1.6;color:#475569;">
          Please update regularization. Otherwise, this attendance may be marked as absent according to company policy.
        </div>

        ${dashboardButton({
          label: "Open Attendance & Regularize",
        })}
      `,
    }),
  });
};

/* =====================================================
   REGULARIZATION REQUEST
===================================================== */

const sendRegularizationRequestMailToAdmin =
  async (attendance, requester = {}) => {
    const employeeRole =
      requester.role ||
      attendance.raisedByRole ||
      attendance.employeeRole ||
      "user";

    const recipients =
      getApprovalRecipients({
        employeeRole,
      });

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: recipients.to,

      cc: recipients.cc,

      subject: `Attendance Regularization Approval Required | ${attendance.employeeName}`,

      html: baseTemplate({
        title:
          "Regularization Approval Required",

        subtitle: `${attendance.employeeName} submitted an attendance regularization request.`,

        body: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
            An attendance regularization request has been submitted.

            Please review the exact Indian Standard Time values below and approve or reject the request in Bharat RMS.
          </div>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Employee",
              attendance.employeeName
            )}

            ${infoRow(
              "Employee Role",
              formatLabel(employeeRole)
            )}

            ${infoRow(
              "Date",
              formatDate(
                attendance.attendanceDate
              )
            )}

            ${infoRow(
              "Type",
              formatLabel(
                attendance.regularization?.type
              )
            )}

            ${infoRow(
              "Reason",
              attendance.regularization?.reason
            )}

            ${infoRow(
              "Requested Check-in",
              formatRegularizedTime(
                attendance.regularization
                  ?.requestedCheckIn
              )
            )}

            ${infoRow(
              "Requested Check-out",
              formatRegularizedTime(
                attendance.regularization
                  ?.requestedCheckOut
              )
            )}

            ${infoRow(
              "Submitted At",
              formatDateTime(
                attendance.regularization
                  ?.requestedAt
              )
            )}
          </table>

          ${dashboardButton({
            label:
              "Review Regularization Request",
          })}
        `,
      }),
    });
  };

/* =====================================================
   REGULARIZATION DECISION
===================================================== */

const sendRegularizationDecisionMailToUser =
  async (
    attendance,
    status,
    decision = {}
  ) => {
    if (!attendance?.employeeEmail) {
      return null;
    }

    const approved =
      status === "approved";

    const isRegularized =
      attendance.attendanceStatus ===
        "regularized" ||
      attendance.attendanceSource ===
        "regularization" ||
      attendance.regularization?.status ===
        "approved";

    const checkInTime =
      attendance.checkIn?.time || null;

    const checkOutTime =
      attendance.checkOut?.time || null;

    const employeeRole =
      decision.employeeRole ||
      attendance.employeeRole ||
      "user";

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: attendance.employeeEmail,

      cc: getDecisionCc({
        employeeRole,
        decidedByEmail:
          decision.decidedByEmail ||
          attendance.regularization
            ?.approvedBy?.email ||
          attendance.regularization
            ?.rejectedBy?.email,
      }),

      subject: `Attendance Regularization ${
        approved ? "Approved" : "Rejected"
      } | ${formatDate(
        attendance.attendanceDate
      )}`,

      html: baseTemplate({
        title: approved
          ? "Regularization Approved"
          : "Regularization Rejected",

        subtitle: `Attendance date: ${formatDate(
          attendance.attendanceDate
        )}`,

        body: `
          ${statusPanel({
            approved,
            employeeName:
              attendance.employeeName,
            entityName:
              "attendance regularization",
            status: approved
              ? "approved"
              : "rejected",
          })}

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Date",
              formatDate(
                attendance.attendanceDate
              )
            )}

            ${infoRow(
              "Check-in",
              isRegularized
                ? formatRegularizedTime(
                    checkInTime
                  )
                : formatTime(checkInTime)
            )}

            ${infoRow(
              "Check-out",
              isRegularized
                ? formatRegularizedTime(
                    checkOutTime
                  )
                : formatTime(checkOutTime)
            )}

            ${infoRow(
              "Status",
              formatLabel(
                attendance.attendanceStatus
              )
            )}

            ${infoRow(
              "Decision By",
              decision.decidedByName ||
                attendance.regularization
                  ?.approvedBy?.name ||
                attendance.regularization
                  ?.rejectedBy?.name ||
                "-"
            )}

            ${
              !approved
                ? infoRow(
                    "Rejection Reason",
                    attendance.regularization
                      ?.rejectionReason || "-"
                  )
                : ""
            }
          </table>

          ${dashboardButton({
            label:
              "Open Attendance Dashboard",
          })}
        `,
      }),
    });
  };

/* =====================================================
   LEAVE REQUEST
===================================================== */

const sendLeaveRequestMailToApprovers =
  async (leaveRequest) => {
    const recipients =
      getApprovalRecipients({
        employeeRole:
          leaveRequest.employeeRole,
      });

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: recipients.to,

      cc: recipients.cc,

      subject: `Leave Approval Required | ${leaveRequest.employeeName} | ${formatDate(
        leaveRequest.fromDate
      )}`,

      html: baseTemplate({
        title: "Leave Approval Required",

        subtitle: `${leaveRequest.employeeName} submitted a ${formatLeaveType(
          leaveRequest.leaveType
        )} request.`,

        body: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
            A leave request requires review.

            ${
              leaveRequest.leaveType ===
              "loss_of_pay"
                ? "This request is marked as Loss of Pay."
                : "This request will use the employee's monthly paid leave balance."
            }
          </div>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Employee",
              leaveRequest.employeeName
            )}

            ${infoRow(
              "Employee Email",
              leaveRequest.employeeEmail
            )}

            ${infoRow(
              "Employee Role",
              formatLabel(
                leaveRequest.employeeRole
              )
            )}

            ${infoRow(
              "Leave Type",
              formatLeaveType(
                leaveRequest.leaveType
              )
            )}

            ${infoRow(
              "Duration",
              formatLeaveDuration(
                leaveRequest.duration
              )
            )}

            ${infoRow(
              "From Date",
              formatDate(
                leaveRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                leaveRequest.toDate
              )
            )}

            ${infoRow(
              "Reason",
              leaveRequest.reason
            )}

            ${infoRow(
              "Applied At",
              formatDateTime(
                leaveRequest.appliedAt ||
                  leaveRequest.createdAt
              )
            )}
          </table>

          ${dashboardButton({
            label:
              "Review Leave Request",
          })}
        `,
      }),
    });
  };

/* =====================================================
   LEAVE SUBMISSION CONFIRMATION
===================================================== */

const sendLeaveSubmissionMailToUser =
  async (leaveRequest) => {
    if (!leaveRequest?.employeeEmail) {
      return null;
    }

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: leaveRequest.employeeEmail,

      subject: `Leave Request Submitted | ${formatDate(
        leaveRequest.fromDate
      )}`,

      html: baseTemplate({
        title: "Leave Request Submitted",

        subtitle:
          "Your request has been recorded and sent for approval.",

        body: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
            Dear <strong>${escapeHtml(
              leaveRequest.employeeName
            )}</strong>,<br/><br/>

            Your leave request has been submitted successfully.

            You will receive another email and dashboard notification after approval or rejection.
          </div>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Leave Type",
              formatLeaveType(
                leaveRequest.leaveType
              )
            )}

            ${infoRow(
              "Duration",
              formatLeaveDuration(
                leaveRequest.duration
              )
            )}

            ${infoRow(
              "From Date",
              formatDate(
                leaveRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                leaveRequest.toDate
              )
            )}

            ${infoRow(
              "Status",
              formatLabel(
                leaveRequest.status
              )
            )}
          </table>

          ${dashboardButton({
            label:
              "Track My Leave Request",
          })}
        `,
      }),
    });
  };

/* =====================================================
   LEAVE DECISION
===================================================== */

const sendLeaveDecisionMailToUser =
  async (
    leaveRequest,
    status,
    decision = {}
  ) => {
    if (!leaveRequest?.employeeEmail) {
      return null;
    }

    const approved =
      status === "approved";

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: leaveRequest.employeeEmail,

      cc: getDecisionCc({
        employeeRole:
          leaveRequest.employeeRole,

        decidedByEmail:
          decision.decidedByEmail,
      }),

      subject: `Leave Request ${
        approved ? "Approved" : "Rejected"
      } | ${formatDate(
        leaveRequest.fromDate
      )}`,

      html: baseTemplate({
        title: approved
          ? "Leave Approved"
          : "Leave Rejected",

        subtitle: `${formatLeaveType(
          leaveRequest.leaveType
        )} · ${formatDate(
          leaveRequest.fromDate
        )}`,

        body: `
          ${statusPanel({
            approved,
            employeeName:
              leaveRequest.employeeName,
            entityName: "leave",
            status: approved
              ? "approved"
              : "rejected",
          })}

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Leave Type",
              formatLeaveType(
                leaveRequest.leaveType
              )
            )}

            ${infoRow(
              "Duration",
              formatLeaveDuration(
                leaveRequest.duration
              )
            )}

            ${infoRow(
              "From Date",
              formatDate(
                leaveRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                leaveRequest.toDate
              )
            )}

            ${infoRow(
              "Decision By",
              decision.decidedByName ||
                leaveRequest.approvedByName ||
                leaveRequest.rejectedByName ||
                "-"
            )}

            ${infoRow(
              "Decision Date",
              formatDateTime(
                leaveRequest.approvedAt ||
                  leaveRequest.rejectedAt
              )
            )}

            ${
              !approved
                ? infoRow(
                    "Rejection Reason",
                    leaveRequest.rejectionReason ||
                      "-"
                  )
                : ""
            }

            ${
              approved &&
              leaveRequest.leaveType ===
                "loss_of_pay"
                ? infoRow(
                    "Payroll Treatment",
                    "Loss of Pay"
                  )
                : ""
            }
          </table>

          ${dashboardButton({
            label:
              "Open Leave Dashboard",
          })}
        `,
      }),
    });
  };

/* =====================================================
   WORK FROM HOME REQUEST

   These functions are ready for the WFH request service/model.
===================================================== */

const sendWorkFromHomeRequestMailToApprovers =
  async (workFromHomeRequest) => {
    const recipients =
      getApprovalRecipients({
        employeeRole:
          workFromHomeRequest.employeeRole,
      });

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to: recipients.to,

      cc: recipients.cc,

      subject: `Work From Home Approval Required | ${workFromHomeRequest.employeeName} | ${formatDate(
        workFromHomeRequest.fromDate
      )}`,

      html: baseTemplate({
        title:
          "Work From Home Approval Required",

        subtitle: `${workFromHomeRequest.employeeName} submitted a work-from-home request.`,

        body: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
            A Work From Home request requires review.

            On approval, attendance may be marked using the employee's current location, device and GPS details.
          </div>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "Employee",
              workFromHomeRequest.employeeName
            )}

            ${infoRow(
              "Employee Email",
              workFromHomeRequest.employeeEmail
            )}

            ${infoRow(
              "Employee Role",
              formatLabel(
                workFromHomeRequest.employeeRole
              )
            )}

            ${infoRow(
              "From Date",
              formatDate(
                workFromHomeRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                workFromHomeRequest.toDate
              )
            )}

            ${infoRow(
              "Reason",
              workFromHomeRequest.reason
            )}

            ${infoRow(
              "Submitted At",
              formatDateTime(
                workFromHomeRequest.appliedAt ||
                  workFromHomeRequest.createdAt
              )
            )}
          </table>

          ${dashboardButton({
            label:
              "Review Work From Home Request",
          })}
        `,
      }),
    });
  };

/* =====================================================
   WORK FROM HOME SUBMISSION
===================================================== */

const sendWorkFromHomeSubmissionMailToUser =
  async (workFromHomeRequest) => {
    if (
      !workFromHomeRequest?.employeeEmail
    ) {
      return null;
    }

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to:
        workFromHomeRequest.employeeEmail,

      subject: `Work From Home Request Submitted | ${formatDate(
        workFromHomeRequest.fromDate
      )}`,

      html: baseTemplate({
        title:
          "Work From Home Request Submitted",

        subtitle:
          "Your request has been sent for approval.",

        body: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;font-size:14px;line-height:1.7;color:#1e40af;">
            Dear <strong>${escapeHtml(
              workFromHomeRequest.employeeName
            )}</strong>,<br/><br/>

            Your Work From Home request has been submitted successfully.

            You will receive a notification after the request is approved or rejected.
          </div>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "From Date",
              formatDate(
                workFromHomeRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                workFromHomeRequest.toDate
              )
            )}

            ${infoRow(
              "Status",
              formatLabel(
                workFromHomeRequest.status
              )
            )}
          </table>

          ${dashboardButton({
            label:
              "Track Work From Home Request",
          })}
        `,
      }),
    });
  };

/* =====================================================
   WORK FROM HOME DECISION
===================================================== */

const sendWorkFromHomeDecisionMailToUser =
  async (
    workFromHomeRequest,
    status,
    decision = {}
  ) => {
    if (
      !workFromHomeRequest?.employeeEmail
    ) {
      return null;
    }

    const approved =
      status === "approved";

    return transporter.sendMail({
      from: `"${COMPANY.name}" <${EMAILS.sender}>`,

      to:
        workFromHomeRequest.employeeEmail,

      cc: getDecisionCc({
        employeeRole:
          workFromHomeRequest.employeeRole,

        decidedByEmail:
          decision.decidedByEmail,
      }),

      subject: `Work From Home Request ${
        approved ? "Approved" : "Rejected"
      } | ${formatDate(
        workFromHomeRequest.fromDate
      )}`,

      html: baseTemplate({
        title: approved
          ? "Work From Home Approved"
          : "Work From Home Rejected",

        subtitle: `${formatDate(
          workFromHomeRequest.fromDate
        )} to ${formatDate(
          workFromHomeRequest.toDate
        )}`,

        body: `
          ${statusPanel({
            approved,
            employeeName:
              workFromHomeRequest.employeeName,
            entityName:
              "Work From Home",
            status: approved
              ? "approved"
              : "rejected",
          })}

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="margin-top:20px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"
          >
            ${infoRow(
              "From Date",
              formatDate(
                workFromHomeRequest.fromDate
              )
            )}

            ${infoRow(
              "To Date",
              formatDate(
                workFromHomeRequest.toDate
              )
            )}

            ${infoRow(
              "Decision By",
              decision.decidedByName ||
                workFromHomeRequest.approvedByName ||
                workFromHomeRequest.rejectedByName ||
                "-"
            )}

            ${
              !approved
                ? infoRow(
                    "Rejection Reason",
                    workFromHomeRequest.rejectionReason ||
                      "-"
                  )
                : ""
            }

            ${
              approved
                ? infoRow(
                    "Attendance Mode",
                    "Work From Home"
                  )
                : ""
            }
          </table>

          ${dashboardButton({
            label:
              "Open Attendance Dashboard",
          })}
        `,
      }),
    });
  };

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  /*
   * Existing attendance email functions
   */
  sendMissedCheckoutMailToUser,
  sendRegularizationRequestMailToAdmin,
  sendRegularizationDecisionMailToUser,

  /*
   * Leave email functions
   */
  sendLeaveRequestMailToApprovers,
  sendLeaveSubmissionMailToUser,
  sendLeaveDecisionMailToUser,

  /*
   * Work From Home email functions
   */
  sendWorkFromHomeRequestMailToApprovers,
  sendWorkFromHomeSubmissionMailToUser,
  sendWorkFromHomeDecisionMailToUser,

  /*
   * Optional utility exports
   */
  formatDate,
  formatTime,
  formatDateTime,
  formatRegularizedTime,
};