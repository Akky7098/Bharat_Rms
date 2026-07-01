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

/* DISPATCH ONLY - PERSISTENT UPLOAD PATH */
const dispatchUploadDir =
  process.env.DISPATCH_UPLOAD_DIR ||
  path.join(__dirname, "uploads", "dispatch");

app.use("/uploads/dispatch", express.static(dispatchUploadDir));

/* SALES ORDER PDF */
app.use(
  "/uploads/sales-orders",
  express.static(
    process.env.PDF_STORAGE_PATH ||
      path.join(__dirname, "uploads", "sales-orders")
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

/* MTC ROUTES */
app.use("/api/mtc", mtcRoutes);

module.exports = app;