const {
  User,
  SalesOrder,
  Enquiry,
  Dispatch,
  Attendance,
  Timesheet,
  ColdCall,
} = require(
  "../modelRegistry"
);

const {
  isManagement,
} = require(
  "../security/aiAccess"
);

const {
  dateRangeToUtc,
} = require(
  "../context/dateResolver"
);

/* =========================================================
   EMPLOYEE RESOLUTION
========================================================= */

const resolveEmployee =
  async ({
    requestingUser,
    employeeName,
    employeeId,
  }) => {
    /* =====================================================
       NORMAL USER → SELF ONLY
    ===================================================== */

    if (
      !isManagement(
        requestingUser
      )
    ) {
      return User.findById(
        requestingUser._id
      )
        .select(
          "_id name email"
        )
        .lean();
    }

    /* =====================================================
       MANAGEMENT + ID
    ===================================================== */

    if (employeeId) {
      return User.findById(
        employeeId
      )
        .select(
          "_id name email"
        )
        .lean();
    }

    /* =====================================================
       MANAGEMENT + NAME
    ===================================================== */

    if (
      employeeName &&
      employeeName !==
        "self"
    ) {
      const matches =
        await User.find({
          name: {
            $regex:
              employeeName,

            $options:
              "i",
          },
        })
          .select(
            "_id name email"
          )
          .limit(5)
          .lean();

      if (
        matches.length ===
        1
      ) {
        return matches[0];
      }

      return {
        ambiguous:
          matches.length >
          1,

        matches,
      };
    }

    /* =====================================================
       MANAGEMENT ASKING "MY"
    ===================================================== */

    return User.findById(
      requestingUser._id
    )
      .select(
        "_id name email"
      )
      .lean();
  };

/* =========================================================
   FORMAT MONEY
========================================================= */

const formatMoney = (
  value
) => {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  )}`;
};

/* =========================================================
   DAILY ACTIVITY
========================================================= */

const getDailyActivitySummary =
  async ({
    requestingUser,
    employeeName,
    employeeId,
    date,
  }) => {
    if (!date) {
      const error =
        new Error(
          "Date is required for daily activity summary."
        );

      error.statusCode =
        400;

      throw error;
    }

    const employee =
      await resolveEmployee({
        requestingUser,
        employeeName,
        employeeId,
      });

    if (
      employee
        ?.matches
    ) {
      return {
        ambiguous:
          employee.ambiguous,

        matches:
          employee.matches,
      };
    }

    if (!employee) {
      return {
        found: false,
        reason:
          "employee_not_found",
      };
    }

    const range =
      dateRangeToUtc({
        dateFrom: date,
        dateTo: date,
      });

    /* =====================================================
       SALES ORDERS CREATED THAT DAY
    ===================================================== */

    const salesOrdersPromise =
      SalesOrder.find({
        salesPersonId:
          employee._id,

        createdAt: {
          $gte:
            range.start,

          $lte:
            range.end,
        },
      })
        .select(
          [
            "companyName",
            "poNumber",
            "orderValue",
            "createdAt",
            "approvalStatus",
            "trackingOrderType",
            "customerType",
          ].join(" ")
        )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    /* =====================================================
       ENQUIRIES CREATED
    ===================================================== */

    const enquiriesPromise =
      Enquiry.find({
        salesPersonId:
          employee._id,

        createdAt: {
          $gte:
            range.start,

          $lte:
            range.end,
        },
      })
        .select(
          [
            "enquiryNumber",
            "companyName",
            "grade",
            "size",
            "quantityInKg",
            "closure.status",
            "createdAt",
          ].join(" ")
        )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    /* =====================================================
       SALES ACTIVITIES
    ===================================================== */

    const activitiesPromise =
      ColdCall.find({
        salesPersonId:
          employee._id,

        date: {
          $gte:
            range.start,

          $lte:
            range.end,
        },
      })
        .select(
          "activityType companyName contactPersonName date"
        )
        .sort({
          date: -1,
        })
        .limit(200)
        .lean();

    /* =====================================================
       TIMESHEET
    ===================================================== */

    const timesheetPromise =
      Timesheet.findOne({
        employeeId:
          employee._id,

        reportDate: {
          $gte:
            range.start,

          $lte:
            range.end,
        },
      })
        .select(
          "reportDate workSummary challenges nextDayPlan status"
        )
        .lean();

    /* =====================================================
       ATTENDANCE
    ===================================================== */

    const attendancePromise =
      Attendance.findOne({
        employeeId:
          employee._id,

        attendanceDate: {
          $gte:
            range.start,

          $lte:
            range.end,
        },
      })
        .select(
          [
            "attendanceStatus",
            "workMode",
            "checkIn.time",
            "checkOut.time",
            "totalWorkingMinutes",
          ].join(" ")
        )
        .lean();

    /* =====================================================
       DISPATCHES ATTRIBUTABLE TO SALESPERSON
    ===================================================== */

    const dispatchPromise =
      Dispatch.find({
        salesPersonId:
          employee._id,

        dispatchDate: {
          $gte:
            range.start,

          $lte:
            range.end,
        },

        isActive:
          true,
      })
        .select(
          [
            "companyName",
            "invoiceNumber",
            "dispatchQty",
            "invoiceValue",
            "dispatchDate",
            "dispatchStatus",
          ].join(" ")
        )
        .sort({
          dispatchDate: -1,
        })
        .limit(100)
        .lean();

    const [
      salesOrders,
      enquiries,
      activities,
      timesheet,
      attendance,
      dispatches,
    ] =
      await Promise.all([
        salesOrdersPromise,
        enquiriesPromise,
        activitiesPromise,
        timesheetPromise,
        attendancePromise,
        dispatchPromise,
      ]);

    /* =====================================================
       AGGREGATES
    ===================================================== */

    const salesOrderValue =
      salesOrders.reduce(
        (
          sum,
          order
        ) =>
          sum +
          Number(
            order.orderValue ||
              0
          ),
        0
      );

    const dispatchValue =
      dispatches.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.invoiceValue ||
              0
          ),
        0
      );

    const callingCount =
      activities.filter(
        (
          activity
        ) =>
          activity
            .activityType ===
          "calling"
      ).length;

    const visitCount =
      activities.filter(
        (
          activity
        ) =>
          activity
            .activityType ===
          "visit"
      ).length;

    const emailCount =
      activities.filter(
        (
          activity
        ) =>
          activity
            .activityType ===
          "email"
      ).length;

    const summary = {
      employee: {
        id:
          employee._id,

        name:
          employee.name,

        email:
          employee.email,
      },

      date,

      sales: {
        orderCount:
          salesOrders.length,

        orderValue:
          salesOrderValue,

        orders:
          salesOrders,
      },

      enquiries: {
        count:
          enquiries.length,

        records:
          enquiries,
      },

      customerActivity: {
        total:
          activities.length,

        calling:
          callingCount,

        visits:
          visitCount,

        emails:
          emailCount,

        records:
          activities,
      },

      dispatch: {
        count:
          dispatches.length,

        value:
          dispatchValue,

        records:
          dispatches,
      },

      attendance,

      timesheet,
    };

    /* =====================================================
       LOCAL ANSWER

       Guarantees that "aaj maine kya kiya?" works even
       without an additional Gemini reasoning call.
    ===================================================== */

    const answerParts = [
      `${employee.name}'s activity for ${date}:`,
      "",
      "SALES",
      `• Sales orders created: ${salesOrders.length}`,
      `• Sales order value: ${formatMoney(
        salesOrderValue
      )}`,
      "",
      "ENQUIRIES",
      `• Enquiries created: ${enquiries.length}`,
      "",
      "CUSTOMER ACTIVITY",
      `• Calls: ${callingCount}`,
      `• Visits: ${visitCount}`,
      `• Emails: ${emailCount}`,
      "",
      "DISPATCH",
      `• Dispatches: ${dispatches.length}`,
      `• Dispatch value: ${formatMoney(
        dispatchValue
      )}`,
      "",
      "ATTENDANCE",
      attendance
        ? `• Status: ${attendance.attendanceStatus}`
        : "• No attendance record found.",
      "",
      "TIMESHEET",
      timesheet
        ? `• ${timesheet.workSummary}`
        : "• Timesheet not submitted/found for this date.",
    ];

    return {
      found: true,
      ...summary,
      answer:
        answerParts.join(
          "\n"
        ),
    };
  };

module.exports = {
  getDailyActivitySummary,
};