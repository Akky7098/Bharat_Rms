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

const app = express();

const FRONTEND_URL = "https://mediumaquamarine-eel-186314.hostingersite.com";

// CORS
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Manual preflight handling
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", FRONTEND_URL);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());
app.use(bodyParser.json());

// Test route
app.get("/api/cors-test", (req, res) => {
  res.json({ message: "cors working" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/sales-order", salesOrderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cold-call", coldCallRoutes);
app.use("/api/timesheet", timesheetRoutes);

module.exports = app;