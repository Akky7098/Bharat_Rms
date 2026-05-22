const User = require("../model/userModel");
const Enquiry = require("../model/enquiryModel");
const ColdCall = require("../model/coldCallModel");
const SalesOrder = require("../model/salesOrderModel");
const transporter = require("../util/mailTransporter");
const { getWhatsappClient, isWhatsappReady } = require("../util/whatsappClient");

const SALES_GROUP_ID = process.env.SALES_DAILY_WHATSAPP_GROUP_ID;
const MANAGER_EMAIL =
  process.env.MANAGER_EMAIL || process.env.ADMIN_EMAIL || "info@bharatspecialsteels.com";

const getISTRange = () => {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  const start = new Date(istNow);
  start.setHours(0, 0, 0, 0);

  const end = new Date(istNow);
  end.setHours(23, 59, 59, 999);

  return { start, end, now: istNow };
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
    map.get(key).lostReasons[reason] = (map.get(key).lostReasons[reason] || 0) + 1;
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

    const priorityQuote = [...row.overdueQuotations].sort(
      (a, b) => b.overdueDays - a.overdueDays || b.qty - a.qty
    )[0];

    if (row.wonOrders > 0 && priorityQuote) {
      row.insight = `${getEmployeeName(row.employee)} converted well today, but ${priorityQuote.companyName} quotation is overdue by ${priorityQuote.overdueDays} day(s). This can cause order loss if not closed immediately.`;
    } else if (row.calls >= 15 && row.quotations === 0) {
      row.insight = `${getEmployeeName(row.employee)} has strong calling activity, but no quotation moved today. Focus should shift from calling to quotation conversion.`;
    } else if (row.enquiries > 0 && row.quotations === 0) {
      row.insight = `${getEmployeeName(row.employee)} generated enquiries but quotation conversion is pending. First priority tomorrow should be quotation release.`;
    } else if (row.calls === 0 && row.enquiries === 0 && row.quotations === 0 && row.wonOrders === 0) {
      row.insight = `${getEmployeeName(row.employee)} has no sales activity updated today. Please verify if field work happened but was not updated in RMS.`;
    } else if (row.overdueQuotations.length > 0) {
      row.insight = `${getEmployeeName(row.employee)} has ${row.overdueQuotations.length} feasible quotation(s) overdue. These should be completed before new low-value follow-ups.`;
    } else {
      row.insight = `${getEmployeeName(row.employee)} activity is stable. Keep follow-ups updated to avoid leakage.`;
    }

    return row;
  });

  rows.sort((a, b) => b.score - a.score);

  return {
    date: start,
    rows,
  };
};

const buildWhatsAppMessage = ({ date, rows }) => {
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

  const employeeLines = rows
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
${totals.overdueQuotes} feasible quotation(s) are overdue and ${totals.overdueClosures} closure follow-up(s) are pending.
Ask the concerned salesperson about overdue high-value feasible enquiries first, before reviewing low-value activity.`;
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
  const data = await buildEmployeeStats();

  const message = buildWhatsAppMessage(data);
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