const express = require("express");
const cors = require("cors");
const path = require("path");

/* =========================================================
   ROUTES
========================================================= */

const authRoutes =
  require("./routes/authRoutes");

const enquiryRoutes =
  require("./routes/enquiryRoutes");

const salesOrderRoutes =
  require("./routes/salesOrderRoutes");

const userRoutes =
  require("./routes/userRoutes");

const dashboardRoutes =
  require("./routes/dashboardRoutes");

const coldCallRoutes =
  require("./routes/coldCallRoutes");

const timesheetRoutes =
  require("./routes/timesheetRoutes");

const notificationRoutes =
  require("./routes/notificationRoutes");

const dispatchRoutes =
  require("./routes/dispatchRoutes");

const whatsappApprovalRoutes =
  require("./routes/whatsappApprovalRoutes");

const whatsappStatusRoutes =
  require("./routes/whatsappStatusRoutes");

const documentRoutes =
  require("./routes/documentRoutes");

const attendanceRoutes =
  require("./routes/attendanceRoutes");

const receivableRoutes =
  require("./routes/receivableRoutes");

const pushSubscriptionRoutes =
  require("./routes/pushSubscriptionRoutes");

const appPushRoutes =
  require("./routes/appPushRoutes");

const mtcRoutes =
  require("./routes/mtcRoutes");

const supportTicketRoutes =
  require("./routes/supportTicketRoutes");

const enquiryLookupRoutes =
  require("./routes/enquiryLookupRoutes");

const itSupportRoutes =
  require("./routes/itSupportRoutes");

const baileysStatusRoutes =
  require("./routes/baileysStatusRoutes");

const orderTrackingRoutes =
  require("./routes/orderTrackingRoutes");

const bharatAiRoutes =
  require("./routes/bharatAiRoutes");

  const customerOrderTrackingRoutes =
  require(
    "./routes/customerOrderTrackingRoutes"
  );

  const customerOrderTrackingPageRoutes =
  require(
    "./routes/customerOrderTrackingPageRoutes"
  );

/* =========================================================
   APP
========================================================= */

const app = express();

/* =========================================================
   TRUST PROXY

   Production is behind Hostinger / reverse proxy.

   This allows Express to correctly understand forwarded
   protocol/IP information.

   It does NOT change existing route behavior.
========================================================= */

app.set(
  "trust proxy",
  1
);

/* =========================================================
   CORS
========================================================= */

app.use(
  (
    req,
    res,
    next
  ) => {
    res.header(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (
      req.method ===
      "OPTIONS"
    ) {
      return res.sendStatus(
        204
      );
    }

    return next();
  }
);

app.use(
  cors()
);

/* =========================================================
   REQUEST BODY PARSING

   IMPORTANT:

   Do NOT add bodyParser.json() here.

   Express already contains JSON and URL encoded parsers.

   Having both express.json() and bodyParser.json() is
   unnecessary and can make request parsing/debugging harder.

   5 MB leaves room for normal RMS requests while still
   preventing unlimited JSON payloads.

   Actual file uploads handled through multer/etc. are not
   affected by this JSON size limit.
========================================================= */

app.use(
  express.json({
    limit: "5mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  })
);

/* =========================================================
   JSON PARSING ERROR HANDLER

   This must be AFTER express.json() and BEFORE routes.

   Without this, malformed JSON can produce Express's
   default HTML:

   <pre>Bad Request</pre>

   APIs should always return JSON instead.
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
        SyntaxError &&
      error.status ===
        400 &&
      Object.prototype
        .hasOwnProperty.call(
          error,
          "body"
        )
    ) {
      console.error(
        "INVALID JSON REQUEST =>",
        {
          method:
            req.method,

          url:
            req.originalUrl,

          contentType:
            req.headers[
              "content-type"
            ],

          message:
            error.message,
        }
      );

      return res
        .status(400)
        .json({
          success: false,

          code:
            "INVALID_JSON",

          message:
            "Invalid request body.",
        });
    }

    return next(
      error
    );
  }
);

/* =========================================================
   EXISTING UPLOADS

   KEEP FOR OTHER MODULES
========================================================= */

app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);

/* =========================================================
   DOCUMENTS - PERSISTENT UPLOAD PATH
========================================================= */

const documentUploadDir =
  process.env
    .DOCUMENT_UPLOAD_DIR ||
  path.join(
    __dirname,
    "uploads",
    "documents"
  );

app.use(
  "/uploads/documents",
  express.static(
    documentUploadDir
  )
);

/* =========================================================
   ENQUIRY SIZE PDF - PERSISTENT UPLOAD PATH
========================================================= */

const enquirySizePdfUploadDir =
  process.env
    .ENQUIRY_SIZE_PDF_UPLOAD_DIR ||
  path.join(
    __dirname,
    "uploads",
    "enquiry-size-pdf"
  );

app.use(
  "/uploads/enquiry-size-pdf",
  express.static(
    enquirySizePdfUploadDir
  )
);

/* =========================================================
   DISPATCH - PERSISTENT UPLOAD PATH
========================================================= */

const dispatchUploadDir =
  process.env
    .DISPATCH_UPLOAD_DIR ||
  path.join(
    __dirname,
    "uploads",
    "dispatch"
  );

app.use(
  "/uploads/dispatch",
  express.static(
    dispatchUploadDir
  )
);

/* =========================================================
   SUPPORT TICKET - PERSISTENT UPLOAD PATH
========================================================= */

app.use(
  "/uploads/support",
  express.static(
    process.env
      .SUPPORT_UPLOAD_DIR ||
      path.join(
        __dirname,
        "uploads",
        "support"
      )
  )
);

/* =========================================================
   SALES ORDER PDF
========================================================= */

app.use(
  "/uploads/sales-orders",
  express.static(
    process.env
      .PDF_STORAGE_PATH ||
      path.join(
        __dirname,
        "uploads",
        "sales-orders"
      )
  )
);

/* =========================================================
   ORDER TRACKING FILES
========================================================= */

const orderTrackingUploadDir =
  process.env
    .ORDER_TRACKING_UPLOAD_PATH ||
  path.join(
    process.cwd(),
    "uploads",
    "order-tracking"
  );

app.use(
  "/uploads/order-tracking",

  express.static(
    orderTrackingUploadDir,
    {
      fallthrough: false,

      setHeaders: (
        res,
        filePath
      ) => {
        const extension =
          path
            .extname(
              filePath
            )
            .toLowerCase();

        if (
          extension ===
          ".webm"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/webm"
          );
        } else if (
          extension ===
          ".m4a"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mp4"
          );
        } else if (
          extension ===
          ".ogg"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/ogg"
          );
        } else if (
          extension ===
          ".mp3"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mpeg"
          );
        } else if (
          extension ===
          ".wav"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/wav"
          );
        }

        /*
         * Browser audio players use byte-range requests
         * for seeking and metadata.
         */

        res.setHeader(
          "Accept-Ranges",
          "bytes"
        );

        /*
         * Audio filenames are unique, so they may be
         * cached aggressively.
         */

        res.setHeader(
          "Cache-Control",
          "public, max-age=31536000, immutable"
        );
      },
    }
  )
);

/* =========================================================
   MTC PDF - PERSISTENT UPLOAD PATH
========================================================= */

app.use(
  "/uploads/mtc",
  express.static(
    process.env
      .MTC_PDF_STORAGE_PATH ||
      path.join(
        __dirname,
        "uploads",
        "mtc"
      )
  )
);

/* =========================================================
   CUSTOMER PO
========================================================= */

app.use(
  "/uploads/customer-po",
  express.static(
    process.env
      .CUSTOMER_PO_STORAGE_PATH ||
      path.join(
        __dirname,
        "uploads",
        "customer-po"
      )
  )
);

/* =========================================================
   FEASIBILITY REPORT
========================================================= */

app.use(
  "/uploads/feasibility-report",
  express.static(
    process.env
      .FEASIBILITY_REPORT_STORAGE_PATH ||
      path.join(
        __dirname,
        "uploads",
        "feasibility-report"
      )
  )
);

/* =========================================================
   IT SUPPORT - PERSISTENT UPLOAD PATH
========================================================= */

app.use(
  "/uploads/it-support",
  express.static(
    process.env
      .IT_SUPPORT_UPLOAD_DIR ||
      path.join(
        __dirname,
        "uploads",
        "it-support"
      )
  )
);

/* =========================================================
   LOGO
========================================================= */

app.use(
  "/logo.png",
  express.static(
    path.join(
      __dirname,
      "public",
      "logo.png"
    )
  )
);

/* =========================================================
   CORS / API HEALTH TEST
========================================================= */

app.get(
  "/api/cors-test",
  (
    req,
    res
  ) => {
    return res.json({
      success: true,
      message:
        "cors working",
    });
  }
);

/* =========================================================
   VIEW ENGINE
========================================================= */

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(
    __dirname,
    "views"
  )
);

/* =========================================================
   API ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/enquiry",
  enquiryRoutes
);

app.use(
  "/api/sales-order",
  salesOrderRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/cold-call",
  coldCallRoutes
);

app.use(
  "/api/timesheet",
  timesheetRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/dispatch",
  dispatchRoutes
);

app.use(
  "/api/whatsapp-approval",
  whatsappApprovalRoutes
);

app.use(
  "/api/whatsapp",
  whatsappStatusRoutes
);

app.use(
  "/api/documents",
  documentRoutes
);

app.use(
  "/api/attendance",
  attendanceRoutes
);

app.use(
  "/api/receivables",
  receivableRoutes
);

app.use(
  "/api/push-subscriptions",
  pushSubscriptionRoutes
);

app.use(
  "/api/app-push",
  appPushRoutes
);

app.use(
  "/api/support-tickets",
  supportTicketRoutes
);

app.use(
  "/api/mtc",
  mtcRoutes
);

app.use(
  "/api/enquiry-lookup",
  enquiryLookupRoutes
);

app.use(
  "/api/it-support",
  itSupportRoutes
);

app.use(
  "/api/baileys",
  baileysStatusRoutes
);

app.use(
  "/api/order-tracking",
  orderTrackingRoutes
);


app.use(
  "/api/customer-order-tracking",

  customerOrderTrackingRoutes
);


app.use(
  "/track-order",

  customerOrderTrackingPageRoutes
);

/* =========================================================
   BHARAT INTELLIGENCE

   Keep the same production endpoint:

   POST /api/bharat-ai/chat
   GET  /api/bharat-ai/me
========================================================= */

app.use(
  "/api/bharat-ai",
  bharatAiRoutes
);

app.use(
  "/api/customer-order-tracking",

  customerOrderTrackingRoutes
);

/* =========================================================
   API 404

   IMPORTANT:
   Unknown API routes should return JSON rather than an
   Express HTML error page.

   This must remain AFTER all API routes.
========================================================= */

app.use(
  "/api",
  (
    req,
    res
  ) => {
    return res
      .status(404)
      .json({
        success: false,

        code:
          "API_ROUTE_NOT_FOUND",

        message:
          "API endpoint not found.",
      });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER

   IMPORTANT:
   Must be the LAST middleware in app.js.

   This ensures unexpected Express/API errors are returned
   as JSON rather than generic HTML pages.
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "BHARAT RMS REQUEST ERROR =>",
      {
        method:
          req.method,

        url:
          req.originalUrl,

        name:
          error?.name,

        message:
          error?.message,

        status:
          error?.status ||
          error?.statusCode,
      }
    );

    /*
     * If another middleware has already started sending
     * the response, delegate to Express.
     */

    if (
      res.headersSent
    ) {
      return next(
        error
      );
    }

    /* =====================================================
       PAYLOAD TOO LARGE
    ===================================================== */

    if (
      error?.type ===
        "entity.too.large" ||
      error?.status ===
        413
    ) {
      return res
        .status(413)
        .json({
          success: false,

          code:
            "PAYLOAD_TOO_LARGE",

          message:
            "Request is too large.",
        });
    }

    /* =====================================================
       INVALID JSON FALLBACK
    ===================================================== */

    if (
      error instanceof
        SyntaxError &&
      error?.status ===
        400
    ) {
      return res
        .status(400)
        .json({
          success: false,

          code:
            "INVALID_JSON",

          message:
            "Invalid request body.",
        });
    }

    /* =====================================================
       STATUS
    ===================================================== */

    const statusCode =
      Number(
        error?.statusCode ||
        error?.status ||
        500
      );

    /*
     * Do not expose internal exception details for
     * unexpected production errors.
     */

    const safeMessage =
      statusCode >= 500
        ? "Internal server error."
        : error?.message ||
          "Request failed.";

    return res
      .status(
        statusCode
      )
      .json({
        success: false,

        code:
          error?.code ||
          "REQUEST_FAILED",

        message:
          safeMessage,
      });
  }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = app;