const SalesOrder = require("../model/salesOrderModel");
const Enquiry = require("../model/enquiryModel");
const mongoose = require("mongoose");
const Receivable = require("../model/receivableModel");

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

const formatLostReason = (reason = "") => {
  const text = String(reason).toLowerCase();

  if (
    text.includes("price") ||
    text.includes("rate") ||
    text.includes("cost")
  ) {
    return "Price Issue";
  }

  if (
    text.includes("qty") ||
    text.includes("quantity")
  ) {
    return "Quantity Issue";
  }

  if (
    text.includes("size") ||
    text.includes("dimension")
  ) {
    return "Size Issue";
  }

  if (
    text.includes("delivery") ||
    text.includes("late")
  ) {
    return "Delivery Delay";
  }

  if (
    text.includes("grade") ||
    text.includes("material")
  ) {
    return "Grade Availability";
  }

  return reason || "Unknown";
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

  /* ========================= */
  /* TOTAL ORDERS */
  /* ========================= */

  const totalOrders = await SalesOrder.countDocuments(
    salesOrderFilter
  );

  /* ========================= */
  /* TOTAL REVENUE */
  /* ========================= */

  const revenueData = await SalesOrder.aggregate([
    {
      $match: salesOrderFilter,
    },

    {
      $group: {
        _id: null,

        totalRevenue: {
          $sum: "$valueInRupees",
        },
      },
    },
  ]);

  const totalRevenue =
    revenueData[0]?.totalRevenue || 0;

  /* ========================= */
  /* TOTAL ENQUIRIES */
  /* ========================= */

  const totalEnquiries =
    await Enquiry.countDocuments(
      enquiryFilter
    );

  /* ========================= */
  /* FEASIBLE */
  /* ========================= */

  const feasibleEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "feasibility.status":
        "feasible",
    });

  /* ========================= */
  /* NOT FEASIBLE */
  /* ========================= */

  const notFeasibleEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "feasibility.status":
        "not_feasible",
    });

  /* ========================= */
  /* WON */
  /* ========================= */

  const wonEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "closure.status": "won",
    });

  /* ========================= */
  /* LOST */
  /* ========================= */

  const lostEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "closure.status": "lost",
    });

  /* ========================= */
  /* DELAYED */
  /* ========================= */

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const delayedEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "closure.status": {
        $nin: ["won", "lost"],
      },

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
    });

  /* ========================= */
  /* ACTIVE / ONGOING */
  /* ========================= */

  const activeEnquiries =
    await Enquiry.countDocuments({
      ...enquiryFilter,

      "closure.status": {
        $nin: ["won", "lost"],
      },

      $nor: [
        {
          $or: [
            {
              "feasibility.planDate":
                {
                  $lt: today,
                },

              "feasibility.completed":
                {
                  $ne: true,
                },
            },

            {
              "quotation.planDate":
                {
                  $lt: today,
                },

              "quotation.completed":
                {
                  $ne: true,
                },
            },

            {
              "closure.planDate":
                {
                  $lt: today,
                },

              "closure.completed":
                {
                  $ne: true,
                },
            },
          ],
        },
      ],
    });

  /* ========================= */
  /* SALES PERSON PERFORMANCE */
  /* ========================= */

  const salesPersonRevenue =
    await SalesOrder.aggregate([
      {
        $match: salesOrderFilter,
      },

      {
        $group: {
          _id: "$salesPersonId",

          revenue: {
            $sum: "$valueInRupees",
          },

          orders: {
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

          revenue: 1,

          orders: 1,
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },
    ]);

  const salesPersonRevenueWithPercentage =
    salesPersonRevenue.map(
      (person) => ({
        ...person,

        percentage:
          totalRevenue > 0
            ? Number(
                (
                  (person.revenue /
                    totalRevenue) *
                  100
                ).toFixed(2)
              )
            : 0,
      })
    );

  /* ========================= */
  /* TOP GRADES */
  /* ========================= */

  const gradeWiseQuantity =
    await SalesOrder.aggregate([
      {
        $match: salesOrderFilter,
      },

      {
        $group: {
          _id: "$grade",

          quantity: {
            $sum: "$quantityInKg",
          },

          revenue: {
            $sum: "$valueInRupees",
          },

          orders: {
            $sum: 1,
          },
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

      {
        $sort: {
          quantity: -1,
        },
      },

      {
        $limit: 10,
      },
    ]);

  /* ========================= */
  /* TOP DELAYED EMPLOYEE */
  /* ========================= */

  const delayedEmployeeData =
    await Enquiry.aggregate([
      {
        $match: {
          ...enquiryFilter,

          "closure.status": {
            $nin: ["won", "lost"],
          },
        },
      },

      {
        $match: {
          $or: [
            {
              $expr: {
                $gt: [
                  "$feasibility.actualDate",
                  "$feasibility.planDate",
                ],
              },
            },

            {
              $expr: {
                $gt: [
                  "$quotation.actualDate",
                  "$quotation.planDate",
                ],
              },
            },
          ],
        },
      },

      {
        $group: {
          _id: "$salesPersonId",

          delayedCount: {
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

          name:
            "$salesPerson.name",

          email:
            "$salesPerson.email",

          delayedCount: 1,
        },
      },

      {
        $sort: {
          delayedCount: -1,
        },
      },

      {
        $limit: 1,
      },
    ]);

  /* ========================= */
  /* TOP LOST EMPLOYEE */
  /* ========================= */

  const lostEmployeeData =
    await Enquiry.aggregate([
      {
        $match: {
          ...enquiryFilter,

          "closure.status":
            "lost",
        },
      },

      {
        $group: {
          _id: "$salesPersonId",

          lostCount: {
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

          name:
            "$salesPerson.name",

          email:
            "$salesPerson.email",

          lostCount: 1,
        },
      },

      {
        $sort: {
          lostCount: -1,
        },
      },

      {
        $limit: 1,
      },
    ]);

  /* ========================= */
  /* TOP WON EMPLOYEE */
  /* ========================= */

  const wonEmployeeData =
    await Enquiry.aggregate([
      {
        $match: {
          ...enquiryFilter,

          "closure.status":
            "won",
        },
      },

      {
        $group: {
          _id: "$salesPersonId",

          wonCount: {
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

          name:
            "$salesPerson.name",

          email:
            "$salesPerson.email",

          wonCount: 1,
        },
      },

      {
        $sort: {
          wonCount: -1,
        },
      },

      {
        $limit: 1,
      },
    ]);

  /* ========================= */
  /* COMMON LOST REASON */
  /* ========================= */

  const lostReasonData =
    await Enquiry.aggregate([
      {
        $match: {
          ...enquiryFilter,

          "closure.status":
            "lost",

          "closure.lostRemark": {
            $exists: true,

            $ne: "",
          },
        },
      },

      {
        $group: {
          _id:
            "$closure.lostRemark",

          count: {
            $sum: 1,
          },
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

  const topLostReason =
    lostReasonData[0] || null;

  /* ========================= */
  /* RETURN */
  /* ========================= */

  return {
    totalRevenue,

    totalOrders,

    totalEnquiries,

    feasibleEnquiries,

    notFeasibleEnquiries,

    wonEnquiries,

    lostEnquiries,

    delayedEnquiries,

    activeEnquiries,

    salesPersonRevenue:
      salesPersonRevenueWithPercentage,

    gradeWiseQuantity,

    topDelayedEmployee:
      delayedEmployeeData[0] || null,

    topLostEmployee:
      lostEmployeeData[0] || null,

    topWonEmployee:
      wonEmployeeData[0] || null,

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
module.exports = {
  getDashboardSummary,
  getCashflowSummary,
  getActionRequiredInsights,
};