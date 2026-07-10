const mongoose = require("mongoose");

const ITSupport = require("../model/ITSupport");
const User = require("../model/userModel");

const BASE_UPLOAD_URL = "/uploads/it-support";
const IT_SUPPORT_ACTION_URL = "/dashboard#it-support";

const VALID_TICKET_STATUSES = [
  "open",
  "acknowledged",
  "assigned",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
  "rejected",
];

const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

const VALID_CATEGORIES = [
  "attendance",
  "sales_order",
  "dispatch",
  "enquiry",
  "document",
  "receivable",
  "payment",
  "dashboard",
  "login",
  "mobile_app",
  "performance",
  "bug",
  "feature_request",
  "general",
  "other",
];

const VALID_CONTENT_TYPES = ["faq", "guide", "announcement"];
const VALID_CONTENT_STATUSES = ["published", "draft", "archived"];
const VALID_VISIBILITIES = ["all", "admin_only", "it_only"];

const CLOSED_TICKET_STATUSES = ["closed", "rejected"];

/* =====================================================
   OPTIONAL NOTIFICATION SERVICE

   A notification failure must never prevent a ticket
   operation from completing successfully.
===================================================== */

let notificationService = null;

try {
  notificationService = require("./notificationService");
} catch (error) {
  console.log(
    "IT SUPPORT NOTIFICATION SERVICE NOT LOADED =>",
    error.message
  );
}

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) {
      return null;
    }

    return await notificationService.createNotification(payload);
  } catch (error) {
    console.log(
      "IT SUPPORT NOTIFICATION ERROR =>",
      error.message
    );

    return null;
  }
};

/* =====================================================
   COMMON HELPERS
===================================================== */

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeRole = (role = "") => {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const isAdminUser = (user) => {
  const role = normalizeRole(user?.role);

  return ["super_admin", "admin"].includes(role);
};

const isSuperAdmin = (user) => {
  return normalizeRole(user?.role) === "super_admin";
};

const getUserId = (user) => {
  return user?._id || user?.id || null;
};

const cleanText = (value = "") => {
  return String(value || "").trim();
};

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeObjectIdArray = (values = []) => {
  const unique = new Map();

  values
    .filter(Boolean)
    .forEach((value) => {
      const actualValue = value?._id || value;

      if (!actualValue) return;

      unique.set(String(actualValue), actualValue);
    });

  return Array.from(unique.values());
};

const normalizeRoleArray = (roles = []) => {
  return Array.from(
    new Set(
      roles
        .filter(Boolean)
        .map((role) => normalizeRole(role))
    )
  );
};

const formatStatus = (status = "") => {
  return String(status || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const getNotificationPriority = (priority = "medium") => {
  switch (priority) {
    case "critical":
      return "urgent";

    case "high":
      return "high";

    case "low":
      return "low";

    default:
      return "medium";
  }
};

const getClientIp = (req) => {
  return (
    req?.headers?.["x-forwarded-for"]
      ?.split(",")[0]
      ?.trim() ||
    req?.socket?.remoteAddress ||
    req?.ip ||
    ""
  );
};

const buildAttachmentObjects = (
  files = [],
  user = null
) => {
  const userId = getUserId(user);

  return files.map((file) => ({
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileUrl: `${BASE_UPLOAD_URL}/${file.filename}`,
    mimeType: file.mimetype,
    fileSize: file.size || 0,
    uploadedAt: new Date(),
    uploadedBy: userId,
    uploadedByName: user?.name || "",
  }));
};

const buildTicketMeta = (ticket, extraMeta = {}) => {
  return {
    ticketId: ticket?._id,
    ticketNumber: ticket?.ticketNumber,
    ticketTitle: ticket?.title,
    category: ticket?.category,
    priority: ticket?.priority,
    status: ticket?.status,
    raisedById:
      ticket?.raisedBy?._id || ticket?.raisedBy,
    raisedByName: ticket?.raisedByName,
    assignedToId:
      ticket?.assignedTo?._id || ticket?.assignedTo,
    assignedToName: ticket?.assignedToName,
    ...extraMeta,
  };
};

/* =====================================================
   CENTRALIZED TICKET NOTIFICATION

   This uses the same notification payload shape as your
   Sales Order service.
===================================================== */

const notifyTicket = async ({
  ticket,
  event,
  title,
  message,
  createdBy,
  priority,
  targetUserIds = [],
  targetRoles = [],
  extraMeta = {},
}) => {
  if (!ticket?._id) return null;

  const safeTargetUserIds =
    normalizeObjectIdArray(targetUserIds);

  const safeTargetRoles =
    normalizeRoleArray(targetRoles);

  if (
    safeTargetUserIds.length === 0 &&
    safeTargetRoles.length === 0
  ) {
    return null;
  }

  return safeCreateNotification({
    module: "it_support",
    event,
    title,
    message,
    priority:
      priority ||
      getNotificationPriority(ticket.priority),
    targetUserIds: safeTargetUserIds,
    targetRoles: safeTargetRoles,
    createdBy: createdBy || null,
    referenceId: ticket._id,
    referenceModel: "ITSupport",
    actionUrl: IT_SUPPORT_ACTION_URL,
    meta: buildTicketMeta(ticket, extraMeta),
  });
};

const notifyPublishedAnnouncement = async ({
  content,
  user,
  event = "announcement_published",
}) => {
  if (
    content?.recordType !== "announcement" ||
    content?.status !== "published"
  ) {
    return null;
  }

  let targetRoles = [];

  if (content.visibility === "all") {
    targetRoles = ["user", "admin", "super_admin"];
  } else if (content.visibility === "admin_only") {
    targetRoles = ["admin", "super_admin"];
  } else {
    targetRoles = ["super_admin"];
  }

  return safeCreateNotification({
    module: "it_support",
    event,
    title: "New IT Announcement",
    message: content.title,
    priority: "high",
    targetRoles,
    createdBy: getUserId(user),
    referenceId: content._id,
    referenceModel: "ITSupport",
    actionUrl: IT_SUPPORT_ACTION_URL,
    meta: {
      contentId: content._id,
      recordType: content.recordType,
      title: content.title,
      category: content.category,
      visibility: content.visibility,
      status: content.status,
      createdByName: content.createdByName,
    },
  });
};

/* =====================================================
   DEFAULT IT ASSIGNEE

   Recommended .env:
   IT_SUPPORT_ASSIGNEE_EMAIL=ankit-email@example.com
===================================================== */

const findDefaultITAssignee = async () => {
  const configuredEmail = cleanText(
    process.env.IT_SUPPORT_ASSIGNEE_EMAIL
  ).toLowerCase();

  let assignee = null;

  if (configuredEmail) {
    assignee = await User.findOne({
      email: configuredEmail,
      role: "super_admin",
    })
      .select("_id name email role")
      .lean();
  }

  if (!assignee) {
    assignee = await User.findOne({
      role: "super_admin",
      name: {
        $regex: /^ankit\s+singh$/i,
      },
    })
      .select("_id name email role")
      .lean();
  }

  if (!assignee) {
    assignee = await User.findOne({
      role: "super_admin",
    })
      .sort({ createdAt: 1 })
      .select("_id name email role")
      .lean();
  }

  if (!assignee) {
    throw createServiceError(
      "Default IT support super admin was not found. Configure IT_SUPPORT_ASSIGNEE_EMAIL in .env.",
      500
    );
  }

  return assignee;
};

/* =====================================================
   TICKET NUMBER

   Retries protect against two tickets being created
   at nearly the same time.
===================================================== */

const generateTicketNumber = async () => {
  const year = new Date().getFullYear();

  const lastTicket = await ITSupport.findOne({
    recordType: "ticket",
    ticketNumber: {
      $regex: `^ITS-${year}-`,
    },
  })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .select("ticketNumber")
    .lean();

  let nextNumber = 1;

  if (lastTicket?.ticketNumber) {
    const lastNumber = Number(
      lastTicket.ticketNumber.split("-").pop()
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `ITS-${year}-${String(nextNumber).padStart(
    6,
    "0"
  )}`;
};

const createTicketWithRetry = async (
  ticketData,
  maxAttempts = 5
) => {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      const ticketNumber =
        await generateTicketNumber();

      return await ITSupport.create({
        ...ticketData,
        ticketNumber,
      });
    } catch (error) {
      lastError = error;

      const isDuplicateTicketNumber =
        error?.code === 11000 &&
        Boolean(error?.keyPattern?.ticketNumber);

      if (!isDuplicateTicketNumber) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    createServiceError(
      "Unable to generate ticket number",
      500
    )
  );
};

/* =====================================================
   ACCESS HELPERS
===================================================== */

const canAccessTicket = (ticket, user) => {
  if (isAdminUser(user)) return true;

  const userId = getUserId(user);
  const raisedById =
    ticket?.raisedBy?._id || ticket?.raisedBy;

  return String(raisedById) === String(userId);
};

const sanitizeTicketForUser = (ticketObject, user) => {
  if (!ticketObject) return ticketObject;
  if (isAdminUser(user)) return ticketObject;

  const plainTicket =
    typeof ticketObject.toObject === "function"
      ? ticketObject.toObject()
      : { ...ticketObject };

  plainTicket.messages = (
    plainTicket.messages || []
  ).filter(
    (message) =>
      message.messageType !== "internal_note"
  );

  return plainTicket;
};

/* =====================================================
   CREATE TICKET
===================================================== */

const createTicket = async ({
  body,
  files,
  user,
  req,
}) => {
  const userId = getUserId(user);

  if (!userId) {
    throw createServiceError(
      "Authenticated user was not found",
      401
    );
  }

  const title = cleanText(
    body.title || body.subject
  );

  const description = cleanText(body.description);

  const category = cleanText(
    body.category || body.module || "other"
  ).toLowerCase();

  const priority = cleanText(
    body.priority || "medium"
  ).toLowerCase();

  if (!title) {
    throw createServiceError(
      "Ticket title is required",
      400
    );
  }

  if (title.length < 5) {
    throw createServiceError(
      "Ticket title must contain at least 5 characters",
      400
    );
  }

  if (title.length > 180) {
    throw createServiceError(
      "Ticket title cannot exceed 180 characters",
      400
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw createServiceError(
      "Invalid ticket category",
      400
    );
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    throw createServiceError(
      "Invalid ticket priority",
      400
    );
  }

  const attachments = buildAttachmentObjects(
    files,
    user
  );

  if (!description && attachments.length === 0) {
    throw createServiceError(
      "Please provide issue description or upload an attachment",
      400
    );
  }

  const assignee = await findDefaultITAssignee();

  const ticket = await createTicketWithRetry({
    recordType: "ticket",

    title,
    description,
    category,
    priority,

    status: "assigned",

    raisedBy: userId,
    raisedByName: user.name,
    raisedByEmail: user.email,
    raisedByRole: normalizeRole(user.role),

    assignedTo: assignee._id,
    assignedToName: assignee.name,

    createdBy: userId,
    createdByName: user.name,

    updatedBy: userId,
    updatedByName: user.name,

    attachments,

    deviceInfo: {
      browser: cleanText(body.browser),
      os: cleanText(body.os),
      deviceType: cleanText(body.deviceType),
      screenResolution: cleanText(
        body.screenResolution
      ),
      currentUrl: cleanText(body.currentUrl),
      userAgent:
        req?.headers?.["user-agent"] || "",
      ipAddress: getClientIp(req),
    },

    timeline: [
      {
        action: "created",
        message: `Ticket created by ${user.name}`,
        performedBy: userId,
        performedByName: user.name,
      },
      {
        action: "assigned",
        message: `Ticket automatically assigned to ${assignee.name}`,
        newValue: assignee.name,
        performedBy: assignee._id,
        performedByName: assignee.name,
      },
    ],
  });

  /*
   * Notify IT management and assigned IT person.
   */
  await notifyTicket({
    ticket,
    event: "created",
    title: "New IT Support Ticket",
    message: `${user.name} raised ${ticket.ticketNumber}: ${ticket.title}`,
    priority: getNotificationPriority(priority),
    targetUserIds: [assignee._id],
    targetRoles: ["super_admin"],
    createdBy: userId,
    extraMeta: {
      source: "ticket_creation",
    },
  });

  /*
   * Notify creator that the ticket was recorded.
   */
  await notifyTicket({
    ticket,
    event: "ticket_received",
    title: "IT Ticket Submitted",
    message: `${ticket.ticketNumber} was submitted and assigned to ${assignee.name}.`,
    priority: "medium",
    targetUserIds: [userId],
    createdBy: userId,
    extraMeta: {
      assignedToName: assignee.name,
    },
  });

  return ticket;
};

/* =====================================================
   GET TICKETS
===================================================== */

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

  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    recordType: "ticket",
    isActive: true,
  };

  if (!isAdminUser(user)) {
    filter.raisedBy = new mongoose.Types.ObjectId(
      getUserId(user)
    );
  }

  if (status) {
    if (!VALID_TICKET_STATUSES.includes(status)) {
      throw createServiceError(
        "Invalid status filter",
        400
      );
    }

    filter.status = status;
  }

  if (priority) {
    if (!VALID_PRIORITIES.includes(priority)) {
      throw createServiceError(
        "Invalid priority filter",
        400
      );
    }

    filter.priority = priority;
  }

  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw createServiceError(
        "Invalid category filter",
        400
      );
    }

    filter.category = category;
  }

  if (
    assignedTo &&
    isAdminUser(user) &&
    mongoose.Types.ObjectId.isValid(assignedTo)
  ) {
    filter.assignedTo =
      new mongoose.Types.ObjectId(assignedTo);
  }

  if (
    raisedBy &&
    isAdminUser(user) &&
    mongoose.Types.ObjectId.isValid(raisedBy)
  ) {
    filter.raisedBy =
      new mongoose.Types.ObjectId(raisedBy);
  }

  if (cleanText(search)) {
    const safeSearch = escapeRegex(
      cleanText(search)
    );

    filter.$or = [
      {
        title: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        description: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        ticketNumber: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        raisedByName: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        assignedToName: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  const skip =
    (pageNumber - 1) * limitNumber;

  const [tickets, total] = await Promise.all([
    ITSupport.find(filter)
      .populate(
        "raisedBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    ITSupport.countDocuments(filter),
  ]);

  const safeTickets = tickets.map((ticket) =>
    sanitizeTicketForUser(ticket, user)
  );

  return {
    tickets: safeTickets,

    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.max(
        Math.ceil(total / limitNumber),
        1
      ),
    },
  };
};

/* =====================================================
   GET SINGLE TICKET
===================================================== */

const getTicketById = async ({
  ticketId,
  user,
}) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  })
    .populate(
      "raisedBy",
      "name email role"
    )
    .populate(
      "assignedTo",
      "name email role"
    )
    .populate(
      "messages.createdBy",
      "name email role"
    );

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  if (!canAccessTicket(ticket, user)) {
    throw createServiceError(
      "You are not allowed to view this ticket",
      403
    );
  }

  return sanitizeTicketForUser(ticket, user);
};

/* =====================================================
   ADD MESSAGE
===================================================== */

const addTicketMessage = async ({
  ticketId,
  body,
  files,
  user,
}) => {
  const userId = getUserId(user);

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  if (!canAccessTicket(ticket, user)) {
    throw createServiceError(
      "You are not allowed to reply on this ticket",
      403
    );
  }

  if (
    CLOSED_TICKET_STATUSES.includes(ticket.status)
  ) {
    throw createServiceError(
      `This ticket is ${formatStatus(
        ticket.status
      )} and cannot receive new messages.`,
      400
    );
  }

  const message = cleanText(body.message);
  const attachments = buildAttachmentObjects(
    files,
    user
  );

  if (!message && attachments.length === 0) {
    throw createServiceError(
      "Message or attachment is required",
      400
    );
  }

  const requestedInternalNote =
    body.messageType === "internal_note";

  if (
    requestedInternalNote &&
    !isAdminUser(user)
  ) {
    throw createServiceError(
      "Only admin or super admin can add an internal note",
      403
    );
  }

  const messageType = requestedInternalNote
    ? "internal_note"
    : isAdminUser(user)
    ? "it_reply"
    : "user_message";

  ticket.messages.push({
    message,
    messageType,
    attachments,
    createdBy: userId,
    createdByName: user.name,
    createdByRole: normalizeRole(user.role),
  });

  ticket.timeline.push({
    action: "message_added",
    message:
      messageType === "internal_note"
        ? `Internal note added by ${user.name}`
        : `Message added by ${user.name}`,
    performedBy: userId,
    performedByName: user.name,
  });

  ticket.updatedBy = userId;
  ticket.updatedByName = user.name;

  await ticket.save();

  const raisedById = ticket.raisedBy;
  const assignedToId = ticket.assignedTo;

  if (messageType === "internal_note") {
    /*
     * Internal note is never sent to the employee.
     */
    await notifyTicket({
      ticket,
      event: "internal_note_added",
      title: "Internal Note Added",
      message: `${user.name} added an internal note to ${ticket.ticketNumber}.`,
      priority: "medium",
      targetUserIds: [assignedToId],
      targetRoles: ["admin", "super_admin"],
      createdBy: userId,
      extraMeta: {
        messageType,
      },
    });
  } else if (isAdminUser(user)) {
    /*
     * IT reply: notify the ticket creator and management.
     */
    await notifyTicket({
      ticket,
      event: "it_reply",
      title: "New IT Support Reply",
      message: `${user.name} replied to ${ticket.ticketNumber}: ${ticket.title}`,
      priority: "medium",
      targetUserIds: [raisedById],
      targetRoles: ["super_admin"],
      createdBy: userId,
      extraMeta: {
        messageType,
        repliedBy: user.name,
      },
    });
  } else {
    /*
     * Employee reply: notify assigned IT and management.
     */
    await notifyTicket({
      ticket,
      event: "user_reply",
      title: "Employee Replied to IT Ticket",
      message: `${user.name} replied to ${ticket.ticketNumber}: ${ticket.title}`,
      priority: getNotificationPriority(
        ticket.priority
      ),
      targetUserIds: [assignedToId],
      targetRoles: ["super_admin"],
      createdBy: userId,
      extraMeta: {
        messageType,
        repliedBy: user.name,
      },
    });
  }

  return sanitizeTicketForUser(ticket, user);
};

/* =====================================================
   UPDATE STATUS
===================================================== */

const updateTicketStatus = async ({
  ticketId,
  body,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can update ticket status",
      403
    );
  }

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  const newStatus = cleanText(
    body.status
  ).toLowerCase();

  if (!VALID_TICKET_STATUSES.includes(newStatus)) {
    throw createServiceError(
      "Invalid ticket status",
      400
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  const oldStatus = ticket.status;

  if (oldStatus === newStatus) {
    return ticket;
  }

  const userId = getUserId(user);

  ticket.status = newStatus;
  ticket.updatedBy = userId;
  ticket.updatedByName = user.name;

  if (newStatus === "resolved") {
    const rootCause = cleanText(body.rootCause);
    const actionTaken = cleanText(
      body.actionTaken
    );

    if (!rootCause) {
      throw createServiceError(
        "Root cause is required before resolving ticket",
        400
      );
    }

    if (!actionTaken) {
      throw createServiceError(
        "Action taken is required before resolving ticket",
        400
      );
    }

    ticket.resolution = {
      rootCause,
      actionTaken,
      preventiveAction: cleanText(
        body.preventiveAction
      ),
      resolvedBy: userId,
      resolvedByName: user.name,
      resolvedAt: new Date(),
    };

    ticket.closedAt = null;

    ticket.timeline.push({
      action: "resolved",
      message: `Ticket resolved by ${user.name}`,
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: userId,
      performedByName: user.name,
    });
  } else if (newStatus === "closed") {
    ticket.closedAt = new Date();

    ticket.timeline.push({
      action: "closed",
      message: `Ticket closed by ${user.name}`,
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: userId,
      performedByName: user.name,
    });
  } else if (
    ["open", "acknowledged", "assigned", "in_progress"].includes(
      newStatus
    ) &&
    ["resolved", "closed", "rejected"].includes(
      oldStatus
    )
  ) {
    /*
     * Reopen workflow.
     */
    ticket.closedAt = null;

    ticket.timeline.push({
      action: "reopened",
      message: `Ticket reopened by ${user.name}`,
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: userId,
      performedByName: user.name,
    });
  } else {
    ticket.timeline.push({
      action: "status_changed",
      message: `Status changed from ${formatStatus(
        oldStatus
      )} to ${formatStatus(newStatus)}`,
      oldValue: oldStatus,
      newValue: newStatus,
      performedBy: userId,
      performedByName: user.name,
    });
  }

  await ticket.save();

  let notificationTitle =
    "IT Ticket Status Updated";

  let notificationPriority = "medium";

  if (newStatus === "resolved") {
    notificationTitle = "IT Ticket Resolved";
    notificationPriority = "high";
  } else if (newStatus === "closed") {
    notificationTitle = "IT Ticket Closed";
  } else if (newStatus === "rejected") {
    notificationTitle = "IT Ticket Rejected";
    notificationPriority = "high";
  } else if (newStatus === "in_progress") {
    notificationTitle =
      "IT Team Started Working on Ticket";
  } else if (newStatus === "waiting_user") {
    notificationTitle =
      "IT Ticket Waiting for Your Response";
    notificationPriority = "high";
  }

  await notifyTicket({
    ticket,
    event:
      newStatus === "resolved"
        ? "resolved"
        : newStatus === "closed"
        ? "closed"
        : newStatus === "rejected"
        ? "rejected"
        : "status_changed",
    title: notificationTitle,
    message: `${ticket.ticketNumber} status changed from ${formatStatus(
      oldStatus
    )} to ${formatStatus(newStatus)} by ${user.name}.`,
    priority: notificationPriority,
    targetUserIds: [
      ticket.raisedBy,
      ticket.assignedTo,
    ],
    targetRoles: ["super_admin"],
    createdBy: userId,
    extraMeta: {
      oldStatus,
      newStatus,
      statusChangedBy: user.name,
      rootCause:
        newStatus === "resolved"
          ? ticket.resolution?.rootCause
          : undefined,
      actionTaken:
        newStatus === "resolved"
          ? ticket.resolution?.actionTaken
          : undefined,
    },
  });

  return ticket;
};

/* =====================================================
   UPDATE TICKET DETAILS
===================================================== */

const updateTicketDetails = async ({
  ticketId,
  body,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can update ticket details",
      403
    );
  }

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  const oldPriority = ticket.priority;
  const oldCategory = ticket.category;
  const oldTitle = ticket.title;

  if (body.title !== undefined) {
    const title = cleanText(body.title);

    if (!title) {
      throw createServiceError(
        "Ticket title cannot be empty",
        400
      );
    }

    if (title.length > 180) {
      throw createServiceError(
        "Ticket title cannot exceed 180 characters",
        400
      );
    }

    ticket.title = title;
  }

  if (body.description !== undefined) {
    ticket.description = cleanText(
      body.description
    );
  }

  if (body.category !== undefined) {
    const category = cleanText(
      body.category
    ).toLowerCase();

    if (!VALID_CATEGORIES.includes(category)) {
      throw createServiceError(
        "Invalid ticket category",
        400
      );
    }

    ticket.category = category;
  }

  if (body.priority !== undefined) {
    const priority = cleanText(
      body.priority
    ).toLowerCase();

    if (!VALID_PRIORITIES.includes(priority)) {
      throw createServiceError(
        "Invalid ticket priority",
        400
      );
    }

    ticket.priority = priority;
  }

  const userId = getUserId(user);

  ticket.updatedBy = userId;
  ticket.updatedByName = user.name;

  const priorityChanged =
    oldPriority !== ticket.priority;

  ticket.timeline.push({
    action: priorityChanged
      ? "priority_changed"
      : "details_updated",
    message: priorityChanged
      ? `Priority changed from ${formatStatus(
          oldPriority
        )} to ${formatStatus(ticket.priority)}`
      : `Ticket details updated by ${user.name}`,
    oldValue: priorityChanged
      ? oldPriority
      : oldTitle,
    newValue: priorityChanged
      ? ticket.priority
      : ticket.title,
    performedBy: userId,
    performedByName: user.name,
  });

  await ticket.save();

  await notifyTicket({
    ticket,
    event: priorityChanged
      ? "priority_changed"
      : "details_updated",
    title: priorityChanged
      ? "IT Ticket Priority Updated"
      : "IT Ticket Details Updated",
    message: priorityChanged
      ? `${ticket.ticketNumber} priority changed from ${formatStatus(
          oldPriority
        )} to ${formatStatus(ticket.priority)} by ${user.name}.`
      : `${ticket.ticketNumber} details were updated by ${user.name}.`,
    priority: priorityChanged
      ? getNotificationPriority(ticket.priority)
      : "medium",
    targetUserIds: [
      ticket.raisedBy,
      ticket.assignedTo,
    ],
    targetRoles: ["super_admin"],
    createdBy: userId,
    extraMeta: {
      oldPriority,
      newPriority: ticket.priority,
      oldCategory,
      newCategory: ticket.category,
      oldTitle,
      newTitle: ticket.title,
    },
  });

  return ticket;
};

/* =====================================================
   REASSIGN TICKET
===================================================== */

const reassignTicket = async ({
  ticketId,
  body,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can assign ticket",
      403
    );
  }

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      body.assignedTo
    )
  ) {
    throw createServiceError(
      "Valid assigned user is required",
      400
    );
  }

  const assignee = await User.findOne({
    _id: body.assignedTo,
    role: {
      $in: ["super_admin", "admin"],
    },
  }).select("name email role");

  if (!assignee) {
    throw createServiceError(
      "Assigned IT user was not found",
      404
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  const oldAssignedTo = ticket.assignedTo;
  const oldAssignedToName =
    ticket.assignedToName || "Unassigned";

  ticket.assignedTo = assignee._id;
  ticket.assignedToName = assignee.name;

  if (ticket.status === "open") {
    ticket.status = "assigned";
  }

  const userId = getUserId(user);

  ticket.timeline.push({
    action: "assigned",
    message: `Ticket reassigned from ${oldAssignedToName} to ${assignee.name} by ${user.name}`,
    oldValue: oldAssignedToName,
    newValue: assignee.name,
    performedBy: userId,
    performedByName: user.name,
  });

  ticket.updatedBy = userId;
  ticket.updatedByName = user.name;

  await ticket.save();

  await notifyTicket({
    ticket,
    event: "assigned",
    title: "IT Ticket Assigned",
    message: `${ticket.ticketNumber} was assigned to ${assignee.name} by ${user.name}.`,
    priority: getNotificationPriority(
      ticket.priority
    ),
    targetUserIds: [
      assignee._id,
      ticket.raisedBy,
      oldAssignedTo,
    ],
    targetRoles: ["super_admin"],
    createdBy: userId,
    extraMeta: {
      oldAssignedTo,
      oldAssignedToName,
      newAssignedTo: assignee._id,
      newAssignedToName: assignee.name,
    },
  });

  return ticket;
};

/* =====================================================
   DELETE TICKET
===================================================== */

const deleteTicket = async ({
  ticketId,
  user,
}) => {
  /*
   * Restrict destructive deletion to super admin.
   */
  if (!isSuperAdmin(user)) {
    throw createServiceError(
      "Only super admin can delete IT support ticket",
      403
    );
  }

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createServiceError(
      "Invalid ticket ID",
      400
    );
  }

  const ticket = await ITSupport.findOne({
    _id: ticketId,
    recordType: "ticket",
    isActive: true,
  });

  if (!ticket) {
    throw createServiceError(
      "Ticket not found",
      404
    );
  }

  const userId = getUserId(user);

  ticket.isActive = false;
  ticket.updatedBy = userId;
  ticket.updatedByName = user.name;

  ticket.timeline.push({
    action: "deleted",
    message: `Ticket deleted by ${user.name}`,
    performedBy: userId,
    performedByName: user.name,
  });

  await ticket.save();

  await notifyTicket({
    ticket,
    event: "deleted",
    title: "IT Support Ticket Deleted",
    message: `${ticket.ticketNumber} was deleted by ${user.name}.`,
    priority: "urgent",
    targetUserIds: [
      ticket.raisedBy,
      ticket.assignedTo,
    ],
    targetRoles: ["super_admin"],
    createdBy: userId,
    extraMeta: {
      deletedBy: user.name,
    },
  });

  return {
    message: "Ticket deleted successfully",
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
  };
};

/* =====================================================
   STATS
===================================================== */

const getStats = async ({ user }) => {
  const filter = {
    recordType: "ticket",
    isActive: true,
  };

  if (!isAdminUser(user)) {
    filter.raisedBy =
      new mongoose.Types.ObjectId(
        getUserId(user)
      );
  }

  const [
    total,
    open,
    acknowledged,
    assigned,
    inProgress,
    waitingUser,
    resolved,
    closed,
    rejected,
    critical,
    byCategory,
    byStatus,
    byPriority,
  ] = await Promise.all([
    ITSupport.countDocuments(filter),

    ITSupport.countDocuments({
      ...filter,
      status: "open",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "acknowledged",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "assigned",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "in_progress",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "waiting_user",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "resolved",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "closed",
    }),

    ITSupport.countDocuments({
      ...filter,
      status: "rejected",
    }),

    ITSupport.countDocuments({
      ...filter,
      priority: "critical",
    }),

    ITSupport.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$category",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    ITSupport.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    ITSupport.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$priority",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),
  ]);

  return {
    total,
    open,
    acknowledged,
    assigned,
    inProgress,
    waitingUser,
    resolved,
    closed,
    rejected,
    critical,
    byCategory,
    byStatus,
    byPriority,
  };
};

/* =====================================================
   ASSIGNABLE USERS
===================================================== */

const getAssignableUsers = async () => {
  return User.find({
    role: {
      $in: ["super_admin", "admin"],
    },
  })
    .select("name email role")
    .sort({
      role: -1,
      name: 1,
    })
    .lean();
};

/* =====================================================
   CREATE FAQ / GUIDE / ANNOUNCEMENT
===================================================== */

const createContent = async ({
  body,
  files,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can create content",
      403
    );
  }

  const recordType = cleanText(
    body.recordType
  ).toLowerCase();

  const title = cleanText(body.title);
  const description = cleanText(
    body.description
  );

  const category = cleanText(
    body.category || "general"
  ).toLowerCase();

  const status = cleanText(
    body.status || "published"
  ).toLowerCase();

  const visibility = cleanText(
    body.visibility || "all"
  ).toLowerCase();

  if (!VALID_CONTENT_TYPES.includes(recordType)) {
    throw createServiceError(
      "Invalid content type",
      400
    );
  }

  if (!title) {
    throw createServiceError(
      "Content title is required",
      400
    );
  }

  if (title.length > 180) {
    throw createServiceError(
      "Content title cannot exceed 180 characters",
      400
    );
  }

  if (!description) {
    throw createServiceError(
      "Content description is required",
      400
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw createServiceError(
      "Invalid content category",
      400
    );
  }

  if (!VALID_CONTENT_STATUSES.includes(status)) {
    throw createServiceError(
      "Invalid content status",
      400
    );
  }

  if (!VALID_VISIBILITIES.includes(visibility)) {
    throw createServiceError(
      "Invalid content visibility",
      400
    );
  }

  const userId = getUserId(user);

  const content = await ITSupport.create({
    recordType,
    title,
    description,
    category,
    status,
    visibility,

    attachments: buildAttachmentObjects(
      files,
      user
    ),

    createdBy: userId,
    createdByName: user.name,

    updatedBy: userId,
    updatedByName: user.name,
  });

  await notifyPublishedAnnouncement({
    content,
    user,
    event: "announcement_published",
  });

  return content;
};

/* =====================================================
   GET CONTENT
===================================================== */

const getContent = async ({ query, user }) => {
  const {
    recordType,
    category,
    search,
    status,
    visibility,
  } = query;

  const filter = {
    recordType: {
      $in: VALID_CONTENT_TYPES,
    },
    isActive: true,
  };

  if (recordType) {
    if (
      !VALID_CONTENT_TYPES.includes(recordType)
    ) {
      throw createServiceError(
        "Invalid content type filter",
        400
      );
    }

    filter.recordType = recordType;
  }

  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw createServiceError(
        "Invalid content category filter",
        400
      );
    }

    filter.category = category;
  }

  if (!isAdminUser(user)) {
    filter.status = "published";
    filter.visibility = "all";
  } else {
    if (status) {
      if (
        !VALID_CONTENT_STATUSES.includes(status)
      ) {
        throw createServiceError(
          "Invalid content status filter",
          400
        );
      }

      filter.status = status;
    }

    if (visibility) {
      if (
        !VALID_VISIBILITIES.includes(visibility)
      ) {
        throw createServiceError(
          "Invalid visibility filter",
          400
        );
      }

      filter.visibility = visibility;
    }
  }

  if (cleanText(search)) {
    const safeSearch = escapeRegex(
      cleanText(search)
    );

    filter.$or = [
      {
        title: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        description: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  return ITSupport.find(filter)
    .sort({
      updatedAt: -1,
      createdAt: -1,
    })
    .populate(
      "createdBy",
      "name email role"
    )
    .lean();
};

/* =====================================================
   UPDATE CONTENT
===================================================== */

const updateContent = async ({
  contentId,
  body,
  files,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can update content",
      403
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(contentId)
  ) {
    throw createServiceError(
      "Invalid content ID",
      400
    );
  }

  const content = await ITSupport.findOne({
    _id: contentId,
    recordType: {
      $in: VALID_CONTENT_TYPES,
    },
    isActive: true,
  });

  if (!content) {
    throw createServiceError(
      "Content not found",
      404
    );
  }

  const oldStatus = content.status;
  const oldVisibility = content.visibility;

  if (body.title !== undefined) {
    const title = cleanText(body.title);

    if (!title) {
      throw createServiceError(
        "Content title cannot be empty",
        400
      );
    }

    content.title = title;
  }

  if (body.description !== undefined) {
    const description = cleanText(
      body.description
    );

    if (!description) {
      throw createServiceError(
        "Content description cannot be empty",
        400
      );
    }

    content.description = description;
  }

  if (body.category !== undefined) {
    const category = cleanText(
      body.category
    ).toLowerCase();

    if (!VALID_CATEGORIES.includes(category)) {
      throw createServiceError(
        "Invalid content category",
        400
      );
    }

    content.category = category;
  }

  if (body.status !== undefined) {
    const status = cleanText(
      body.status
    ).toLowerCase();

    if (
      !VALID_CONTENT_STATUSES.includes(status)
    ) {
      throw createServiceError(
        "Invalid content status",
        400
      );
    }

    content.status = status;
  }

  if (body.visibility !== undefined) {
    const visibility = cleanText(
      body.visibility
    ).toLowerCase();

    if (
      !VALID_VISIBILITIES.includes(visibility)
    ) {
      throw createServiceError(
        "Invalid content visibility",
        400
      );
    }

    content.visibility = visibility;
  }

  const newAttachments =
    buildAttachmentObjects(files, user);

  if (newAttachments.length > 0) {
    content.attachments.push(
      ...newAttachments
    );
  }

  content.updatedBy = getUserId(user);
  content.updatedByName = user.name;

  await content.save();

  const becamePublished =
    content.recordType === "announcement" &&
    content.status === "published" &&
    (
      oldStatus !== "published" ||
      oldVisibility !== content.visibility
    );

  if (becamePublished) {
    await notifyPublishedAnnouncement({
      content,
      user,
      event: "announcement_published",
    });
  }

  return content;
};

/* =====================================================
   DELETE CONTENT
===================================================== */

const deleteContent = async ({
  contentId,
  user,
}) => {
  if (!isAdminUser(user)) {
    throw createServiceError(
      "Only admin or super admin can delete content",
      403
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(contentId)
  ) {
    throw createServiceError(
      "Invalid content ID",
      400
    );
  }

  const content = await ITSupport.findOne({
    _id: contentId,
    recordType: {
      $in: VALID_CONTENT_TYPES,
    },
    isActive: true,
  });

  if (!content) {
    throw createServiceError(
      "Content not found",
      404
    );
  }

  content.isActive = false;
  content.status = "archived";
  content.updatedBy = getUserId(user);
  content.updatedByName = user.name;

  await content.save();

  return {
    message: "Content deleted successfully",
    contentId: content._id,
  };
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