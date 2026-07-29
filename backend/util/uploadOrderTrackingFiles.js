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
  image: path.join(
    ROOT_UPLOAD_PATH,
    "images"
  ),

  audio: path.join(
    ROOT_UPLOAD_PATH,
    "audio"
  ),

  video: path.join(
    ROOT_UPLOAD_PATH,
    "videos"
  ),

  document: path.join(
    ROOT_UPLOAD_PATH,
    "documents"
  ),

  other: path.join(
    ROOT_UPLOAD_PATH,
    "documents"
  ),
};

Object.values(
  DIRECTORY_MAP
).forEach((directory) => {
  fs.mkdirSync(directory, {
    recursive: true,
  });
});

const IMAGE_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const AUDIO_MIME_TYPES =
  new Set([
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

const VIDEO_MIME_TYPES =
  new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]);

const DOCUMENT_MIME_TYPES =
  new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ]);

/*
 * Browsers can provide:
 *
 * audio/webm;codecs=opus
 * audio/ogg;codecs=opus
 *
 * Multer normally strips codecs, but we should
 * not depend on that behaviour.
 */
const normalizeMimeType = (
  mimeType = ""
) =>
  String(mimeType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

const getFileTypeFromMime = (
  mimeType = ""
) => {
  const normalizedMime =
    normalizeMimeType(
      mimeType
    );

  if (
    IMAGE_MIME_TYPES.has(
      normalizedMime
    )
  ) {
    return "image";
  }

  if (
    AUDIO_MIME_TYPES.has(
      normalizedMime
    )
  ) {
    return "audio";
  }

  if (
    VIDEO_MIME_TYPES.has(
      normalizedMime
    )
  ) {
    return "video";
  }

  if (
    DOCUMENT_MIME_TYPES.has(
      normalizedMime
    )
  ) {
    return "document";
  }

  return "other";
};

const getExtensionFromMime = (
  mimeType = ""
) => {
  const normalizedMime =
    normalizeMimeType(
      mimeType
    );

  const extensionMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",

    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",

    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",

    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };

  return (
    extensionMap[
      normalizedMime
    ] || ""
  );
};

const getSafeExtension = (
  originalName = "",
  mimeType = ""
) => {
  const extension = path
    .extname(
      String(
        originalName || ""
      )
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9.]/g,
      ""
    );

  if (extension) {
    return extension;
  }

  return getExtensionFromMime(
    mimeType
  );
};

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      const fileType =
        getFileTypeFromMime(
          file.mimetype
        );

      callback(
        null,
        DIRECTORY_MAP[
          fileType
        ] ||
          DIRECTORY_MAP.other
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        getSafeExtension(
          file.originalname,
          file.mimetype
        );

      const uniquePart =
        crypto
          .randomBytes(12)
          .toString("hex");

      callback(
        null,
        [
          "order_tracking",
          Date.now(),
          uniquePart,
        ].join("_") +
          extension
      );
    },
  });

const fileFilter = (
  req,
  file,
  callback
) => {
  const fileType =
    getFileTypeFromMime(
      file.mimetype
    );

  if (fileType === "other") {
    const error =
      new Error(
        `Unsupported file type: ${file.mimetype}`
      );

    error.statusCode = 400;

    return callback(error);
  }

  return callback(null, true);
};

const uploadOrderTrackingFiles =
  multer({
    storage,

    fileFilter,

    limits: {
      files: 10,

      fileSize:
        50 * 1024 * 1024,
    },
  });

uploadOrderTrackingFiles
  .getFileTypeFromMime =
  getFileTypeFromMime;

uploadOrderTrackingFiles
  .normalizeMimeType =
  normalizeMimeType;

uploadOrderTrackingFiles
  .getRootUploadPath =
  () => ROOT_UPLOAD_PATH;

module.exports =
  uploadOrderTrackingFiles;