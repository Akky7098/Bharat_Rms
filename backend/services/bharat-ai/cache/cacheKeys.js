const crypto = require("crypto");

const safe = (value) => {
  if (value === undefined || value === null || value === "") return "all";

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.:@-]/g, "");
};

const userScope = (user) => {
  if (!user?._id) return "anonymous";

  if (["super_admin", "admin"].includes(user.role)) {
    return "management";
  }

  return `user:${safe(user._id)}`;
};

const fingerprint = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex").slice(0, 20);

const key = (...parts) =>
  ["bharat", "ai", ...parts.map(safe)].join(":");

const CACHE_KEYS = {
  genericTool: ({ toolName, requestingUser, args }) =>
    key("tool", toolName, userScope(requestingUser), fingerprint(args)),

  conversation: ({ userId, conversationId }) =>
    key("conversation", userId, conversationId),

  sales: (params) =>
    key(
      "sales",
      userScope(params.requestingUser),
      params.salesPersonId,
      params.dateFrom,
      params.dateTo
    ),

  enquiry: (params) =>
    key(
      "enquiry",
      userScope(params.requestingUser),
      params.salesPersonId,
      params.dateFrom,
      params.dateTo
    ),

  dispatch: (params) =>
    key(
      "dispatch",
      userScope(params.requestingUser),
      params.salesPersonId,
      params.dateFrom,
      params.dateTo
    ),

  receivable: (params) =>
    key("receivable", userScope(params.requestingUser), params.companyName),

  tracking: (params) =>
    key(
      "tracking",
      userScope(params.requestingUser),
      params.salesPersonId,
      params.companyName
    ),

  attendance: (params) =>
    key(
      "attendance",
      userScope(params.requestingUser),
      params.employeeId,
      params.employeeName,
      params.dateFrom,
      params.dateTo,
      params.date
    ),

  timesheet: (params) =>
    key(
      "timesheet",
      userScope(params.requestingUser),
      params.employeeId,
      params.employeeName,
      params.dateFrom,
      params.dateTo,
      params.date
    ),

  coldCall: (params) =>
    key(
      "cold-call",
      userScope(params.requestingUser),
      params.salesPersonId,
      params.dateFrom,
      params.dateTo
    ),
};

module.exports = {
  CACHE_KEYS,
  userScope,
  fingerprint,
};
