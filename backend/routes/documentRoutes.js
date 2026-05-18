const express = require("express");
const router = express.Router();

const documentController = require("../controller/documentController");
const uploadDocument = require("../util/documentUpload");
const authMiddleware = require("../util/auth");
// Folder routes
router.post("/folders", authMiddleware, documentController.createFolder);

router.get("/folders", authMiddleware, documentController.getAllFolders);

router.delete(
  "/folders/:folderId",
  authMiddleware,
  documentController.deleteFolder
);

// Document routes
router.post(
  "/upload",
  authMiddleware,
  uploadDocument.single("file"),
  documentController.uploadDocument
);

router.get("/", authMiddleware, documentController.getAllDocuments);

router.get(
  "/:documentId",
  authMiddleware,
  documentController.getDocumentById
);

router.delete(
  "/:documentId",
  authMiddleware,
  documentController.deleteDocument
);

module.exports = router;