const { GoogleGenerativeAI } = require("@google/generative-ai");

const ENABLE_AI = process.env.ENABLE_AI_SALES_INSIGHT === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI =
  ENABLE_AI && GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const extractJson = (text = "") => {
  const clean = String(text)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain valid JSON");
  }

  return JSON.parse(clean.slice(start, end + 1));
};

const generateTeamSalesCoachingReport = async ({ reportData }) => {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const prompt = `
You are an experienced steel sales director and performance coach for Bharat Special Steels.

Your job:
- Give practical daily coaching for each salesperson.
- Be firm when the same issue repeats.
- Never insult, shame, embarrass, or use words like "void", "paralysis", "unacceptable".
- Management should be able to act from this.
- Salesperson should feel guided, not attacked.
- Use trend data when available.
- Identify productivity, not only activity.
- Calls without enquiry/quotation/conversion should be flagged as low productivity.
- Repeated overdue quotation/closure should be called out clearly.
- Suggest what to do tomorrow.
- Avoid same generic wording for every employee.
- Keep WhatsApp readable.

Return ONLY valid JSON in this exact shape:

{
  "employeeInsights": {
    "Employee Name": {
      "score": 0,
      "rankNote": "short productivity note",
      "bullets": [
        "bullet 1",
        "bullet 2",
        "bullet 3",
        "bullet 4",
        "bullet 5"
      ]
    }
  },
  "managementInsight": [
    "bullet 1",
    "bullet 2",
    "bullet 3",
    "bullet 4"
  ]
}

Scoring guidance:
- 85-100: high productive output
- 70-84: good but needs cleanup
- 50-69: activity exists but conversion/pipeline weak
- 30-49: weak productivity
- 0-29: serious attention needed

Report data:
${JSON.stringify(reportData, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return extractJson(text);
};

module.exports = {
  generateTeamSalesCoachingReport,
};