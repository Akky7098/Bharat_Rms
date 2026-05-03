const SalesOrder = require("../model/salesOrderModel");
const Enquiry = require("../model/enquiryModel");

const getDateFilter = (fromDate, toDate, fieldName) => {
  const filter = {};

  if (fromDate || toDate) {
    filter[fieldName] = {};

    if (fromDate) {
      filter[fieldName].$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter[fieldName].$lte = endDate;
    }
  }

  return filter;
};

const getDashboardSummary = async (query, user) => {
  const { fromDate, toDate } = query;

  const salesOrderFilter = {
    ...getDateFilter(fromDate, toDate, "orderDate"),
  };

  const enquiryFilter = {
    ...getDateFilter(fromDate, toDate, "enquiryDate"),
  };

  if (user.role !== "admin" && user.role !== "super_admin") {
    salesOrderFilter.salesPersonId = user.id;
    enquiryFilter.salesPersonId = user.id;
  }

  const totalOrders = await SalesOrder.countDocuments(salesOrderFilter);

  const revenueData = await SalesOrder.aggregate([
    { $match: salesOrderFilter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$valueInRupees" },
      },
    },
  ]);

  const totalRevenue = revenueData[0]?.totalRevenue || 0;

  const totalEnquiries = await Enquiry.countDocuments(enquiryFilter);

  const wonEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": "won",
  });

  const lostEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": "lost",
  });

  const delayedEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    $or: [
      {
        "feasibility.actualDate": { $exists: true },
        $expr: {
          $gt: ["$feasibility.actualDate", "$feasibility.planDate"],
        },
      },
      {
        "quotation.actualDate": { $exists: true },
        $expr: {
          $gt: ["$quotation.actualDate", "$quotation.planDate"],
        },
      },
    ],
  });

  const salesPersonRevenue = await SalesOrder.aggregate([
    { $match: salesOrderFilter },
    {
      $group: {
        _id: "$salesPersonId",
        revenue: { $sum: "$valueInRupees" },
        orders: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "salesPerson",
      },
    },
    { $unwind: "$salesPerson" },
    {
      $project: {
        _id: 0,
        salesPersonId: "$salesPerson._id",
        name: "$salesPerson.name",
        email: "$salesPerson.email",
        revenue: 1,
        orders: 1,
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const gradeWiseQuantity = await SalesOrder.aggregate([
    { $match: salesOrderFilter },
    {
      $group: {
        _id: "$grade",
        quantity: { $sum: "$quantityInKg" },
        revenue: { $sum: "$valueInRupees" },
        orders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        grade: "$_id",
        quantity: 1,
        revenue: 1,
        orders: 1,
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 10 },
  ]);
   const delayedEmployeeData = await Enquiry.aggregate([
  { $match: enquiryFilter },
  {
    $match: {
      $or: [
        { $expr: { $gt: ["$feasibility.actualDate", "$feasibility.planDate"] } },
        { $expr: { $gt: ["$quotation.actualDate", "$quotation.planDate"] } },
      ],
    },
  },
  {
    $group: {
      _id: "$salesPersonId",
      delayedCount: { $sum: 1 },
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "salesPerson",
    },
  },
  { $unwind: "$salesPerson" },
  {
    $project: {
      _id: 0,
      name: "$salesPerson.name",
      email: "$salesPerson.email",
      delayedCount: 1,
    },
  },
  { $sort: { delayedCount: -1 } },
  { $limit: 1 },
]);

const lostEmployeeData = await Enquiry.aggregate([
  {
    $match: {
      ...enquiryFilter,
      "closure.status": "lost",
    },
  },
  {
    $group: {
      _id: "$salesPersonId",
      lostCount: { $sum: 1 },
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "salesPerson",
    },
  },
  { $unwind: "$salesPerson" },
  {
    $project: {
      _id: 0,
      name: "$salesPerson.name",
      email: "$salesPerson.email",
      lostCount: 1,
    },
  },
  { $sort: { lostCount: -1 } },
  { $limit: 1 },
]);
const wonEmployeeData = await Enquiry.aggregate([
  {
    $match: {
      ...enquiryFilter,
      "closure.status": "won",
    },
  },
  {
    $group: {
      _id: "$salesPersonId",
      wonCount: { $sum: 1 },
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "salesPerson",
    },
  },
  { $unwind: "$salesPerson" },
  {
    $project: {
      _id: 0,
      name: "$salesPerson.name",
      email: "$salesPerson.email",
      wonCount: 1,
    },
  },
  { $sort: { wonCount: -1 } },
  { $limit: 1 },
]);
  const salesPersonRevenueWithPercentage = salesPersonRevenue.map((person) => ({
    ...person,
    percentage:
      totalRevenue > 0
        ? Number(((person.revenue / totalRevenue) * 100).toFixed(2))
        : 0,
  }));

  return {
    totalRevenue,
    totalOrders,
    totalEnquiries,
    wonEnquiries,
    lostEnquiries,
    delayedEnquiries,
    salesPersonRevenue: salesPersonRevenueWithPercentage,
    gradeWiseQuantity,
     topDelayedEmployee: delayedEmployeeData[0] || null,
     topLostEmployee: lostEmployeeData[0] || null,
     topWonEmployee: wonEmployeeData[0] || null,
  };
};

module.exports = {
  getDashboardSummary,
};