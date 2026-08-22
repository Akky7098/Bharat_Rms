const Attendance = require("../model/attendanceModel");
const User = require("../model/userModel");
const transporter = require("../util/mailTransporter");

const {
  sendTextToGroup,
} = require("../util/baileysClient");

const MANAGER_EMAIL =
  process.env.MANAGER_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "info@bharatspecialsteels.com";

const WHATSAPP_GROUP_ID =
  process.env.ATTENDANCE_WHATSAPP_GROUP_ID;

const REQUIRED_WORK_MINUTES =
  9 * 60;

/* =========================================================
   DATE HELPERS
========================================================= */

const getStartOfTodayIST = () => {
  const now = new Date();

  const istDate =
    new Date(
      now.toLocaleString(
        "en-US",
        {
          timeZone:
            "Asia/Kolkata",
        }
      )
    );

  istDate.setHours(
    0,
    0,
    0,
    0
  );

  return istDate;
};

const getEndOfTodayIST = () => {
  const d =
    getStartOfTodayIST();

  d.setHours(
    23,
    59,
    59,
    999
  );

  return d;
};

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Asia/Kolkata",
    }
  );
};

const formatTime = (date) => {
  if (!date) {
    return "-";
  }

  return new Date(
    date
  ).toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone:
        "Asia/Kolkata",
    }
  );
};

const formatMinutes = (
  minutes
) => {
  const total =
    Number(
      minutes || 0
    );

  if (!total) {
    return "-";
  }

  const hrs =
    Math.floor(
      total / 60
    );

  const mins =
    total % 60;

  if (
    hrs &&
    mins
  ) {
    return `${hrs}h ${mins}m`;
  }

  if (hrs) {
    return `${hrs}h`;
  }

  return `${mins}m`;
};

const normalizeId = (
  value
) =>
  String(
    value || ""
  );

/* =========================================================
   BAILEYS WHATSAPP SEND

   No Chromium.
   No whatsapp-web.js.
========================================================= */

const sendWhatsAppText =
  async (
    message
  ) => {
    if (
      !WHATSAPP_GROUP_ID
    ) {
      console.log(
        "Attendance WhatsApp skipped: ATTENDANCE_WHATSAPP_GROUP_ID missing"
      );

      return;
    }

    try {
      await sendTextToGroup(
        WHATSAPP_GROUP_ID,
        message
      );

      console.log(
        "Attendance WhatsApp sent successfully"
      );

      return true;
    } catch (
      error
    ) {
      /*
       * IMPORTANT:
       *
       * WhatsApp failure must not stop
       * attendance email/report generation.
       */
      console.log(
        "Attendance WhatsApp skipped/failed:",
        error.message
      );

      return false;
    }
  };

/* =========================================================
   TODAY DATA
========================================================= */

const getTodayData =
  async () => {
    const start =
      getStartOfTodayIST();

    const end =
      getEndOfTodayIST();

    const [
      employees,
      attendance,
    ] =
      await Promise.all([
        User.find({
          role: {
            $in: [
              "user",
              "admin",
            ],
          },
        })
          .select(
            "_id name email role attendanceWorkMode attendanceMode"
          )
          .lean(),

        Attendance.find({
          attendanceDate: {
            $gte: start,
            $lte: end,
          },
        }).lean(),
      ]);

    const attendanceMap =
      new Map();

    attendance.forEach(
      (item) => {
        attendanceMap.set(
          normalizeId(
            item.employeeId
          ),
          item
        );
      }
    );

    const rows =
      employees
        .map(
          (emp) => {
            const record =
              attendanceMap.get(
                normalizeId(
                  emp._id
                )
              );

            return {
              employee:
                emp,

              attendance:
                record ||
                null,
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            String(
              a.employee
                ?.name ||
                ""
            ).localeCompare(
              String(
                b.employee
                  ?.name ||
                  ""
              )
            )
        );

    return {
      date: start,
      rows,
    };
  };

/* =========================================================
   EMPLOYEE MODE
========================================================= */

const getEmployeeMode =
  (
    employee,
    attendance
  ) => {
    const mode =
      attendance
        ?.workMode ||
      employee
        ?.attendanceWorkMode ||
      employee
        ?.attendanceMode ||
      "office";

    return mode ===
      "work_from_home"
      ? "WFH"
      : "Office";
  };

/* =========================================================
   MORNING WHATSAPP MESSAGE
========================================================= */

const buildMorningWhatsAppMessage =
  ({
    date,
    rows,
  }) => {
    const present =
      rows.filter(
        (r) =>
          r.attendance
            ?.checkIn
            ?.time
      );

    const absent =
      rows.filter(
        (r) =>
          !r.attendance
            ?.checkIn
            ?.time
      );

    const office =
      present.filter(
        (r) =>
          getEmployeeMode(
            r.employee,
            r.attendance
          ) ===
          "Office"
      );

    const wfh =
      present.filter(
        (r) =>
          getEmployeeMode(
            r.employee,
            r.attendance
          ) ===
          "WFH"
      );

    const late =
      present.filter(
        (r) => {
          const t =
            r.attendance
              ?.checkIn
              ?.time;

          if (!t) {
            return false;
          }

          const d =
            new Date(
              t
            );

          const ist =
            new Date(
              d.toLocaleString(
                "en-US",
                {
                  timeZone:
                    "Asia/Kolkata",
                }
              )
            );

          return (
            ist.getHours() >
              9 ||
            (
              ist.getHours() ===
                9 &&
              ist.getMinutes() >
                45
            )
          );
        }
      );

    const line =
      (r) => {
        const name =
          r.employee
            ?.name ||
          r.attendance
            ?.employeeName ||
          "-";

        return `• ${name} — ${formatTime(
          r.attendance
            ?.checkIn
            ?.time
        )}`;
      };

    return `📍 *Bharat RMS Attendance Update*
Date: ${formatDate(date)}
Time: 10:15 AM

✅ *Present (${present.length})*

🏢 *Office*
${
  office.length
    ? office
        .map(
          line
        )
        .join(
          "\n"
        )
    : "No office check-ins yet"
}

🏠 *Work From Home*
${
  wfh.length
    ? wfh
        .map(
          (r) => {
            const address =
              r.attendance
                ?.checkIn
                ?.locationAddress ||
              r.attendance
                ?.checkOut
                ?.locationAddress ||
              "Location captured";

            return `• ${
              r.employee
                ?.name ||
              "-"
            } — ${formatTime(
              r.attendance
                ?.checkIn
                ?.time
            )}
  ${address}`;
          }
        )
        .join(
          "\n"
        )
    : "No WFH check-ins"
}

⚠️ *Late / After 9:45*
${
  late.length
    ? late
        .map(
          line
        )
        .join(
          "\n"
        )
    : "None"
}

❌ *Not Checked In (${absent.length})*
${
  absent.length
    ? absent
        .map(
          (r) =>
            `• ${
              r.employee
                ?.name ||
              "-"
            }`
        )
        .join(
          "\n"
        )
    : "None"
}`;
  };

/* =========================================================
   EVENING WHATSAPP MESSAGE
========================================================= */

const buildEveningWhatsAppMessage =
  ({
    date,
    rows,
  }) => {
    const checkedOut =
      rows.filter(
        (r) =>
          r.attendance
            ?.checkOut
            ?.time
      );

    const stillWorking =
      rows.filter(
        (r) =>
          r.attendance
            ?.checkIn
            ?.time &&
          !r.attendance
            ?.checkOut
            ?.time
      );

    const absent =
      rows.filter(
        (r) =>
          !r.attendance
            ?.checkIn
            ?.time
      );

    const shortHours =
      checkedOut.filter(
        (r) =>
          Number(
            r.attendance
              ?.totalWorkingMinutes ||
              0
          ) <
          REQUIRED_WORK_MINUTES
      );

    const checkedOutLine =
      (r) => {
        const name =
          r.employee
            ?.name ||
          r.attendance
            ?.employeeName ||
          "-";

        return `• ${name} — ${formatTime(
          r.attendance
            ?.checkOut
            ?.time
        )} — ${formatMinutes(
          r.attendance
            ?.totalWorkingMinutes
        )}`;
      };

    const stillWorkingLine =
      (r) => {
        const name =
          r.employee
            ?.name ||
          r.attendance
            ?.employeeName ||
          "-";

        const checkInTime =
          r.attendance
            ?.checkIn
            ?.time;

        const workedMinutes =
          Math.max(
            Math.round(
              (
                new Date() -
                new Date(
                  checkInTime
                )
              ) /
                60000
            ),
            0
          );

        const remainingMinutes =
          Math.max(
            REQUIRED_WORK_MINUTES -
              workedMinutes,
            0
          );

        const remainingText =
          remainingMinutes >
          0
            ? `${formatMinutes(
                remainingMinutes
              )} left`
            : "Shift completed";

        return `• ${name} — Checked in ${formatTime(
          checkInTime
        )} — ${remainingText}`;
      };

    const shortHoursLine =
      (r) => {
        const name =
          r.employee
            ?.name ||
          r.attendance
            ?.employeeName ||
          "-";

        const worked =
          Number(
            r.attendance
              ?.totalWorkingMinutes ||
              0
          );

        const shortBy =
          Math.max(
            REQUIRED_WORK_MINUTES -
              worked,
            0
          );

        return `• ${name} — Short by ${formatMinutes(
          shortBy
        )}`;
      };

    return `📊 *Bharat RMS Attendance Closing Summary*
Date: ${formatDate(date)}
Time: 7:00 PM

✅ *Checked Out (${checkedOut.length})*
${
  checkedOut.length
    ? checkedOut
        .map(
          checkedOutLine
        )
        .join(
          "\n"
        )
    : "No check-outs yet"
}

⏳ *Still Working (${stillWorking.length})*
${
  stillWorking.length
    ? stillWorking
        .map(
          stillWorkingLine
        )
        .join(
          "\n"
        )
    : "None"
}

⚠️ *Short Hours (${shortHours.length})*
${
  shortHours.length
    ? shortHours
        .map(
          shortHoursLine
        )
        .join(
          "\n"
        )
    : "None"
}

❌ *Absent (${absent.length})*
${
  absent.length
    ? absent
        .map(
          (r) =>
            `• ${
              r.employee
                ?.name ||
              "-"
            }`
        )
        .join(
          "\n"
        )
    : "None"
}`;
  };

/* =========================================================
   EMAIL HTML
========================================================= */

const buildEmailHtml =
  ({
    title,
    subtitle,
    rows,
    type,
  }) => {
    const rowHtml =
      rows
        .map(
          ({
            employee,
            attendance,
          }) => {
            const mode =
              getEmployeeMode(
                employee,
                attendance
              );

            const checkedIn =
              attendance
                ?.checkIn
                ?.time;

            const checkedOut =
              attendance
                ?.checkOut
                ?.time;

            const minutes =
              Number(
                attendance
                  ?.totalWorkingMinutes ||
                  0
              );

            const status =
              checkedOut
                ? "Checked Out"
                : checkedIn
                ? "Still Working"
                : type ===
                  "Evening"
                ? "Absent"
                : "Not Checked In";

            const location =
              mode ===
              "WFH"
                ? attendance
                    ?.checkIn
                    ?.locationAddress ||
                  attendance
                    ?.checkOut
                    ?.locationAddress ||
                  "Location captured"
                : "";

            return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:800;color:#111827;">
            ${employee?.name || "-"}
            ${
              location
                ? `<div style="font-size:11px;color:#0f766e;margin-top:3px;">${location}</div>`
                : ""
            }
          </td>

          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            ${mode}
          </td>

          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            ${formatTime(
              attendance
                ?.checkIn
                ?.time
            )}
          </td>

          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            ${formatTime(
              attendance
                ?.checkOut
                ?.time
            )}
          </td>

          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:800;">
            ${formatMinutes(
              minutes
            )}
          </td>

          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            ${status}
          </td>
        </tr>
      `;
          }
        )
        .join("");

    return `
<!DOCTYPE html>
<html>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    padding:20px 0;
    background:#f4f7fb;
  "
>

<tr>
<td align="center">

<table
  width="760"
  cellpadding="0"
  cellspacing="0"
  style="
    width:96%;
    max-width:760px;
    background:#ffffff;
    border:1px solid #e5e7eb;
    border-radius:18px;
    overflow:hidden;
  "
>

<tr>
<td
  style="
    padding:18px 22px;
    background:#0f172a;
    color:#ffffff;
  "
>
  <div
    style="
      font-size:18px;
      font-weight:900;
    "
  >
    Bharat Special Steels
  </div>

  <div
    style="
      font-size:12px;
      color:#cbd5e1;
      margin-top:3px;
    "
  >
    Attendance ${type} Report
  </div>
</td>
</tr>

<tr>
<td
  style="
    padding:22px;
  "
>
  <h2
    style="
      margin:0;
      font-size:24px;
      color:#0f172a;
    "
  >
    ${title}
  </h2>

  <p
    style="
      margin:7px 0 0;
      font-size:14px;
      color:#64748b;
    "
  >
    ${subtitle}
  </p>
</td>
</tr>

<tr>
<td
  style="
    padding:0 22px 24px;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    border:1px solid #e5e7eb;
    border-radius:14px;
    overflow:hidden;
    font-size:13px;
  "
>

<tr
  style="
    background:#f8fafc;
  "
>
  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Employee
  </th>

  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Mode
  </th>

  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Check In
  </th>

  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Check Out
  </th>

  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Total
  </th>

  <th
    align="left"
    style="
      padding:10px;
      border-bottom:1px solid #e5e7eb;
    "
  >
    Status
  </th>
</tr>

${rowHtml}

</table>

</td>
</tr>

<tr>
<td
  style="
    padding:16px 22px;
    background:#f8fafc;
    border-top:1px solid #e5e7eb;
    font-size:11px;
    color:#94a3b8;
  "
>
  Automated attendance summary from Bharat RMS.
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

/* =========================================================
   EMAIL SEND
========================================================= */

const sendEmailReport =
  async ({
    title,
    subtitle,
    rows,
    type,
  }) => {
    if (
      !MANAGER_EMAIL
    ) {
      return;
    }

    return transporter.sendMail({
      from:
        `"Bharat Special Steels Pvt. Ltd." <${process.env.ADMIN_EMAIL}>`,

      to:
        MANAGER_EMAIL,

      cc:
        process.env
          .SUPER_ADMIN_EMAIL ||
        "",

      subject:
        `${title} | Bharat RMS`,

      html:
        buildEmailHtml({
          title,
          subtitle,
          rows,
          type,
        }),
    });
  };

/* =========================================================
   MORNING DIGEST
========================================================= */

const sendMorningAttendanceDigest =
  async () => {
    const data =
      await getTodayData();

    /*
     * WhatsApp failure will NOT stop email.
     */
    await sendWhatsAppText(
      buildMorningWhatsAppMessage(
        data
      )
    );

    await sendEmailReport({
      title:
        "Morning Attendance Snapshot",

      subtitle:
        `${formatDate(
          data.date
        )} · 10:15 AM`,

      rows:
        data.rows,

      type:
        "Morning",
    });

    return {
      checked:
        data.rows.length,
    };
  };

/* =========================================================
   EVENING DIGEST
========================================================= */

const sendEveningAttendanceDigest =
  async () => {
    console.log(
      "Evening digest service started"
    );

    const data =
      await getTodayData();

    console.log(
      "Evening data loaded:",
      data.rows.length
    );

    /*
     * WhatsApp failure will NOT stop email.
     */
    await sendWhatsAppText(
      buildEveningWhatsAppMessage(
        data
      )
    );

    console.log(
      "Evening WhatsApp step completed"
    );

    await sendEmailReport({
      title:
        "Evening Attendance Closing Summary",

      subtitle:
        `${formatDate(
          data.date
        )} · 7:00 PM`,

      rows:
        data.rows,

      type:
        "Evening",
    });

    console.log(
      "Evening email sent"
    );

    return {
      checked:
        data.rows.length,
    };
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  sendMorningAttendanceDigest,
  sendEveningAttendanceDigest,
};