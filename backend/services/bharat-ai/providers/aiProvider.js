const gemini = require("./geminiProvider");

const getProviderName = () =>
  String(process.env.BHARAT_AI_PROVIDER || "gemini").toLowerCase();

const getProvider = () => {
  const name = getProviderName();

  if (name === "gemini") {
    return {
      name: "gemini",
      generate: gemini.generate,
      extractUsage: gemini.extractUsage,
      getModel: gemini.getModel,
    };
  }

  throw new Error(
    `Unsupported BHARAT_AI_PROVIDER "${name}". Currently configured provider: gemini.`
  );
};

module.exports = {
  getProvider,
  getProviderName,
};
