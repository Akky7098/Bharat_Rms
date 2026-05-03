const ColdCall = require("../model/coldCallModel");

const createColdCall = async (body, user) => {
  const {
    activityType,
    date,
    companyName,
    contactPersonName,
    contactPersonNumber,
  } = body;

  const coldCall = await ColdCall.create({
    salesPersonId: user.id,
    activityType,
    date,
    companyName,
    contactPersonName,
    contactPersonNumber,
  });

  return coldCall;
};

const getAllColdCalls = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    salesPersonId,
    fromDate,
    toDate,
    activityType,
  } = query;

  const filter = {};

  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      filter.salesPersonId = salesPersonId;
    }
  } else {
    filter.salesPersonId = user.id;
  }

  if (activityType) {
    filter.activityType = activityType;
  }

  if (fromDate || toDate) {
    filter.date = {};

    if (fromDate) {
      filter.date.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.date.$lte = endDate;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalRecords = await ColdCall.countDocuments(filter);

  const coldCalls = await ColdCall.find(filter)
    .populate("salesPersonId", "name email role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return {
    coldCalls,
    pagination: {
      totalRecords,
      currentPage: Number(page),
      totalPages: Math.ceil(totalRecords / Number(limit)),
      limit: Number(limit),
    },
  };
};

module.exports = {
  createColdCall,
  getAllColdCalls,
};