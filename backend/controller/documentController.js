const documentService = require("../services/documentService");

const parseData = (req) => {
  if (req.body.data) {
    return JSON.parse(req.body.data);
  }

  return req.body;
};

// ================= FOLDER CONTROLLERS =================

const createFolder = async (req, res) => {
  try {
    const body = parseData(req);

    const folder = await documentService.createFolder(body, req.user);

    return res.status(201).json({
      success: true,
      message: "Folder created successfully.",
      data: folder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllFolders = async (req, res) => {
  try {
    const folders = await documentService.getAllFolders(req.user);

    return res.status(200).json({
      success: true,
      message: "Folders fetched successfully.",
      data: folders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await documentService.deleteFolder(
      req.params.folderId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Folder deleted successfully.",
      data: folder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= DOCUMENT CONTROLLERS =================

const uploadDocument = async (req, res) => {
  try {
    const body = parseData(req);

    const document = await documentService.createDocument(
      body,
      req.file,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const documents = await documentService.getAllDocuments(
      req.user,
      req.query.folderId
    );

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(
      req.params.documentId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
      data: document,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await documentService.deleteDocument(
      req.params.documentId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      data: document,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFolder,
  getAllFolders,
  deleteFolder,
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
};