import axios from "axios";


const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/it-support";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const formHeaders = (payload) => {
  const isFormData = payload instanceof FormData;

  return {
    ...authHeaders(),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };
};

/* TICKETS */
export const createITSupportTicket = async (payload) => {
  const response = await axios.post(`${API_URL}/tickets`, payload, {
    headers: formHeaders(payload),
  });

  return response.data;
};

export const getITSupportTickets = async (params = {}) => {
  const response = await axios.get(`${API_URL}/tickets`, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const getITSupportTicketById = async (ticketId) => {
  const response = await axios.get(`${API_URL}/tickets/${ticketId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const addITSupportMessage = async (ticketId, payload) => {
  const response = await axios.post(
    `${API_URL}/tickets/${ticketId}/messages`,
    payload,
    {
      headers: formHeaders(payload),
    }
  );

  return response.data;
};

export const updateITSupportStatus = async (ticketId, payload) => {
  const response = await axios.patch(
    `${API_URL}/tickets/${ticketId}/status`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

export const updateITSupportDetails = async (ticketId, payload) => {
  const response = await axios.patch(
    `${API_URL}/tickets/${ticketId}/details`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

export const reassignITSupportTicket = async (ticketId, payload) => {
  const response = await axios.patch(
    `${API_URL}/tickets/${ticketId}/reassign`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

export const deleteITSupportTicket = async (ticketId) => {
  const response = await axios.delete(`${API_URL}/tickets/${ticketId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getITSupportStats = async () => {
  const response = await axios.get(`${API_URL}/stats`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getITSupportAssignableUsers = async () => {
  const response = await axios.get(`${API_URL}/assignable-users`, {
    headers: authHeaders(),
  });

  return response.data.data || [];
};

/* FAQ / GUIDES / ANNOUNCEMENTS */
export const createITSupportContent = async (payload) => {
  const response = await axios.post(`${API_URL}/content`, payload, {
    headers: formHeaders(payload),
  });

  return response.data;
};

export const getITSupportContent = async (params = {}) => {
  const response = await axios.get(`${API_URL}/content`, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const updateITSupportContent = async (contentId, payload) => {
  const response = await axios.patch(`${API_URL}/content/${contentId}`, payload, {
    headers: formHeaders(payload),
  });

  return response.data;
};

export const deleteITSupportContent = async (contentId) => {
  const response = await axios.delete(`${API_URL}/content/${contentId}`, {
    headers: authHeaders(),
  });

  return response.data;
};