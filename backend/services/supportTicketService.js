const mongoose = require("mongoose");
const SupportTicket = require("../model/SupportTicket");
const User = require("../model/userModel");

const {
  sendTicketAssignedMailToEmployee,
  sendTicketMessageMail,
  sendTicketStatusChangedMail,
} = require("./supportTicketMailService");

const isAdminUser = (user) =>
  user?.role === "super_admin" || user?.role === "admin";

const assertObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}.`);
  }
};

const canViewTicket = (ticket, user) => {
  if (isAdminUser(user)) return true;

  return (
    String(ticket.assignedToId) === String(user._id) ||
    String(ticket.createdById) === String(user._id)
  );
};

const mapFiles = (files = []) =>
  files.map((file) => ({
    originalName: file.originalname,
    fileName: file.filename,
    fileUrl: `/uploads/support/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  }));

const getAssignableUsers = async () => {
  return User.find({})
    .select("_id name email role")
    .sort({ role: 1, name: 1 });
};

const createTicket = async (body = {}, user, files = []) => {
  const title = body.title;
  const description = body.description;
  const priority = body.priority || "medium";
  const assignedToId = body.assignedToId;
  const estimatedHours = 0;

  if (!title || !description || !body.dueDate || !assignedToId) {
    throw new Error(
      "Title, description, start date/time and assigned employee are required."
    );
  }

  assertObjectId(assignedToId, "assigned employee ID");

  const employee = await User.findById(assignedToId).select("name email role");

  if (!employee) {
    throw new Error("Assigned employee not found.");
  }

  const startDateTime = new Date(body.dueDate);

  const finalDueDate = new Date(body.dueDate);

  const attachments = mapFiles(files);

  const ticket = new SupportTicket({
    title,
    description,
    priority,
    dueDate: finalDueDate,
estimatedHours: 0,

    assignedToId: employee._id,
    assignedToName: employee.name,
    assignedToEmail: employee.email,

    createdById: user._id,
    createdByName: user.name,
    createdByRole: user.role,

    attachments,

    timeline: [
      {
        action: "ticket_created",
        message: `Ticket created by ${user.name} and assigned to ${employee.name}.`,
        performedById: user._id,
        performedByName: user.name,
        to: employee.name,
      },
      ...(attachments.length
        ? [
            {
              action: "attachments_uploaded",
              message: `${attachments.length} attachment(s) uploaded with ticket.`,
              performedById: user._id,
              performedByName: user.name,
            },
          ]
        : []),
    ],
  });

  await ticket.save();

  sendTicketAssignedMailToEmployee(ticket).catch((error) => {
    console.error("Support ticket assignment mail failed:", error.message);
  });

  return ticket;
};

const getTickets = async (query, user) => {
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    assignedToId,
    search,
    overdue,
    fromDate,
    toDate,
  } = query;

  const filter = {};

  if (!isAdminUser(user)) {
    filter.$or = [{ assignedToId: user._id }, { createdById: user._id }];
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  if (assignedToId && isAdminUser(user)) {
    assertObjectId(assignedToId, "assigned employee ID");
    filter.assignedToId = assignedToId;
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(`${fromDate}T00:00:00.000+05:30`);
    }

    if (toDate) {
      filter.createdAt.$lte = new Date(`${toDate}T23:59:59.999+05:30`);
    }
  }

  if (overdue === "true") {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ["completed", "closed"] };
  }

  if (search) {
    filter.$or = [
      ...(filter.$or || []),
      { ticketNumber: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { assignedToName: { $regex: search, $options: "i" } },
      { createdByName: { $regex: search, $options: "i" } },
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    SupportTicket.countDocuments(filter),
  ]);

  return {
    tickets,
    pagination: {
      currentPage: pageNumber,
      page: pageNumber,
      limit: limitNumber,
      totalRecords: total,
      total,
      totalPages: Math.ceil(total / limitNumber) || 1,
      pages: Math.ceil(total / limitNumber) || 1,
    },
  };
};

const getTicketById = async (ticketId, user) => {
  assertObjectId(ticketId, "ticket ID");

  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found.");
  }

  if (!canViewTicket(ticket, user)) {
    throw new Error("You are not allowed to view this ticket.");
  }

  return ticket;
};

const addTicketMessage = async (ticketId, body = {}, user, files = []) => {
  const message = body.message || "";
  const isInternalNote =
    body.isInternalNote === "true" || body.isInternalNote === true;

  const attachments = mapFiles(files);

  if (!message.trim() && attachments.length === 0) {
    throw new Error("Message or attachment is required.");
  }

  const ticket = await getTicketById(ticketId, user);

 const newMessage = {
  message: message.trim(),
  attachments,
  senderId: user._id,
  senderName: user.name,
  senderEmail: user.email,
  senderRole: user.role,
  isInternalNote: Boolean(isInternalNote),
};

  ticket.messages.push(newMessage);

  ticket.timeline.push({
    action: "message_added",
    message: `${user.name} added a comment${
      attachments.length ? ` with ${attachments.length} attachment(s)` : ""
    }.`,
    performedById: user._id,
    performedByName: user.name,
  });

  await ticket.save();

  const savedMessage = ticket.messages[ticket.messages.length - 1];

  sendTicketMessageMail({ ticket, message: savedMessage }).catch((error) => {
    console.error("Support ticket comment mail failed:", error.message);
  });

  return ticket;
};

const updateTicketStatus = async (ticketId, body, user) => {
  const { status, remark } = body;

  if (!status) {
    throw new Error("Status is required.");
  }

  const allowedStatus = ["open", "in_progress", "on_hold", "completed", "closed"];

  if (!allowedStatus.includes(status)) {
    throw new Error("Invalid ticket status.");
  }

  const ticket = await getTicketById(ticketId, user);
  const oldStatus = ticket.status;

  if (oldStatus === status) return ticket;

  ticket.status = status;

  if (status === "completed") ticket.completedAt = new Date();
  if (status === "closed") ticket.closedAt = new Date();

  ticket.timeline.push({
    action: "status_changed",
    message: remark || `Status changed from ${oldStatus} to ${status}.`,
    performedById: user._id,
    performedByName: user.name,
    from: oldStatus,
    to: status,
  });

  await ticket.save();

  sendTicketStatusChangedMail({
  ticket,
  oldStatus,
  changedBy: user.name,
  changedByEmail: user.email,
}).catch((error) => {
    console.error("Support ticket status mail failed:", error.message);
  });

  return ticket;
};

const updateTicketDetails = async (ticketId, body, user) => {
  const ticket = await getTicketById(ticketId, user);

  const allowedFields = ["title", "description", "priority", "dueDate", "estimatedHours"];

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      ticket[field] = body[field];
    }
  });

  ticket.timeline.push({
    action: "ticket_updated",
    message: `Ticket details updated by ${user.name}.`,
    performedById: user._id,
    performedByName: user.name,
  });

  await ticket.save();

  return ticket;
};

const reassignTicket = async (ticketId, body, user) => {
  const { assignedToId } = body;

  if (!assignedToId) {
    throw new Error("Assigned employee is required.");
  }

  assertObjectId(assignedToId, "assigned employee ID");

  const ticket = await getTicketById(ticketId, user);

  const employee = await User.findById(assignedToId).select("name email role");

  if (!employee) {
    throw new Error("Employee not found.");
  }

  const oldAssignedTo = ticket.assignedToName;

  ticket.assignedToId = employee._id;
  ticket.assignedToName = employee.name;
  ticket.assignedToEmail = employee.email;

  ticket.timeline.push({
    action: "ticket_reassigned",
    message: `Ticket reassigned from ${oldAssignedTo} to ${employee.name} by ${user.name}.`,
    performedById: user._id,
    performedByName: user.name,
    from: oldAssignedTo,
    to: employee.name,
  });

  await ticket.save();

  sendTicketAssignedMailToEmployee(ticket).catch((error) => {
    console.error("Support ticket reassignment mail failed:", error.message);
  });

  return ticket;
};

const getTicketStats = async (user) => {
  const baseFilter = {};

  if (!isAdminUser(user)) {
    baseFilter.$or = [{ assignedToId: user._id }, { createdById: user._id }];
  }

  const now = new Date();

  const [total, open, inProgress, completed, highPriority, overdue] =
    await Promise.all([
      SupportTicket.countDocuments(baseFilter),
      SupportTicket.countDocuments({ ...baseFilter, status: "open" }),
      SupportTicket.countDocuments({ ...baseFilter, status: "in_progress" }),
      SupportTicket.countDocuments({ ...baseFilter, status: "completed" }),
      SupportTicket.countDocuments({
        ...baseFilter,
        priority: { $in: ["high", "critical"] },
        status: { $nin: ["completed", "closed"] },
      }),
      SupportTicket.countDocuments({
        ...baseFilter,
        dueDate: { $lt: now },
        status: { $nin: ["completed", "closed"] },
      }),
    ]);

  return {
    total,
    open,
    inProgress,
    completed,
    highPriority,
    overdue,
  };
};

const deleteTicket = async (ticketId, user) => {
  if (user?.role !== "super_admin") {
    throw new Error("Only super admin can delete support tickets.");
  }

  assertObjectId(ticketId, "ticket ID");

  const ticket = await SupportTicket.findByIdAndDelete(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found.");
  }

  return ticket;
};

module.exports = {
  getAssignableUsers,
  createTicket,
  getTickets,
  getTicketById,
  addTicketMessage,
  updateTicketStatus,
  updateTicketDetails,
  reassignTicket,
  getTicketStats,
  deleteTicket,
};