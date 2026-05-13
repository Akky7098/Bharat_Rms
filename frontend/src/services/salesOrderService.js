import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

const API_URL = `${BASE_URL}/api/sales-order`;
const ENQUIRY_API_URL = `${BASE_URL}/api/enquiry`;
const USER_API_URL = `${BASE_URL}/api/user`;

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// CREATE
export const createSalesOrder = async (data) => {
  const isFormData = data instanceof FormData;

  const response = await axios.post(`${API_URL}/create`, data, {
    headers: {
      ...authHeaders(),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });

  return response.data;
};

// GET ALL
export const getAllSalesOrders = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

// GET SINGLE
export const getSalesOrderById = async (salesOrderId) => {
  const response = await axios.get(`${API_URL}/${salesOrderId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

// UPDATE / RESUBMIT
export const updateSalesOrder = async (salesOrderId, data) => {
  const response = await axios.put(`${API_URL}/${salesOrderId}`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

// GENERATE PDF
export const generateSalesOrderPdf = async (salesOrderId) => {
  const response = await axios.post(
    `${API_URL}/${salesOrderId}/generate-pdf`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// ADMIN APPROVE
export const approveSalesOrderByAdmin = async (salesOrderId) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/admin-approve`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// ADMIN REJECT
export const rejectSalesOrderByAdmin = async (
  salesOrderId,
  payload
) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/admin-reject`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// MANAGER APPROVE
export const approveSalesOrderByManager = async (salesOrderId) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/manager-approve`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// MANAGER REJECT
export const rejectSalesOrderByManager = async (
  salesOrderId,
  payload
) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/manager-reject`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// UPDATE PDF DETAILS
export const updatePdfDetails = async (salesOrderId, payload) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/pdf`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// UPDATE WHATSAPP GROUP STATUS
export const updateWhatsappGroupStatus = async (
  salesOrderId,
  payload
) => {
  const response = await axios.patch(
    `${API_URL}/${salesOrderId}/whatsapp-group`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// DELETE
export const deleteSalesOrder = async (salesOrderId) => {
  const response = await axios.delete(`${API_URL}/${salesOrderId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

// OLD DASHBOARD SUPPORT
export const searchPendingDispatchSalesOrders = async (params = {}) => {
  const response = await axios.get(`${API_URL}/pending-dispatch-search`, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

// PRODUCT CONFIG
export const getProductConfig = async () => {
  const response = await axios.get(`${ENQUIRY_API_URL}/product-config`, {
    headers: authHeaders(),
  });

  return response.data.data;
};

// SALES PERSON LIST
export const getSalesPersons = async () => {
  const response = await axios.get(`${USER_API_URL}/sales-persons`, {
    headers: authHeaders(),
  });

  return response.data.data;
};