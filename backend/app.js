const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const coldCallRoutes = require("./routes/coldCallRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const app = express();
const path = require("path");
// OPEN CORS - temporary for testing
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors());

app.use(express.json());
app.use(bodyParser.json());

app.get("/api/cors-test", (req, res) => {
  res.json({ message: "cors working" });
});


app.use(
  "/uploads/sales-orders",
  express.static(
    process.env.PDF_STORAGE_PATH ||
      path.join(__dirname, "uploads", "sales-orders")
  )
);


app.use(
  "/logo.png",
  express.static(
    path.join(__dirname, "public/logo.png")
  )
);
app.use(
  "/uploads/customer-po",
  express.static(
    process.env.CUSTOMER_PO_STORAGE_PATH ||
      path.join(__dirname, "uploads", "customer-po")
  )
);
app.use("/api/auth", authRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/sales-order", salesOrderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cold-call", coldCallRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dispatch", dispatchRoutes);
module.exports = app;