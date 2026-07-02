const supportTicketService = require("../services/supportTicketService");

const parseBody = (req) => {
  let body = req.body || {};

  if (body.data) {
    try {
      body = JSON.parse(body.data);
    } catch (error) {
      throw new Error("Invalid support ticket data format.");
    }
  }

  return body;
};

const getAssignableUsers = async (req, res) => {
  try {
    const users = await supportTicketService.getAssignableUsers(req.user);

    return res.status(200).json({
      success: true,
      message: "Assignable users fetched successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createTicket = async (req, res) => {
  try {
    const body = parseBody(req);

    const ticket = await supportTicketService.createTicket(
      body,
      req.user,
      req.files || []
    );

    return res.status(201).json({
      success: true,
      message: "Support ticket created and assigned successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getTickets = async (req, res) => {
  try {
    const result = await supportTicketService.getTickets(req.query, req.user);

    return res.status(200).json({
      success: true,
      message: "Support tickets fetched successfully.",
      data: result.tickets,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticket = await supportTicketService.getTicketById(
      req.params.ticketId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Support ticket fetched successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const addTicketMessage = async (req, res) => {
  try {
    const body = parseBody(req);

    const ticket = await supportTicketService.addTicketMessage(
      req.params.ticketId,
      body,
      req.user,
      req.files || []
    );

    return res.status(200).json({
      success: true,
      message: "Message added successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const ticket = await supportTicketService.updateTicketStatus(
      req.params.ticketId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTicketDetails = async (req, res) => {
  try {
    const ticket = await supportTicketService.updateTicketDetails(
      req.params.ticketId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket details updated successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const reassignTicket = async (req, res) => {
  try {
    const ticket = await supportTicketService.reassignTicket(
      req.params.ticketId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket reassigned successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getTicketStats = async (req, res) => {
  try {
    const stats = await supportTicketService.getTicketStats(req.user);

    return res.status(200).json({
      success: true,
      message: "Support ticket stats fetched successfully.",
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteTicket = async (req, res) => {
  try {
    const ticket = await supportTicketService.deleteTicket(
      req.params.ticketId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Support ticket deleted successfully.",
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
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