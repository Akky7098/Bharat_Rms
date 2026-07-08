const itSupportService = require("../services/itSupportService");

const sendSuccess = (res, data, message = "Success") => {
  res.status(200).json({
    success: true,
    message,
    data,
  });
};

const sendCreated = (res, data, message = "Created successfully") => {
  res.status(201).json({
    success: true,
    message,
    data,
  });
};

const handleError = (res, error) => {
  console.error("IT Support Error:", error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const createTicket = async (req, res) => {
  try {
    const ticket = await itSupportService.createTicket({
      body: req.body,
      files: req.files || [],
      user: req.user,
      req,
    });

    sendCreated(res, ticket, "IT support ticket created successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const getTickets = async (req, res) => {
  try {
    const result = await itSupportService.getTickets({
      query: req.query,
      user: req.user,
    });

    sendSuccess(res, result, "Tickets fetched successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticket = await itSupportService.getTicketById({
      ticketId: req.params.ticketId,
      user: req.user,
    });

    sendSuccess(res, ticket, "Ticket fetched successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const addTicketMessage = async (req, res) => {
  try {
    const ticket = await itSupportService.addTicketMessage({
      ticketId: req.params.ticketId,
      body: req.body,
      files: req.files || [],
      user: req.user,
    });

    sendSuccess(res, ticket, "Message added successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const ticket = await itSupportService.updateTicketStatus({
      ticketId: req.params.ticketId,
      body: req.body,
      user: req.user,
    });

    sendSuccess(res, ticket, "Ticket status updated successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const updateTicketDetails = async (req, res) => {
  try {
    const ticket = await itSupportService.updateTicketDetails({
      ticketId: req.params.ticketId,
      body: req.body,
      user: req.user,
    });

    sendSuccess(res, ticket, "Ticket details updated successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const reassignTicket = async (req, res) => {
  try {
    const ticket = await itSupportService.reassignTicket({
      ticketId: req.params.ticketId,
      body: req.body,
      user: req.user,
    });

    sendSuccess(res, ticket, "Ticket assigned successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const deleteTicket = async (req, res) => {
  try {
    const result = await itSupportService.deleteTicket({
      ticketId: req.params.ticketId,
      user: req.user,
    });

    sendSuccess(res, result, "Ticket deleted successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await itSupportService.getStats({
      user: req.user,
    });

    sendSuccess(res, stats, "IT support stats fetched successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const getAssignableUsers = async (req, res) => {
  try {
    const users = await itSupportService.getAssignableUsers();

    sendSuccess(res, users, "Assignable users fetched successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const createContent = async (req, res) => {
  try {
    const content = await itSupportService.createContent({
      body: req.body,
      files: req.files || [],
      user: req.user,
    });

    sendCreated(res, content, "IT support content created successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const getContent = async (req, res) => {
  try {
    const content = await itSupportService.getContent({
      query: req.query,
      user: req.user,
    });

    sendSuccess(res, content, "IT support content fetched successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const updateContent = async (req, res) => {
  try {
    const content = await itSupportService.updateContent({
      contentId: req.params.contentId,
      body: req.body,
      files: req.files || [],
      user: req.user,
    });

    sendSuccess(res, content, "IT support content updated successfully");
  } catch (error) {
    handleError(res, error);
  }
};

const deleteContent = async (req, res) => {
  try {
    const result = await itSupportService.deleteContent({
      contentId: req.params.contentId,
      user: req.user,
    });

    sendSuccess(res, result, "IT support content deleted successfully");
  } catch (error) {
    handleError(res, error);
  }
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