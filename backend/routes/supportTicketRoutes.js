const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const supportTicketController = require("../controller/supportTicketController");
const authMiddleware = require("../util/auth");

const supportUploadDir =
  process.env.SUPPORT_UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads", "support");

if (!fs.existsSync(supportUploadDir)) {
  fs.mkdirSync(supportUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, supportUploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authMiddleware);

router.get("/stats", supportTicketController.getTicketStats);
router.get("/assignable-users", supportTicketController.getAssignableUsers);

router.post(
  "/",
  upload.array("attachments", 5),
  supportTicketController.createTicket
);

router.get("/", supportTicketController.getTickets);
router.get("/:ticketId", supportTicketController.getTicketById);

router.post(
  "/:ticketId/messages",
  upload.array("attachments", 5),
  supportTicketController.addTicketMessage
);

router.patch("/:ticketId/status", supportTicketController.updateTicketStatus);
router.patch("/:ticketId/details", supportTicketController.updateTicketDetails);
router.patch("/:ticketId/reassign", supportTicketController.reassignTicket);

router.delete("/:ticketId", supportTicketController.deleteTicket);

module.exports = router;