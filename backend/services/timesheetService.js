const Timesheet = require("../model/timesheetModel");
const transporter = require("../util/mailTransporter");

const ADMIN_EMAIL = "info@bharatspecialsteels.com";

/* =========================
   DATE RANGE
========================= */
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/* =========================
   TEXT FORMATTER (BULLETS)
========================= */
const formatTextForMail = (text = "") => {
  if (!text || !String(text).trim()) return "-";

  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleanLine = line.replace(/^\d+\.\s*/, "");

      return `
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;">
          <div style="font-weight:900; margin-right:8px;">•</div>
          <div>${cleanLine}</div>
        </div>
      `;
    })
    .join("");
};

/* =========================
   CREATE TIMESHEET
========================= */
const createTimesheet = async (body, user) => {
  const { workSummary, challenges, nextDayPlan } = body;

  const { start, end } = getTodayRange();

  /* Prevent duplicate entry */
  const alreadySubmitted = await Timesheet.findOne({
    employeeId: user.id,
    reportDate: { $gte: start, $lte: end },
  });

  if (alreadySubmitted) {
    throw new Error("You have already submitted today's work report.");
  }

  /* Save */
  const timesheet = await Timesheet.create({
    employeeId: user.id,
    reportDate: start,
    workSummary,
    challenges,
    nextDayPlan,
  });

  /* Unique time (prevents Gmail grouping) */
  const submittedTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* =========================
     SEND MAIL
  ========================= */
  await transporter.sendMail({
    from: `"Timesheet" <admin@bharatspecialsteels.com>`,
    to: ADMIN_EMAIL,
    cc: user.email,
    replyTo: user.email,

    // IMPORTANT → prevents mail grouping
    subject: `WORK REPORT || ${start.toLocaleDateString("en-IN")} || ${user.name} || ${submittedTime}`,

    html: `
      <div style="font-family: Arial, sans-serif; padding:20px;">

        <h2>Daily Work Report</h2>

        <p><b>Employee:</b> ${user.name}</p>
        <p><b>Email:</b> ${user.email}</p>
        <p><b>Date:</b> ${start.toLocaleDateString("en-IN")}</p>

        <h3>Work Summary</h3>
        <div style="line-height:1.6;">
          ${formatTextForMail(workSummary)}
        </div>

        <h3>Challenges</h3>
        <div style="line-height:1.6;">
          ${formatTextForMail(challenges)}
        </div>

        <h3>Next Day Plan</h3>
        <div style="line-height:1.6;">
          ${formatTextForMail(nextDayPlan)}
        </div>

      </div>
    `,
  });

  return timesheet;
};


const getTimesheets = async (query, user) => {
  const { month, year, employeeId } = query;

  const filter = {};

  if (user.role === "admin" || user.role === "super_admin") {
    if (employeeId) {
      filter.employeeId = employeeId;
    }
  } else {
    filter.employeeId = user.id;
  }

  if (month !== undefined && year) {
    const start = new Date(Number(year), Number(month), 1);
    const end = new Date(Number(year), Number(month) + 1, 0);
    end.setHours(23, 59, 59, 999);

    filter.reportDate = {
      $gte: start,
      $lte: end,
    };
  }

  const data = await Timesheet.find(filter)
    .populate("employeeId", "name email")
    .sort({ reportDate: -1, createdAt: -1 });

  return data;
};
module.exports = {
  createTimesheet,
  getTimesheets,
};
