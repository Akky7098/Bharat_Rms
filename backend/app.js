const express = require("express");
const bodyParser = require("body-parser")
const authRoutes = require("./routes/authRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const coldCallRoutes = require("./routes/coldCallRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const cors = require("cors")
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors())
app.use("/api/auth", authRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/sales-order", salesOrderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cold-call", coldCallRoutes);
app.use("/api/timesheet", timesheetRoutes);
module.exports = app;