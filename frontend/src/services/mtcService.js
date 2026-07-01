import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com/api";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

export const createMtcCertificate = async (payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/mtc`,
    payload,
    authHeaders()
  );

  return response.data;
};

export const getMtcCertificates = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.companyName) params.append("companyName", filters.companyName);
  if (filters.fromDate) params.append("fromDate", filters.fromDate);
  if (filters.toDate) params.append("toDate", filters.toDate);

  const response = await axios.get(`${API_BASE_URL}/mtc?${params.toString()}`, {
    ...authHeaders(),
  });

  return response.data;
};

export const downloadMtcPdf = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/mtc/${id}/pdf`, {
    ...authHeaders(),
    responseType: "blob",
  });

  return response.data;
};
export const getMtcChemicalSpecs = async () => {
  const response = await axios.get(`${API_BASE_URL}/mtc/chemical-specs`, {
    ...authHeaders(),
  });

  return response.data;
};