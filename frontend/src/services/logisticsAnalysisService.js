import axios from "axios";

/* =========================================================
   LOGISTICS ANALYSIS SERVICE

   BACKEND:

   GET /api/logistics-analysis

   GET /api/logistics-analysis/details


   PURPOSE:

   This service is ONLY responsible for:

   - Dispatch Plan
   - Actual Dispatch
   - Target Pending

   - H.O. Logistics
   - Steel Mill / N.H.O. Logistics

   - Logistics Order Details


   IMPORTANT:

   NO Total Order Analysis here.

   NO H.O. Order Quantity calculation here.

   NO Steel Mill Order Quantity calculation here.

   NO Grade Demand calculation here.

   NO Mill Business calculation here.

   NO PDF here.

   Backend remains the single source of truth.


   DISPATCH PLAN:

   Backend remains responsible for determining
   the dispatch plan month from Order Tracking
   readiness / estimatedReadyDate.

   Frontend DOES NOT calculate that date.
========================================================= */


/* =========================================================
   BASE URL

   LOCAL DEVELOPMENT
========================================================= */

const BASE_URL =
  "http://localhost:5000";


/* =========================================================
   PRODUCTION

   COMMENT LOCAL URL ABOVE AND
   UNCOMMENT THIS WHEN DEPLOYING.
========================================================= */

// const BASE_URL =
//   process.env.REACT_APP_API_URL ||
//   "https://bharatspecialsteels.bharatspecialsteels.com";


/* =========================================================
   API URL
========================================================= */

const API_URL =
  `${BASE_URL}/api/logistics-analysis`;


/* =========================================================
   ANALYTICS START DATE
========================================================= */

export const LOGISTICS_ANALYTICS_START_DATE =
  "2026-08-13";


/* =========================================================
   CLEAN TEXT
========================================================= */

const cleanText = (value) =>
  String(value || "").trim();


/* =========================================================
   TOKEN
========================================================= */

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  "";


/* =========================================================
   AUTH HEADERS
========================================================= */

const authHeaders = () => {
  const token =
    getToken();

  return token
    ? {
        Authorization:
          `Bearer ${token}`,
      }
    : {};
};


/* =========================================================
   NORMALIZE MONTH

   EXPECTED:

   YYYY-MM
========================================================= */

const normalizeMonth = (
  value
) => {
  const text =
    cleanText(value);

  if (!text) {
    return "";
  }

  if (
    !/^\d{4}-\d{2}$/.test(
      text
    )
  ) {
    return "";
  }

  const [
    year,
    month,
  ] =
    text
      .split("-")
      .map(Number);

  if (
    !Number.isInteger(
      year
    ) ||
    !Number.isInteger(
      month
    ) ||
    month < 1 ||
    month > 12
  ) {
    return "";
  }

  return (
    `${year}-${String(
      month
    ).padStart(
      2,
      "0"
    )}`
  );
};


/* =========================================================
   NORMALIZE DATE

   TEMPORARY SUPPORT FOR OLD FRONTEND
   from / to FILTERS.
========================================================= */

const normalizeDate = (
  value
) => {
  if (!value) {
    return "";
  }

  const text =
    cleanText(value);

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
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-${month}-${day}`
  );
};


/* =========================================================
   CURRENT MONTH
========================================================= */

export const getCurrentLogisticsMonth =
  () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    return (
      `${year}-${month}`
    );
  };


/* =========================================================
   NORMALIZE PERIOD

   ALLOWED:

   1
   3
   6
========================================================= */

const normalizePeriod = (
  value
) => {
  const period =
    Number(
      value || 1
    );

  if (
    ![1, 3, 6].includes(
      period
    )
  ) {
    throw new Error(
      "Logistics period must be 1, 3 or 6 months."
    );
  }

  return period;
};


/* =========================================================
   NORMALIZE TRACKING ORDER TYPE
========================================================= */

const normalizeTrackingOrderType =
  (value) => {
    const text =
      cleanText(value)
        .toUpperCase()
        .replace(
          /\s+/g,
          ""
        );

    if (
      text === "HO" ||
      text === "H.O."
    ) {
      return "H.O.";
    }

    if (
      text === "NHO" ||
      text === "N.H.O." ||
      text ===
        "STEELMILL"
    ) {
      return "N.H.O.";
    }

    return "";
  };


/* =========================================================
   BUILD LOGISTICS PARAMS

   NEW FILTERS:

   month
   months

   TEMPORARY OLD FRONTEND SUPPORT:

   from
   to

   OPTIONAL:

   trackingOrderType
========================================================= */

const buildLogisticsParams = (
  filters = {}
) => {
  const params = {};

  const month =
    normalizeMonth(
      filters.month
    );

  const months =
    normalizePeriod(
      filters.months ||
      filters.period ||
      1
    );

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
      filters
        .trackingOrderType ||
      filters.orderType ||
      filters.type
    );


  /* =====================================================
     MONTH
  ===================================================== */

  if (month) {
    params.month =
      month;
  }


  /* =====================================================
     PERIOD
  ===================================================== */

  params.months =
    months;


  /* =====================================================
     TEMPORARY BACKWARD COMPATIBILITY
  ===================================================== */

  if (from) {
    params.from =
      from;
  }

  if (to) {
    params.to =
      to;
  }


  /* =====================================================
     DATE VALIDATION
  ===================================================== */

  if (
    from &&
    to &&
    to < from
  ) {
    throw new Error(
      "To date cannot be earlier than From date."
    );
  }


  /* =====================================================
     H.O. / N.H.O.
  ===================================================== */

  if (
    trackingOrderType
  ) {
    params
      .trackingOrderType =
      trackingOrderType;
  }

  return params;
};


/* =========================================================
   EXTRACT DATA
========================================================= */

const extractData = (
  response
) => {
  const body =
    response?.data;

  if (!body) {
    throw new Error(
      "Empty response received from Logistics Analysis API."
    );
  }

  if (
    body.success ===
    false
  ) {
    throw new Error(
      body.message ||
      "Failed to load Logistics Analysis."
    );
  }

  if (
    body.data ===
      undefined ||
    body.data ===
      null
  ) {
    throw new Error(
      "Logistics Analysis data was not returned by backend."
    );
  }

  return body.data;
};


/* =========================================================
   ERROR MESSAGE
========================================================= */

const getErrorMessage = (
  error
) => {
  if (
    error &&
    !error.response &&
    error.message
  ) {
    return error.message;
  }

  const status =
    error?.response
      ?.status;

  const backendMessage =
    error?.response
      ?.data
      ?.message;

  if (
    backendMessage
  ) {
    return backendMessage;
  }

  if (
    status === 400
  ) {
    return (
      "Invalid Logistics Analysis request."
    );
  }

  if (
    status === 401
  ) {
    return (
      "Your session has expired. Please login again."
    );
  }

  if (
    status === 403
  ) {
    return (
      "You are not authorized to access Logistics Analysis."
    );
  }

  if (
    status === 404
  ) {
    return (
      "Logistics Analysis API endpoint was not found."
    );
  }

  if (
    status >= 500
  ) {
    return (
      "Logistics Analysis server error. Please try again."
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
    "Failed to load Logistics Analysis."
  );
};


/* =========================================================
   CREATE NORMALIZED ERROR
========================================================= */

const createNormalizedError = (
  error
) => {
  const normalizedError =
    new Error(
      getErrorMessage(
        error
      )
    );

  normalizedError.status =
    error?.response
      ?.status;

  normalizedError.response =
    error?.response;

  return normalizedError;
};


/* =========================================================
   API GET HELPER
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
    throw createNormalizedError(
      error
    );
  }
};


/* =========================================================
   1. GET MAIN LOGISTICS ANALYSIS

   BACKEND:

   GET /api/logistics-analysis


   INITIAL LOGISTICS PAGE REQUEST.

   RETURNS ONLY:

   - Dispatch Plan
   - Actual Dispatch
   - Target Pending

   Prefer lightweight aggregate data.

   Detailed orders should NOT be required
   during initial load.
========================================================= */

export const getLogisticsAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams(
        filters
      );

    return apiGet(
      API_URL,
      params
    );
  };


/* =========================================================
   2. GET H.O. LOGISTICS ANALYSIS
========================================================= */

export const getHouseLogisticsAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams({
        ...filters,

        trackingOrderType:
          "H.O.",
      });

    return apiGet(
      API_URL,
      params
    );
  };


/* =========================================================
   3. GET STEEL MILL / N.H.O. LOGISTICS ANALYSIS
========================================================= */

export const getSteelMillLogisticsAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams({
        ...filters,

        trackingOrderType:
          "N.H.O.",
      });

    return apiGet(
      API_URL,
      params
    );
  };


/* =========================================================
   4. GET ALL LOGISTICS DETAILS

   BACKEND:

   GET /api/logistics-analysis/details


   IMPORTANT:

   DO NOT CALL THIS ON INITIAL PAGE LOAD.

   CALL ONLY WHEN USER OPENS
   LOGISTICS DETAILS.
========================================================= */

export const getLogisticsDetails =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams(
        filters
      );

    return apiGet(
      `${API_URL}/details`,
      params
    );
  };


/* =========================================================
   5. GET H.O. LOGISTICS DETAILS
========================================================= */

export const getHouseLogisticsDetails =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams({
        ...filters,

        trackingOrderType:
          "H.O.",
      });

    return apiGet(
      `${API_URL}/details`,
      params
    );
  };


/* =========================================================
   6. GET STEEL MILL / N.H.O. LOGISTICS DETAILS
========================================================= */

export const getSteelMillLogisticsDetails =
  async (
    filters = {}
  ) => {
    const params =
      buildLogisticsParams({
        ...filters,

        trackingOrderType:
          "N.H.O.",
      });

    return apiGet(
      `${API_URL}/details`,
      params
    );
  };


/* =========================================================
   LOCAL DETAIL HELPERS

   These DO NOT call backend again.

   They only filter the details already
   returned by /details.
========================================================= */

const getOrders = (
  data
) => {
  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  if (
    Array.isArray(
      data?.orders
    )
  ) {
    return data.orders;
  }

  if (
    Array.isArray(
      data?.salesOrders
    )
  ) {
    return data
      .salesOrders;
  }

  return [];
};


/* =========================================================
   DISPATCH PLAN ORDERS

   Supports current backend field:

   dispatchTargetMT
========================================================= */

export const getDispatchPlanOrders =
  (data) => {
    return getOrders(
      data
    )
      .filter(
        (order) =>
          Number(
            order
              ?.dispatchTargetMT ||
            0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b
              ?.dispatchTargetMT ||
            0
          ) -
          Number(
            a
              ?.dispatchTargetMT ||
            0
          )
      );
  };


/* =========================================================
   ACTUAL DISPATCH ORDERS
========================================================= */

export const getActualDispatchOrders =
  (data) => {
    return getOrders(
      data
    )
      .filter(
        (order) =>
          Number(
            order
              ?.actualDispatchMT ||
            0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b
              ?.actualDispatchMT ||
            0
          ) -
          Number(
            a
              ?.actualDispatchMT ||
            0
          )
      );
  };


/* =========================================================
   TARGET PENDING ORDERS
========================================================= */

export const getTargetPendingOrders =
  (data) => {
    return getOrders(
      data
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
            b
              ?.targetPendingMT ||
            0
          ) -
          Number(
            a
              ?.targetPendingMT ||
            0
          )
      );
  };


/* =========================================================
   H.O. ORDERS
========================================================= */

export const getHouseLogisticsOrders =
  (data) => {
    return getOrders(
      data
    ).filter(
      (order) =>
        cleanText(
          order
            ?.trackingOrderType
        )
          .toUpperCase() ===
        "H.O."
    );
  };


/* =========================================================
   STEEL MILL / N.H.O. ORDERS
========================================================= */

export const getSteelMillLogisticsOrders =
  (data) => {
    return getOrders(
      data
    ).filter(
      (order) =>
        cleanText(
          order
            ?.trackingOrderType
        )
          .toUpperCase() ===
        "N.H.O."
    );
  };


/* =========================================================
   FORMAT MT VALUE AS KG

   Existing analytics backend quantities
   are currently based on MT values.

   Management UI displays KG.

   Example:

   1.25 MT
   ->
   1,250 KG
========================================================= */

export const formatLogisticsKG = (
  mtValue,
  decimals = 0
) => {
  const mt =
    Number(
      mtValue
    );

  if (
    !Number.isFinite(
      mt
    )
  ) {
    return "0 KG";
  }

  const kg =
    mt * 1000;

  return (
    `${kg.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          decimals,
      }
    )} KG`
  );
};


/* =========================================================
   RAW KG FORMATTER

   Use when backend already returns KG.
========================================================= */

export const formatKG = (
  value,
  decimals = 0
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0 KG";
  }

  return (
    `${number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          decimals,
      }
    )} KG`
  );
};


/* =========================================================
   FORMAT NUMBER
========================================================= */

export const formatLogisticsNumber = (
  value,
  decimals = 0
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0";
  }

  return number
    .toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          decimals,
      }
    );
};


/* =========================================================
   FORMAT DATE
========================================================= */

export const formatLogisticsDate =
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

    return date
      .toLocaleDateString(
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

const logisticsAnalysisService = {
  getLogisticsAnalysis,

  getHouseLogisticsAnalysis,

  getSteelMillLogisticsAnalysis,

  getLogisticsDetails,

  getHouseLogisticsDetails,

  getSteelMillLogisticsDetails,

  getDispatchPlanOrders,

  getActualDispatchOrders,

  getTargetPendingOrders,

  getHouseLogisticsOrders,

  getSteelMillLogisticsOrders,

  getCurrentLogisticsMonth,

  formatLogisticsKG,

  formatKG,

  formatLogisticsNumber,

  formatLogisticsDate,
};

export default
  logisticsAnalysisService;