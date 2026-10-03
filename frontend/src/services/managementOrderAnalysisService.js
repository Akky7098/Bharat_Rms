import axios from "axios";

/* =========================================================
   MANAGEMENT ORDER ANALYSIS SERVICE

   BACKEND:

   GET /api/management-order-analysis

   GET /api/management-order-analysis/mill

   GET /api/management-order-analysis/grade


   PURPOSE:

   This service is ONLY responsible for:

   - Total Orders
   - Total Order Quantity
   - Total Order Count

   - H.O. Orders
   - H.O. Order Quantity
   - H.O. Order Count

   - Steel Mill / N.H.O. Orders
   - Steel Mill Order Quantity
   - Steel Mill Order Count

   - Mill-wise Order Analysis

   - Grade-wise Order Analysis

   - Mill Order Details

   - Grade Order Details


   IMPORTANT:

   NO dispatch calculation here.

   NO dispatch target here.

   NO actual dispatch here.

   NO target pending here.

   NO Order Tracking logistics processing here.

   NO PDF here.

   Backend remains the single source of truth.
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
  `${BASE_URL}/api/management-order-analysis`;


/* =========================================================
   ANALYTICS START DATE
========================================================= */

export const ANALYTICS_START_DATE =
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

   KEPT ONLY FOR TEMPORARY
   FRONTEND BACKWARD COMPATIBILITY.

   EXPECTED:

   YYYY-MM-DD
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
   CURRENT ANALYSIS MONTH
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

   1 MONTH
   3 MONTH
   6 MONTH
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
      "Analysis period must be 1, 3 or 6 months."
    );
  }

  return period;
};


/* =========================================================
   NORMALIZE TRACKING ORDER TYPE

   UI MAY SEND:

   HO
   H.O.

   NHO
   N.H.O.

   STEEL MILL
   STEELMILL

   BACKEND EXPECTS:

   H.O.
   N.H.O.
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
   BUILD COMMON MANAGEMENT PARAMS

   PRIMARY NEW FILTERS:

   month
   months

   TEMPORARY COMPATIBILITY:

   from
   to

   OPTIONAL:

   trackingOrderType
   steelMill
   grade
========================================================= */

const buildManagementParams = (
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

  const steelMill =
    cleanText(
      filters.steelMill ||
      filters.mill
    );

  const grade =
    cleanText(
      filters.grade
    );


  /* =====================================================
     MONTH / PERIOD
  ===================================================== */

  if (month) {
    params.month =
      month;
  }

  params.months =
    months;


  /* =====================================================
     TEMPORARY OLD FRONTEND SUPPORT

     This allows us to change frontend
     pages gradually without breaking them.
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
     OPTIONAL FILTERS
  ===================================================== */

  if (
    trackingOrderType
  ) {
    params
      .trackingOrderType =
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
   EXTRACT BACKEND DATA

   EXPECTED BACKEND RESPONSE:

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
      "Empty response received from Management Order Analysis API."
    );
  }

  if (
    body.success ===
    false
  ) {
    throw new Error(
      body.message ||
      "Failed to load Management Order Analysis."
    );
  }

  if (
    body.data ===
      undefined ||
    body.data ===
      null
  ) {
    throw new Error(
      "Management Order Analysis data was not returned by backend."
    );
  }

  return body.data;
};


/* =========================================================
   NORMALIZE API ERROR
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
      "Invalid Management Order Analysis request."
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
      "You are not authorized to access Management Order Analysis."
    );
  }

  if (
    status === 404
  ) {
    return (
      "Management Order Analysis API endpoint was not found."
    );
  }

  if (
    status >= 500
  ) {
    return (
      "Management Order Analysis server error. Please try again."
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
    "Failed to load Management Order Analysis."
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
   1. GET MAIN MANAGEMENT ORDER ANALYSIS

   BACKEND:

   GET /api/management-order-analysis


   THIS IS THE INITIAL PAGE REQUEST.

   IT SHOULD RETURN LIGHTWEIGHT DATA:

   - Total Order KG
   - Total Order Count

   - H.O. KG
   - H.O. Count

   - Steel Mill KG
   - Steel Mill Count

   - Mill Aggregates

   - Grade Aggregates

   IT SHOULD NOT REQUIRE LOGISTICS DATA.
========================================================= */

export const getManagementOrderAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildManagementParams(
        filters
      );

    return apiGet(
      API_URL,
      params
    );
  };


/* =========================================================
   2. GET H.O. ORDER ANALYSIS

   Uses the SAME lightweight management
   endpoint but forces H.O.
========================================================= */

export const getHouseOrderAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildManagementParams({
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
   3. GET STEEL MILL / N.H.O. ORDER ANALYSIS

   Uses the SAME lightweight management
   endpoint but forces N.H.O.
========================================================= */

export const getSteelMillOrderAnalysis =
  async (
    filters = {}
  ) => {
    const params =
      buildManagementParams({
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
   4. GET ONE STEEL MILL DETAIL

   BACKEND:

   GET /api/management-order-analysis/mill


   IMPORTANT:

   THIS API IS NOT CALLED DURING
   INITIAL DASHBOARD LOAD.

   IT IS CALLED ONLY WHEN MANAGEMENT
   OPENS A SPECIFIC MILL.
========================================================= */

export const getSteelMillDetail =
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

    const params =
      buildManagementParams({
        ...filters,

        trackingOrderType:
          "N.H.O.",

        steelMill:
          mill,
      });

    return apiGet(
      `${API_URL}/mill`,
      params
    );
  };


/* =========================================================
   5. GET ONE GRADE DETAIL

   BACKEND:

   GET /api/management-order-analysis/grade


   IMPORTANT:

   THIS API IS NOT CALLED DURING
   INITIAL DASHBOARD LOAD.

   IT IS CALLED ONLY WHEN MANAGEMENT
   OPENS A SPECIFIC GRADE.
========================================================= */

export const getGradeOrderDetail =
  async (
    grade,
    filters = {}
  ) => {
    const selectedGrade =
      cleanText(
        grade
      );

    if (
      !selectedGrade
    ) {
      throw new Error(
        "Grade is required."
      );
    }

    const params =
      buildManagementParams({
        ...filters,

        grade:
          selectedGrade,
      });

    return apiGet(
      `${API_URL}/grade`,
      params
    );
  };


/* =========================================================
   FORMAT QUANTITY AS KG

   BACKEND CURRENT ANALYTICS VALUES
   MAY STILL BE RETURNED IN MT.

   FRONTEND MANAGEMENT VIEW USES KG.
========================================================= */

export const formatOrderKG = (
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
   FORMAT RAW KG

   USE THIS WHEN BACKEND ALREADY
   RETURNS KG.
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

export const formatAnalysisNumber = (
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
   6. DOWNLOAD H.O. ORDER ANALYSIS PDF

   BACKEND:

   GET /api/management-order-analysis/house/pdf

   IMPORTANT:

   PDF is generated only when management
   explicitly clicks Download PDF.

   It is NOT loaded during dashboard load.

   Backend returns application/pdf.
========================================================= */

export const downloadHouseOrderAnalysisPdf =
  async (
    filters = {}
  ) => {
    try {
      const params =
        buildManagementParams({
          ...filters,

          trackingOrderType:
            "H.O.",
        });

      const response =
        await axios.get(
          `${API_URL}/house/pdf`,
          {
            headers: {
              ...authHeaders(),

              Accept:
                "application/pdf",
            },

            params,

            responseType:
              "blob",
          }
        );

      const contentType =
        String(
          response?.headers?.[
            "content-type"
          ] || ""
        ).toLowerCase();

      /*
       * If backend unexpectedly
       * returns JSON as blob,
       * convert it and show the
       * actual backend message.
       */
      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data.text();

        let message =
          "Unable to generate H.O. Order Analysis PDF.";

        try {
          const parsed =
            JSON.parse(text);

          message =
            parsed?.message ||
            message;
        } catch (_) {
          if (text) {
            message = text;
          }
        }

        throw new Error(
          message
        );
      }

      const blob =
        response.data;

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          "Empty PDF received from backend."
        );
      }

      const objectUrl =
        window.URL
          .createObjectURL(
            blob
          );

      const link =
        document
          .createElement(
            "a"
          );

      const month =
        normalizeMonth(
          filters.month
        ) ||
        getCurrentAnalysisMonth();

      const months =
        normalizePeriod(
          filters.months ||
          filters.period ||
          1
        );

      link.href =
        objectUrl;

      link.download =
        `HO_Order_Analysis_${month}_${months}M.pdf`;

      document.body
        .appendChild(
          link
        );

      link.click();

      link.remove();

      window.setTimeout(
        () => {
          window.URL
            .revokeObjectURL(
              objectUrl
            );
        },
        1000
      );

      return true;
    } catch (error) {
      /*
       * Axios error response may
       * itself be a JSON blob.
       */
      const responseBlob =
        error?.response?.data;

      if (
        responseBlob instanceof
        Blob
      ) {
        try {
          const text =
            await responseBlob
              .text();

          if (text) {
            const parsed =
              JSON.parse(text);

            throw new Error(
              parsed?.message ||
              "Unable to generate H.O. Order Analysis PDF."
            );
          }
        } catch (
          blobError
        ) {
          if (
            blobError?.message &&
            blobError.message !==
              "Unexpected end of JSON input"
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
   7. DOWNLOAD STEEL MILL ORDER ANALYSIS PDF

   BACKEND:

   GET /api/management-order-analysis/mill/pdf


   REQUIRED:

   steelMill


   OPTIONAL:

   month
   months
   supplyCondition
   includeCustomerName


   EXAMPLES:

   WITH CUSTOMER NAME:

   /api/management-order-analysis/mill/pdf
     ?month=2026-10
     &months=3
     &steelMill=S.S. Steel - Sirhind
     &supplyCondition=as_rolled
     &includeCustomerName=true


   WITHOUT CUSTOMER NAME:

   /api/management-order-analysis/mill/pdf
     ?month=2026-10
     &months=3
     &steelMill=S.S. Steel - Sirhind
     &supplyCondition=as_rolled
     &includeCustomerName=false


   IMPORTANT:

   PDF is generated only when management
   explicitly clicks one of the PDF options.

   It is NOT loaded during dashboard load.

   Backend returns application/pdf.
========================================================= */

export const downloadSteelMillOrderAnalysisPdf =
  async (
    steelMill,
    filters = {},
    includeCustomerName = true
  ) => {
    try {
      /* =====================================================
         VALIDATE MILL
      ===================================================== */

      const mill =
        cleanText(
          steelMill
        );

      if (!mill) {
        throw new Error(
          "Steel Mill is required."
        );
      }


      /* =====================================================
         BUILD STANDARD MANAGEMENT PARAMS
      ===================================================== */

      const params =
        buildManagementParams({
          ...filters,

          trackingOrderType:
            "N.H.O.",

          steelMill:
            mill,
        });


      /* =====================================================
         SUPPLY CONDITION

         This is an additional mill-detail/PDF filter.
      ===================================================== */

      const supplyCondition =
        cleanText(
          filters
            .supplyCondition
        );

      if (
        supplyCondition &&
        supplyCondition !==
          "all"
      ) {
        params
          .supplyCondition =
          supplyCondition;
      }


      /* =====================================================
         CUSTOMER NAME OPTION
      ===================================================== */

      params
        .includeCustomerName =
        Boolean(
          includeCustomerName
        );


      /* =====================================================
         REQUEST PDF
      ===================================================== */

      const response =
        await axios.get(
          `${API_URL}/mill/pdf`,
          {
            headers: {
              ...authHeaders(),

              Accept:
                "application/pdf",
            },

            params,

            responseType:
              "blob",
          }
        );


      /* =====================================================
         CONTENT TYPE

         Backend may return JSON error
         even though responseType is blob.
      ===================================================== */

      const contentType =
        String(
          response?.headers?.[
            "content-type"
          ] || ""
        ).toLowerCase();


      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data
            .text();

        let message =
          "Unable to generate Steel Mill Order Analysis PDF.";

        try {
          const parsed =
            JSON.parse(
              text
            );

          message =
            parsed?.message ||
            message;
        } catch (_) {
          if (text) {
            message =
              text;
          }
        }

        throw new Error(
          message
        );
      }


      /* =====================================================
         VALIDATE PDF BLOB
      ===================================================== */

      const blob =
        response.data;

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          "Empty Steel Mill PDF received from backend."
        );
      }


      /* =====================================================
         CREATE DOWNLOAD URL
      ===================================================== */

      const objectUrl =
        window.URL
          .createObjectURL(
            blob
          );


      const link =
        document
          .createElement(
            "a"
          );


      /* =====================================================
         FILE NAME VALUES
      ===================================================== */

      const month =
        normalizeMonth(
          filters.month
        ) ||
        getCurrentAnalysisMonth();


      const months =
        normalizePeriod(
          filters.months ||
          filters.period ||
          1
        );


      const safeMillName =
        mill
          .replace(
            /[^0-9A-Za-z_-]+/g,
            "_"
          )
          .replace(
            /^_+|_+$/g,
            ""
          ) ||
        "Steel_Mill";


      const customerMode =
        includeCustomerName
          ? "With_Customer"
          : "Without_Customer";


      /* =====================================================
         DOWNLOAD
      ===================================================== */

      link.href =
        objectUrl;


      link.download =
        `Steel_Mill_Order_Analysis_${safeMillName}_${month}_${months}M_${customerMode}.pdf`;


      document.body
        .appendChild(
          link
        );


      link.click();


      link.remove();


      window.setTimeout(
        () => {
          window.URL
            .revokeObjectURL(
              objectUrl
            );
        },
        1000
      );


      return true;
    } catch (error) {
      /* =====================================================
         AXIOS ERROR RESPONSE MAY ALSO BE JSON BLOB
      ===================================================== */

      const responseBlob =
        error?.response?.data;


      if (
        responseBlob instanceof
        Blob
      ) {
        try {
          const text =
            await responseBlob
              .text();


          if (text) {
            const parsed =
              JSON.parse(
                text
              );


            throw new Error(
              parsed?.message ||
              "Unable to generate Steel Mill Order Analysis PDF."
            );
          }
        } catch (
          blobError
        ) {
          if (
            blobError?.message &&
            blobError.message !==
              "Unexpected end of JSON input"
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
   DEFAULT EXPORT
========================================================= */

const managementOrderAnalysisService = {
  getManagementOrderAnalysis,

  getHouseOrderAnalysis,

  getSteelMillOrderAnalysis,

  getSteelMillDetail,

  getGradeOrderDetail,

  downloadHouseOrderAnalysisPdf,

  downloadSteelMillOrderAnalysisPdf,

  getCurrentAnalysisMonth,

  formatOrderKG,

  formatKG,

  formatAnalysisNumber,

  formatAnalysisDate,
};


export default
  managementOrderAnalysisService;