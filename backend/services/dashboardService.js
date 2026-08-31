const SalesOrder = require("../model/salesOrderModel");
const Enquiry = require("../model/enquiryModel");
const mongoose = require("mongoose");
const Receivable = require("../model/receivableModel");
const ColdCall = require("../model/coldCallModel");

const getISTDateRange = (fromDate, toDate) => {
  const range = {};

  if (fromDate) {
    range.$gte = new Date(`${fromDate}T00:00:00.000+05:30`);
  }

  if (toDate) {
    range.$lte = new Date(`${toDate}T23:59:59.999+05:30`);
  }

  return range;
};

const getDateFilter = (fromDate, toDate, fieldName) => {
  const filter = {};

  if (fromDate || toDate) {
    filter[fieldName] = getISTDateRange(fromDate, toDate);
  }

  return filter;
};

const formatLostReason = (reason = "") => {
  const text = String(reason)
    .toLowerCase()
    .trim();

  // PRICE
  if (
    text.includes("price") ||
    text.includes("rate") ||
    text.includes("cost") ||
    text.includes("expensive") ||
    text.includes("higher amount") ||
    text.includes("lower price") ||
    text.includes("budget")
  ) {
    return "Price Issue";
  }

  // QUANTITY
  if (
    text.includes("qty") ||
    text.includes("quantity") ||
    text.includes("small qty") ||
    text.includes("low qty")
  ) {
    return "Quantity Issue";
  }

  // SIZE
  if (
    text.includes("size") ||
    text.includes("dimension") ||
    text.includes("dia") ||
    text.includes("od") ||
    text.includes("length")
  ) {
    return "Size Issue";
  }

  // DELIVERY
  if (
    text.includes("delivery") ||
    text.includes("late") ||
    text.includes("urgent") ||
    text.includes("timeline") ||
    text.includes("delay")
  ) {
    return "Delivery Delay";
  }

  // GRADE / MATERIAL
  if (
    text.includes("grade") ||
    text.includes("material") ||
    text.includes("steel") ||
    text.includes("hardness") ||
    text.includes("specification")
  ) {
    return "Grade Availability";
  }

  // PAYMENT
  if (
    text.includes("payment") ||
    text.includes("credit") ||
    text.includes("advance") ||
    text.includes("terms")
  ) {
    return "Payment Terms";
  }

  // COMPETITOR
  if (
    text.includes("competitor") ||
    text.includes("other supplier") ||
    text.includes("existing vendor") ||
    text.includes("local supplier")
  ) {
    return "Competitor Issue";
  }

  // CUSTOMER DROPPED
  if (
    text.includes("cancel") ||
    text.includes("dropped") ||
    text.includes("hold") ||
    text.includes("closed")
  ) {
    return "Customer Dropped";
  }

  // fallback
  return "Others";
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

  const approvedSalesOrderFilter = {
    ...salesOrderFilter,
    approvalStatus: "approved",
  };

  let pendingSalesOrderFilter = { ...salesOrderFilter };

  if (user.role === "admin") {
    pendingSalesOrderFilter.approvalStatus = "pending_admin_review";
  } else if (user.role === "super_admin") {
    pendingSalesOrderFilter.approvalStatus = "pending_manager_approval";
  } else {
    pendingSalesOrderFilter.approvalStatus = {
      $in: ["pending_admin_review", "pending_manager_approval"],
    };
  }

  const pendingOrders = await SalesOrder.countDocuments(pendingSalesOrderFilter);

  const totalOrders = await SalesOrder.countDocuments(approvedSalesOrderFilter);

  const revenueData = await SalesOrder.aggregate([
    { $match: approvedSalesOrderFilter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$orderValue" },
      },
    },
  ]);

  const totalRevenue = revenueData[0]?.totalRevenue || 0;

  const totalEnquiries = await Enquiry.countDocuments(enquiryFilter);

  const feasibleEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "feasibility.status": "feasible",
  });

  const notFeasibleEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "feasibility.status": "not_feasible",
  });

  const wonEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": "won",
  });

  const lostEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": "lost",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delayedEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": { $nin: ["won", "lost"] },
    $or: [
      {
        "feasibility.planDate": { $lt: today },
        "feasibility.completed": { $ne: true },
      },
      {
        "quotation.planDate": { $lt: today },
        "quotation.completed": { $ne: true },
      },
      {
        "closure.planDate": { $lt: today },
        "closure.completed": { $ne: true },
      },
    ],
  });

  const activeEnquiries = await Enquiry.countDocuments({
    ...enquiryFilter,
    "closure.status": { $nin: ["won", "lost"] },
    $nor: [
      {
        $or: [
          {
            "feasibility.planDate": { $lt: today },
            "feasibility.completed": { $ne: true },
          },
          {
            "quotation.planDate": { $lt: today },
            "quotation.completed": { $ne: true },
          },
          {
            "closure.planDate": { $lt: today },
            "closure.completed": { $ne: true },
          },
        ],
      },
    ],
  });

  const salesPersonRevenue = await SalesOrder.aggregate([
    { $match: approvedSalesOrderFilter },
    {
      $group: {
        _id: "$salesPersonId",
        revenue: { $sum: "$orderValue" },
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

  const salesPersonRevenueWithPercentage = salesPersonRevenue.map((person) => ({
    ...person,
    percentage:
      totalRevenue > 0
        ? Number(((person.revenue / totalRevenue) * 100).toFixed(2))
        : 0,
  }));

 const gradeWiseQuantity = await SalesOrder.aggregate([
  {
    $match: approvedSalesOrderFilter,
  },
  {
    $project: {
      orderValue: 1,
      sizeGradeQuantityRate: {
        $ifNull: ["$sizeGradeQuantityRate", ""],
      },
    },
  },
  {
    $addFields: {
      gradeMatch: {
        $regexFind: {
          input: "$sizeGradeQuantityRate",
          regex: /(?:grade|gr)\s*[:\-]?\s*([A-Za-z0-9.+\-\/]+)/i,
        },
      },
    },
  },
  {
    $addFields: {
      extractedGrade: {
        $arrayElemAt: ["$gradeMatch.captures", 0],
      },
    },
  },
  {
    $project: {
      orderValue: 1,
      grade: {
        $cond: [
          {
            $or: [
              { $eq: ["$extractedGrade", null] },
              { $eq: ["$extractedGrade", ""] },
            ],
          },
          "Not Specified",
          {
            $toUpper: {
              $trim: {
                input: "$extractedGrade",
              },
            },
          },
        ],
      },
    },
  },
  {
    $group: {
      _id: "$grade",
      revenue: { $sum: "$orderValue" },
      orders: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      grade: "$_id",
      revenue: 1,
      orders: 1,
    },
  },
  {
    $sort: {
      orders: -1,
      revenue: -1,
    },
  },
  {
    $limit: 10,
  },
]);

  const delayedEmployeeData = await Enquiry.aggregate([
    {
      $match: {
        ...enquiryFilter,
        "closure.status": { $nin: ["won", "lost"] },
      },
    },
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

  const lostReasonData = await Enquiry.aggregate([
    {
      $match: {
        ...enquiryFilter,
        "closure.status": "lost",
      },
    },
    {
      $project: {
        reason: {
          $cond: [
            { $eq: ["$closure.lostRemark", "others"] },
            "$closure.lostRemarkOtherText",
            "$closure.lostRemark",
          ],
        },
      },
    },
    {
      $match: {
        reason: { $exists: true, $nin: ["", null] },
      },
    },
    {
      $group: {
        _id: "$reason",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  const topLostReason = lostReasonData[0]
    ? {
        reason: formatLostReason(lostReasonData[0]._id),
        rawReason: lostReasonData[0]._id,
        count: lostReasonData[0].count,
      }
    : null;

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,

    totalEnquiries,
    feasibleEnquiries,
    notFeasibleEnquiries,
    wonEnquiries,
    lostEnquiries,
    delayedEnquiries,
    activeEnquiries,

    salesPersonRevenue: salesPersonRevenueWithPercentage,
    gradeWiseQuantity,

    topDelayedEmployee: delayedEmployeeData[0] || null,
    topLostEmployee: lostEmployeeData[0] || null,
    topWonEmployee: wonEmployeeData[0] || null,
    topLostReason,
  };
};

/* ===================================== */
/* CASHFLOW DASHBOARD */
/* ===================================== */

const getCashflowSummary = async (query, user) => {
  const { fromDate, toDate } = query;

  const invoiceDateFilter = {};

  if (fromDate || toDate) {
    invoiceDateFilter["invoices.invoiceDate"] = {};

    if (fromDate) {
      invoiceDateFilter["invoices.invoiceDate"].$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      invoiceDateFilter["invoices.invoiceDate"].$lte = endDate;
    }
  }

  const baseFilter = {
    isActive: true,
  };

  if (user.role !== "admin" && user.role !== "super_admin" && user.role !== "accounts") {
    baseFilter["salesPersons.userId"] = new mongoose.Types.ObjectId(
      user._id || user.id
    );
  }

  const summaryData = await Receivable.aggregate([
    {
      $match: baseFilter,
    },
    {
      $unwind: "$invoices",
    },
    {
      $match: invoiceDateFilter,
    },
    {
      $group: {
        _id: null,

        totalRevenue: {
          $sum: "$invoices.invoiceAmount",
        },

        totalPaid: {
          $sum: "$invoices.receivedAmount",
        },

        totalPending: {
          $sum: "$invoices.pendingAmount",
        },

        overdueAmount: {
          $sum: {
            $cond: [
              {
                $eq: ["$invoices.status", "overdue"],
              },
              "$invoices.pendingAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const result = summaryData[0] || {
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    overdueAmount: 0,
  };

  const today = new Date();

  const nextThreeDays = new Date();
  nextThreeDays.setDate(today.getDate() + 3);
  nextThreeDays.setHours(23, 59, 59, 999);

  const upcomingDuePayments = await Receivable.aggregate([
    {
      $match: baseFilter,
    },
    {
      $unwind: "$invoices",
    },
    {
      $match: {
        "invoices.status": {
          $in: ["pending", "partial"],
        },
        "invoices.pendingAmount": {
          $gt: 0,
        },
        "invoices.dueDate": {
          $gte: today,
          $lte: nextThreeDays,
        },
      },
    },
    {
      $sort: {
        "invoices.dueDate": 1,
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        _id: 1,
        companyName: 1,
        tallyLedgerName: 1,
        invoiceNumber: "$invoices.invoiceNumber",
        invoiceDate: "$invoices.invoiceDate",
        paymentDueDate: "$invoices.dueDate",
        invoiceAmount: "$invoices.invoiceAmount",
        paidAmount: "$invoices.receivedAmount",
        pendingAmount: "$invoices.pendingAmount",
        paymentStatus: "$invoices.status",
        overdueDays: "$invoices.overdueDays",
        salesPersons: 1,
      },
    },
  ]);

  const overduePayments = await Receivable.aggregate([
    {
      $match: baseFilter,
    },
    {
      $unwind: "$invoices",
    },
    {
      $match: {
        "invoices.status": "overdue",
        "invoices.pendingAmount": {
          $gt: 0,
        },
      },
    },
    {
      $sort: {
        "invoices.dueDate": 1,
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        _id: 1,
        companyName: 1,
        tallyLedgerName: 1,
        invoiceNumber: "$invoices.invoiceNumber",
        invoiceDate: "$invoices.invoiceDate",
        paymentDueDate: "$invoices.dueDate",
        invoiceAmount: "$invoices.invoiceAmount",
        paidAmount: "$invoices.receivedAmount",
        pendingAmount: "$invoices.pendingAmount",
        paymentStatus: "$invoices.status",
        overdueDays: "$invoices.overdueDays",
        salesPersons: 1,
      },
    },
  ]);

  return {
    ...result,
    upcomingDuePayments,
    overduePayments,
  };
};
const getActionRequiredInsights = async (query, user) => {
  const { fromDate, toDate } = query;

  const enquiryFilter = {
    ...getDateFilter(fromDate, toDate, "enquiryDate"),
  };

  if (user.role !== "admin" && user.role !== "super_admin") {
    enquiryFilter.salesPersonId = user.id;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const activeOnlyFilter = {
    ...enquiryFilter,

    "closure.status": {
      $nin: ["won", "lost"],
    },
  };

  /* ========================= */
  /* OVERDUE CONDITION */
  /* ========================= */

  const overdueCondition = {
    $or: [
      {
        "feasibility.planDate": {
          $lt: today,
        },

        "feasibility.completed": {
          $ne: true,
        },
      },

      {
        "quotation.planDate": {
          $lt: today,
        },

        "quotation.completed": {
          $ne: true,
        },
      },

      {
        "closure.planDate": {
          $lt: today,
        },

        "closure.completed": {
          $ne: true,
        },
      },
    ],
  };

  /* ========================= */
  /* HIGH RISK DELAY */
  /* ========================= */

  const delayedRiskCondition = {
    $or: [
      {
        "feasibility.planDate": {
          $lt: new Date(
            today.getTime() -
              7 * 24 * 60 * 60 * 1000
          ),
        },

        "feasibility.completed": {
          $ne: true,
        },
      },

      {
        "quotation.planDate": {
          $lt: new Date(
            today.getTime() -
              7 * 24 * 60 * 60 * 1000
          ),
        },

        "quotation.completed": {
          $ne: true,
        },
      },

      {
        "closure.planDate": {
          $lt: new Date(
            today.getTime() -
              7 * 24 * 60 * 60 * 1000
          ),
        },

        "closure.completed": {
          $ne: true,
        },
      },
    ],
  };

  /* ========================= */
  /* DAYS OVERDUE */
  /* ========================= */

  const getDaysOverdue = (planDate) => {
    if (!planDate) return 0;

    const plan = new Date(planDate);

    plan.setHours(0, 0, 0, 0);

    return Math.max(
      0,
      Math.floor(
        (today.getTime() - plan.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  };

  /* ========================= */
  /* FIND CURRENT OVERDUE STAGE */
  /* ========================= */

  const getOverdueStage = (enquiry) => {
    const stages = [];

    if (
      enquiry.feasibility?.planDate &&
      enquiry.feasibility?.completed !== true &&
      new Date(
        enquiry.feasibility.planDate
      ) < today
    ) {
      stages.push({
        stage: "Feasibility",

        planDate:
          enquiry.feasibility.planDate,

        daysOverdue: getDaysOverdue(
          enquiry.feasibility.planDate
        ),
      });
    }

    if (
      enquiry.quotation?.planDate &&
      enquiry.quotation?.completed !== true &&
      new Date(
        enquiry.quotation.planDate
      ) < today
    ) {
      stages.push({
        stage: "Quotation",

        planDate:
          enquiry.quotation.planDate,

        daysOverdue: getDaysOverdue(
          enquiry.quotation.planDate
        ),
      });
    }

    if (
      enquiry.closure?.planDate &&
      enquiry.closure?.completed !== true &&
      new Date(
        enquiry.closure.planDate
      ) < today
    ) {
      stages.push({
        stage: "Closure",

        planDate:
          enquiry.closure.planDate,

        daysOverdue: getDaysOverdue(
          enquiry.closure.planDate
        ),
      });
    }

    stages.sort(
      (a, b) =>
        b.daysOverdue -
        a.daysOverdue
    );

    return (
      stages[0] || {
        stage: "-",
        planDate: null,
        daysOverdue: 0,
      }
    );
  };

  /* ========================= */
  /* FORMAT RESPONSE */
  /* ========================= */

  const formatEnquiryItem = (
    enquiry
  ) => {
    const overdue =
      getOverdueStage(enquiry);

    return {
      enquiryId: enquiry._id,

      companyName:
        enquiry.companyName,

      customerName:
        enquiry.customerName,

      salesPersonName:
        enquiry.salesPersonId?.name ||
        "-",

      grade: enquiry.grade,

      quantityInKg:
        enquiry.quantityInKg,

      overdueStage:
        overdue.stage,

      planDate:
        overdue.planDate,

      daysOverdue:
        overdue.daysOverdue,

      enquiryDate:
        enquiry.enquiryDate,
    };
  };

  /* ========================= */
  /* OVERDUE */
  /* ========================= */

  const overdueEnquiriesRaw =
    await Enquiry.find({
      ...activeOnlyFilter,
      ...overdueCondition,
    })
      .populate(
        "salesPersonId",
        "name email"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .lean();

  const overdueEnquiriesCount =
    await Enquiry.countDocuments({
      ...activeOnlyFilter,
      ...overdueCondition,
    });

  /* ========================= */
  /* PENDING QUOTATION */
  /* ========================= */

  const pendingQuotationsRaw =
    await Enquiry.find({
      ...activeOnlyFilter,

      "feasibility.completed":
        true,

      "quotation.completed": {
        $ne: true,
      },
    })
      .populate(
        "salesPersonId",
        "name email"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .lean();

  const pendingQuotationsCount =
    await Enquiry.countDocuments({
      ...activeOnlyFilter,

      "feasibility.completed":
        true,

      "quotation.completed": {
        $ne: true,
      },
    });

  /* ========================= */
  /* PENDING CLOSURE */
  /* ========================= */

  const pendingClosuresRaw =
    await Enquiry.find({
      ...activeOnlyFilter,

      "quotation.completed":
        true,

      "closure.completed": {
        $ne: true,
      },
    })
      .populate(
        "salesPersonId",
        "name email"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .lean();

  const pendingClosuresCount =
    await Enquiry.countDocuments({
      ...activeOnlyFilter,

      "quotation.completed":
        true,

      "closure.completed": {
        $ne: true,
      },
    });

  /* ========================= */
  /* HIGH RISK */
  /* ========================= */

  const delayedRiskRaw =
    await Enquiry.find({
      ...activeOnlyFilter,
      ...delayedRiskCondition,
    })
      .populate(
        "salesPersonId",
        "name email"
      )
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .lean();

  const delayedRiskCount =
    await Enquiry.countDocuments({
      ...activeOnlyFilter,
      ...delayedRiskCondition,
    });

  /* ========================= */
  /* TOP DELAYED */
  /* ========================= */

  let topDelayedSalesperson =
    null;

  if (
    user.role === "admin" ||
    user.role === "super_admin"
  ) {
    const topDelayedData =
      await Enquiry.aggregate([
        {
          $match: {
            ...activeOnlyFilter,
            ...overdueCondition,
          },
        },

        {
          $group: {
            _id: "$salesPersonId",

            count: {
              $sum: 1,
            },
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

        {
          $unwind: "$salesPerson",
        },

        {
          $project: {
            _id: 0,

            salesPersonId:
              "$salesPerson._id",

            name:
              "$salesPerson.name",

            email:
              "$salesPerson.email",

            count: 1,
          },
        },

        {
          $sort: {
            count: -1,
          },
        },

        {
          $limit: 1,
        },
      ]);

    topDelayedSalesperson =
      topDelayedData[0] || null;
  } else {
    topDelayedSalesperson = {
      name:
        user.name || "You",

      count:
        overdueEnquiriesCount,
    };
  }

  /* ========================= */
  /* SUMMARY */
  /* ========================= */

  const totalActionCount =
    overdueEnquiriesCount +
    pendingQuotationsCount +
    pendingClosuresCount +
    delayedRiskCount;

  return {
    overdueEnquiries: {
      count:
        overdueEnquiriesCount,

      items:
        overdueEnquiriesRaw.map(
          formatEnquiryItem
        ),
    },

    pendingQuotations: {
      count:
        pendingQuotationsCount,

      items:
        pendingQuotationsRaw.map(
          (enquiry) => ({
            enquiryId:
              enquiry._id,

            companyName:
              enquiry.companyName,

            customerName:
              enquiry.customerName,

            salesPersonName:
              enquiry
                .salesPersonId
                ?.name || "-",

            grade:
              enquiry.grade,

            quantityInKg:
              enquiry.quantityInKg,

            planDate:
              enquiry.quotation
                ?.planDate || null,

            enquiryDate:
              enquiry.enquiryDate,
          })
        ),
    },

    pendingClosures: {
      count:
        pendingClosuresCount,

      items:
        pendingClosuresRaw.map(
          (enquiry) => ({
            enquiryId:
              enquiry._id,

            companyName:
              enquiry.companyName,

            customerName:
              enquiry.customerName,

            salesPersonName:
              enquiry
                .salesPersonId
                ?.name || "-",

            grade:
              enquiry.grade,

            quantityInKg:
              enquiry.quantityInKg,

            planDate:
              enquiry.closure
                ?.planDate || null,

            enquiryDate:
              enquiry.enquiryDate,
          })
        ),
    },

    delayedRisk: {
      count:
        delayedRiskCount,

      items:
        delayedRiskRaw.map(
          formatEnquiryItem
        ),
    },

    topDelayedSalesperson,

    summaryMessage:
      totalActionCount > 0
        ? `${totalActionCount} action item(s) need attention`
        : "No urgent action required",
  };
};

const getMisScoring = async (query, user) => {
  const { fromDate, toDate } = query;

  // =========================================================
  // MONTHLY MIS TARGETS
  // =========================================================
  const MIS_TARGETS = {
    "deepak yadav": {
      enquiry: 60,
      sales: 15000000,
      visits: 40,
      orders: 10,
      newCustomers: 5,
    },

    renu: {
      enquiry: 60,
      sales: 15000000,
      visits: 15,
      orders: 25,
      newCustomers: 5,
    },

    deepika: {
      enquiry: 100,
      sales: 10000000,
      visits: 15,
      orders: 8,
      newCustomers: 1,
    },

    shalu: {
      enquiry: 100,
      sales: 10000000,
      visits: 15,
      orders: 10,
      newCustomers: 3,
    },

    saloni: {
      enquiry: 70,
      sales: 5000000,
      visits: 15,
      orders: 10,
      newCustomers: 2,
    },

    kailash: {
      enquiry: 60,
      sales: 20000000,
      visits: 40,
      orders: 20,
      newCustomers: 4,
    },
  };

  // =========================================================
  // NEW MIS WEIGHTAGE
  //
  // Enquiry              = 10%
  // Customer Meeting     = 15%
  // Sales Value          = 25%
  // Number of Orders     = 20%
  // New Customer         = 30%
  //
  // TOTAL                = 100%
  // =========================================================
  const MIS_WEIGHTAGE = {
    enquiry: 10,
    visits: 15,
    salesVolume: 25,
    ordersWon: 20,
    newCustomers: 30,
  };

  // =========================================================
  // HELPERS
  // =========================================================
  const normalizeName = (name = "") =>
    String(name).toLowerCase().trim().replace(/\s+/g, " ");

  const getTargetByName = (name = "") =>
    MIS_TARGETS[normalizeName(name)] || {
      enquiry: 0,
      sales: 0,
      visits: 0,
      orders: 0,
      newCustomers: 0,
    };

  const formatCurrency = (amount = 0) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getPercent = (actual, target) => {
    actual = Number(actual || 0);
    target = Number(target || 0);

    if (!target) return 0;

    return Math.min(
      100,
      Number(((actual / target) * 100).toFixed(1))
    );
  };

  const getShortBy = (actual, target) =>
    Math.max(
      Number(target || 0) - Number(actual || 0),
      0
    );

  // =========================================================
  // WEIGHTED MIS SCORE
  // =========================================================
  const calculateWeightedScore = ({
    enquiryPercent,
    visitPercent,
    salesPercent,
    orderPercent,
    newCustomerPercent,
  }) => {
    const score =
      (Number(enquiryPercent || 0) *
        MIS_WEIGHTAGE.enquiry) /
        100 +

      (Number(visitPercent || 0) *
        MIS_WEIGHTAGE.visits) /
        100 +

      (Number(salesPercent || 0) *
        MIS_WEIGHTAGE.salesVolume) /
        100 +

      (Number(orderPercent || 0) *
        MIS_WEIGHTAGE.ordersWon) /
        100 +

      (Number(newCustomerPercent || 0) *
        MIS_WEIGHTAGE.newCustomers) /
        100;

    return Math.min(
      100,
      Number(score.toFixed(1))
    );
  };

  // =========================================================
  // DATE RANGE
  // =========================================================
  const getMonthDateRange = () => {
    if (fromDate && toDate) {
      return {
        startDate: new Date(
          `${fromDate}T00:00:00.000+05:30`
        ),

        endDate: new Date(
          `${toDate}T23:59:59.999+05:30`
        ),
      };
    }

    const now = new Date();

    const istNow = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const year = istNow.getFullYear();
    const month = istNow.getMonth() + 1;

    const lastDay = new Date(
      year,
      month,
      0
    ).getDate();

    return {
      startDate: new Date(
        `${year}-${String(month).padStart(
          2,
          "0"
        )}-01T00:00:00.000+05:30`
      ),

      endDate: new Date(
        `${year}-${String(month).padStart(
          2,
          "0"
        )}-${String(lastDay).padStart(
          2,
          "0"
        )}T23:59:59.999+05:30`
      ),
    };
  };

  // =========================================================
  // FOUR MIS WEEKS
  //
  // Week 1 = 1 - 8
  // Week 2 = 9 - 15
  // Week 3 = 16 - 23
  // Week 4 = 24 - Month End
  // =========================================================
  const getFourMonthWeeks = (
    startDate,
    endDate
  ) => {
    /*
     * Read selected month in IST.
     *
     * Do not use startDate.getMonth() directly
     * because production server may run in UTC.
     */

    const istStart = new Date(
      startDate.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const year = istStart.getFullYear();
    const monthIndex = istStart.getMonth();

    const monthNumber = String(
      monthIndex + 1
    ).padStart(2, "0");

    const lastDay = new Date(
      year,
      monthIndex + 1,
      0
    ).getDate();

    const ranges = [
      [1, 8],
      [9, 15],
      [16, 23],
      [24, lastDay],
    ];

    const createIstBoundary = (
      day,
      isEnd = false
    ) => {
      const dayText = String(day).padStart(
        2,
        "0"
      );

      const timeText = isEnd
        ? "23:59:59.999"
        : "00:00:00.000";

      return new Date(
        `${year}-${monthNumber}-${dayText}T${timeText}+05:30`
      );
    };

    return ranges.map(
      ([weekStartDay, weekEndDay], index) => ({
        weekNo: index + 1,

        label: `Week ${index + 1}`,

        displayRange: `${weekStartDay}-${weekEndDay}`,

        startDate: createIstBoundary(
          weekStartDay,
          false
        ),

        endDate: createIstBoundary(
          weekEndDay,
          true
        ),
      })
    );
  };

  // =========================================================
  // FIND WEEK
  // =========================================================
  const findWeekIndex = (weeks, date) => {
    if (!date) return -1;

    const d = new Date(date);

    return weeks.findIndex(
      (week) =>
        d >= new Date(week.startDate) &&
        d <= new Date(week.endDate)
    );
  };

  // =========================================================
  // PERFORMANCE REASON
  // =========================================================
  const getPerformanceReason = (person) => {
    const reasons = [];

    /*
     * New customer has highest MIS weightage,
     * therefore checking it first.
     */
    if (
      person.achievement.newCustomerPercent < 60
    ) {
      reasons.push("low new customer acquisition");
    }

    if (person.achievement.salesPercent < 60) {
      reasons.push("lower sales order value");
    }

    if (person.achievement.orderPercent < 60) {
      reasons.push(
        "low number of approved orders"
      );
    }

    if (person.achievement.visitPercent < 60) {
      reasons.push(
        "less customer meeting/visit activity"
      );
    }

    if (
      person.achievement.enquiryPercent < 60
    ) {
      reasons.push("less enquiry focus");
    }

    if (!reasons.length) {
      reasons.push(
        "balanced performance across MIS parameters"
      );
    }

    return reasons.join(", ");
  };

  // =========================================================
  // GET DATE RANGE + WEEKS
  // =========================================================
  const { startDate, endDate } =
    getMonthDateRange();

  const weeks = getFourMonthWeeks(
    startDate,
    endDate
  );

  // =========================================================
  // ENQUIRY FILTER
  // =========================================================
  const enquiryFilter = {
    enquiryDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // =========================================================
  // SALES ORDER FILTER
  //
  // ONLY APPROVED SALES ORDERS ARE COUNTED
  // =========================================================
  const salesOrderFilter = {
    approvalStatus: "approved",

    isActive: {
      $ne: false,
    },

    "managerApproval.approvedAt": {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // =========================================================
  // CUSTOMER MEETING / VISIT FILTER
  // =========================================================
  const visitFilter = {
    $and: [
      /*
       * New records use activity date.
       * Older records may only have createdAt.
       */
      {
        $or: [
          {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },

          {
            date: {
              $exists: false,
            },

            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },

          {
            date: null,

            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        ],
      },

      /*
       * Count customer visits / meetings only.
       */
      {
        $or: [
          {
            activityType: {
              $in: ["visit", "meeting"],
            },
          },

          {
            callType: {
              $in: ["visit", "meeting"],
            },
          },

          {
            type: {
              $in: ["visit", "meeting"],
            },
          },

          {
            visitType: {
              $exists: true,
            },
          },

          {
            meetingType: {
              $exists: true,
            },
          },
        ],
      },
    ],
  };

  // =========================================================
  // OPTIONAL USER FILTER
  //
  // CURRENT PRODUCTION LOGIC KEPT COMMENTED
  // =========================================================

  /*
  if (
    user.role !== "admin" &&
    user.role !== "super_admin"
  ) {
    const userId = makeObjectId(
      user.id || user._id
    );

    enquiryFilter.salesPersonId = userId;

    salesOrderFilter.$or = [
      {
        salesPersonId: userId,
      },
      {
        salesPersonId: String(
          user.id || user._id
        ),
      },
    ];

    visitFilter.salesPersonId = userId;
  }
  */

  // =========================================================
  // FETCH ENQUIRIES
  // =========================================================
  const enquiries = await Enquiry.find(
    enquiryFilter
  )
    .populate(
      "salesPersonId",
      "name email"
    )
    .lean();

  // =========================================================
  // FETCH APPROVED SALES ORDERS
  //
  // customerType IS ADDED HERE.
  //
  // customerType === "new"
  // will count toward 30% new-customer MIS.
  // =========================================================
  const approvedSalesOrders =
    await SalesOrder.find(salesOrderFilter)
      .select(
        [
          "salesPersonId",
          "salesPersonName",
          "salesPersonEmail",
          "orderValue",
          "orderDate",
          "customerType",
          "managerApproval.approvedAt",
          "approvalStatus",
        ].join(" ")
      )
      .lean();

  // =========================================================
  // FETCH CUSTOMER MEETINGS / VISITS
  // =========================================================
  const visits = await ColdCall.find(
    visitFilter
  )
    .select(
      "salesPersonId salesPersonName salesPersonEmail date createdAt"
    )
    .lean();

  // =========================================================
  // SALES PERSON MAP
  // =========================================================
  const salesMap = {};

  const ensurePerson = ({
    id,
    name,
    email,
  }) => {
    if (!id) return null;

    const salesPersonId = String(id);

    if (!salesMap[salesPersonId]) {
      salesMap[salesPersonId] = {
        salesPersonId: id,

        name: name || "",

        email: email || "",

        // Enquiry
        totalEnquiries: 0,

        wonEnquiries: 0,

        lostEnquiries: 0,

        pendingEnquiries: 0,

        // Sales Order
        approvedSalesValue: 0,

        approvedOrders: 0,

        // Customer Meeting
        visitsDone: 0,

        // NEW CUSTOMER
        newCustomers: 0,

        // Weekly report
        weeklyReport: weeks.map(
          (week) => ({
            weekNo: week.weekNo,

            label: week.label,

            displayRange:
              week.displayRange,

            startDate: week.startDate,

            endDate: week.endDate,

            enquiries: 0,

            approvedSalesValue: 0,

            approvedOrders: 0,

            visits: 0,

            newCustomers: 0,
          })
        ),
      };
    }

    return salesMap[salesPersonId];
  };

  // =========================================================
  // PROCESS ENQUIRIES
  // =========================================================
  enquiries.forEach((enquiry) => {
    const salesPerson =
      enquiry.salesPersonId;

    if (!salesPerson) return;

    const person = ensurePerson({
      id: salesPerson._id,

      name: salesPerson.name,

      email: salesPerson.email,
    });

    if (!person) return;

    person.totalEnquiries += 1;

    if (
      enquiry.closure?.status === "won"
    ) {
      person.wonEnquiries += 1;
    } else if (
      enquiry.closure?.status === "lost"
    ) {
      person.lostEnquiries += 1;
    } else {
      person.pendingEnquiries += 1;
    }

    const weekIndex = findWeekIndex(
      weeks,
      enquiry.enquiryDate
    );

    if (weekIndex >= 0) {
      person.weeklyReport[
        weekIndex
      ].enquiries += 1;
    }
  });

  // =========================================================
  // PROCESS APPROVED SALES ORDERS
  // =========================================================
  approvedSalesOrders.forEach((order) => {
    const person = ensurePerson({
      id: order.salesPersonId,

      name: order.salesPersonName,

      email: order.salesPersonEmail,
    });

    if (!person) return;

    const value = Number(
      order.orderValue || 0
    );

    // Approved sales value
    person.approvedSalesValue += value;

    // Number of approved orders
    person.approvedOrders += 1;

    // =====================================================
    // NEW CUSTOMER
    //
    // IMPORTANT:
    // New customer comes directly from SalesOrder.customerType
    //
    // customerType = "new"      -> Count
    // customerType = "existing" -> Do not count
    // =====================================================
    if (
      String(
        order.customerType || ""
      ).toLowerCase() === "new"
    ) {
      person.newCustomers += 1;
    }

    const approvalDate =
      order.managerApproval?.approvedAt ||
      order.orderDate;

    const weekIndex = findWeekIndex(
      weeks,
      approvalDate
    );

    if (weekIndex >= 0) {
      person.weeklyReport[
        weekIndex
      ].approvedSalesValue += value;

      person.weeklyReport[
        weekIndex
      ].approvedOrders += 1;

      // Weekly new customer
      if (
        String(
          order.customerType || ""
        ).toLowerCase() === "new"
      ) {
        person.weeklyReport[
          weekIndex
        ].newCustomers += 1;
      }
    }
  });

  // =========================================================
  // PROCESS CUSTOMER MEETINGS / VISITS
  // =========================================================
  visits.forEach((visit) => {
    const person = ensurePerson({
      id: visit.salesPersonId,

      name: visit.salesPersonName,

      email: visit.salesPersonEmail,
    });

    if (!person) return;

    person.visitsDone += 1;

    const visitActivityDate =
      visit.date || visit.createdAt;

    const weekIndex = findWeekIndex(
      weeks,
      visitActivityDate
    );

    if (weekIndex >= 0) {
      person.weeklyReport[
        weekIndex
      ].visits += 1;
    }
  });

  // =========================================================
  // FIND CURRENT WEEK IN IST
  // =========================================================
  const now = new Date();

  const istNow = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  /*
   * Convert IST wall-clock time into
   * Date with IST offset.
   */
  const currentIstDate = new Date(
    `${istNow.getFullYear()}-${String(
      istNow.getMonth() + 1
    ).padStart(2, "0")}-${String(
      istNow.getDate()
    ).padStart(2, "0")}T${String(
      istNow.getHours()
    ).padStart(2, "0")}:${String(
      istNow.getMinutes()
    ).padStart(2, "0")}:${String(
      istNow.getSeconds()
    ).padStart(2, "0")}+05:30`
  );

  let currentWeekIndex =
    findWeekIndex(
      weeks,
      currentIstDate
    );

  if (currentWeekIndex < 0) {
    const firstWeekStart = new Date(
      weeks[0]?.startDate
    );

    const lastWeekEnd = new Date(
      weeks[
        weeks.length - 1
      ]?.endDate
    );

    /*
     * Past selected month:
     * show last week.
     *
     * Future selected month:
     * show first week.
     */
    if (
      currentIstDate > lastWeekEnd
    ) {
      currentWeekIndex =
        weeks.length - 1;
    } else if (
      currentIstDate <
      firstWeekStart
    ) {
      currentWeekIndex = 0;
    } else {
      currentWeekIndex = 0;
    }
  }

  // =========================================================
  // CALCULATE SALES PERSON MIS SCORES
  // =========================================================
  const salesPersonScores =
    Object.values(salesMap)
      .map((person) => {
        const target =
          getTargetByName(
            person.name
          );

        // ===================================================
        // WEEKLY BASE TARGET
        //
        // Monthly target / 4
        // ===================================================
        const weeklyBaseTarget = {
          enquiries: Number(
            (
              Number(
                target.enquiry || 0
              ) / 4
            ).toFixed(1)
          ),

          salesValue: Number(
            (
              Number(
                target.sales || 0
              ) / 4
            ).toFixed(0)
          ),

          visits: Number(
            (
              Number(
                target.visits || 0
              ) / 4
            ).toFixed(1)
          ),

          orders: Number(
            (
              Number(
                target.orders || 0
              ) / 4
            ).toFixed(1)
          ),

          newCustomers: Number(
            (
              Number(
                target.newCustomers ||
                  0
              ) / 4
            ).toFixed(2)
          ),
        };

        // ===================================================
        // CUMULATIVE TARGET
        // ===================================================
        let cumulativeTarget = {
          enquiries: 0,

          salesValue: 0,

          visits: 0,

          orders: 0,

          newCustomers: 0,
        };

        // ===================================================
        // CUMULATIVE ACTUAL
        // ===================================================
        let cumulativeActual = {
          enquiries: 0,

          salesValue: 0,

          visits: 0,

          orders: 0,

          newCustomers: 0,
        };

        // ===================================================
        // CARRY FORWARD
        // ===================================================
        let carryForward = {
          enquiries: 0,

          salesValue: 0,

          visits: 0,

          orders: 0,

          newCustomers: 0,
        };

        // ===================================================
        // WEEKLY REPORT
        // ===================================================
        const weeklyReport =
          person.weeklyReport.map(
            (week) => {
              // =============================================
              // TARGET WITH CARRY FORWARD
              // =============================================
              const targetWithCarryForward =
                {
                  enquiries:
                    Number(
                      weeklyBaseTarget.enquiries ||
                        0
                    ) +
                    Number(
                      carryForward.enquiries ||
                        0
                    ),

                  salesValue:
                    Number(
                      weeklyBaseTarget.salesValue ||
                        0
                    ) +
                    Number(
                      carryForward.salesValue ||
                        0
                    ),

                  visits:
                    Number(
                      weeklyBaseTarget.visits ||
                        0
                    ) +
                    Number(
                      carryForward.visits ||
                        0
                    ),

                  orders:
                    Number(
                      weeklyBaseTarget.orders ||
                        0
                    ) +
                    Number(
                      carryForward.orders ||
                        0
                    ),

                  newCustomers:
                    Number(
                      weeklyBaseTarget.newCustomers ||
                        0
                    ) +
                    Number(
                      carryForward.newCustomers ||
                        0
                    ),
                };

              // =============================================
              // UPDATE CUMULATIVE TARGET
              // =============================================
              cumulativeTarget.enquiries +=
                Number(
                  weeklyBaseTarget.enquiries ||
                    0
                );

              cumulativeTarget.salesValue +=
                Number(
                  weeklyBaseTarget.salesValue ||
                    0
                );

              cumulativeTarget.visits +=
                Number(
                  weeklyBaseTarget.visits ||
                    0
                );

              cumulativeTarget.orders +=
                Number(
                  weeklyBaseTarget.orders ||
                    0
                );

              cumulativeTarget.newCustomers +=
                Number(
                  weeklyBaseTarget.newCustomers ||
                    0
                );

              // =============================================
              // UPDATE CUMULATIVE ACTUAL
              // =============================================
              cumulativeActual.enquiries +=
                Number(
                  week.enquiries || 0
                );

              cumulativeActual.salesValue +=
                Number(
                  week.approvedSalesValue ||
                    0
                );

              cumulativeActual.visits +=
                Number(
                  week.visits || 0
                );

              cumulativeActual.orders +=
                Number(
                  week.approvedOrders ||
                    0
                );

              cumulativeActual.newCustomers +=
                Number(
                  week.newCustomers ||
                    0
                );

              // =============================================
              // WEEK ACHIEVEMENT
              // =============================================
              const weekAchievement = {
                enquiryPercent:
                  getPercent(
                    week.enquiries,
                    targetWithCarryForward.enquiries
                  ),

                salesPercent:
                  getPercent(
                    week.approvedSalesValue,
                    targetWithCarryForward.salesValue
                  ),

                visitPercent:
                  getPercent(
                    week.visits,
                    targetWithCarryForward.visits
                  ),

                orderPercent:
                  getPercent(
                    week.approvedOrders,
                    targetWithCarryForward.orders
                  ),

                newCustomerPercent:
                  getPercent(
                    week.newCustomers,
                    targetWithCarryForward.newCustomers
                  ),
              };

              // =============================================
              // CUMULATIVE ACHIEVEMENT
              // =============================================
              const cumulativeAchievement =
                {
                  enquiryPercent:
                    getPercent(
                      cumulativeActual.enquiries,
                      cumulativeTarget.enquiries
                    ),

                  salesPercent:
                    getPercent(
                      cumulativeActual.salesValue,
                      cumulativeTarget.salesValue
                    ),

                  visitPercent:
                    getPercent(
                      cumulativeActual.visits,
                      cumulativeTarget.visits
                    ),

                  orderPercent:
                    getPercent(
                      cumulativeActual.orders,
                      cumulativeTarget.orders
                    ),

                  newCustomerPercent:
                    getPercent(
                      cumulativeActual.newCustomers,
                      cumulativeTarget.newCustomers
                    ),
                };

              // =============================================
              // WEEKLY SHORTAGE
              // =============================================
              const shortBy = {
                enquiries:
                  getShortBy(
                    week.enquiries,
                    targetWithCarryForward.enquiries
                  ),

                salesValue:
                  getShortBy(
                    week.approvedSalesValue,
                    targetWithCarryForward.salesValue
                  ),

                visits:
                  getShortBy(
                    week.visits,
                    targetWithCarryForward.visits
                  ),

                orders:
                  getShortBy(
                    week.approvedOrders,
                    targetWithCarryForward.orders
                  ),

                newCustomers:
                  getShortBy(
                    week.newCustomers,
                    targetWithCarryForward.newCustomers
                  ),
              };

              // =============================================
              // CUMULATIVE SHORTAGE
              // =============================================
              const cumulativeShortBy =
                {
                  enquiries:
                    getShortBy(
                      cumulativeActual.enquiries,
                      cumulativeTarget.enquiries
                    ),

                  salesValue:
                    getShortBy(
                      cumulativeActual.salesValue,
                      cumulativeTarget.salesValue
                    ),

                  visits:
                    getShortBy(
                      cumulativeActual.visits,
                      cumulativeTarget.visits
                    ),

                  orders:
                    getShortBy(
                      cumulativeActual.orders,
                      cumulativeTarget.orders
                    ),

                  newCustomers:
                    getShortBy(
                      cumulativeActual.newCustomers,
                      cumulativeTarget.newCustomers
                    ),
                };

              // =============================================
              // WEEKLY WEIGHTED MIS SCORE
              // =============================================
              const weekScore =
                calculateWeightedScore({
                  enquiryPercent:
                    weekAchievement.enquiryPercent,

                  visitPercent:
                    weekAchievement.visitPercent,

                  salesPercent:
                    weekAchievement.salesPercent,

                  orderPercent:
                    weekAchievement.orderPercent,

                  newCustomerPercent:
                    weekAchievement.newCustomerPercent,
                });

              // =============================================
              // NEXT WEEK CARRY FORWARD
              // =============================================
              const nextCarryForward =
                {
                  enquiries: Number(
                    shortBy.enquiries || 0
                  ),

                  salesValue: Number(
                    shortBy.salesValue ||
                      0
                  ),

                  visits: Number(
                    shortBy.visits || 0
                  ),

                  orders: Number(
                    shortBy.orders || 0
                  ),

                  newCustomers:
                    Number(
                      shortBy.newCustomers ||
                        0
                    ),
                };

              // =============================================
              // BUILD WEEK RESULT
              // =============================================
              const weekResult = {
                ...week,

                // -------------------------------------------
                // BASE TARGET
                // -------------------------------------------
                baseTarget: {
                  enquiries: Number(
                    Number(
                      weeklyBaseTarget.enquiries ||
                        0
                    ).toFixed(1)
                  ),

                  salesValue: Number(
                    Number(
                      weeklyBaseTarget.salesValue ||
                        0
                    ).toFixed(0)
                  ),

                  visits: Number(
                    Number(
                      weeklyBaseTarget.visits ||
                        0
                    ).toFixed(1)
                  ),

                  orders: Number(
                    Number(
                      weeklyBaseTarget.orders ||
                        0
                    ).toFixed(1)
                  ),

                  newCustomers: Number(
                    Number(
                      weeklyBaseTarget.newCustomers ||
                        0
                    ).toFixed(2)
                  ),
                },

                // -------------------------------------------
                // TARGET WITH CARRY FORWARD
                // -------------------------------------------
                targetWithCarryForward:
                  {
                    enquiries: Number(
                      targetWithCarryForward.enquiries.toFixed(
                        1
                      )
                    ),

                    salesValue: Number(
                      targetWithCarryForward.salesValue.toFixed(
                        0
                      )
                    ),

                    visits: Number(
                      targetWithCarryForward.visits.toFixed(
                        1
                      )
                    ),

                    orders: Number(
                      targetWithCarryForward.orders.toFixed(
                        1
                      )
                    ),

                    newCustomers:
                      Number(
                        targetWithCarryForward.newCustomers.toFixed(
                          2
                        )
                      ),
                  },

                // -------------------------------------------
                // PREVIOUS WEEK CARRY FORWARD
                // -------------------------------------------
                carryForwardFromPreviousWeek:
                  {
                    enquiries: Number(
                      Number(
                        carryForward.enquiries ||
                          0
                      ).toFixed(1)
                    ),

                    salesValue: Number(
                      Number(
                        carryForward.salesValue ||
                          0
                      ).toFixed(0)
                    ),

                    visits: Number(
                      Number(
                        carryForward.visits ||
                          0
                      ).toFixed(1)
                    ),

                    orders: Number(
                      Number(
                        carryForward.orders ||
                          0
                      ).toFixed(1)
                    ),

                    newCustomers:
                      Number(
                        Number(
                          carryForward.newCustomers ||
                            0
                        ).toFixed(2)
                      ),
                  },

                // -------------------------------------------
                // CUMULATIVE TARGET
                // -------------------------------------------
                cumulativeTarget: {
                  enquiries: Number(
                    cumulativeTarget.enquiries.toFixed(
                      1
                    )
                  ),

                  salesValue: Number(
                    cumulativeTarget.salesValue.toFixed(
                      0
                    )
                  ),

                  visits: Number(
                    cumulativeTarget.visits.toFixed(
                      1
                    )
                  ),

                  orders: Number(
                    cumulativeTarget.orders.toFixed(
                      1
                    )
                  ),

                  newCustomers:
                    Number(
                      cumulativeTarget.newCustomers.toFixed(
                        2
                      )
                    ),
                },

                // -------------------------------------------
                // CUMULATIVE ACTUAL
                // -------------------------------------------
                cumulativeActual: {
                  enquiries: Number(
                    cumulativeActual.enquiries.toFixed(
                      1
                    )
                  ),

                  salesValue: Number(
                    cumulativeActual.salesValue.toFixed(
                      0
                    )
                  ),

                  visits: Number(
                    cumulativeActual.visits.toFixed(
                      1
                    )
                  ),

                  orders: Number(
                    cumulativeActual.orders.toFixed(
                      1
                    )
                  ),

                  newCustomers:
                    Number(
                      cumulativeActual.newCustomers.toFixed(
                        0
                      )
                    ),
                },

                // -------------------------------------------
                // WEEK SHORTAGE
                // -------------------------------------------
                shortBy: {
                  enquiries: Math.ceil(
                    shortBy.enquiries
                  ),

                  salesValue: Number(
                    shortBy.salesValue.toFixed(
                      0
                    )
                  ),

                  visits: Math.ceil(
                    shortBy.visits
                  ),

                  orders: Math.ceil(
                    shortBy.orders
                  ),

                  newCustomers:
                    Math.ceil(
                      shortBy.newCustomers
                    ),
                },

                // -------------------------------------------
                // CUMULATIVE SHORTAGE
                // -------------------------------------------
                cumulativeShortBy: {
                  enquiries: Math.ceil(
                    cumulativeShortBy.enquiries
                  ),

                  salesValue: Number(
                    cumulativeShortBy.salesValue.toFixed(
                      0
                    )
                  ),

                  visits: Math.ceil(
                    cumulativeShortBy.visits
                  ),

                  orders: Math.ceil(
                    cumulativeShortBy.orders
                  ),

                  newCustomers:
                    Math.ceil(
                      cumulativeShortBy.newCustomers
                    ),
                },

                achievement:
                  cumulativeAchievement,

                weekAchievement,

                weekScore,

                // -------------------------------------------
                // WEEK INSIGHT
                // -------------------------------------------
                insight: {
                  newCustomers:
                    shortBy.newCustomers >
                    0
                      ? `Need ${Math.ceil(
                          shortBy.newCustomers
                        )} more new customer(s) in ${week.label}. The pending target will carry forward to the next week.`
                      : `New customer target is on track in ${week.label}.`,

                  orders:
                    shortBy.orders > 0
                      ? `Need ${Math.ceil(
                          shortBy.orders
                        )} more approved order(s) in ${week.label}. The pending target will carry forward to the next week.`
                      : `Order target is on track in ${week.label}.`,

                  sales:
                    shortBy.salesValue >
                    0
                      ? `Need ${formatCurrency(
                          shortBy.salesValue
                        )} more sales value in ${week.label}. The pending value will carry forward to the next week.`
                      : `Sales value target is on track in ${week.label}.`,

                  enquiries:
                    shortBy.enquiries >
                    0
                      ? `Need ${Math.ceil(
                          shortBy.enquiries
                        )} more enquiries in ${week.label}. The pending target will carry forward to the next week.`
                      : `Enquiry target is on track in ${week.label}.`,

                  visits:
                    shortBy.visits > 0
                      ? `Need ${Math.ceil(
                          shortBy.visits
                        )} more customer meeting/visit(s) in ${week.label}. The pending target will carry forward to the next week.`
                      : `Customer meeting/visit target is on track in ${week.label}.`,
                },
              };

              /*
               * Update carry-forward only after
               * current week's result is built.
               *
               * Week 2 receives Week 1 shortage,
               * Week 3 receives Week 2 shortage, etc.
               */
              carryForward =
                nextCarryForward;

              return weekResult;
            }
          );

        // ===================================================
        // CURRENT WEEK
        // ===================================================
        const currentWeek =
          weeklyReport[
            currentWeekIndex
          ] ||
          weeklyReport[
            weeklyReport.length - 1
          ];

        // ===================================================
        // MONTHLY ACHIEVEMENT
        // ===================================================
        const monthlyAchievement = {
          enquiryPercent:
            getPercent(
              person.totalEnquiries,
              target.enquiry
            ),

          salesPercent:
            getPercent(
              person.approvedSalesValue,
              target.sales
            ),

          visitPercent:
            getPercent(
              person.visitsDone,
              target.visits
            ),

          orderPercent:
            getPercent(
              person.approvedOrders,
              target.orders
            ),

          newCustomerPercent:
            getPercent(
              person.newCustomers,
              target.newCustomers
            ),
        };

        // ===================================================
        // MONTHLY MIS SCORE
        // ===================================================
        const monthlyScore =
          calculateWeightedScore({
            enquiryPercent:
              monthlyAchievement.enquiryPercent,

            visitPercent:
              monthlyAchievement.visitPercent,

            salesPercent:
              monthlyAchievement.salesPercent,

            orderPercent:
              monthlyAchievement.orderPercent,

            newCustomerPercent:
              monthlyAchievement.newCustomerPercent,
          });

        // ===================================================
        // MONTHLY SHORTAGE
        // ===================================================
        const monthlyShortBy = {
          enquiries:
            getShortBy(
              person.totalEnquiries,
              target.enquiry
            ),

          salesValue:
            getShortBy(
              person.approvedSalesValue,
              target.sales
            ),

          visits:
            getShortBy(
              person.visitsDone,
              target.visits
            ),

          orders:
            getShortBy(
              person.approvedOrders,
              target.orders
            ),

          newCustomers:
            getShortBy(
              person.newCustomers,
              target.newCustomers
            ),
        };

        // ===================================================
        // USER INSIGHT
        // ===================================================
        const userInsight = {
          title: `${person.name}, MIS performance update`,

          weekly:
            currentWeek?.weekScore >=
            80
              ? `Good performance in ${currentWeek.label}. Weekly weighted MIS score is ${currentWeek.weekScore}/100.`
              : `${currentWeek?.label} weighted MIS score is ${
                  currentWeek?.weekScore ||
                  0
                }/100. Focus first on new customer acquisition, then sales value, approved orders, customer meetings and enquiries.`,

          newCustomers:
            currentWeek?.shortBy
              ?.newCustomers > 0
              ? `Need ${currentWeek.shortBy.newCustomers} more new customer(s) in ${currentWeek.label}. New customer carries the highest MIS weightage of 30%.`
              : `New customer target is on track in ${currentWeek?.label}.`,

          sales:
            currentWeek?.shortBy
              ?.salesValue > 0
              ? `Need ${formatCurrency(
                  currentWeek
                    .shortBy
                    .salesValue
                )} more approved sales value in ${currentWeek.label}. Sales value carries 25% MIS weightage.`
              : `Sales value target is on track in ${currentWeek?.label}.`,

          orders:
            currentWeek?.shortBy
              ?.orders > 0
              ? `Need ${currentWeek.shortBy.orders} more approved order(s) in ${currentWeek.label}. Number of orders carries 20% MIS weightage.`
              : `Approved order target is on track in ${currentWeek?.label}.`,

          visits:
            currentWeek?.shortBy
              ?.visits > 0
              ? `Need ${currentWeek.shortBy.visits} more customer meeting/visit(s) in ${currentWeek.label}. Customer meetings carry 15% MIS weightage.`
              : `Customer meeting/visit target is on track in ${currentWeek?.label}.`,

          enquiries:
            currentWeek?.shortBy
              ?.enquiries > 0
              ? `Need ${currentWeek.shortBy.enquiries} more enquiries in ${currentWeek.label}. Enquiries carry 10% MIS weightage.`
              : `Enquiry target is on track in ${currentWeek?.label}.`,

          monthly:
            monthlyScore >= 80
              ? `Monthly MIS is strong at ${monthlyScore}/100.`
              : `Monthly pending: ${Math.ceil(
                  monthlyShortBy.newCustomers
                )} new customer(s), ${Math.ceil(
                  monthlyShortBy.orders
                )} approved order(s), ${formatCurrency(
                  monthlyShortBy.salesValue
                )} sales value, ${Math.ceil(
                  monthlyShortBy.enquiries
                )} enquiries and ${Math.ceil(
                  monthlyShortBy.visits
                )} customer meeting/visit(s).`,
        };

        // ===================================================
        // SALES PERSON RESPONSE
        // ===================================================
        return {
          salesPersonId:
            person.salesPersonId,

          name: person.name,

          email: person.email,

          monthlyScore,

          score: monthlyScore,

          weightage:
            MIS_WEIGHTAGE,

          // Enquiries
          totalEnquiries:
            person.totalEnquiries,

          wonEnquiries:
            person.wonEnquiries,

          lostEnquiries:
            person.lostEnquiries,

          pendingEnquiries:
            person.pendingEnquiries,

          // Sales Orders
          approvedSalesValue:
            person.approvedSalesValue,

          approvedOrders:
            person.approvedOrders,

          // Customer meetings
          visitsDone:
            person.visitsDone,

          // NEW CUSTOMERS
          newCustomers:
            person.newCustomers,

          // Targets
          target: {
            monthly: {
              enquiries:
                target.enquiry,

              salesValue:
                target.sales,

              visits:
                target.visits,

              orders:
                target.orders,

              newCustomers:
                target.newCustomers,
            },

            weeklyBase:
              weeklyBaseTarget,
          },

          achievement:
            monthlyAchievement,

          shortBy: {
            enquiries: Math.ceil(
              monthlyShortBy.enquiries
            ),

            salesValue:
              monthlyShortBy.salesValue,

            visits: Math.ceil(
              monthlyShortBy.visits
            ),

            orders: Math.ceil(
              monthlyShortBy.orders
            ),

            newCustomers:
              Math.ceil(
                monthlyShortBy.newCustomers
              ),
          },

          currentWeek,

          userInsight,

          weeklyReport,
        };
      })

      // =====================================================
      // SORT PERFORMANCE
      // =====================================================
      .sort((a, b) => {
        // First by MIS score
        if (
          b.monthlyScore !==
          a.monthlyScore
        ) {
          return (
            b.monthlyScore -
            a.monthlyScore
          );
        }

        // Then new customers
        if (
          b.newCustomers !==
          a.newCustomers
        ) {
          return (
            b.newCustomers -
            a.newCustomers
          );
        }

        // Then approved orders
        if (
          b.approvedOrders !==
          a.approvedOrders
        ) {
          return (
            b.approvedOrders -
            a.approvedOrders
          );
        }

        // Then sales value
        return (
          b.approvedSalesValue -
          a.approvedSalesValue
        );
      });

  // =========================================================
  // COMPANY TOTALS
  // =========================================================
  const totalMonthlyOrdersWon =
    salesPersonScores.reduce(
      (sum, item) =>
        sum +
        Number(
          item.approvedOrders || 0
        ),
      0
    );

  const totalMonthlySalesVolume =
    salesPersonScores.reduce(
      (sum, item) =>
        sum +
        Number(
          item.approvedSalesValue ||
            0
        ),
      0
    );

  const totalMonthlyEnquiries =
    salesPersonScores.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalEnquiries || 0
        ),
      0
    );

  const totalMonthlyVisits =
    salesPersonScores.reduce(
      (sum, item) =>
        sum +
        Number(
          item.visitsDone || 0
        ),
      0
    );

  // =========================================================
  // TOTAL NEW CUSTOMERS
  // =========================================================
  const totalMonthlyNewCustomers =
    salesPersonScores.reduce(
      (sum, item) =>
        sum +
        Number(
          item.newCustomers || 0
        ),
      0
    );

  // =========================================================
  // TOP / WORST PERFORMER
  // =========================================================
  const topPerformer =
    salesPersonScores[0] || null;

  const worstPerformer =
    salesPersonScores.length > 1
      ? salesPersonScores[
          salesPersonScores.length -
            1
        ]
      : null;

  // =========================================================
  // BUSINESS INSIGHT
  // =========================================================
  const businessInsight = {
    totalMonthlyOrdersWon,

    totalMonthlySalesVolume,

    totalMonthlyEnquiries,

    totalMonthlyVisits,

    totalMonthlyNewCustomers,

    // -------------------------------------------------------
    // TOP PERFORMER
    // -------------------------------------------------------
    topPerformer: topPerformer
      ? {
          salesPersonId:
            topPerformer.salesPersonId,

          name:
            topPerformer.name,

          score:
            topPerformer.monthlyScore,

          approvedOrders:
            topPerformer.approvedOrders,

          approvedSalesValue:
            topPerformer.approvedSalesValue,

          newCustomers:
            topPerformer.newCustomers,

          reason:
            `Top performer with MIS score of ${topPerformer.monthlyScore}/100, ` +
            `${topPerformer.newCustomers} new customer(s), ` +
            `${topPerformer.approvedOrders} approved order(s) and ` +
            `${formatCurrency(
              topPerformer.approvedSalesValue
            )} approved sales value.`,
        }
      : null,

    // -------------------------------------------------------
    // WORST PERFORMER
    // -------------------------------------------------------
    worstPerformer:
      worstPerformer
        ? {
            salesPersonId:
              worstPerformer.salesPersonId,

            name:
              worstPerformer.name,

            score:
              worstPerformer.monthlyScore,

            approvedOrders:
              worstPerformer.approvedOrders,

            approvedSalesValue:
              worstPerformer.approvedSalesValue,

            newCustomers:
              worstPerformer.newCustomers,

            reason:
              getPerformanceReason(
                worstPerformer
              ),
          }
        : null,

    // -------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------
    summaryMessage:
      topPerformer &&
      worstPerformer
        ? `${topPerformer.name} is leading this month with MIS score ${topPerformer.monthlyScore}/100, ${topPerformer.newCustomers} new customer(s) and ${topPerformer.approvedOrders} approved order(s). ${worstPerformer.name} needs focus on ${getPerformanceReason(
            worstPerformer
          )}.`
        : "MIS business insight will appear once employee performance data is available.",
  };

  // =========================================================
  // FINAL RESPONSE
  // =========================================================
  return {
    reportType:
      "monthly_weightage_mis",

    dateRange: {
      fromDate: startDate,

      toDate: endDate,
    },

    // =======================================================
    // NEW MANAGEMENT WEIGHTAGE
    // =======================================================
    weightage:
      MIS_WEIGHTAGE,

    // =======================================================
    // OVERALL SUMMARY
    // =======================================================
    summary: {
      totalApprovedSalesValue:
        totalMonthlySalesVolume,

      totalApprovedOrders:
        totalMonthlyOrdersWon,

      totalMonthlyOrdersWon,

      totalEnquiries:
        totalMonthlyEnquiries,

      totalVisits:
        totalMonthlyVisits,

      totalNewCustomers:
        totalMonthlyNewCustomers,
    },

    businessInsight,

    weeks,

    salesPersonScores,
  };
};

module.exports = {
  getDashboardSummary,
  getCashflowSummary,
  getActionRequiredInsights,
  getMisScoring,
};