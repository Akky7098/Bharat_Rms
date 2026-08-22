const AiUsageLog = require("../../../model/AiUsageLog");
const AiAuditLog = require("../../../model/AiAuditLog");

const safeCreate = async (Model, payload, label) => {
  try {
    await Model.create(payload);
  } catch (error) {
    console.error(`${label} write failed:`, error?.message || error);
  }
};

const logUsage = (payload) =>
  safeCreate(AiUsageLog, payload, "AI usage log");

const logAudit = (payload) =>
  safeCreate(AiAuditLog, payload, "AI audit log");

module.exports = {
  logUsage,
  logAudit,
};
