const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDirectory =
  process.env.CUSTOMER_PO_STORAGE_PATH ||
  path.join(__dirname, "..", "uploads", "customer-po");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `PO-${Date.now()}-${safeName}`);
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