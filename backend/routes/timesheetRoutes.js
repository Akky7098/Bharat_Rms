const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const timesheetController = require("../controller/timesheetController");

router.post("/create", authMiddleware, timesheetController.createTimesheet);
router.get("/", authMiddleware, timesheetController.getTimesheets);
module.exports = router;