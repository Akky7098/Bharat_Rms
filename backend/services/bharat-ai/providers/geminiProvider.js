const { GoogleGenAI } = require("@google/genai");
const { getToolDeclarations } = require("../toolRegistry");

let aiClient = null;

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return aiClient;
};

const getModel = () =>
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const normalizeSchemaTypes = (value) => {
  if (Array.isArray(value)) return value.map(normalizeSchemaTypes);

  if (!value || typeof value !== "object") return value;

  const result = {};

  for (const [key, child] of Object.entries(value)) {
    if (key === "type" && typeof child === "string") {
      result[key] = child.toUpperCase();
    } else {
      result[key] = normalizeSchemaTypes(child);
    }
  }

  return result;
};

const getGeminiTools = () => [
  {
    functionDeclarations: getToolDeclarations().map((decl) => ({
      ...decl,
      parameters: normalizeSchemaTypes(decl.parameters),
    })),
  },
];

const generate = async ({
  contents,
  systemInstruction,
}) => {
  return getClient().models.generateContent({
    model: getModel(),
    contents,
    config: {
      systemInstruction,
      tools: getGeminiTools(),
      temperature: 0.2,
    },
  });
};

const extractUsage = (response) => {
  const usage = response?.usageMetadata || {};

  return {
    inputTokens: Number(
      usage.promptTokenCount ||
        usage.inputTokenCount ||
        0
    ),
    outputTokens: Number(
      usage.candidatesTokenCount ||
        usage.outputTokenCount ||
        0
    ),
    totalTokens: Number(usage.totalTokenCount || 0),
  };
};

module.exports = {
  generate,
  extractUsage,
  getModel,
};
