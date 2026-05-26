const { GoogleGenerativeAI } = require("@google/generative-ai");

const ENABLE_AI = process.env.ENABLE_AI_SALES_INSIGHT === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI =
  ENABLE_AI && GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const generateSalesInsight = async ({ employeeName, stats }) => {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const prompt = `
You are a strict sales performance director for a steel company.

Give one sharp management insight for this salesperson.
Do not use motivational or soft words.
Do not say "stable" unless performance is clearly balanced.
Focus on what management should ask or act on.

Keep it within 2 lines.

Salesperson: ${employeeName}

Data:
Calls: ${stats.calls}
Visits: ${stats.visits}
Emails: ${stats.emails}
Enquiries: ${stats.enquiries}
Quotations: ${stats.quotations}
Orders Won: ${stats.wonOrders}
Orders Lost: ${stats.lostOrders}
Quotation Overdue Count: ${stats.overdueQuotationCount}
Closure Overdue Count: ${stats.overdueClosureCount}
Top Overdue Quotation: ${stats.topOverdueQuotation || "None"}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

const generateManagementInsight = async ({ totals, priorityDelays }) => {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const prompt = `
You are a sales director reviewing today's Bharat RMS sales report.

Write a strict management action summary.
No generic text.
Mention what management should ask tomorrow.
Keep within 4 bullet points.

Team data:
Calls: ${totals.calls}
Visits: ${totals.visits}
Emails: ${totals.emails}
Enquiries: ${totals.enquiries}
Quotations: ${totals.quotations}
Orders Won: ${totals.wonOrders}
Orders Lost: ${totals.lostOrders}
Overdue Quotations: ${totals.overdueQuotes}
Overdue Closures: ${totals.overdueClosures}

High priority delays:
${priorityDelays || "None"}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

module.exports = {
  generateSalesInsight,
  generateManagementInsight,
};