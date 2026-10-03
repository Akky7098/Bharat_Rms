// src/services/managementAnalysisService.js

import axios from "axios";

/* =========================================================
   MANAGEMENT ANALYSIS SERVICE

   BACKEND SOURCE:

   GET /api/steel-analytics
   GET /api/steel-analytics/summary
   GET /api/steel-analytics/drill-down
   GET /api/steel-analytics/pdf

   IMPORTANT:

   - Frontend does NOT calculate management quantities.
   - Backend is the single source of truth.
   - All filters are sent to backend.
   - Supports H.O. / N.H.O. / Steel Mill / Grade filters.
   - Supports From / To date filters.
   - PDF supports 1 / 3 / 6 month comparison.
========================================================= */


/* =========================================================
   BASE URL
========================================================= */

/*
 * LOCAL DEVELOPMENT:
 *
 * const BASE_URL =
 *   process.env.REACT_APP_BACKEND_URL ||
 *   "http://localhost:5000";
 *
 * PRODUCTION:
 *
 * REACT_APP_API_URL should NOT end with /api
 *
 * because API_URL below already adds:
 *
 * /api/steel-analytics
 */


  const BASE_URL =
    "http://localhost:5000";
// const BASE_URL =
//   process.env.REACT_APP_API_URL ||
//   "https://bharatspecialsteels.bharatspecialsteels.com";


const API_URL =
  `${BASE_URL}/api/steel-analytics`;


/* =========================================================
   ANALYTICS START DATE
========================================================= */

export const ANALYTICS_START_DATE =
  "2026-08-13";


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
   MONTH VALIDATION
========================================================= */

const normalizeMonth = (value) => {
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
  ] = text
    .split("-")
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}`;
};


/* =========================================================
   CURRENT MONTH
========================================================= */

export const getCurrentAnalysisMonth =
  () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    return `${year}-${month}`;
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
   BUILD PDF PARAMS

   Backend PDF endpoint:

   GET /api/steel-analytics/pdf

   Required:
   month=YYYY-MM

   period:
   1
   3
   6

   Optional:
   trackingOrderType
   steelMill
   grade
========================================================= */

const buildPdfParams = (
  options = {}
) => {
  const params = {};

  const month =
    normalizeMonth(
      options.month
    );

  if (!month) {
    throw new Error(
      "Please select a valid month for the Management Analysis PDF."
    );
  }


  /* =======================================================
     DO NOT ALLOW PERIOD BEFORE ANALYTICS START
  ======================================================= */

  if (
    month < "2026-08"
  ) {
    throw new Error(
      "Management Analysis is available from August 2026."
    );
  }


  const period =
    Number(
      options.period || 1
    );

  if (
    ![
      1,
      3,
      6,
    ].includes(period)
  ) {
    throw new Error(
      "PDF period must be 1, 3 or 6 months."
    );
  }


  const trackingOrderType =
    normalizeTrackingOrderType(
      options.trackingOrderType ||
        options.orderType ||
        options.type
    );


  const steelMill =
    cleanText(
      options.steelMill ||
        options.mill
    );


  const grade =
    cleanText(
      options.grade
    );


  params.month =
    month;

  params.period =
    period;


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
   NORMALIZED ERROR
========================================================= */

const createNormalizedError = (
  error
) => {
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

  return normalizedError;
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
    throw createNormalizedError(
      error
    );
  }
};


/* =========================================================
   GET FULL MANAGEMENT ANALYSIS
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
   BACKEND DRILL-DOWN

   metric:

   new_order
   dispatch_target
   actual_dispatch
   target_pending
   order_balance
========================================================= */

export const getManagementAnalysisDrillDown =
  async (
    metric,
    filters = {}
  ) => {
    const cleanMetric =
      cleanText(metric)
        .toLowerCase();

    const validMetrics = [
      "new_order",
      "dispatch_target",
      "actual_dispatch",
      "target_pending",
      "order_balance",
    ];

    if (
      !validMetrics.includes(
        cleanMetric
      )
    ) {
      throw new Error(
        "Invalid Management Analysis metric."
      );
    }

    const params = {
      ...buildParams(
        filters
      ),

      metric:
        cleanMetric,
    };

    return apiGet(
      `${API_URL}/drill-down`,
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
      (order) => {
        /*
         * Preferred backend flag.
         */
        if (
          order
            ?.isNewOrderInPeriod ===
          true
        ) {
          return true;
        }

        /*
         * Compatibility with older backend response.
         */
        return Boolean(
          order?.orderDate
        );
      }
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

   IMPORTANT:

   Visible Management Analysis table is:

                     H.O.     STEEL MILL

   New Order Qty
   Dispatch Target
   Actual Dispatch
   Target Pending
   Order Balance

   No visible TOTAL column.
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
      summary.ho ||
      {};

    const steelMill =
      summary.steelMill ||
      summary.nho ||
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
              house
                .orderedMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .newOrderMT ||
              steelMill
                .orderedMT ||
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
              house
                .targetMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .dispatchTargetMT ||
              steelMill
                .targetMT ||
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
              house
                .dispatchedMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .actualDispatchMT ||
              steelMill
                .dispatchedMT ||
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
              house
                .balanceMT ||
              0
          ),

        steelMillMT:
          Number(
            steelMill
              .orderBalanceMT ||
              steelMill
                .balanceMT ||
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
   GET PDF FILE NAME FROM RESPONSE
========================================================= */

const getPdfFileName = (
  response,
  fallbackName
) => {
  const disposition =
    response?.headers?.[
      "content-disposition"
    ] || "";

  /*
   * Handles:
   *
   * filename="Management_Analysis_3M_2026-09.pdf"
   *
   * and:
   *
   * filename=Management_Analysis_3M_2026-09.pdf
   */

  const utfMatch =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

  if (
    utfMatch &&
    utfMatch[1]
  ) {
    try {
      return decodeURIComponent(
        utfMatch[1]
      );
    } catch {
      return utfMatch[1];
    }
  }


  const normalMatch =
    disposition.match(
      /filename="?([^"]+)"?/i
    );

  if (
    normalMatch &&
    normalMatch[1]
  ) {
    return normalMatch[1]
      .replace(
        /;$/,
        ""
      )
      .trim();
  }


  return fallbackName;
};


/* =========================================================
   DOWNLOAD MANAGEMENT ANALYSIS PDF

   Backend:

   GET /api/steel-analytics/pdf

   Example:

   downloadManagementAnalysisPdf({
     month: "2026-09",
     period: 3
   });

   Optional:

   trackingOrderType
   steelMill
   grade

   IMPORTANT:

   responseType MUST be blob.
========================================================= */

export const downloadManagementAnalysisPdf =
  async (
    options = {}
  ) => {
    try {
      const params =
        buildPdfParams(
          options
        );


      const response =
        await axios.get(
          `${API_URL}/pdf`,
          {
            headers:
              authHeaders(),

            params,

            responseType:
              "blob",

            timeout:
              180000,
          }
        );


      if (
        !response?.data
      ) {
        throw new Error(
          "Management Analysis PDF was not returned by backend."
        );
      }


      const contentType =
        String(
          response?.headers?.[
            "content-type"
          ] || ""
        ).toLowerCase();


      /*
       * If backend returns JSON error but axios
       * receives it as blob, decode the blob so
       * user gets the real backend message.
       */
      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data.text();

        let parsed = null;

        try {
          parsed =
            JSON.parse(text);
        } catch {
          parsed = null;
        }

        throw new Error(
          parsed?.message ||
            "Management Analysis PDF generation failed."
        );
      }


      if (
        !contentType.includes(
          "application/pdf"
        )
      ) {
        throw new Error(
          "Backend did not return a valid PDF."
        );
      }


      const fallbackName =
        `Management_Analysis_${params.period}M_${params.month}.pdf`;


      const filename =
        getPdfFileName(
          response,
          fallbackName
        );


      const blob =
        response.data instanceof
        Blob
          ? response.data
          : new Blob(
              [
                response.data,
              ],
              {
                type:
                  "application/pdf",
              }
            );


      const downloadUrl =
        window.URL.createObjectURL(
          blob
        );


      const anchor =
        document.createElement(
          "a"
        );


      anchor.href =
        downloadUrl;

      anchor.download =
        filename;

      anchor.style.display =
        "none";


      document.body.appendChild(
        anchor
      );


      anchor.click();


      document.body.removeChild(
        anchor
      );


      /*
       * Do not revoke immediately before
       * browser starts the download.
       */
      window.setTimeout(
        () => {
          window.URL.revokeObjectURL(
            downloadUrl
          );
        },
        1000
      );


      return {
        success:
          true,

        filename,

        month:
          params.month,

        period:
          params.period,
      };
    } catch (error) {
      /*
       * Axios error response can itself be a Blob
       * because responseType is "blob".
       */
      const errorBlob =
        error?.response?.data;

      if (
        typeof Blob !==
          "undefined" &&
        errorBlob instanceof
          Blob
      ) {
        try {
          const text =
            await errorBlob.text();

          const parsed =
            JSON.parse(text);

          if (
            parsed?.message
          ) {
            const normalizedError =
              new Error(
                parsed.message
              );

            normalizedError.status =
              error?.response?.status;

            throw normalizedError;
          }
        } catch (
          blobError
        ) {
          /*
           * If we intentionally created the
           * normalized backend error above,
           * preserve it.
           */
          if (
            blobError?.status
          ) {
            throw blobError;
          }
        }
      }


      throw createNormalizedError(
        error
      );
    }
  };


/* =========================================================
   PDF ALIAS

   Shorter name if ManagementAnalysis.js prefers it.
========================================================= */

export const downloadSteelAnalyticsPdf =
  async (
    options = {}
  ) => {
    return downloadManagementAnalysisPdf(
      options
    );
  };


/* =========================================================
   DEFAULT EXPORT
========================================================= */

const managementAnalysisService = {
  getManagementAnalysis,

  getSteelAnalytics,

  getManagementAnalysisSummary,

  getManagementAnalysisDrillDown,

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

  getCurrentAnalysisMonth,

  downloadManagementAnalysisPdf,

  downloadSteelAnalyticsPdf,
};


export default managementAnalysisService;