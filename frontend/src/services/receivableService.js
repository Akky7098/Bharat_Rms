import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com/api/receivables";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const getReceivableSummary = async () => {
  const response = await axios.get(`${API_URL}/summary`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getReceivables = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const getCompanyLedger = async (receivableId) => {
  const response = await axios.get(`${API_URL}/${receivableId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const checkCustomerRisk = async (companyName) => {
  const response = await axios.get(`${API_URL}/risk-check`, {
    headers: authHeaders(),
    params: { companyName },
  });

  return response.data;
};

export const addManualPaymentReceipt = async (receivableId, data) => {
  const response = await axios.patch(`${API_URL}/${receivableId}/payment`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

export const autoMapSalesOrderReceivable = async (salesOrderId) => {
  const response = await axios.post(
    `${API_URL}/auto-map-sales-order/${salesOrderId}`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};