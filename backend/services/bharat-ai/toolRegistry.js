const userTools =
  require(
    "./tools/userTools"
  );

const salesTools =
  require(
    "./tools/salesOrderTools"
  );

const enquiryTools =
  require(
    "./tools/enquiryTools"
  );

const dispatchTools =
  require(
    "./tools/dispatchTools"
  );

const receivableTools =
  require(
    "./tools/receivableTools"
  );

const trackingTools =
  require(
    "./tools/orderTrackingTools"
  );

const attendanceTools =
  require(
    "./tools/attendanceTools"
  );

const timesheetTools =
  require(
    "./tools/timesheetTools"
  );

const coldCallTools =
  require(
    "./tools/coldCallTools"
  );

const managementTools =
  require(
    "./tools/managementTools"
  );
const dailyActivityTools =
  require(
    "./tools/dailyActivityTools"
  );
/* =========================================================
   NEW TOOLS
========================================================= */

const documentTools =
  require(
    "./tools/documentTools"
  );

const teamPerformanceTools =
  require(
    "./tools/teamPerformanceTools"
  );

/* =========================================================
   GEMINI SCHEMA TYPES
========================================================= */

const OBJECT =
  "OBJECT";

const STRING =
  "STRING";

const NUMBER =
  "NUMBER";

const BOOLEAN =
  "BOOLEAN";

/* =========================================================
   SCHEMA HELPERS
========================================================= */

const s = (
  description
) => ({
  type:
    STRING,

  description,
});

const n = (
  description
) => ({
  type:
    NUMBER,

  description,
});

const b = (
  description
) => ({
  type:
    BOOLEAN,

  description,
});

const objectSchema = (
  properties,
  required = []
) => ({
  type:
    OBJECT,

  properties,

  ...(required.length
    ? {
        required,
      }
    : {}),
});

/* =========================================================
   COMMON PARAMETERS
========================================================= */

const dateRange = {
  dateFrom:
    s(
      "Start date in YYYY-MM-DD format. Bharat AI resolves relative business dates using Asia/Kolkata."
    ),

  dateTo:
    s(
      "End date in YYYY-MM-DD format. Bharat AI resolves relative business dates using Asia/Kolkata."
    ),
};

const salesperson = {
  salesPersonId:
    s(
      "Salesperson user id. Omit for a normal logged-in salesperson unless management is asking about another employee."
    ),
};

const forceRefresh = {
  forceRefresh:
    b(
      "Set true only when the user explicitly requests live, fresh or cache-bypassed Bharat data."
    ),
};

const employee = {
  employeeId:
    s(
      "Employee user id when already resolved."
    ),

  employeeName:
    s(
      "Employee name when management asks about a named employee."
    ),
};

/* =========================================================
   TOOL GROUPS

   IMPORTANT:
   Groups reduce prompt/token usage.

   Gemini should receive only the groups required
   for the current question.
========================================================= */

const TOOL_GROUPS =
  Object.freeze({
    USER:
      "user",

    SALES:
      "sales",

    ENQUIRY:
      "enquiry",

    DISPATCH:
      "dispatch",

    RECEIVABLE:
      "receivable",

    TRACKING:
      "tracking",

    ATTENDANCE:
      "attendance",

    TIMESHEET:
      "timesheet",

    ACTIVITY:
      "activity",

    TEAM:
      "team",

    MANAGEMENT:
      "management",

    DOCUMENT:
      "document",
  });

/* =========================================================
   REGISTRY
========================================================= */

const registry = [
  /* =======================================================
     USER
  ======================================================= */

  {
    name:
      "search_users",

    group:
      TOOL_GROUPS.USER,

    description:
      "Find authorized Bharat users/employees by name or email. Use when management refers to an employee and a unique employee id is required.",

    parameters:
      objectSchema({
        search:
          s(
            "Employee name or email text."
          ),

        limit:
          n(
            "Maximum results. Keep small."
          ),
      }),

    execute:
      userTools.searchUsers,
  },

  {
    name:
      "get_my_profile",

    group:
      TOOL_GROUPS.USER,

    description:
      "Return the logged-in user's basic Bharat profile.",

    parameters:
      objectSchema(
        {}
      ),

    execute:
      userTools.getMyProfile,
  },

  /* =======================================================
     SALES
  ======================================================= */

  {
    name:
      "get_sales_summary",

    group:
      TOOL_GROUPS.SALES,

    description:
      "Get approved Bharat sales order value, order count, average order value and new/existing customer counts for a requested period.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      salesTools
        .getSalesSummary,
  },

  {
    name:
      "get_sales_orders",

    group:
      TOOL_GROUPS.SALES,

    description:
      "Get authorized Bharat sales orders filtered by customer, salesperson, approval state and/or date period.",

    parameters:
      objectSchema({
        ...salesperson,

        companyName:
          s(
            "Customer/company name."
          ),

        ...dateRange,

        approvalStatus:
          s(
            "pending_admin_review, rejected_by_admin, pending_manager_approval, rejected_by_manager, or approved."
          ),

        limit:
          n(
            "Maximum records. Use the smallest useful limit, never more than 100."
          ),

        ...forceRefresh,
      }),

    execute:
      salesTools
        .getSalesOrders,
  },

  {
    name:
      "get_top_customers",

    group:
      TOOL_GROUPS.SALES,

    description:
      "Rank authorized customers by approved sales order value for the requested period.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,

        limit:
          n(
            "Maximum customers to return."
          ),

        ...forceRefresh,
      }),

    execute:
      salesTools
        .getTopCustomers,
  },

  {
    name:
      "compare_sales_periods",

    group:
      TOOL_GROUPS.SALES,

    description:
      "Compare approved sales between two explicit periods and calculate absolute and percentage change.",

    parameters:
      objectSchema(
        {
          ...salesperson,

          period1From:
            s(
              "Period 1 start YYYY-MM-DD."
            ),

          period1To:
            s(
              "Period 1 end YYYY-MM-DD."
            ),

          period2From:
            s(
              "Period 2 start YYYY-MM-DD."
            ),

          period2To:
            s(
              "Period 2 end YYYY-MM-DD."
            ),

          ...forceRefresh,
        },

        [
          "period1From",
          "period1To",
          "period2From",
          "period2To",
        ]
      ),

    execute:
      salesTools
        .compareSalesPeriods,
  },

  {
    name:
      "get_inactive_customers",

    group:
      TOOL_GROUPS.SALES,

    description:
      "Find previously ordering customers whose last approved order is older than the requested inactivity threshold, ranked by historical sales value.",

    parameters:
      objectSchema({
        ...salesperson,

        inactiveDays:
          n(
            "Days without an approved order. Default 45."
          ),

        minimumHistoricalSales:
          n(
            "Optional minimum historical approved sales value."
          ),

        limit:
          n(
            "Maximum customers."
          ),

        ...forceRefresh,
      }),

    execute:
      salesTools
        .getInactiveCustomers,
  },

  /* =======================================================
     ENQUIRY
  ======================================================= */

  {
    name:
      "get_enquiry_summary",

    group:
      TOOL_GROUPS.ENQUIRY,

    description:
      "Get enquiry totals, won/lost/pending counts, enquiry quantity and conversion rate for an authorized period.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      enquiryTools
        .getEnquirySummary,
  },

  {
    name:
      "get_lost_enquiries",

    group:
      TOOL_GROUPS.ENQUIRY,

    description:
      "Get authorized lost enquiry records and lost reasons.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,

        lostReason:
          s(
            "price, delivery, qty, quality, payment_terms, material_not_available, others."
          ),

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      enquiryTools
        .getLostEnquiries,
  },

  {
    name:
      "get_lost_enquiry_reason_summary",

    group:
      TOOL_GROUPS.ENQUIRY,

    description:
      "Aggregate authorized lost enquiries by reason for sales or management analysis.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      enquiryTools
        .getLostEnquiryReasonSummary,
  },

  /* =======================================================
     DISPATCH
  ======================================================= */

  {
    name:
      "get_dispatch_summary",

    group:
      TOOL_GROUPS.DISPATCH,

    description:
      "Get dispatch count, dispatched quantity, invoice value and pending payment totals for the authorized scope and period.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      dispatchTools
        .getDispatchSummary,
  },
    {
  name:
    "get_daily_activity_summary",

  group:
    TOOL_GROUPS.ACTIVITY,

  description:
    "Get an authorized cross-module daily activity summary for the logged-in employee or, for management, a named employee. Use for questions such as 'What did I do today?', 'Aaj maine kya kiya?', or 'What did Shalu do today?'. It combines sales orders, enquiries, calls/visits, dispatch, attendance and timesheet data for one date.",

  parameters:
    objectSchema(
      {
        employeeId:
          s(
            "Employee user id when already resolved."
          ),

        employeeName:
          s(
            "Employee name when management asks about another employee. Omit for self."
          ),

        date:
          s(
            "Required Bharat business date YYYY-MM-DD in Asia/Kolkata."
          ),
      },

      [
        "date",
      ]
    ),

  execute:
    dailyActivityTools
      .getDailyActivitySummary,
},
  {
    name:
      "get_overdue_dispatch_payments",

    group:
      TOOL_GROUPS.DISPATCH,

    description:
      "Get authorized dispatched invoices with overdue payment and remaining pending amount.",

    parameters:
      objectSchema({
        ...salesperson,

        limit:
          n(
            "Maximum invoices."
          ),

        ...forceRefresh,
      }),

    execute:
      dispatchTools
        .getOverdueDispatchPayments,
  },

  /* =======================================================
     RECEIVABLE
  ======================================================= */

  {
    name:
      "get_receivable_summary",

    group:
      TOOL_GROUPS.RECEIVABLE,

    description:
      "Get authorized total receivable, pending, overdue and credit-risk totals.",

    parameters:
      objectSchema({
        ...forceRefresh,
      }),

    execute:
      receivableTools
        .getReceivableSummary,
  },

  {
    name:
      "get_overdue_customers",

    group:
      TOOL_GROUPS.RECEIVABLE,

    description:
      "Get authorized customers with overdue receivables ranked by overdue value.",

    parameters:
      objectSchema({
        minimumOverdueDays:
          n(
            "Minimum number of overdue days."
          ),

        limit:
          n(
            "Maximum customers."
          ),

        ...forceRefresh,
      }),

    execute:
      receivableTools
        .getOverdueCustomers,
  },

  {
    name:
      "get_customer_receivable",

    group:
      TOOL_GROUPS.RECEIVABLE,

    description:
      "Get an authorized receivable ledger summary and outstanding invoices for one customer.",

    parameters:
      objectSchema(
        {
          companyName:
            s(
              "Customer/company name."
            ),

          ...forceRefresh,
        },

        [
          "companyName",
        ]
      ),

    execute:
      receivableTools
        .getCustomerReceivable,
  },

  /* =======================================================
     ORDER TRACKING
  ======================================================= */

  {
    name:
      "get_order_tracking_summary",

    group:
      TOOL_GROUPS.TRACKING,

    description:
      "Get authorized active order tracking counts grouped by current production/dispatch status.",

    parameters:
      objectSchema({
        ...salesperson,
        ...forceRefresh,
      }),

    execute:
      trackingTools
        .getOrderTrackingSummary,
  },

  {
    name:
      "get_delayed_orders",

    group:
      TOOL_GROUPS.TRACKING,

    description:
      "Get active tracked orders whose estimated delivery date has passed.",

    parameters:
      objectSchema({
        ...salesperson,

        overdueByDays:
          n(
            "Only include orders at least this many days beyond estimated delivery."
          ),

        limit:
          n(
            "Maximum orders."
          ),

        ...forceRefresh,
      }),

    execute:
      trackingTools
        .getDelayedOrders,
  },

  {
    name:
      "get_tracking_by_company",

    group:
      TOOL_GROUPS.TRACKING,

    description:
      "Get authorized order tracking status, milestones and ETA for a specific customer/company.",

    parameters:
      objectSchema(
        {
          companyName:
            s(
              "Customer/company name."
            ),

          limit:
            n(
              "Maximum tracking records."
            ),

          ...forceRefresh,
        },

        [
          "companyName",
        ]
      ),

    execute:
      trackingTools
        .getTrackingByCompany,
  },

  /* =======================================================
     ATTENDANCE
  ======================================================= */

  {
    name:
      "get_attendance_by_employee_and_date",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get one employee's attendance for a specific India business date. Management can query employees; normal users are automatically scoped to themselves.",

    parameters:
      objectSchema(
        {
          ...employee,

          date:
            s(
              "Attendance date YYYY-MM-DD in India time."
            ),

          includeLocation:
            b(
              "Include basic attendance location information only when the user actually asks about check-in/check-out location."
            ),

          ...forceRefresh,
        },

        [
          "date",
        ]
      ),

    execute:
      attendanceTools
        .getAttendanceByEmployeeAndDate,
  },

  {
    name:
      "get_attendance_summary",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get attendance counts and working-time summary for a requested period. Management can analyze company or employee attendance; normal users are automatically self-scoped.",

    parameters:
      objectSchema({
        ...employee,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getAttendanceSummary,
  },

  {
    name:
      "get_attendance_by_date",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get daily attendance records for a specific date, optionally filtered by attendance status or work mode.",

    parameters:
      objectSchema(
        {
          date:
            s(
              "Date YYYY-MM-DD in India time."
            ),

          attendanceStatus:
            s(
              "Optional attendance status filter."
            ),

          workMode:
            s(
              "Optional work mode filter: office or work_from_home."
            ),

          limit:
            n(
              "Maximum records."
            ),

          ...forceRefresh,
        },

        [
          "date",
        ]
      ),

    execute:
      attendanceTools
        .getAttendanceByDate,
  },

  {
    name:
      "get_employee_attendance_history",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get an employee's attendance records for a requested period.",

    parameters:
      objectSchema({
        ...employee,
        ...dateRange,

        attendanceStatus:
          s(
            "Optional attendance status filter."
          ),

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getEmployeeAttendanceHistory,
  },

  {
    name:
      "get_missing_checkout_attendance",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Find authorized attendance records where an employee checked in but did not complete checkout.",

    parameters:
      objectSchema({
        ...employee,
        ...dateRange,

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getMissingCheckoutAttendance,
  },

  {
    name:
      "get_attendance_regularizations",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get attendance regularization requests filtered by employee, status and period.",

    parameters:
      objectSchema({
        ...employee,

        status:
          s(
            "none, pending, approved or rejected."
          ),

        ...dateRange,

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getAttendanceRegularizations,
  },

  {
    name:
      "get_leave_attendance",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get authorized leave or loss-of-pay attendance records for an employee or period.",

    parameters:
      objectSchema({
        ...employee,

        leaveType:
          s(
            "paid_leave or loss_of_pay."
          ),

        ...dateRange,

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getLeaveAttendance,
  },

  {
    name:
      "get_employee_attendance_stats",

    group:
      TOOL_GROUPS.ATTENDANCE,

    description:
      "Get compact attendance statistics for one employee including present, absent, leave, missing checkout and working-time totals.",

    parameters:
      objectSchema({
        ...employee,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      attendanceTools
        .getEmployeeAttendanceStats,
  },

  /* =======================================================
     TIMESHEET
  ======================================================= */

  {
    name:
      "get_timesheet_by_employee_and_date",

    group:
      TOOL_GROUPS.TIMESHEET,

    description:
      "Get one employee's submitted timesheet, work summary, challenges and next-day plan for a specific date.",

    parameters:
      objectSchema(
        {
          ...employee,

          date:
            s(
              "Timesheet date YYYY-MM-DD in India time."
            ),

          ...forceRefresh,
        },

        [
          "date",
        ]
      ),

    execute:
      timesheetTools
        .getTimesheetByEmployeeAndDate,
  },

  {
    name:
      "get_timesheets",

    group:
      TOOL_GROUPS.TIMESHEET,

    description:
      "Get an employee's timesheets within a period. Management can query employees; normal users are automatically self-scoped.",

    parameters:
      objectSchema({
        ...employee,
        ...dateRange,

        limit:
          n(
            "Maximum records."
          ),

        ...forceRefresh,
      }),

    execute:
      timesheetTools
        .getTimesheets,
  },

  /* =======================================================
     COLD CALL / SALES ACTIVITY
  ======================================================= */

  {
    name:
      "get_cold_call_summary",

    group:
      TOOL_GROUPS.ACTIVITY,

    description:
      "Get authorized sales calling, visit and email activity counts and unique company counts for a period.",

    parameters:
      objectSchema({
        ...salesperson,
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      coldCallTools
        .getColdCallSummary,
  },

  /* =======================================================
     INDIVIDUAL SALESPERSON MANAGEMENT ANALYSIS
  ======================================================= */

  {
    name:
      "get_salesperson_performance",

    group:
      TOOL_GROUPS.TEAM,

    description:
      "Management-only detailed performance summary for one salesperson covering sales, enquiries, customers, activities and delayed orders.",

    parameters:
      objectSchema({
        employeeName:
          s(
            "Salesperson name."
          ),

        salesPersonId:
          s(
            "Salesperson user id when already resolved."
          ),

        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      managementTools
        .getSalespersonPerformance,
  },

  /* =======================================================
     NEW TEAM-WIDE PERFORMANCE

     Solves:
     "Which salesperson performed lowest last week?"
  ======================================================= */

  {
    name:
      "get_team_sales_performance",

    group:
      TOOL_GROUPS.TEAM,

    description:
      "Management-only team-wide comparison of salespeople for an explicit period. Returns sales, orders, enquiries, conversions, calls, visits, emails and other available measurable performance indicators.",

    parameters:
      objectSchema(
        {
          ...dateRange,
          ...forceRefresh,
        },

        [
          "dateFrom",
          "dateTo",
        ]
      ),

    execute:
      teamPerformanceTools
        .getTeamSalesPerformance,
  },

  /* =======================================================
     MANAGEMENT EXECUTIVE SUMMARY
  ======================================================= */

  {
    name:
      "get_executive_summary",

    group:
      TOOL_GROUPS.MANAGEMENT,

    description:
      "Management-only cross-module Bharat summary covering sales, enquiries, dispatch, receivables and order tracking for a requested period.",

    parameters:
      objectSchema({
        ...dateRange,
        ...forceRefresh,
      }),

    execute:
      managementTools
        .getExecutiveSummary,
  },

  /* =======================================================
     DOCUMENT SEARCH

     IMPORTANT:
     This only searches authorized document metadata.
     It does not send the file to Gemini.
  ======================================================= */

  {
    name:
      "search_documents",

    group:
      TOOL_GROUPS.DOCUMENT,

    description:
      "Search documents that the logged-in Bharat user is authorized to access, such as brochures, catalogues, MTCs, technical specifications and internal reference documents.",

    parameters:
      objectSchema(
        {
          search:
            s(
              "Short document search phrase, for example 'tool steel brochure' or 'DB6 catalogue'."
            ),

          limit:
            n(
              "Maximum results. Keep small, generally 5 to 10."
            ),

          ...forceRefresh,
        },

        [
          "search",
        ]
      ),

    execute:
      documentTools
        .searchDocuments,
  },
];

/* =========================================================
   TOOL MAP
========================================================= */

const TOOL_MAP =
  new Map(
    registry.map(
      (
        tool
      ) => [
        tool.name,
        tool,
      ]
    )
  );

/* =========================================================
   TOOL DECLARATIONS

   NEW:
   getToolDeclarations({
     groups: ["attendance"],
   })

   means Gemini receives ONLY attendance tools.

   Also supports:
   getToolDeclarations({
     names: ["get_sales_summary"]
   })
========================================================= */

const getToolDeclarations =
  ({
    groups = [],
    names = [],
  } = {}) => {
    let tools =
      registry;

    /* =====================================================
       FILTER BY EXACT TOOL NAME
    ===================================================== */

    if (
      Array.isArray(
        names
      ) &&
      names.length >
        0
    ) {
      const allowedNames =
        new Set(
          names
        );

      tools =
        tools.filter(
          (
            tool
          ) =>
            allowedNames.has(
              tool.name
            )
        );
    }

    /* =====================================================
       FILTER BY GROUP
    ===================================================== */

    if (
      Array.isArray(
        groups
      ) &&
      groups.length >
        0
    ) {
      const allowedGroups =
        new Set(
          groups
        );

      tools =
        tools.filter(
          (
            tool
          ) =>
            allowedGroups.has(
              tool.group
            )
        );
    }

    return tools.map(
      ({
        name,
        description,
        parameters,
      }) => ({
        name,
        description,
        parameters,
      })
    );
  };

/* =========================================================
   TOOL EXECUTION

   RBAC remains inside tool implementations.

   Gemini NEVER receives unrestricted model/database access.
========================================================= */

const executeTool =
  async ({
    toolName,
    args = {},
    requestingUser,
  }) => {
    const tool =
      TOOL_MAP.get(
        toolName
      );

    if (!tool) {
      const error =
        new Error(
          `Unknown Bharat AI tool: ${toolName}`
        );

      error.statusCode =
        400;

      throw error;
    }

    return tool.execute({
      ...(args || {}),

      requestingUser,
    });
  };

/* =========================================================
   OPTIONAL HELPERS

   Useful for provider/router/debugging.
========================================================= */

const getRegisteredToolNames =
  () => {
    return registry.map(
      (
        tool
      ) =>
        tool.name
    );
  };

const getRegisteredGroups =
  () => {
    return [
      ...new Set(
        registry.map(
          (
            tool
          ) =>
            tool.group
        )
      ),
    ];
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  registry,

  TOOL_GROUPS,

  getToolDeclarations,

  executeTool,

  getRegisteredToolNames,

  getRegisteredGroups,
};