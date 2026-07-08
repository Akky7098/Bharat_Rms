const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const itSupportController = require("../controller/itSupportController");
const authMiddleware = require("../util/auth");

const itSupportUploadDir =
  process.env.IT_SUPPORT_UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads", "it-support");

if (!fs.existsSync(itSupportUploadDir)) {
  fs.mkdirSync(itSupportUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, itSupportUploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Upload image, PDF, Excel, Word, video, or audio only."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authMiddleware);

/* Ticket APIs */
router.get("/stats", itSupportController.getStats);
router.get("/assignable-users", itSupportController.getAssignableUsers);

router.post(
  "/tickets",
  upload.array("attachments", 5),
  itSupportController.createTicket
);

router.get("/tickets", itSupportController.getTickets);
router.get("/tickets/:ticketId", itSupportController.getTicketById);

router.post(
  "/tickets/:ticketId/messages",
  upload.array("attachments", 5),
  itSupportController.addTicketMessage
);

router.patch("/tickets/:ticketId/status", itSupportController.updateTicketStatus);
router.patch("/tickets/:ticketId/details", itSupportController.updateTicketDetails);
router.patch("/tickets/:ticketId/reassign", itSupportController.reassignTicket);
router.delete("/tickets/:ticketId", itSupportController.deleteTicket);

/* FAQ / Guide / Announcement APIs */
router.post(
  "/content",
  upload.array("attachments", 5),
  itSupportController.createContent
);

router.get("/content", itSupportController.getContent);

router.patch(
  "/content/:contentId",
  upload.array("attachments", 5),
  itSupportController.updateContent
);

router.delete("/content/:contentId", itSupportController.deleteContent);

module.exports = router;