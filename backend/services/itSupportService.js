const ITSupport = require("../model/ITSupport");
const User = require("../model/userModel");

const BASE_UPLOAD_URL = "/uploads/it-support";

const isAdminUser = (user) =>
  user && ["super_admin", "admin"].includes(user.role);

const buildAttachmentObjects = (files = [], user = null) => {
  return files.map((file) => ({
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileUrl: `${BASE_UPLOAD_URL}/${file.filename}`,
    mimeType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
    uploadedBy: user?._id,
    uploadedByName: user?.name,
  }));
};

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

const generateTicketNumber = async () => {
  const year = new Date().getFullYear();

  const lastTicket = await ITSupport.findOne({
    recordType: "ticket",
    ticketNumber: new RegExp(`^ITS-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("ticketNumber")
    .lean();

  let nextNumber = 1;

  if (lastTicket?.ticketNumber) {
    const lastNumber = Number(lastTicket.ticketNumber.split("-").pop());
    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `ITS-${year}-${String(nextNumber).padStart(6, "0")}`;
};

const createTicket = async ({ body, files, user, req }) => {
  const attachments = buildAttachmentObjects(files, user);
  const ticketNumber = await generateTicketNumber();

  const ticket = await ITSupport.create({
    recordType: "ticket",
    ticketNumber,
    title: body.title || body.subject,
    description: body.description || "",
    category: body.category || body.module || "other",
    priority: body.priority || "medium",
    status: "open",

    raisedBy: user._id,
    raisedByName: user.name,
    raisedByEmail: user.email,
    raisedByRole: user.role,

    createdBy: user._id,
    createdByName: user.name,

    attachments,

    deviceInfo: {
      browser: body.browser,
      os: body.os,
      deviceType: body.deviceType,
      screenResolution: body.screenResolution,
      currentUrl: body.currentUrl,
      userAgent: req.headers["user-agent"],
      ipAddress: getClientIp(req),
    },

    timeline: [
      {
        action: "created",
        message: `Ticket created by ${user.name}`,
        performedBy: user._id,
        performedByName: user.name,
      },
    ],
  });

  return ticket;
};

const getTickets = async ({ query, user }) => {
  const {
    status,
    priority,
    category,
    search,
    assignedTo,
    raisedBy,
    page = 1,
    limit = 20,
  } = query;

  const filter = {
    recordType: "ticket",
    isActive: true,
  };

  if (!isAdminUser(user)) {
    filter.raisedBy = user._id;
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  if (assignedTo && isAdminUser(user)) {
    filter.assignedTo = assignedTo;
  }

  if (raisedBy && isAdminUser(user)) {
    filter.raisedBy = raisedBy;
  }

  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
      { ticketNumber: new RegExp(search, "i") },
      { raisedByName: new RegExp(search, "i") },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [tickets, total] = await Promise.all([
    ITSupport.find(filter)
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ITSupport.countDocuments(filter),
  ]);

  return {
    tickets,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getTicketById = async ({ ticketId, user }) => {
  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  })
    .populate("raisedBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("messages.createdBy", "name email role");

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (!isAdminUser(user) && String(ticket.raisedBy?._id) !== String(user._id)) {
    const error = new Error("You are not allowed to view this ticket");
    error.statusCode = 403;
    throw error;
  }

  return ticket;
};

const addTicketMessage = async ({ ticketId, body, files, user }) => {
  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  if (!isAdminUser(user) && String(ticket.raisedBy) !== String(user._id)) {
    const error = new Error("You are not allowed to reply on this ticket");
    error.statusCode = 403;
    throw error;
  }

  const attachments = buildAttachmentObjects(files, user);

  const messageType =
    isAdminUser(user) && body.messageType === "internal_note"
      ? "internal_note"
      : isAdminUser(user)
      ? "it_reply"
      : "user_message";

  ticket.messages.push({
    message: body.message || "",
    messageType,
    attachments,
    createdBy: user._id,
    createdByName: user.name,
    createdByRole: user.role,
  });

  ticket.timeline.push({
    action: "message_added",
    message: `Message added by ${user.name}`,
    performedBy: user._id,
    performedByName: user.name,
  });

  ticket.updatedBy = user._id;
  ticket.updatedByName = user.name;

  await ticket.save();
  return ticket;
};

const updateTicketStatus = async ({ ticketId, body, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can update ticket status");
    error.statusCode = 403;
    throw error;
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  const oldStatus = ticket.status;
  const newStatus = body.status;

  ticket.status = newStatus;
  ticket.updatedBy = user._id;
  ticket.updatedByName = user.name;

  if (newStatus === "resolved") {
    ticket.resolution = {
      rootCause: body.rootCause || "",
      actionTaken: body.actionTaken || "",
      preventiveAction: body.preventiveAction || "",
      resolvedBy: user._id,
      resolvedByName: user.name,
      resolvedAt: new Date(),
    };

    ticket.timeline.push({
      action: "resolved",
      message: "Ticket resolved",
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: user._id,
      performedByName: user.name,
    });
  } else if (newStatus === "closed") {
    ticket.closedAt = new Date();

    ticket.timeline.push({
      action: "closed",
      message: "Ticket closed",
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: user._id,
      performedByName: user.name,
    });
  } else {
    ticket.timeline.push({
      action: "status_changed",
      message: `Status changed from ${oldStatus} to ${newStatus}`,
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: user._id,
      performedByName: user.name,
    });
  }

  await ticket.save();
  return ticket;
};

const updateTicketDetails = async ({ ticketId, body, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can update ticket details");
    error.statusCode = 403;
    throw error;
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  const oldPriority = ticket.priority;

  if (body.title) ticket.title = body.title;
  if (body.description !== undefined) ticket.description = body.description;
  if (body.category) ticket.category = body.category;
  if (body.priority) ticket.priority = body.priority;

  ticket.updatedBy = user._id;
  ticket.updatedByName = user.name;

  ticket.timeline.push({
    action: body.priority && body.priority !== oldPriority
      ? "priority_changed"
      : "details_updated",
    message: "Ticket details updated",
    oldValue: oldPriority,
    newValue: ticket.priority,
    performedBy: user._id,
    performedByName: user.name,
  });

  await ticket.save();
  return ticket;
};

const reassignTicket = async ({ ticketId, body, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can assign ticket");
    error.statusCode = 403;
    throw error;
  }

  const assignee = await User.findById(body.assignedTo).select("name email role");

  if (!assignee) {
    const error = new Error("Assigned user not found");
    error.statusCode = 404;
    throw error;
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  ticket.assignedTo = assignee._id;
  ticket.assignedToName = assignee.name;
  ticket.status = ticket.status === "open" ? "assigned" : ticket.status;

  ticket.timeline.push({
    action: "assigned",
    message: `Ticket assigned to ${assignee.name}`,
    newValue: assignee.name,
    performedBy: user._id,
    performedByName: user.name,
  });

  ticket.updatedBy = user._id;
  ticket.updatedByName = user.name;

  await ticket.save();
  return ticket;
};

const deleteTicket = async ({ ticketId, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can delete ticket");
    error.statusCode = 403;
    throw error;
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }

  ticket.isActive = false;
  ticket.updatedBy = user._id;
  ticket.updatedByName = user.name;

  ticket.timeline.push({
    action: "deleted",
    message: "Ticket deleted",
    performedBy: user._id,
    performedByName: user.name,
  });

  await ticket.save();

  return { message: "Ticket deleted successfully" };
};

const getStats = async ({ user }) => {
  const filter = {
    recordType: "ticket",
    isActive: true,
  };

  if (!isAdminUser(user)) {
    filter.raisedBy = user._id;
  }

  const [
    total,
    open,
    inProgress,
    resolved,
    closed,
    critical,
    byCategory,
    byStatus,
  ] = await Promise.all([
    ITSupport.countDocuments(filter),
    ITSupport.countDocuments({ ...filter, status: "open" }),
    ITSupport.countDocuments({ ...filter, status: "in_progress" }),
    ITSupport.countDocuments({ ...filter, status: "resolved" }),
    ITSupport.countDocuments({ ...filter, status: "closed" }),
    ITSupport.countDocuments({ ...filter, priority: "critical" }),
    ITSupport.aggregate([
      { $match: filter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ITSupport.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    critical,
    byCategory,
    byStatus,
  };
};

const getAssignableUsers = async () => {
  return User.find({
    role: { $in: ["super_admin", "admin"] },
  })
    .select("name email role")
    .sort({ name: 1 })
    .lean();
};

const createContent = async ({ body, files, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can create content");
    error.statusCode = 403;
    throw error;
  }

  const recordType = body.recordType;

  if (!["faq", "guide", "announcement"].includes(recordType)) {
    const error = new Error("Invalid content type");
    error.statusCode = 400;
    throw error;
  }

  const content = await ITSupport.create({
    recordType,
    title: body.title,
    description: body.description || "",
    category: body.category || "general",
    status: body.status || "published",
    visibility: body.visibility || "all",
    attachments: buildAttachmentObjects(files, user),
    createdBy: user._id,
    createdByName: user.name,
    updatedBy: user._id,
    updatedByName: user.name,
  });

  return content;
};

const getContent = async ({ query, user }) => {
  const { recordType, category, search, status = "published" } = query;

  const filter = {
    recordType: { $in: ["faq", "guide", "announcement"] },
    isActive: true,
  };

  if (recordType) filter.recordType = recordType;
  if (category) filter.category = category;

  if (!isAdminUser(user)) {
    filter.status = "published";
    filter.visibility = "all";
  } else if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  return ITSupport.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email role")
    .lean();
};

const updateContent = async ({ contentId, body, files, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can update content");
    error.statusCode = 403;
    throw error;
  }

  const content = await ITSupport.findOne({
    _id: contentId,
    recordType: { $in: ["faq", "guide", "announcement"] },
    isActive: true,
  });

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  if (body.title) content.title = body.title;
  if (body.description !== undefined) content.description = body.description;
  if (body.category) content.category = body.category;
  if (body.status) content.status = body.status;
  if (body.visibility) content.visibility = body.visibility;

  const newAttachments = buildAttachmentObjects(files, user);
  if (newAttachments.length) {
    content.attachments.push(...newAttachments);
  }

  content.updatedBy = user._id;
  content.updatedByName = user.name;

  await content.save();
  return content;
};

const deleteContent = async ({ contentId, user }) => {
  if (!isAdminUser(user)) {
    const error = new Error("Only admin or super admin can delete content");
    error.statusCode = 403;
    throw error;
  }

  const content = await ITSupport.findOne({
    _id: contentId,
    recordType: { $in: ["faq", "guide", "announcement"] },
    isActive: true,
  });

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  content.isActive = false;
  content.status = "archived";
  content.updatedBy = user._id;
  content.updatedByName = user.name;

  await content.save();

  return { message: "Content deleted successfully" };
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  addTicketMessage,
  updateTicketStatus,
  updateTicketDetails,
  reassignTicket,
  deleteTicket,
  getStats,
  getAssignableUsers,
  createContent,
  getContent,
  updateContent,
  deleteContent,
};