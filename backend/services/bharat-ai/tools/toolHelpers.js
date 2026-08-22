const {
  User,
} = require("../modelRegistry");

const {
  isManagement,
} = require("../security/aiAccess");

const IST_OFFSET = "+05:30";

const startOfISTDayUTC = (dateString) => {
  const d = new Date(`${dateString}T00:00:00${IST_OFFSET}`);

  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return d;
};

const endOfISTDayUTC = (dateString) => {
  const d = new Date(`${dateString}T23:59:59.999${IST_OFFSET}`);

  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return d;
};

const buildDateRange = (dateFrom, dateTo) => {
  const range = {};

  if (dateFrom) range.$gte = startOfISTDayUTC(dateFrom);
  if (dateTo) range.$lte = endOfISTDayUTC(dateTo);

  return Object.keys(range).length ? range : undefined;
};

const resolveEmployee = async ({
  requestingUser,
  employeeId,
  employeeName,
}) => {
  if (!requestingUser?._id) {
    throw new Error("Authenticated user is required.");
  }

  if (!isManagement(requestingUser)) {
    return User.findById(requestingUser._id)
      .select("_id name email role")
      .lean();
  }

  if (employeeId) {
    const employee = await User.findById(employeeId)
      .select("_id name email role")
      .lean();

    if (!employee) throw new Error("Employee not found.");
    return employee;
  }

  if (!employeeName) {
    throw new Error("employeeName or employeeId is required.");
  }

  const matches = await User.find({
    name: { $regex: employeeName, $options: "i" },
  })
    .select("_id name email role")
    .limit(10)
    .lean();

  if (matches.length === 0) {
    return {
      ambiguous: false,
      notFound: true,
      matches: [],
    };
  }

  if (matches.length > 1) {
    return {
      ambiguous: true,
      notFound: false,
      matches,
    };
  }

  return matches[0];
};

const publicEmployee = (employee) =>
  employee
    ? {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      }
    : null;

const cacheMetadata = (cache, ttlSeconds) => ({
  hit: Boolean(cache?.hit),
  ttlSeconds,
});

module.exports = {
  buildDateRange,
  startOfISTDayUTC,
  endOfISTDayUTC,
  resolveEmployee,
  publicEmployee,
  cacheMetadata,
};
