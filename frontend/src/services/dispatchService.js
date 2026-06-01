import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com/api/dispatch";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const getFullFileUrl = (fileUrl) => {
  if (!fileUrl) return "#";
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${BACKEND_URL}${fileUrl}`;
};

export const searchDispatchSalesOrders = async (params = {}) => {
  const response = await axios.get(`${API_URL}/sales-orders/search`, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const createDispatch = async (
  data,
  billPdf,
  lrCopyPdf,
  tcCertificatePdf,
  onUploadProgress
) => {
  const formData = new FormData();

  formData.append("data", JSON.stringify(data));

  if (billPdf) {
    formData.append("billPdf", billPdf);
  }

  if (lrCopyPdf) {
    formData.append("lrCopyPdf", lrCopyPdf);
  }

  if (tcCertificatePdf) {
    formData.append("tcCertificatePdf", tcCertificatePdf);
  }

  const response = await axios.post(`${API_URL}/create`, formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};
export const getDispatches = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const getDispatchById = async (dispatchId) => {
  const response = await axios.get(`${API_URL}/${dispatchId}`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const updateDispatchStatus = async (dispatchId, data) => {
  const response = await axios.patch(`${API_URL}/${dispatchId}/status`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

export const deleteDispatch = async (dispatchId) => {
  const response = await axios.delete(`${API_URL}/${dispatchId}`, {
    headers: authHeaders(),
  });

  return response.data;
};
export const updateDispatchPayment = async (
  dispatchId,
  data,
  paymentBillPdf
) => {
  const formData = new FormData();

  formData.append("data", JSON.stringify(data));

  if (paymentBillPdf) {
    formData.append("paymentBillPdf", paymentBillPdf);
  }

  const response = await axios.patch(
    `${API_URL}/${dispatchId}/payment`,
    formData,
    {
      headers: {
        ...authHeaders(),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};