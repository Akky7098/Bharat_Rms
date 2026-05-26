const User = require("../model/userModel");
const Enquiry = require("../model/enquiryModel");
const ColdCall = require("../model/coldCallModel");
const SalesOrder = require("../model/salesOrderModel");
const transporter = require("../util/mailTransporter");
const { getWhatsappClient, isWhatsappReady } = require("../util/whatsappClient");
const CronLock = require("../model/cronLockModel");
const {
  generateTeamSalesCoachingReport,
} = require("./aiInsightService");

const SALES_GROUP_ID = process.env.SALES_DAILY_WHATSAPP_GROUP_ID;
const MANAGER_EMAIL =
  process.env.MANAGER_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "info@bharatspecialsteels.com";

const EXCLUDED_FROM_SALES_REPORT = ["Sonia", "Deepak Arya"];

const getISTRange = (daysBack = 0) => {
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const start = new Date(istNow);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  const end = new Date(istNow);
  end.setHours(23, 59, 59, 999);

  return { start, end, now: istNow };
};

const getTodayKey = (prefix) => {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return `${prefix}_${today}`;
};

const acquireDailyLock = async (key) => {
  try {
    await CronLock.create({ key });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const daysOverdue = (date) => {
  if (!date) return 0;
  const diff = new Date() - new Date(date);
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
};

const getEmployeeName = (emp) => emp?.name || "Unknown";

const sendWhatsapp = async (message) => {
  if (!SALES_GROUP_ID) return;

  const ready = await isWhatsappReady();
  if (!ready) {
    console.log("Sales daily insight WhatsApp skipped: client not ready");
    return;
  }

  const client = getWhatsappClient();
  return client.sendMessage(SALES_GROUP_ID, message);
};

const getSalesEmployees = async () => {
  return User.find({
    role: { $in: ["user", "admin"] },
    name: { $nin: EXCLUDED_FROM_SALES_REPORT },
  })
    .select("_id name email role")
    .lean();
};

const getRangeStats = async (employees, daysBack) => {
  const { start, end } = getISTRange(daysBack);

  const [enquiries, coldCalls, orders, lost] = await Promise.all([
    Enquiry.find({
      enquiryDate: { $gte: start, $lte: end },
    }).lean(),

    ColdCall.find({
      date: { $gte: start, $lte: end },
    }).lean(),

    SalesOrder.find({
      orderDate: { $gte: start, $lte: end },
    }).lean(),

    Enquiry.find({
      "closure.status": "lost",
      "closure.actualDate": { $gte: start, $lte: end },
    }).lean(),
  ]);

  const map = new Map();

  employees.forEach((emp) => {
    map.set(String(emp._id), {
      calls: 0,
      visits: 0,
      emails: 0,
      enquiries: 0,
      quotations: 0,
      wonOrders: 0,
      wonValue: 0,
      lostOrders: 0,
      lostReasons: {},
    });
  });

  coldCalls.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    if (item.activityType === "calling") map.get(key).calls += 1;
    if (item.activityType === "visit") map.get(key).visits += 1;
    if (item.activityType === "email") map.get(key).emails += 1;
  });

  enquiries.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    map.get(key).enquiries += 1;

    if (item.quotation?.completed) {
      map.get(key).quotations += 1;
    }
  });

  orders.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    map.get(key).wonOrders += 1;
    map.get(key).wonValue += Number(item.orderValue || 0);
  });

  lost.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    const reason = item.closure?.lostRemark || "not_specified";
    map.get(key).lostOrders += 1;
    map.get(key).lostReasons[reason] =
      (map.get(key).lostReasons[reason] || 0) + 1;
  });

  return map;
};

const calculateProductivityScore = (row) => {
  let score = 0;

  score += row.calls * 1;
  score += row.visits * 5;
  score += row.emails * 1;
  score += row.enquiries * 8;
  score += row.quotations * 14;
  score += row.wonOrders * 30;

  score -= row.lostOrders * 6;
  score -= row.overdueQuotations.length * 10;
  score -= row.overdueClosures.length * 3;

  if (
    row.calls >= 15 &&
    row.quotations === 0 &&
    row.wonOrders === 0
  ) {
    score -= 15;
  }

  if (
    row.calls === 0 &&
    row.visits === 0 &&
    row.emails === 0 &&
    row.enquiries === 0 &&
    row.quotations === 0 &&
    row.wonOrders === 0
  ) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const buildFallbackCoaching = (row) => {
  const name = getEmployeeName(row.employee);

  const priorityQuote = [...row.overdueQuotations].sort(
    (a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty
  )[0];

  const bullets = [];

  if (row.productivityScore >= 75) {
    bullets.push(`Strong productive movement today with a score of ${row.productivityScore}/100.`);
  } else if (row.productivityScore >= 45) {
    bullets.push(`Moderate productivity today with a score of ${row.productivityScore}/100.`);
  } else {
    bullets.push(`Low productivity today with a score of ${row.productivityScore}/100.`);
  }

  if (
    row.calls === 0 &&
    row.visits === 0 &&
    row.emails === 0 &&
    row.enquiries === 0 &&
    row.quotations === 0 &&
    row.wonOrders === 0
  ) {
    bullets.push(
      "No measurable activity was updated today; if field work happened, RMS update discipline needs improvement."
    );
    bullets.push(
      "Tomorrow first priority should be visible customer movement before noon."
    );
  }

  if (row.calls >= 15 && row.quotations === 0 && row.wonOrders === 0) {
    bullets.push(
      `${row.calls} calls did not convert into quotation or order movement; review call quality and lead fit.`
    );
  }

  if (row.enquiries > 0 && row.quotations === 0) {
    bullets.push(
      `${row.enquiries} enquiry(s) came in, but quotation movement is missing; tomorrow focus should shift to quotation release.`
    );
  }

  if (priorityQuote) {
    bullets.push(
      `${priorityQuote.companyName} quotation is overdue by ${priorityQuote.overdueDays} day(s); close, escalate, or mark reality.`
    );
  }

  if (row.overdueClosures.length >= 10) {
    bullets.push(
      `${row.overdueClosures.length} closure follow-up(s) are overdue; this is now a pipeline hygiene risk.`
    );
  }

  if (row.wonOrders > 0) {
    bullets.push(
      `${row.wonOrders} order(s) won today; keep momentum but do not allow overdue pipeline to remain unattended.`
    );
  }

  if ((row.week7.calls || 0) > row.calls && row.calls === 0) {
  bullets.push(
    "Compared to the recent week, today's activity is visibly lower; check whether this is a pipeline issue or update gap."
  );
}

  if (!bullets.length) {
    bullets.push(
      "Activity is present, but management should ask which customer will move to quotation/order next."
    );
  }

  return bullets.slice(0, 6);
};

const buildEmployeeStats = async () => {
  const { start, end, now } = getISTRange();

  const employees = await getSalesEmployees();

  const [
    todayStats,
    week7Stats,
    month30Stats,
    allPendingEnquiries,
  ] = await Promise.all([
    getRangeStats(employees, 0),
    getRangeStats(employees, 6),
    getRangeStats(employees, 29),

    Enquiry.find({
      "feasibility.status": "feasible",
      "closure.status": "pending",
    }).lean(),
  ]);

  const map = new Map();

  employees.forEach((emp) => {
    const today = todayStats.get(String(emp._id)) || {};
    const week7 = week7Stats.get(String(emp._id)) || {};
    const month30 = month30Stats.get(String(emp._id)) || {};

    map.set(String(emp._id), {
      employee: emp,

      calls: today.calls || 0,
      visits: today.visits || 0,
      emails: today.emails || 0,
      enquiries: today.enquiries || 0,
      quotations: today.quotations || 0,
      wonOrders: today.wonOrders || 0,
      wonValue: today.wonValue || 0,
      lostOrders: today.lostOrders || 0,
      lostReasons: today.lostReasons || {},

      week7,
      month30,

      overdueQuotations: [],
      overdueClosures: [],
      productivityScore: 0,
      coachingBullets: [],
    });
  });

  allPendingEnquiries.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    const quoteOverdue =
      item.feasibility?.status === "feasible" &&
      !item.quotation?.completed &&
      item.quotation?.planDate &&
      new Date(item.quotation.planDate) < now;

    const closureOverdue =
      item.quotation?.completed &&
      item.closure?.status === "pending" &&
      item.closure?.planDate &&
      new Date(item.closure.planDate) < now;

    if (quoteOverdue) {
      map.get(key).overdueQuotations.push({
        companyName: item.companyName,
        qty: item.quantityInKg,
        overdueDays: daysOverdue(item.quotation.planDate),
        planDate: item.quotation.planDate,
      });
    }

    if (closureOverdue) {
      map.get(key).overdueClosures.push({
        companyName: item.companyName,
        qty: item.quantityInKg,
        overdueDays: daysOverdue(item.closure.planDate),
        planDate: item.closure.planDate,
      });
    }
  });

  const rows = Array.from(map.values()).map((row) => {
    row.productivityScore = calculateProductivityScore(row);
    row.coachingBullets = buildFallbackCoaching(row);
    return row;
  });

  rows.sort((a, b) => b.productivityScore - a.productivityScore);

  return {
    date: start,
    rows,
  };
};

const safeParseJson = (text) => {
  try {
    const clean = String(text || "")
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(clean);
  } catch {
    return null;
  }
};

const applyAIInsights = async (rows, totals, priorityText) => {
  try {
    const payload = {
      instruction:
        "Daily sales performance coaching. Be firm, useful, professional, and action-oriented. Do not insult. Do not shame. Use today, last7Days, last30Days, pending and lost reason data.",
      employees: rows.map((r) => ({
        name: getEmployeeName(r.employee),
        currentScore: r.productivityScore,

        today: {
          calls: r.calls,
          visits: r.visits,
          emails: r.emails,
          enquiries: r.enquiries,
          quotations: r.quotations,
          wonOrders: r.wonOrders,
          wonValue: r.wonValue,
          lostOrders: r.lostOrders,
          lostReasons: r.lostReasons,
        },

        last7Days: {
          calls: r.week7.calls || 0,
          visits: r.week7.visits || 0,
          emails: r.week7.emails || 0,
          enquiries: r.week7.enquiries || 0,
          quotations: r.week7.quotations || 0,
          wonOrders: r.week7.wonOrders || 0,
          wonValue: r.week7.wonValue || 0,
          lostOrders: r.week7.lostOrders || 0,
          lostReasons: r.week7.lostReasons || {},
        },

        last30Days: {
          calls: r.month30.calls || 0,
          visits: r.month30.visits || 0,
          emails: r.month30.emails || 0,
          enquiries: r.month30.enquiries || 0,
          quotations: r.month30.quotations || 0,
          wonOrders: r.month30.wonOrders || 0,
          wonValue: r.month30.wonValue || 0,
          lostOrders: r.month30.lostOrders || 0,
          lostReasons: r.month30.lostReasons || {},
        },

        conversionQuality: {
          todayCallToEnquiryRatio:
            r.calls > 0 ? Number((r.enquiries / r.calls).toFixed(2)) : null,
          todayEnquiryToQuotationRatio:
            r.enquiries > 0
              ? Number((r.quotations / r.enquiries).toFixed(2))
              : null,
          weekCallToEnquiryRatio:
            r.week7.calls > 0
              ? Number((r.week7.enquiries / r.week7.calls).toFixed(2))
              : null,
          weekEnquiryToQuotationRatio:
            r.week7.enquiries > 0
              ? Number((r.week7.quotations / r.week7.enquiries).toFixed(2))
              : null,
        },

        pending: {
          overdueQuotationCount: r.overdueQuotations.length,
          overdueClosureCount: r.overdueClosures.length,
          topOverdueQuotations: [...r.overdueQuotations]
            .sort((a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty)
            .slice(0, 3),
        },
      })),

      teamTotals: totals,
      priorityDelays: priorityText,
    };

    let aiReport = null;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    aiReport = await generateTeamSalesCoachingReport({
      reportData: payload,
    });

    if (aiReport) break;
  } catch (error) {
    console.error(
      `AI sales coaching attempt ${attempt} failed:`,
      error.message
    );

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }
}

    if (!aiReport || !aiReport.employeeInsights) {
      return { rows, managementBullets: null };
    }

    rows.forEach((row) => {
      const name = getEmployeeName(row.employee);
      const item = aiReport.employeeInsights[name];

      if (!item) return;

      if (typeof item.score === "number") {
        row.productivityScore = Math.max(0, Math.min(100, item.score));
      }

      if (item.rankNote) {
        row.rankNote = item.rankNote;
      }

      if (Array.isArray(item.bullets) && item.bullets.length) {
        row.coachingBullets = item.bullets.slice(0, 6);
      }
    });

    rows.sort((a, b) => b.productivityScore - a.productivityScore);

    return {
      rows,
      managementBullets: Array.isArray(aiReport.managementInsight)
        ? aiReport.managementInsight.slice(0, 5)
        : null,
    };
  } catch (error) {
    console.error("Team AI sales coaching failed:", error.message);
    return { rows, managementBullets: null };
  }
};

const buildFallbackManagementBullets = (totals, rows) => {
  const zeroActivity = rows.filter(
    (r) =>
      r.calls === 0 &&
      r.visits === 0 &&
      r.emails === 0 &&
      r.enquiries === 0 &&
      r.quotations === 0 &&
      r.wonOrders === 0
  ).length;

  const activityNoConversion = rows.filter(
    (r) =>
      (r.calls > 0 || r.visits > 0 || r.emails > 0 || r.enquiries > 0) &&
      r.quotations === 0 &&
      r.wonOrders === 0
  ).length;

  const bullets = [];

  if (totals.overdueQuotes > 0) {
    bullets.push(
      `${totals.overdueQuotes} feasible quotation(s) are overdue; review these before fresh low-value activity.`
    );
  }

  if (totals.overdueClosures > 0) {
    bullets.push(
      `${totals.overdueClosures} closure follow-up(s) are pending; pipeline hygiene needs salesperson-wise review.`
    );
  }

  if (zeroActivity > 0) {
    bullets.push(
      `${zeroActivity} salesperson(s) had zero visible activity; verify field work vs RMS update discipline.`
    );
  }

  if (activityNoConversion > 0) {
    bullets.push(
      `${activityNoConversion} salesperson(s) show activity without conversion; review call quality and quotation movement.`
    );
  }

  if (!bullets.length) {
    bullets.push(
      "No major red flag today; keep focus on quotation speed and closure discipline."
    );
  }

  return bullets;
};

const buildWhatsAppMessage = async ({ date, rows }) => {
  const totals = rows.reduce(
    (acc, r) => {
      acc.calls += r.calls;
      acc.visits += r.visits;
      acc.emails += r.emails;
      acc.enquiries += r.enquiries;
      acc.quotations += r.quotations;
      acc.wonOrders += r.wonOrders;
      acc.lostOrders += r.lostOrders;
      acc.wonValue += r.wonValue;
      acc.overdueQuotes += r.overdueQuotations.length;
      acc.overdueClosures += r.overdueClosures.length;
      return acc;
    },
    {
      calls: 0,
      visits: 0,
      emails: 0,
      enquiries: 0,
      quotations: 0,
      wonOrders: 0,
      lostOrders: 0,
      wonValue: 0,
      overdueQuotes: 0,
      overdueClosures: 0,
    }
  );

  const priorityDelays = rows
    .flatMap((r) =>
      r.overdueQuotations.map((q) => ({
        employee: getEmployeeName(r.employee),
        ...q,
      }))
    )
    .sort((a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty)
    .slice(0, 5);

  const priorityText = priorityDelays.length
    ? priorityDelays
        .map(
          (q) =>
            `• ${q.companyName} — ${q.employee} — quotation overdue ${q.overdueDays} day(s), Qty ${q.qty || "-"} kg`
        )
        .join("\n")
    : "No high priority quotation delay.";

  const aiResult = await applyAIInsights(rows, totals, priorityText);
  const finalRows = aiResult.rows;

  const rankingText = finalRows
    .map(
      (r, index) =>
        `${index + 1}. ${getEmployeeName(r.employee)} — ${r.productivityScore}/100`
    )
    .join("\n");

  const employeeText = finalRows
    .map((r) => {
      const name = getEmployeeName(r.employee);

      const bullets = r.coachingBullets
        .slice(0, 6)
        .map((b) => `• ${b}`)
        .join("\n");

      return `👤 *${name}*
Performance Score: *${r.productivityScore}/100*
📞 ${r.calls} | 🚗 ${r.visits} | 📧 ${r.emails} | 📝 Enq ${r.enquiries} | 💰 Quote ${r.quotations} | 🏆 Won ${r.wonOrders} | ❌ Lost ${r.lostOrders}
⚠ Pending: ${r.overdueQuotations.length} quote overdue, ${r.overdueClosures.length} closure overdue

${bullets}`;
    })
    .join("\n\n");

  const managementBullets =
    aiResult.managementBullets || buildFallbackManagementBullets(totals, finalRows);

  return `📊 *Bharat RMS Sales Performance Intelligence*
Date: ${formatDate(date)} | ${formatTime(new Date())}

👥 *Team Snapshot*
📞 Calls: ${totals.calls}
🚗 Visits: ${totals.visits}
📧 Emails: ${totals.emails}
📝 Enquiries: ${totals.enquiries}
💰 Quotations: ${totals.quotations}
🏆 Orders Won: ${totals.wonOrders}
❌ Orders Lost: ${totals.lostOrders}

🏆 *Productivity Ranking*
${rankingText}

${employeeText}

🔥 *High Priority Delays*
${priorityText}

📌 *Management Intelligence*
${managementBullets.map((b) => `• ${b}`).join("\n")}`;
};

const buildEmailHtml = ({ date, rows }) => {
  const tableRows = rows
    .map((r, index) => {
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:900;">${index + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:900;">${getEmployeeName(r.employee)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.productivityScore}/100</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.calls}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.enquiries}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.quotations}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.wonOrders}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.lostOrders}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#b45309;font-weight:800;">${r.overdueQuotations.length}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#0f172a;">${r.coachingBullets.map((b) => `• ${b}`).join("<br/>")}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;background:#f4f7fb;">
<tr><td align="center">
<table width="1000" cellpadding="0" cellspacing="0" style="width:96%;max-width:1000px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
<tr>
<td style="padding:18px 22px;background:#0f172a;color:#ffffff;">
<div style="font-size:18px;font-weight:900;">Bharat RMS Sales Performance Intelligence</div>
<div style="font-size:12px;color:#cbd5e1;margin-top:3px;">${formatDate(date)} · ${formatTime(new Date())}</div>
</td>
</tr>
<tr>
<td style="padding:22px;">
<h2 style="margin:0;font-size:24px;color:#0f172a;">Daily Sales Coaching & Management Review</h2>
<p style="margin:7px 0 0;font-size:14px;color:#64748b;">Productivity score, conversion quality, pipeline risk and next-day coaching.</p>
</td>
</tr>
<tr>
<td style="padding:0 22px 24px;overflow-x:auto;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;font-size:13px;">
<tr style="background:#f8fafc;">
<th align="left" style="padding:10px;">Rank</th>
<th align="left" style="padding:10px;">Employee</th>
<th align="left" style="padding:10px;">Score</th>
<th align="left" style="padding:10px;">Calls</th>
<th align="left" style="padding:10px;">Enq</th>
<th align="left" style="padding:10px;">Quote</th>
<th align="left" style="padding:10px;">Won</th>
<th align="left" style="padding:10px;">Lost</th>
<th align="left" style="padding:10px;">Overdue</th>
<th align="left" style="padding:10px;">Coaching Insight</th>
</tr>
${tableRows}
</table>
</td>
</tr>
<tr>
<td style="padding:16px 22px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;">
Automated sales coaching report from Bharat RMS.
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
};

const sendDailySalesInsight = async () => {
  const lockKey = getTodayKey("sales_daily_insight");
  const allowed = await acquireDailyLock(lockKey);

  if (!allowed) {
    console.log("Sales daily insight already sent today. Skipping duplicate.");
    return { checked: 0, skipped: true };
  }

  const data = await buildEmployeeStats();

  const message = await buildWhatsAppMessage(data);
  await sendWhatsapp(message);

  if (MANAGER_EMAIL) {
    await transporter.sendMail({
      from: `"Bharat Special Steels Pvt. Ltd." <${process.env.ADMIN_EMAIL}>`,
      to: MANAGER_EMAIL,
      cc: process.env.SUPER_ADMIN_EMAIL || "",
      subject: `Sales Performance Intelligence | ${formatDate(data.date)}`,
      html: buildEmailHtml(data),
    });
  }

  return {
    checked: data.rows.length,
  };
};

module.exports = {
  sendDailySalesInsight,
};