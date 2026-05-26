const { GoogleGenerativeAI } = require("@google/generative-ai");

const ENABLE_AI = process.env.ENABLE_AI_SALES_INSIGHT === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI =
  ENABLE_AI && GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const buildPrompt = (reportData) => `
You are an experienced steel sales director and daily performance coach for Bharat Special Steels.

IMPORTANT:
The productivity score and rank are already calculated by Bharat RMS rule engine.
Do NOT change score.
Do NOT create your own score.
Use score only to explain productivity.

Your job:
- Give practical daily coaching for each salesperson.
- Help the salesperson improve tomorrow.
- Give management clear action points.
- Be firm when the same issue repeats.
- Create accountability without insulting anyone.
- Never shame, embarrass, or use words like "void", "paralysis", "unacceptable", "lazy", "failure".
- Avoid generic praise.
- Do not congratulate unless TODAY has clear output such as won order, quotation release, or strong enquiry conversion.
- Keep language suitable for a company WhatsApp group.
- Use steel industry sales logic.

Steel sales productivity logic:
- Productivity is not only number of calls.
- Calls matter only if they create enquiry, quotation, closure movement, or order.
- A salesperson with many calls but no enquiry/quote/order has activity-output mismatch.
- A salesperson with enquiries but no quotation has quotation conversion bottleneck.
- A salesperson with orders won but zero outreach may be closing old pipeline, but must still build future pipeline.
- Repeated overdue quotation must be closed, escalated, or marked realistically.
- Large overdue closure backlog indicates pipeline hygiene risk.
- Price-related losses should trigger pricing/negotiation support discussion.
- Payment-term related losses should trigger commercial approval/terms discussion.

For each salesperson:
- Return 4 to 5 bullets only.
- First bullet must refer to today's productivity score and what it means.
- Second bullet must identify main strength or issue.
- Third bullet must mention trend/past data only if useful.
- Fourth bullet must say tomorrow's first action.
- Fifth bullet, if needed, should say what management should review/support.
- If repeated issue is visible, increase firmness professionally.
- Avoid repeating the same sentence structure for every person.

Management insight:
- Return 4 clear bullets.
- Mention where management should intervene tomorrow.
- Mention whether issue is activity, conversion, closure discipline, pricing, or pipeline hygiene.
- Be concise.

Return ONLY valid JSON in this exact shape:

{
  "employeeInsights": {
    "Employee Name": {
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

Report data:
${JSON.stringify(reportData, null, 2)}
`;

const generateTeamSalesCoachingReport = async ({ reportData }) => {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.35,
      topP: 0.8,
      topK: 40,
    },
  });

  const prompt = buildPrompt(reportData);

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return extractJson(text);
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini sales coaching attempt ${attempt} failed:`,
        error.message
      );

      if (attempt < 3) {
        await sleep(15000);
      }
    }
  }

  throw lastError;
};

module.exports = {
  generateTeamSalesCoachingReport,
};