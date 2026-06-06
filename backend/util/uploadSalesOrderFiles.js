const multer = require("multer");
const fs = require("fs");
const path = require("path");

const customerPoDirectory =
  process.env.CUSTOMER_PO_STORAGE_PATH ||
  path.join(__dirname, "..", "uploads", "customer-po");

const feasibilityReportDirectory =
  process.env.FEASIBILITY_REPORT_STORAGE_PATH ||
  path.join(__dirname, "..", "uploads", "feasibility-report");

[customerPoDirectory, feasibilityReportDirectory].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "feasibilityReportFile") {
      return cb(null, feasibilityReportDirectory);
    }

    return cb(null, customerPoDirectory);
  },

  filename: function (req, file, cb) {
    const safeOriginalName = path
      .parse(file.originalname)
      .name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "-");

    const extension = path.extname(file.originalname);

    const prefix =
      file.fieldname === "feasibilityReportFile"
        ? "FEASIBILITY"
        : "PO";

    const uniqueId = [
      prefix,
      Date.now(),
      Math.random().toString(36).slice(2, 10),
      process.pid,
    ].join("-");

    cb(null, `${uniqueId}-${safeOriginalName}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF file is allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
});