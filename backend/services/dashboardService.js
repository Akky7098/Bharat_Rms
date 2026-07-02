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

  const MIS_TARGETS = {
    "deepak yadav": { enquiry: 60, sales: 15000000, visits: 40 },
    renu: { enquiry: 60, sales: 3000000, visits: 15 },
    deepika: { enquiry: 100, sales: 10000000, visits: 15 },
    shalu: { enquiry: 100, sales: 10000000, visits: 15 },
    saloni: { enquiry: 70, sales: 5000000, visits: 15 },
    kailash: { enquiry: 60, sales: 20000000, visits: 40 },
  };

  const normalizeName = (name = "") =>
    String(name).toLowerCase().trim().replace(/\s+/g, " ");

  const getTargetByName = (name = "") =>
    MIS_TARGETS[normalizeName(name)] || { enquiry: 0, sales: 0, visits: 0 };

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const getMonthDateRange = () => {
  if (fromDate && toDate) {
    const start = new Date(`${fromDate}T06:00:00+05:30`);
    const end = new Date(`${toDate}T23:59:59.999+05:30`);

    return {
      startDate: start,
      endDate: end,
    };
  }

  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const year = istNow.getFullYear();
  const month = istNow.getMonth() + 1;

  const start = new Date(
    `${year}-${String(month).padStart(2, "0")}-01T06:00:00+05:30`
  );

  const lastDay = new Date(year, month, 0).getDate();

  const end = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(
      2,
      "0"
    )}T23:59:59.999+05:30`
  );

  return {
    startDate: start,
    endDate: end,
  };
};

 const getCalendarWeeks = (startDate, endDate) => {
  const weeks = [];
  let current = new Date(startDate);
  let weekNo = 1;

  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);

    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    if (weekEnd > endDate) {
      weekEnd.setTime(endDate.getTime());
    }

    weeks.push({
      weekNo,
      label: `Week ${weekNo}`,
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd),
    });

    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
    current.setHours(6, 0, 0, 0);

    weekNo += 1;
  }

  return weeks;
};

  const findWeekIndex = (weeks, date) => {
    if (!date) return -1;

    const d = new Date(date);

    return weeks.findIndex(
      (week) => d >= new Date(week.startDate) && d <= new Date(week.endDate)
    );
  };

  const getPercent = (actual, target) => {
    actual = Number(actual || 0);
    target = Number(target || 0);

    if (!target) return 0;

    return Math.min(100, Number(((actual / target) * 100).toFixed(1)));
  };

  const getShortBy = (actual, target) =>
    Math.max(Number(target || 0) - Number(actual || 0), 0);

  const formatCurrency = (amount = 0) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const makeObjectId = (id) => {
    if (!id) return id;
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return id;
  };

  const calculateWeightedScore = ({
    enquiryPercent,
    salesPercent,
    visitPercent,
  }) => {
    return Math.min(
      100,
      Number(
        (
          Number(salesPercent || 0) * 0.5 +
          Number(enquiryPercent || 0) * 0.3 +
          Number(visitPercent || 0) * 0.2
        ).toFixed(1)
      )
    );
  };

  const { startDate, endDate } = getMonthDateRange();
  const weeks = getCalendarWeeks(startDate, endDate);

  const enquiryFilter = {
    enquiryDate: { $gte: startDate, $lte: endDate },
  };

  const salesOrderFilter = {
    "managerApproval.approvedAt": {
      $gte: startDate,
      $lte: endDate,
    },
  };

  const visitFilter = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (user.role !== "admin" && user.role !== "super_admin") {
    const userId = makeObjectId(user.id || user._id);

    enquiryFilter.salesPersonId = userId;

    salesOrderFilter.$or = [
      { salesPersonId: userId },
      { salesPersonId: String(user.id || user._id) },
    ];

    visitFilter.salesPersonId = userId;
  }

  const enquiries = await Enquiry.find(enquiryFilter)
    .populate("salesPersonId", "name email")
    .lean();

  const approvedSalesOrders = await SalesOrder.find(salesOrderFilter)
    .select(
      "salesPersonId salesPersonName salesPersonEmail orderValue orderDate managerApproval.approvedAt approvalStatus"
    )
    .lean();

  const visits = await ColdCall.find({
    ...visitFilter,
    $or: [
      { activityType: "visit" },
      { callType: "visit" },
      { type: "visit" },
      { visitType: { $exists: true } },
    ],
  })
    .select("salesPersonId salesPersonName salesPersonEmail createdAt")
    .lean();

  const salesMap = {};

  let hotLeads = 0;
  let warmLeads = 0;
  let coldLeads = 0;

  const ensurePerson = ({ id, name, email }) => {
    if (!id) return null;

    const salesPersonId = String(id);

    if (!salesMap[salesPersonId]) {
      salesMap[salesPersonId] = {
        salesPersonId: id,
        name: name || "",
        email: email || "",

        totalScore: 0,
        score: 0,

        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,

        totalEnquiries: 0,
        wonEnquiries: 0,
        lostEnquiries: 0,
        delayedEnquiries: 0,
        pendingEnquiries: 0,

        approvedSalesValue: 0,
        approvedOrders: 0,
        visitsDone: 0,

        weeklyReport: weeks.map((week) => ({
          weekNo: week.weekNo,
          label: week.label,
          startDate: week.startDate,
          endDate: week.endDate,
          enquiries: 0,
          approvedSalesValue: 0,
          approvedOrders: 0,
          visits: 0,
        })),
      };
    }

    return salesMap[salesPersonId];
  };

  enquiries.forEach((enquiry) => {
    const salesPerson = enquiry.salesPersonId;
    if (!salesPerson) return;

    const person = ensurePerson({
      id: salesPerson._id,
      name: salesPerson.name,
      email: salesPerson.email,
    });

    if (!person) return;

    let enquiryScore = 50;

    if (enquiry.feasibility?.status === "feasible") enquiryScore += 15;
    if (enquiry.feasibility?.status === "not_feasible") enquiryScore -= 25;

    if (enquiry.quotation?.completed) enquiryScore += 10;

    if (enquiry.closure?.status === "won") {
      enquiryScore += 25;
      person.wonEnquiries += 1;
    }

    if (enquiry.closure?.status === "lost") {
      enquiryScore -= 30;
      person.lostEnquiries += 1;
    }

    if (Number(enquiry.quantityInKg || 0) >= 500) enquiryScore += 10;

    const now = new Date();

    const isDelayed =
      (enquiry.feasibility?.planDate &&
        enquiry.feasibility?.completed !== true &&
        new Date(enquiry.feasibility.planDate) < now) ||
      (enquiry.quotation?.planDate &&
        enquiry.quotation?.completed !== true &&
        new Date(enquiry.quotation.planDate) < now) ||
      (enquiry.closure?.planDate &&
        enquiry.closure?.completed !== true &&
        new Date(enquiry.closure.planDate) < now);

    if (isDelayed) {
      enquiryScore -= 20;
      person.delayedEnquiries += 1;
    }

    if (!["won", "lost"].includes(enquiry.closure?.status)) {
      person.pendingEnquiries += 1;
    }

    enquiryScore = Math.max(0, Math.min(enquiryScore, 100));

    if (enquiryScore >= 75) {
      hotLeads += 1;
      person.hotLeads += 1;
    } else if (enquiryScore >= 45) {
      warmLeads += 1;
      person.warmLeads += 1;
    } else {
      coldLeads += 1;
      person.coldLeads += 1;
    }

    person.totalScore += enquiryScore;
    person.totalEnquiries += 1;

    const weekIndex = findWeekIndex(weeks, enquiry.enquiryDate);

    if (weekIndex >= 0) {
      person.weeklyReport[weekIndex].enquiries += 1;
    }
  });

  approvedSalesOrders.forEach((order) => {
    const person = ensurePerson({
      id: order.salesPersonId,
      name: order.salesPersonName,
      email: order.salesPersonEmail,
    });

    if (!person) return;

    const value = Number(order.orderValue || 0);

    person.approvedSalesValue += value;
    person.approvedOrders += 1;

    const approvalDate = order.managerApproval?.approvedAt;
    const weekIndex = findWeekIndex(weeks, approvalDate);

    if (weekIndex >= 0) {
      person.weeklyReport[weekIndex].approvedSalesValue += value;
      person.weeklyReport[weekIndex].approvedOrders += 1;
    }
  });

  visits.forEach((visit) => {
    const person = ensurePerson({
      id: visit.salesPersonId,
      name: visit.salesPersonName,
      email: visit.salesPersonEmail,
    });

    if (!person) return;

    person.visitsDone += 1;

    const weekIndex = findWeekIndex(weeks, visit.createdAt);

    if (weekIndex >= 0) {
      person.weeklyReport[weekIndex].visits += 1;
    }
  });

  let currentWeekIndex = findWeekIndex(weeks, new Date());

  if (currentWeekIndex < 0) {
    currentWeekIndex = 0;
  }

  const salesPersonScores = Object.values(salesMap)
    .map((person) => {
      const target = getTargetByName(person.name);

      const weeklyBaseTarget = {
        enquiries: Number((target.enquiry / weeks.length).toFixed(1)),
        salesValue: Number((target.sales / weeks.length).toFixed(0)),
        visits: Number((target.visits / weeks.length).toFixed(1)),
      };

      let cumulativeTarget = {
        enquiries: 0,
        salesValue: 0,
        visits: 0,
      };

      let cumulativeActual = {
        enquiries: 0,
        salesValue: 0,
        visits: 0,
      };

      const weeklyReport = person.weeklyReport.map((week) => {
        cumulativeTarget.enquiries += weeklyBaseTarget.enquiries;
        cumulativeTarget.salesValue += weeklyBaseTarget.salesValue;
        cumulativeTarget.visits += weeklyBaseTarget.visits;

        cumulativeActual.enquiries += Number(week.enquiries || 0);
        cumulativeActual.salesValue += Number(week.approvedSalesValue || 0);
        cumulativeActual.visits += Number(week.visits || 0);

        const previousTarget = {
          enquiries: cumulativeTarget.enquiries - weeklyBaseTarget.enquiries,
          salesValue: cumulativeTarget.salesValue - weeklyBaseTarget.salesValue,
          visits: cumulativeTarget.visits - weeklyBaseTarget.visits,
        };

        const previousActual = {
          enquiries: cumulativeActual.enquiries - Number(week.enquiries || 0),
          salesValue:
            cumulativeActual.salesValue - Number(week.approvedSalesValue || 0),
          visits: cumulativeActual.visits - Number(week.visits || 0),
        };

        const carryForward = {
          enquiries: getShortBy(
            previousActual.enquiries,
            previousTarget.enquiries
          ),
          salesValue: getShortBy(
            previousActual.salesValue,
            previousTarget.salesValue
          ),
          visits: getShortBy(previousActual.visits, previousTarget.visits),
        };

        const targetWithCarryForward = {
          enquiries: weeklyBaseTarget.enquiries + carryForward.enquiries,
          salesValue: weeklyBaseTarget.salesValue + carryForward.salesValue,
          visits: weeklyBaseTarget.visits + carryForward.visits,
        };

        const shortBy = {
          enquiries: getShortBy(
            Number(week.enquiries || 0),
            targetWithCarryForward.enquiries
          ),
          salesValue: getShortBy(
            Number(week.approvedSalesValue || 0),
            targetWithCarryForward.salesValue
          ),
          visits: getShortBy(
            Number(week.visits || 0),
            targetWithCarryForward.visits
          ),
        };

        const cumulativeShortBy = {
          enquiries: getShortBy(
            cumulativeActual.enquiries,
            cumulativeTarget.enquiries
          ),
          salesValue: getShortBy(
            cumulativeActual.salesValue,
            cumulativeTarget.salesValue
          ),
          visits: getShortBy(cumulativeActual.visits, cumulativeTarget.visits),
        };

        const achievement = {
          enquiryPercent: getPercent(
            cumulativeActual.enquiries,
            cumulativeTarget.enquiries
          ),
          salesPercent: getPercent(
            cumulativeActual.salesValue,
            cumulativeTarget.salesValue
          ),
          visitPercent: getPercent(
            cumulativeActual.visits,
            cumulativeTarget.visits
          ),
        };

        const weekAchievement = {
          enquiryPercent: getPercent(
            week.enquiries,
            targetWithCarryForward.enquiries
          ),
          salesPercent: getPercent(
            week.approvedSalesValue,
            targetWithCarryForward.salesValue
          ),
          visitPercent: getPercent(week.visits, targetWithCarryForward.visits),
        };

        const weekScore = calculateWeightedScore({
          enquiryPercent: weekAchievement.enquiryPercent,
          salesPercent: weekAchievement.salesPercent,
          visitPercent: weekAchievement.visitPercent,
        });

        return {
          ...week,

          baseTarget: {
            enquiries: Number(weeklyBaseTarget.enquiries.toFixed(1)),
            salesValue: Number(weeklyBaseTarget.salesValue.toFixed(0)),
            visits: Number(weeklyBaseTarget.visits.toFixed(1)),
          },

          carryForward: {
            enquiries: Number(carryForward.enquiries.toFixed(1)),
            salesValue: Number(carryForward.salesValue.toFixed(0)),
            visits: Number(carryForward.visits.toFixed(1)),
          },

          targetWithCarryForward: {
            enquiries: Number(targetWithCarryForward.enquiries.toFixed(1)),
            salesValue: Number(targetWithCarryForward.salesValue.toFixed(0)),
            visits: Number(targetWithCarryForward.visits.toFixed(1)),
          },

          cumulativeTarget: {
            enquiries: Number(cumulativeTarget.enquiries.toFixed(1)),
            salesValue: Number(cumulativeTarget.salesValue.toFixed(0)),
            visits: Number(cumulativeTarget.visits.toFixed(1)),
          },

          cumulativeActual: {
            enquiries: Number(cumulativeActual.enquiries.toFixed(1)),
            salesValue: Number(cumulativeActual.salesValue.toFixed(0)),
            visits: Number(cumulativeActual.visits.toFixed(1)),
          },

          shortBy: {
            enquiries: Math.ceil(shortBy.enquiries),
            salesValue: Number(shortBy.salesValue.toFixed(0)),
            visits: Math.ceil(shortBy.visits),
          },

          cumulativeShortBy: {
            enquiries: Math.ceil(cumulativeShortBy.enquiries),
            salesValue: Number(cumulativeShortBy.salesValue.toFixed(0)),
            visits: Math.ceil(cumulativeShortBy.visits),
          },

          achievement,
          weekAchievement,
          weekScore,

          insight: {
            sales:
              shortBy.salesValue > 0
                ? `You need ${formatCurrency(
                    shortBy.salesValue
                  )} sales in ${week.label} to recover your weekly target.`
                : `Sales target is on track in ${week.label}.`,

            enquiries:
              shortBy.enquiries > 0
                ? `You need ${Math.ceil(
                    shortBy.enquiries
                  )} enquiries in ${week.label} to recover your weekly target.`
                : `Enquiry target is on track in ${week.label}.`,

            visits:
              shortBy.visits > 0
                ? `You need ${Math.ceil(
                    shortBy.visits
                  )} visits in ${week.label} to recover your weekly target.`
                : `Visit target is on track in ${week.label}.`,
          },
        };
      });

      const currentWeek =
        weeklyReport[currentWeekIndex] || weeklyReport[weeklyReport.length - 1];

      const monthlyAchievement = {
        enquiryPercent: getPercent(person.totalEnquiries, target.enquiry),
        salesPercent: getPercent(person.approvedSalesValue, target.sales),
        visitPercent: getPercent(person.visitsDone, target.visits),
      };

      const monthlyScore = calculateWeightedScore({
        enquiryPercent: monthlyAchievement.enquiryPercent,
        salesPercent: monthlyAchievement.salesPercent,
        visitPercent: monthlyAchievement.visitPercent,
      });

      const enquiryQualityScore =
        person.totalEnquiries > 0
          ? Number((person.totalScore / person.totalEnquiries).toFixed(1))
          : 0;

      const monthlyShortBy = {
        enquiries: getShortBy(person.totalEnquiries, target.enquiry),
        salesValue: getShortBy(person.approvedSalesValue, target.sales),
        visits: getShortBy(person.visitsDone, target.visits),
      };

      const userInsight = {
        title: `${person.name}, your MIS target update`,

        weekly:
          currentWeek?.weekScore >= 80
            ? `Good performance in ${currentWeek.label}. Your weekly score is ${currentWeek.weekScore}/100.`
            : `Your ${currentWeek.label} score is ${
                currentWeek?.weekScore || 0
              }/100. Focus on pending sales, enquiries and visits.`,

        sales:
          currentWeek?.shortBy?.salesValue > 0
            ? `You need ${formatCurrency(
                currentWeek.shortBy.salesValue
              )} sales in ${currentWeek.label}. Weekly target with carry forward is ${formatCurrency(
                currentWeek.targetWithCarryForward.salesValue
              )}.`
            : `Your sales target is on track in ${currentWeek?.label}.`,

        enquiries:
          currentWeek?.shortBy?.enquiries > 0
            ? `You need ${Math.ceil(
                currentWeek.shortBy.enquiries
              )} enquiries in ${currentWeek.label}. Weekly target with carry forward is ${Math.ceil(
                currentWeek.targetWithCarryForward.enquiries
              )}.`
            : `Your enquiry target is on track in ${currentWeek?.label}.`,

        visits:
          currentWeek?.shortBy?.visits > 0
            ? `You need ${Math.ceil(
                currentWeek.shortBy.visits
              )} visits in ${currentWeek.label}. Weekly target with carry forward is ${Math.ceil(
                currentWeek.targetWithCarryForward.visits
              )}.`
            : `Your visit target is on track in ${currentWeek?.label}.`,

        monthly:
          monthlyShortBy.salesValue > 0
            ? `Monthly pending: ${formatCurrency(
                monthlyShortBy.salesValue
              )} sales, ${Math.ceil(
                monthlyShortBy.enquiries
              )} enquiries and ${Math.ceil(monthlyShortBy.visits)} visits.`
            : `Monthly sales target achieved. Keep maintaining enquiries and visits.`,
      };

      return {
        salesPersonId: person.salesPersonId,
        name: person.name,
        email: person.email,

        score: enquiryQualityScore,
        enquiryQualityScore,
        monthlyScore,

        hotLeads: person.hotLeads,
        warmLeads: person.warmLeads,
        coldLeads: person.coldLeads,

        totalEnquiries: person.totalEnquiries,
        wonEnquiries: person.wonEnquiries,
        lostEnquiries: person.lostEnquiries,
        delayedEnquiries: person.delayedEnquiries,
        pendingEnquiries: person.pendingEnquiries,

        approvedSalesValue: person.approvedSalesValue,
        approvedOrders: person.approvedOrders,
        visitsDone: person.visitsDone,

        target: {
          monthly: {
            enquiries: target.enquiry,
            salesValue: target.sales,
            visits: target.visits,
          },
          weeklyBase: weeklyBaseTarget,
        },

        achievement: monthlyAchievement,

        shortBy: {
          enquiries: Math.ceil(monthlyShortBy.enquiries),
          salesValue: monthlyShortBy.salesValue,
          visits: Math.ceil(monthlyShortBy.visits),
        },

        currentWeek,
        userInsight,
        weeklyReport,
      };
    })
    .sort((a, b) => {
      if (b.monthlyScore !== a.monthlyScore) {
        return b.monthlyScore - a.monthlyScore;
      }

      return b.enquiryQualityScore - a.enquiryQualityScore;
    });

  return {
    reportType: "monthly",

    dateRange: {
      fromDate: startDate,
      toDate: endDate,
    },

    summary: {
      hotLeads,
      warmLeads,
      coldLeads,
      totalLeads: hotLeads + warmLeads + coldLeads,

      totalApprovedSalesValue: salesPersonScores.reduce(
        (sum, item) => sum + Number(item.approvedSalesValue || 0),
        0
      ),

      totalApprovedOrders: salesPersonScores.reduce(
        (sum, item) => sum + Number(item.approvedOrders || 0),
        0
      ),

      totalVisits: salesPersonScores.reduce(
        (sum, item) => sum + Number(item.visitsDone || 0),
        0
      ),
    },

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