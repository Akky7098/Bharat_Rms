import axios from "axios";


const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/support-tickets";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const createSupportTicket = async (payload) => {
  const isFormData = payload instanceof FormData;

  const response = await axios.post(API_URL, payload, {
    headers: {
      ...authHeaders(),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });

  return response.data;
};

export const getSupportEmployees = async () => {
  const response = await axios.get(`${API_URL}/assignable-users`, {
    headers: authHeaders(),
  });

  return response.data.data || [];
};

export const getSupportTickets = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const getSupportTicketById = async (ticketId) => {
  const response = await axios.get(`${API_URL}/${ticketId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getSupportTicketStats = async () => {
  const response = await axios.get(`${API_URL}/stats`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const addSupportTicketMessage = async (ticketId, payload) => {
  const isFormData = payload instanceof FormData;

  const response = await axios.post(`${API_URL}/${ticketId}/messages`, payload, {
    headers: {
      ...authHeaders(),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });

  return response.data;
};

export const updateSupportTicketStatus = async (ticketId, payload) => {
  const response = await axios.patch(`${API_URL}/${ticketId}/status`, payload, {
    headers: authHeaders(),
  });

  return response.data;
};

export const updateSupportTicketDetails = async (ticketId, payload) => {
  const response = await axios.patch(`${API_URL}/${ticketId}/details`, payload, {
    headers: authHeaders(),
  });

  return response.data;
};

export const reassignSupportTicket = async (ticketId, payload) => {
  const response = await axios.patch(`${API_URL}/${ticketId}/reassign`, payload, {
    headers: authHeaders(),
  });

  return response.data;
};

export const deleteSupportTicket = async (ticketId) => {
  const response = await axios.delete(`${API_URL}/${ticketId}`, {
    headers: authHeaders(),
  });

  return response.data;
};