const fs = require("fs");
const Document = require("../model/documentModel");
const DocumentFolder = require("../model/documentFolderModel");

const isAdminOrSuperAdmin = (user) => {
  return ["admin", "super_admin"].includes(user.role);
};

const getUserId = (user) => {
  return user._id || user.id;
};

const getFileUrl = (file) => {
  return `/uploads/documents/${file.filename}`;
};

// ================= FOLDER SERVICES =================

const createFolder = async (body, user) => {
  if (!isAdminOrSuperAdmin(user)) {
    throw new Error("Only admin and super admin can create folders.");
  }

  if (!body.name || !body.name.trim()) {
    throw new Error("Folder name is required.");
  }

  const folderName = body.name.trim();

  const existingFolder = await DocumentFolder.findOne({
    name: { $regex: `^${folderName}$`, $options: "i" },
    isActive: true,
  });

  if (existingFolder) {
    throw new Error("Folder with this name already exists.");
  }

  const folder = await DocumentFolder.create({
    name: folderName,
    createdBy: {
      userId: getUserId(user),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  return folder;
};
const getAllFolders = async () => {
  return await DocumentFolder.find({ isActive: true }).sort({
    createdAt: -1,
  });
};

const deleteFolder = async (folderId, user) => {
  if (!isAdminOrSuperAdmin(user)) {
    throw new Error("Only admin and super admin can delete folders.");
  }

  const folder = await DocumentFolder.findById(folderId);

  if (!folder || !folder.isActive) {
    throw new Error("Folder not found.");
  }

  folder.isActive = false;
  await folder.save();

  await Document.updateMany(
    { folderId, isActive: true },
    { $set: { isActive: false } }
  );

  return folder;
};

// ================= DOCUMENT SERVICES =================

const createDocument = async (body, file, user) => {
  if (!file) {
    throw new Error("Document file is required.");
  }

  try {
    if (!body.title) {
      throw new Error("Document title is required.");
    }

    if (!body.folderId) {
      throw new Error("Folder is required.");
    }

    const folder = await DocumentFolder.findOne({
      _id: body.folderId,
      isActive: true,
    });

    if (!folder) {
      throw new Error("Folder not found.");
    }

    let accessLevel = body.accessLevel || "private";

    if (!["private", "admin_only", "all_users"].includes(accessLevel)) {
      throw new Error("Invalid access level.");
    }

    if (!isAdminOrSuperAdmin(user)) {
      accessLevel = "private";
    }

    const document = await Document.create({
      folderId: body.folderId,
      title: body.title,
      description: body.description || "",
      accessLevel,
      fileName: file.filename,
      originalFileName: file.originalname,
      fileUrl: getFileUrl(file),
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: {
        userId: getUserId(user),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return document;
  } catch (error) {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw error;
  }
};

const getVisibleDocumentQuery = (user) => {
  const userId = getUserId(user);

  return {
    isActive: true,
    $or: [
      { accessLevel: "all_users" },
      { "uploadedBy.userId": userId },
      ...(isAdminOrSuperAdmin(user) ? [{ accessLevel: "admin_only" }] : []),
    ],
  };
};

const getAllDocuments = async (user, folderId) => {
  const query = getVisibleDocumentQuery(user);

  if (folderId) {
    query.folderId = folderId;
  }

  return await Document.find(query)
    .populate("folderId", "name description")
    .sort({ createdAt: -1 });
};

const getDocumentById = async (id, user) => {
  const query = getVisibleDocumentQuery(user);
  query._id = id;

  const document = await Document.findOne(query).populate(
    "folderId",
    "name description"
  );

  if (!document) {
    throw new Error("Document not found or access denied.");
  }

  return document;
};

const deleteDocument = async (id, user) => {
  const document = await Document.findById(id);

  if (!document || !document.isActive) {
    throw new Error("Document not found.");
  }

  const isUploader =
    String(document.uploadedBy.userId) === String(getUserId(user));

  if (!isUploader && !isAdminOrSuperAdmin(user)) {
    throw new Error("You are not allowed to delete this document.");
  }

  document.isActive = false;
  await document.save();

  return document;
};

module.exports = {
  createFolder,
  getAllFolders,
  deleteFolder,
  createDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
};