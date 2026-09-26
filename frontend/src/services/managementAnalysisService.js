// src/services/managementAnalysisService.js

import axios from "axios";

/* =========================================================
   MANAGEMENT ANALYSIS SERVICE

   BACKEND SOURCE:
   GET /api/steel-analytics
   GET /api/steel-analytics/summary

   IMPORTANT:
   - Frontend does NOT calculate management quantities.
   - Backend is the single source of truth.
   - All filters are sent to backend.
   - Supports H.O. / N.H.O. / Steel Mill / Grade filters.
   - Supports From / To date filters.
========================================================= */

/* =========================================================
   BASE URL
========================================================= */

/*
 * LOCAL DEVELOPMENT
 *
 * Keep BASE_URL as:
 * http://localhost:5000
 *
 * because API_URL below already adds /api.
 */

const BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:5000";

/*
 * IMPORTANT:
 *
 * If REACT_APP_BACKEND_URL is:
 * http://localhost:5000
 *
 * Final URL becomes:
 * http://localhost:5000/api/steel-analytics
 *
 * NOT:
 * http://localhost:5000/api/api/steel-analytics
 */

const API_URL =
  `${BASE_URL}/api/steel-analytics`;

/* =========================================================
   TOKEN
========================================================= */

const getToken = () =>
  localStorage.getItem("token");

/* =========================================================
   AUTH HEADERS
========================================================= */

const authHeaders = () => {
  const token =
    getToken();

  return {
    Authorization:
      token
        ? `Bearer ${token}`
        : "",
  };
};

/* =========================================================
   CLEAN TEXT
========================================================= */

const cleanText = (value) =>
  String(value || "").trim();

/* =========================================================
   NORMALIZE TRACKING TYPE

   UI may send:
   HO
   H.O.
   NHO
   N.H.O.
   Steel Mill

   Backend expects:
   H.O.
   N.H.O.
========================================================= */

const normalizeTrackingOrderType =
  (value) => {
    const text =
      cleanText(value)
        .toUpperCase()
        .replace(/\s+/g, "");

    if (
      text === "HO" ||
      text === "H.O."
    ) {
      return "H.O.";
    }

    if (
      text === "NHO" ||
      text === "N.H.O." ||
      text === "STEELMILL"
    ) {
      return "N.H.O.";
    }

    return "";
  };

/* =========================================================
   DATE VALIDATION
========================================================= */

const normalizeDate = (value) => {
  if (!value) {
    return "";
  }

  const text =
    cleanText(value);

  /*
   * HTML date input already gives YYYY-MM-DD.
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return text;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/* =========================================================
   BUILD FILTER PARAMS

   Supported backend filters:

   from
   to
   trackingOrderType
   steelMill
   grade
========================================================= */

const buildParams = (
  filters = {}
) => {
  const params = {};

  const from =
    normalizeDate(
      filters.from
    );

  const to =
    normalizeDate(
      filters.to
    );

  const trackingOrderType =
    normalizeTrackingOrderType(
      filters.trackingOrderType ||
        filters.orderType ||
        filters.type
    );

  const steelMill =
    cleanText(
      filters.steelMill ||
        filters.mill
    );

  const grade =
    cleanText(
      filters.grade
    );

  /* =======================================================
     DATE VALIDATION

     Example:

     From: 2026-09-15
     To:   2026-09-10

     This must never be sent.
  ======================================================= */

  if (
    from &&
    to &&
    to < from
  ) {
    throw new Error(
      "To date cannot be earlier than From date."
    );
  }

  if (from) {
    params.from =
      from;
  }

  if (to) {
    params.to =
      to;
  }

  if (
    trackingOrderType
  ) {
    params.trackingOrderType =
      trackingOrderType;
  }

  if (steelMill) {
    params.steelMill =
      steelMill;
  }

  if (grade) {
    params.grade =
      grade;
  }

  return params;
};

/* =========================================================
   EXTRACT API DATA

   Backend response:

   {
     success: true,
     message: "...",
     data: {...}
   }
========================================================= */

const extractData = (
  response
) => {
  const body =
    response?.data;

  if (!body) {
    throw new Error(
      "Empty response received from analytics API."
    );
  }

  if (
    body.success ===
    false
  ) {
    throw new Error(
      body.message ||
        "Failed to load management analysis."
    );
  }

  if (
    body.data ===
      undefined ||
    body.data ===
      null
  ) {
    throw new Error(
      "Analytics data was not returned by backend."
    );
  }

  return body.data;
};

/* =========================================================
   NORMALIZE AXIOS ERROR
========================================================= */

const getErrorMessage = (
  error
) => {
  /*
   * Error intentionally thrown by frontend validation.
   */
  if (
    error &&
    !error.response &&
    error.message
  ) {
    return error.message;
  }

  const status =
    error?.response?.status;

  const backendMessage =
    error?.response?.data
      ?.message;

  if (
    backendMessage
  ) {
    return backendMessage;
  }

  if (status === 401) {
    return (
      "Your session has expired. " +
      "Please login again."
    );
  }

  if (status === 403) {
    return (
      "You are not authorized to access Management Analysis."
    );
  }

  if (status === 404) {
    return (
      "Management Analysis API endpoint was not found."
    );
  }

  if (status >= 500) {
    return (
      "Management Analysis server error. Please try again."
    );
  }

  if (
    error?.code ===
      "ERR_NETWORK" ||
    error?.message ===
      "Network Error"
  ) {
    return (
      "Unable to connect to the backend server."
    );
  }

  return (
    error?.message ||
    "Failed to load Management Analysis."
  );
};

/* =========================================================
   API REQUEST HELPER
========================================================= */

const apiGet = async (
  url,
  params = {}
) => {
  try {
    const response =
      await axios.get(
        url,
        {
          headers:
            authHeaders(),

          params,
        }
      );

    return extractData(
      response
    );
  } catch (error) {
    const message =
      getErrorMessage(
        error
      );

    const normalizedError =
      new Error(message);

    normalizedError.status =
      error?.response?.status;

    normalizedError.response =
      error?.response;

    throw normalizedError;
  }
};

/* =========================================================
   GET FULL MANAGEMENT ANALYSIS

   Example:

   getManagementAnalysis({
     from: "2026-09-01",
     to: "2026-09-30"
   });

   Returns:

   {
     generatedAt,
     filters,
     definitions,

     summary: {
       total: {...},
       house: {...},
       steelMill: {...}
     },

     grades: [],
     mills: [],
     salesOrders: [],

     dataQuality: {...},
     warnings: {...}
   }
========================================================= */

export const getManagementAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildParams(
        filters
      );

    return apiGet(
      API_URL,
      params
    );
  };

/* =========================================================
   ALIAS

   Existing page currently imports:
   getManagementAnalysis

   This alias makes the naming clearer for future code.
========================================================= */

export const getSteelAnalytics =
  async (
    filters = {}
  ) => {
    return getManagementAnalysis(
      filters
    );
  };

/* =========================================================
   GET SUMMARY ONLY

   Useful when dashboard only needs cards/table and does not
   need every Sales Order detail.
========================================================= */

export const getManagementAnalysisSummary =
  async (
    filters = {}
  ) => {
    const params =
      buildParams(
        filters
      );

    return apiGet(
      `${API_URL}/summary`,
      params
    );
  };

/* =========================================================
   H.O. ANALYSIS
========================================================= */

export const getHouseAnalysis =
  async (
    filters = {}
  ) => {
    return getManagementAnalysis({
      ...filters,

      trackingOrderType:
        "H.O.",
    });
  };

/* =========================================================
   STEEL MILL / N.H.O. ANALYSIS
========================================================= */

export const getSteelMillAnalysis =
  async (
    filters = {}
  ) => {
    return getManagementAnalysis({
      ...filters,

      trackingOrderType:
        "N.H.O.",
    });
  };

/* =========================================================
   ONE STEEL MILL ANALYSIS

   Example:

   getMillAnalysis(
     "SAIL",
     {
       from: "2026-09-01",
       to: "2026-09-30"
     }
   );
========================================================= */

export const getMillAnalysis =
  async (
    steelMill,
    filters = {}
  ) => {
    const mill =
      cleanText(
        steelMill
      );

    if (!mill) {
      throw new Error(
        "Steel Mill is required."
      );
    }

    return getManagementAnalysis({
      ...filters,

      trackingOrderType:
        "N.H.O.",

      steelMill:
        mill,
    });
  };

/* =========================================================
   ONE GRADE ANALYSIS

   Example:

   getGradeAnalysis(
     "H13",
     {
       from: "2026-09-01",
       to: "2026-09-30"
     }
   );
========================================================= */

export const getGradeAnalysis =
  async (
    grade,
    filters = {}
  ) => {
    const selectedGrade =
      cleanText(
        grade
      );

    if (!selectedGrade) {
      throw new Error(
        "Grade is required."
      );
    }

    return getManagementAnalysis({
      ...filters,

      grade:
        selectedGrade,
    });
  };

/* =========================================================
   GET ORDERS FROM FULL ANALYSIS

   This does NOT call old Sales Order API.

   It gets the backend analytics and returns its Sales Order
   drill-down data.
========================================================= */

export const getManagementAnalysisOrders =
  async (
    filters = {}
  ) => {
    const data =
      await getManagementAnalysis(
        filters
      );

    return Array.isArray(
      data?.salesOrders
    )
      ? data.salesOrders
      : [];
  };

/* =========================================================
   LOCAL DRILL-DOWN HELPERS

   These work from the already-returned backend Sales Order
   analytics data.

   No extra request is needed for the current UI.
========================================================= */

const getOrders = (
  analysis
) =>
  Array.isArray(
    analysis?.salesOrders
  )
    ? analysis.salesOrders
    : [];

/* =========================================================
   NEW ORDER DRILL-DOWN
========================================================= */

export const getNewOrderDrillDown =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    ).filter(
      (order) =>
        Boolean(
          order?.orderDate
        )
    );
  };

/* =========================================================
   DISPATCH TARGET DRILL-DOWN
========================================================= */

export const getDispatchTargetDrillDown =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    ).filter(
      (order) =>
        Number(
          order
            ?.dispatchTargetMT ||
            0
        ) > 0
    );
  };

/* =========================================================
   ACTUAL DISPATCH DRILL-DOWN
========================================================= */

export const getActualDispatchDrillDown =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    ).filter(
      (order) =>
        Number(
          order
            ?.actualDispatchMT ||
            0
        ) > 0
    );
  };

/* =========================================================
   TARGET PENDING DRILL-DOWN

   Example:
   target = 20 MT
   actual against target = 15 MT
   pending = 5 MT

   Clicking 5 MT will show this order.
========================================================= */

export const getTargetPendingDrillDown =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    )
      .filter(
        (order) =>
          Number(
            order
              ?.targetPendingMT ||
              0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b?.targetPendingMT ||
              0
          ) -
          Number(
            a?.targetPendingMT ||
              0
          )
      );
  };

/* =========================================================
   ORDER BALANCE DRILL-DOWN

   Example:

   Order Qty       20 MT
   Dispatched      10 MT
   Balance         10 MT

   Clicking 10 MT can show the exact order.
========================================================= */

export const getOrderBalanceDrillDown =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    )
      .filter(
        (order) =>
          Number(
            order
              ?.orderBalanceMT ||
              0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b?.orderBalanceMT ||
              0
          ) -
          Number(
            a?.orderBalanceMT ||
              0
          )
      );
  };

/* =========================================================
   H.O. ORDER DRILL-DOWN
========================================================= */

export const getHouseOrders =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    ).filter(
      (order) =>
        String(
          order
            ?.trackingOrderType ||
            ""
        )
          .trim()
          .toUpperCase() ===
        "H.O."
    );
  };

/* =========================================================
   STEEL MILL ORDER DRILL-DOWN
========================================================= */

export const getSteelMillOrders =
  (
    analysis
  ) => {
    return getOrders(
      analysis
    ).filter(
      (order) =>
        String(
          order
            ?.trackingOrderType ||
            ""
        )
          .trim()
          .toUpperCase() ===
        "N.H.O."
    );
  };

/* =========================================================
   ONE MILL ORDERS
========================================================= */

export const getOrdersByMill =
  (
    analysis,
    steelMill
  ) => {
    const wanted =
      cleanText(
        steelMill
      ).toLowerCase();

    if (!wanted) {
      return [];
    }

    return getOrders(
      analysis
    ).filter(
      (order) =>
        cleanText(
          order?.steelMill
        ).toLowerCase() ===
        wanted
    );
  };

/* =========================================================
   ONE GRADE ORDERS
========================================================= */

export const getOrdersByGrade =
  (
    analysis,
    grade
  ) => {
    const wanted =
      cleanText(
        grade
      )
        .toUpperCase()
        .replace(/\s+/g, "");

    if (!wanted) {
      return [];
    }

    return getOrders(
      analysis
    ).filter(
      (order) =>
        Array.isArray(
          order?.grades
        ) &&
        order.grades.some(
          (item) =>
            cleanText(
              item?.grade
            )
              .toUpperCase()
              .replace(
                /\s+/g,
                ""
              ) ===
            wanted
        )
    );
  };

/* =========================================================
   FORMAT METRIC TABLE

   Produces exactly:

                      H.O.     STEEL MILL     TOTAL

   New Order Qty
   Dispatch Target
   Actual Dispatch
   Target Pending
   Order Balance
========================================================= */

export const buildManagementMetricTable =
  (
    analysis
  ) => {
    const summary =
      analysis?.summary ||
      {};

    const house =
      summary.house ||
      {};

    const steelMill =
      summary.steelMill ||
      {};

    const total =
      summary.total ||
      {};

    return [
      {
        key:
          "new_order",

        label:
          "New Order Qty",

        houseMT:
          Number(
            house
              .newOrderMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .newOrderMT ||
              0
          ),

        totalMT:
          Number(
            total
              .newOrderMT ||
              0
          ),
      },

      {
        key:
          "dispatch_target",

        label:
          "Dispatch Target",

        houseMT:
          Number(
            house
              .dispatchTargetMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .dispatchTargetMT ||
              0
          ),

        totalMT:
          Number(
            total
              .dispatchTargetMT ||
              0
          ),
      },

      {
        key:
          "actual_dispatch",

        label:
          "Actual Dispatch",

        houseMT:
          Number(
            house
              .actualDispatchMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .actualDispatchMT ||
              0
          ),

        totalMT:
          Number(
            total
              .actualDispatchMT ||
              0
          ),
      },

      {
        key:
          "target_pending",

        label:
          "Target Pending",

        houseMT:
          Number(
            house
              .targetPendingMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .targetPendingMT ||
              0
          ),

        totalMT:
          Number(
            total
              .targetPendingMT ||
              0
          ),
      },

      {
        key:
          "order_balance",

        label:
          "Order Balance",

        houseMT:
          Number(
            house
              .orderBalanceMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .orderBalanceMT ||
              0
          ),

        totalMT:
          Number(
            total
              .orderBalanceMT ||
              0
          ),
      },
    ];
  };

/* =========================================================
   FORMAT MT
========================================================= */

export const formatMetricTon =
  (
    value,
    decimals = 2
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return "0 MT";
    }

    return `${number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          decimals,
      }
    )} MT`;
  };

/* =========================================================
   FORMAT DATE
========================================================= */

export const formatAnalysisDate =
  (value) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    );
  };

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const managementAnalysisService = {
  getManagementAnalysis,

  getSteelAnalytics,

  getManagementAnalysisSummary,

  getManagementAnalysisOrders,

  getHouseAnalysis,

  getSteelMillAnalysis,

  getMillAnalysis,

  getGradeAnalysis,

  getNewOrderDrillDown,

  getDispatchTargetDrillDown,

  getActualDispatchDrillDown,

  getTargetPendingDrillDown,

  getOrderBalanceDrillDown,

  getHouseOrders,

  getSteelMillOrders,

  getOrdersByMill,

  getOrdersByGrade,

  buildManagementMetricTable,

  formatMetricTon,

  formatAnalysisDate,
};

export default managementAnalysisService;