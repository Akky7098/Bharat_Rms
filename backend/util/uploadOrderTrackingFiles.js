const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const ROOT_UPLOAD_PATH =
  process.env.ORDER_TRACKING_UPLOAD_PATH ||
  path.join(
    process.cwd(),
    "uploads",
    "order-tracking"
  );

const DIRECTORY_MAP = {
  image: path.join(ROOT_UPLOAD_PATH, "images"),
  audio: path.join(ROOT_UPLOAD_PATH, "audio"),
  video: path.join(ROOT_UPLOAD_PATH, "videos"),
  document: path.join(
    ROOT_UPLOAD_PATH,
    "documents"
  ),
  other: path.join(ROOT_UPLOAD_PATH, "documents"),
};

Object.values(DIRECTORY_MAP).forEach((directory) => {
  fs.mkdirSync(directory, {
    recursive: true,
  });
});

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const getFileTypeFromMime = (mimeType = "") => {
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return "image";
  }

  if (AUDIO_MIME_TYPES.has(mimeType)) {
    return "audio";
  }

  if (VIDEO_MIME_TYPES.has(mimeType)) {
    return "video";
  }

  if (DOCUMENT_MIME_TYPES.has(mimeType)) {
    return "document";
  }

  return "other";
};

const getSafeExtension = (originalName = "") => {
  const extension = path
    .extname(originalName)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return extension || "";
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const fileType = getFileTypeFromMime(
      file.mimetype
    );

    callback(
      null,
      DIRECTORY_MAP[fileType] ||
        DIRECTORY_MAP.other
    );
  },

  filename: (req, file, callback) => {
    const extension = getSafeExtension(
      file.originalname
    );

    const uniquePart = crypto
      .randomBytes(12)
      .toString("hex");

    const timestamp = Date.now();

    callback(
      null,
      `order_tracking_${timestamp}_${uniquePart}${extension}`
    );
  },
});

const fileFilter = (req, file, callback) => {
  const fileType = getFileTypeFromMime(
    file.mimetype
  );

  if (fileType === "other") {
    const error = new Error(
      `Unsupported file type: ${file.mimetype}`
    );

    error.statusCode = 400;

    return callback(error);
  }

  return callback(null, true);
};

const uploadOrderTrackingFiles = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 50 * 1024 * 1024,
  },
});

uploadOrderTrackingFiles.getFileTypeFromMime =
  getFileTypeFromMime;

uploadOrderTrackingFiles.getRootUploadPath =
  () => ROOT_UPLOAD_PATH;

module.exports = uploadOrderTrackingFiles;
