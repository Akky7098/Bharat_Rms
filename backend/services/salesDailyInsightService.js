const User = require("../model/userModel");
const Enquiry = require("../model/enquiryModel");
const ColdCall = require("../model/coldCallModel");
const SalesOrder = require("../model/salesOrderModel");
const transporter = require("../util/mailTransporter");
const { getWhatsappClient, isWhatsappReady } = require("../util/whatsappClient");
const CronLock = require("../model/cronLockModel");

const {
  generateSalesInsight,
  generateManagementInsight,
} = require("./aiInsightService");

const SALES_GROUP_ID = process.env.SALES_DAILY_WHATSAPP_GROUP_ID;

const MANAGER_EMAIL =
  process.env.MANAGER_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "info@bharatspecialsteels.com";

const getISTRange = () => {
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const start = new Date(istNow);
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

const getEmployeeName = (emp) => emp?.name || "Unknown";

const getSalesEmployees = async () => {
  return User.find({
    role: { $in: ["user", "admin"] },
  })
    .select("_id name email role")
    .lean();
};

const buildFallbackInsight = (row) => {
  const name = getEmployeeName(row.employee);

  const priorityQuote = [...row.overdueQuotations].sort(
    (a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty
  )[0];

  if (
    row.calls === 0 &&
    row.visits === 0 &&
    row.emails === 0 &&
    row.enquiries === 0 &&
    row.quotations === 0 &&
    row.wonOrders === 0
  ) {
    return `🚨 ${name} recorded zero sales activity today. Management should verify whether field work happened but was not updated, or if this was a zero-productivity day.`;
  }

  if (row.wonOrders > 0 && priorityQuote) {
    return `✅ ${name} won ${row.wonOrders} order(s), but pipeline risk remains. ${priorityQuote.companyName} quotation is overdue by ${priorityQuote.overdueDays} day(s); manager should check why this is still open.`;
  }

  if (row.overdueClosures.length >= 10) {
    return `🚨 ${name} has ${row.overdueClosures.length} overdue closure follow-up(s). This indicates pipeline neglect; management should review old opportunities before allowing more new follow-ups.`;
  }

  if (row.calls >= 15 && row.quotations === 0 && row.wonOrders === 0) {
    return `⚠ ${name} has high activity but no conversion. Management should review lead quality, call effectiveness, and whether follow-ups are moving toward quotation.`;
  }

  if (row.enquiries > 0 && row.quotations === 0) {
    return `⚠ ${name} generated ${row.enquiries} enquiry(s) but no quotation moved. The bottleneck is quotation release or technical follow-up; manager intervention is needed.`;
  }

  if (row.overdueQuotations.length > 0) {
    return `🚨 ${name} has ${row.overdueQuotations.length} feasible quotation(s) overdue. These should be closed before new low-value activity is reviewed.`;
  }

  if (row.quotations > 0 || row.wonOrders > 0) {
    return `🟢 ${name} showed productive movement today with ${row.quotations} quotation(s) and ${row.wonOrders} won order(s). Keep focus on closing pending opportunities.`;
  }

  return `⚠ ${name} has activity but limited business movement. Management should ask what outcome came from today's calls and which customer will move next.`;
};

const buildEmployeeStats = async () => {
  const { start, end, now } = getISTRange();

  const [
    employees,
    enquiriesToday,
    allPendingEnquiries,
    coldCallsToday,
    salesOrdersToday,
    lostToday,
  ] = await Promise.all([
    getSalesEmployees(),

    Enquiry.find({
      enquiryDate: { $gte: start, $lte: end },
    }).lean(),

    Enquiry.find({
      "feasibility.status": "feasible",
      "closure.status": "pending",
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
      employee: emp,
      calls: 0,
      visits: 0,
      emails: 0,
      enquiries: 0,
      quotations: 0,
      wonOrders: 0,
      wonValue: 0,
      lostOrders: 0,
      lostReasons: {},
      overdueQuotations: [],
      overdueClosures: [],
      score: 0,
      insight: "",
    });
  });

  coldCallsToday.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    if (item.activityType === "calling") map.get(key).calls += 1;
    if (item.activityType === "visit") map.get(key).visits += 1;
    if (item.activityType === "email") map.get(key).emails += 1;
  });

  enquiriesToday.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    map.get(key).enquiries += 1;

    if (item.quotation?.completed) {
      map.get(key).quotations += 1;
    }
  });

  salesOrdersToday.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    map.get(key).wonOrders += 1;
    map.get(key).wonValue += Number(item.orderValue || 0);
  });

  lostToday.forEach((item) => {
    const key = String(item.salesPersonId);
    if (!map.has(key)) return;

    const reason = item.closure?.lostRemark || "not_specified";

    map.get(key).lostOrders += 1;
    map.get(key).lostReasons[reason] =
      (map.get(key).lostReasons[reason] || 0) + 1;
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
    row.score =
      row.calls * 1 +
      row.visits * 2 +
      row.emails * 1 +
      row.enquiries * 3 +
      row.quotations * 5 +
      row.wonOrders * 15 -
      row.overdueQuotations.length * 5 -
      row.overdueClosures.length * 3;

    row.insight = buildFallbackInsight(row);

    return row;
  });

  rows.sort((a, b) => b.score - a.score);

  return {
    date: start,
    rows,
  };
};

const enrichRowsWithAIInsights = async (rows) => {
  const updatedRows = [];

  for (const row of rows) {
    try {
      const priorityQuote = [...row.overdueQuotations].sort(
        (a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty
      )[0];

      const aiInsight = await generateSalesInsight({
        employeeName: getEmployeeName(row.employee),
        stats: {
          calls: row.calls,
          visits: row.visits,
          emails: row.emails,
          enquiries: row.enquiries,
          quotations: row.quotations,
          wonOrders: row.wonOrders,
          lostOrders: row.lostOrders,
          overdueQuotationCount: row.overdueQuotations.length,
          overdueClosureCount: row.overdueClosures.length,
          topOverdueQuotation: priorityQuote
            ? `${priorityQuote.companyName}, ${priorityQuote.overdueDays} days overdue, Qty ${priorityQuote.qty || "-"} kg`
            : "",
        },
      });

      if (aiInsight) {
        row.insight = aiInsight;
      }
    } catch (error) {
      console.error(
        `AI insight failed for ${getEmployeeName(row.employee)}:`,
        error.message
      );
    }

    updatedRows.push(row);
  }

  return updatedRows;
};

const buildFallbackManagementInsight = (totals, zeroActivityCount, activityNoConversionCount) => {
  const actions = [];

  if (totals.overdueQuotes > 0) {
    actions.push(
      `🚨 ${totals.overdueQuotes} feasible quotation(s) are overdue. Management should first ask why these quotes were not released/closed.`
    );
  }

  if (totals.overdueClosures > 0) {
    actions.push(
      `🚨 ${totals.overdueClosures} closure follow-up(s) are pending. This is a pipeline hygiene issue and needs salesperson-wise review.`
    );
  }

  if (zeroActivityCount > 0) {
    actions.push(
      `⚠ ${zeroActivityCount} employee(s) recorded zero activity. Verify whether field work happened but was not updated.`
    );
  }

  if (activityNoConversionCount > 0) {
    actions.push(
      `⚠ ${activityNoConversionCount} employee(s) had activity without quotation/order movement. Review lead quality and follow-up effectiveness.`
    );
  }

  if (!actions.length) {
    actions.push(
      "🟢 No major delay pattern detected today. Focus tomorrow on maintaining quotation speed and closure discipline."
    );
  }

  return actions.slice(0, 4).join("\n");
};

const buildWhatsAppMessage = async ({ date, rows }) => {
  const rowsWithInsight = await enrichRowsWithAIInsights(rows);

  const totals = rowsWithInsight.reduce(
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

  const zeroActivityCount = rowsWithInsight.filter(
    (r) =>
      r.calls === 0 &&
      r.visits === 0 &&
      r.emails === 0 &&
      r.enquiries === 0 &&
      r.quotations === 0 &&
      r.wonOrders === 0
  ).length;

  const activityNoConversionCount = rowsWithInsight.filter(
    (r) =>
      (r.calls > 0 || r.visits > 0 || r.emails > 0 || r.enquiries > 0) &&
      r.quotations === 0 &&
      r.wonOrders === 0
  ).length;

  const employeeLines = rowsWithInsight
    .map((r, index) => {
      const name = getEmployeeName(r.employee);

      const overdueText =
        r.overdueQuotations.length || r.overdueClosures.length
          ? `\n⚠ Pending: ${r.overdueQuotations.length} quote overdue, ${r.overdueClosures.length} closure overdue`
          : "";

      return `${index + 1}. *${name}*
📞 ${r.calls} | 🚗 ${r.visits} | 📧 ${r.emails} | 📝 Enq ${r.enquiries} | 💰 Quote ${r.quotations} | 🏆 Won ${r.wonOrders} | ❌ Lost ${r.lostOrders}${overdueText}
💡 ${r.insight}`;
    })
    .join("\n\n");

  const priorityDelays = rowsWithInsight
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

  let managementInsight = buildFallbackManagementInsight(
    totals,
    zeroActivityCount,
    activityNoConversionCount
  );

  try {
    const aiManagementInsight = await generateManagementInsight({
      totals,
      priorityDelays: priorityText,
    });

    if (aiManagementInsight) {
      managementInsight = aiManagementInsight;
    }
  } catch (error) {
    console.error("AI management insight failed:", error.message);
  }

  return `📊 *Bharat RMS Sales Daily Command Centre*
Date: ${formatDate(date)} | ${formatTime(new Date())}

👥 *Team Snapshot*
📞 Calls: ${totals.calls}
🚗 Visits: ${totals.visits}
📧 Emails: ${totals.emails}
📝 Enquiries: ${totals.enquiries}
💰 Quotations: ${totals.quotations}
🏆 Orders Won: ${totals.wonOrders}
❌ Orders Lost: ${totals.lostOrders}

👤 *Employee Scoreboard*

${employeeLines}

🔥 *High Priority Delays*
${priorityText}

📌 *Management Insight*
${managementInsight}`;
};

const buildEmailHtml = ({ date, rows }) => {
  const tableRows = rows
    .map((r, index) => {
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:900;">${index + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:900;">${getEmployeeName(r.employee)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.calls}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.visits}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.enquiries}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.quotations}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.wonOrders}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.lostOrders}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#b45309;font-weight:800;">${r.overdueQuotations.length}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#0f172a;">${r.insight}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;background:#f4f7fb;">
    <tr>
      <td align="center">
        <table width="900" cellpadding="0" cellspacing="0" style="width:96%;max-width:900px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:18px 22px;background:#0f172a;color:#ffffff;">
              <div style="font-size:18px;font-weight:900;">Bharat RMS Sales Daily Command Centre</div>
              <div style="font-size:12px;color:#cbd5e1;margin-top:3px;">${formatDate(date)} · ${formatTime(new Date())}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px;">
              <h2 style="margin:0;font-size:24px;color:#0f172a;">Employee-wise Sales Performance</h2>
              <p style="margin:7px 0 0;font-size:14px;color:#64748b;">Daily productivity, quotation speed, won/lost orders and management insight.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 22px 24px;overflow-x:auto;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;font-size:13px;">
                <tr style="background:#f8fafc;">
                  <th align="left" style="padding:10px;">Rank</th>
                  <th align="left" style="padding:10px;">Employee</th>
                  <th align="left" style="padding:10px;">Calls</th>
                  <th align="left" style="padding:10px;">Visits</th>
                  <th align="left" style="padding:10px;">Enq</th>
                  <th align="left" style="padding:10px;">Quote</th>
                  <th align="left" style="padding:10px;">Won</th>
                  <th align="left" style="padding:10px;">Lost</th>
                  <th align="left" style="padding:10px;">Overdue</th>
                  <th align="left" style="padding:10px;">Management Insight</th>
                </tr>
                ${tableRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 22px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;">
              Automated sales performance summary from Bharat RMS.
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
      subject: `Sales Daily Command Centre | ${formatDate(data.date)}`,
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