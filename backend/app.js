const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const coldCallRoutes = require("./routes/coldCallRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const whatsappApprovalRoutes = require("./routes/whatsappApprovalRoutes");
const whatsappStatusRoutes = require("./routes/whatsappStatusRoutes");
const documentRoutes = require("./routes/documentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const receivableRoutes = require("./routes/receivableRoutes");
const pushSubscriptionRoutes = require("./routes/pushSubscriptionRoutes");
const appPushRoutes = require("./routes/appPushRoutes");
const mtcRoutes = require("./routes/mtcRoutes");
const supportTicketRoutes = require("./routes/supportTicketRoutes");
const enquiryLookupRoutes = require("./routes/enquiryLookupRoutes");
const itSupportRoutes = require("./routes/itSupportRoutes");
const baileysStatusRoutes =
  require("./routes/baileysStatusRoutes");
const orderTrackingRoutes = require(
  "./routes/orderTrackingRoutes"
);

const bharatAiRoutes =
  require("./routes/bharatAiRoutes");

const app = express();

/* CORS */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors());

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

/* EXISTING UPLOADS - KEEP FOR OTHER MODULES */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* DOCUMENTS - PERSISTENT UPLOAD PATH */
const documentUploadDir =
  process.env.DOCUMENT_UPLOAD_DIR ||
  path.join(__dirname, "uploads", "documents");

app.use("/uploads/documents", express.static(documentUploadDir));

/* ENQUIRY SIZE PDF - PERSISTENT UPLOAD PATH */
const enquirySizePdfUploadDir =
  process.env.ENQUIRY_SIZE_PDF_UPLOAD_DIR ||
  path.join(__dirname, "uploads", "enquiry-size-pdf");

app.use("/uploads/enquiry-size-pdf", express.static(enquirySizePdfUploadDir));

/* DISPATCH ONLY - PERSISTENT UPLOAD PATH */
const dispatchUploadDir =
  process.env.DISPATCH_UPLOAD_DIR ||
  path.join(__dirname, "uploads", "dispatch");

app.use("/uploads/dispatch", express.static(dispatchUploadDir));

/* SUPPORT TICKET - PERSISTENT UPLOAD PATH */
app.use(
  "/uploads/support",
  express.static(
    process.env.SUPPORT_UPLOAD_DIR ||
      path.join(__dirname, "uploads", "support")
  )
);

/* SALES ORDER PDF */
app.use(
  "/uploads/sales-orders",
  express.static(
    process.env.PDF_STORAGE_PATH ||
      path.join(__dirname, "uploads", "sales-orders")
  )
);


/* ORDER TRACKING FILES */
const orderTrackingUploadDir =
  process.env.ORDER_TRACKING_UPLOAD_PATH ||
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
        const extension = path
          .extname(filePath)
          .toLowerCase();

        if (
          extension === ".webm"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/webm"
          );
        } else if (
          extension === ".m4a"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mp4"
          );
        } else if (
          extension === ".ogg"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/ogg"
          );
        } else if (
          extension === ".mp3"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mpeg"
          );
        } else if (
          extension === ".wav"
        ) {
          res.setHeader(
            "Content-Type",
            "audio/wav"
          );
        }

        /*
         * Browser audio players use byte-range
         * requests for seeking and metadata.
         */
        res.setHeader(
          "Accept-Ranges",
          "bytes"
        );

        /*
         * Audio messages can be cached because
         * filenames are unique.
         */
        res.setHeader(
          "Cache-Control",
          "public, max-age=31536000, immutable"
        );
      },
    }
  )
);


/* MTC PDF - PERSISTENT UPLOAD PATH */
app.use(
  "/uploads/mtc",
  express.static(
    process.env.MTC_PDF_STORAGE_PATH ||
      path.join(__dirname, "uploads", "mtc")
  )
);

/* CUSTOMER PO */
app.use(
  "/uploads/customer-po",
  express.static(
    process.env.CUSTOMER_PO_STORAGE_PATH ||
      path.join(__dirname, "uploads", "customer-po")
  )
);

/* FEASIBILITY REPORT */
app.use(
  "/uploads/feasibility-report",
  express.static(
    process.env.FEASIBILITY_REPORT_STORAGE_PATH ||
      path.join(__dirname, "uploads", "feasibility-report")
  )
);
/* IT SUPPORT - PERSISTENT UPLOAD PATH */
app.use(
  "/uploads/it-support",
  express.static(
    process.env.IT_SUPPORT_UPLOAD_DIR ||
      path.join(__dirname, "uploads", "it-support")
  )
);

/* LOGO */
app.use("/logo.png", express.static(path.join(__dirname, "public/logo.png")));

app.get("/api/cors-test", (req, res) => {
  res.json({ message: "cors working" });
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/sales-order", salesOrderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cold-call", coldCallRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/whatsapp-approval", whatsappApprovalRoutes);
app.use("/api/whatsapp", whatsappStatusRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/receivables", receivableRoutes);
app.use("/api/push-subscriptions", pushSubscriptionRoutes);
app.use("/api/app-push", appPushRoutes);
app.use("/api/support-tickets", supportTicketRoutes);
app.use("/api/mtc", mtcRoutes);
app.use("/api/enquiry-lookup", enquiryLookupRoutes);
app.use("/api/it-support", itSupportRoutes);
app.use(
  "/api/baileys",
  baileysStatusRoutes
);
app.use(
  "/api/order-tracking",
  orderTrackingRoutes
);
app.use(
  "/api/bharat-ai",
  bharatAiRoutes
);


module.exports = app;