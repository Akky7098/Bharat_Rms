import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:5000"
//   "https://bharatspecialsteels.bharatspecialsteels.com";

const API_URL = `${BASE_URL}/api/pdf-documents`;

const getToken = () =>
  localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/* =========================================================
   CREATE PDF DOCUMENT
========================================================= */

export const createPdfDocument = async (data) => {
  const response = await axios.post(
    `${API_URL}/create`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* =========================================================
   GET ALL PDF DOCUMENTS
========================================================= */

export const getAllPdfDocuments = async (
  params = {}
) => {
  const response = await axios.get(
    API_URL,
    {
      headers: authHeaders(),
      params,
    }
  );

  return response.data;
};

/* =========================================================
   GET SINGLE PDF DOCUMENT
========================================================= */

export const getPdfDocumentById = async (
  id
) => {
  const response = await axios.get(
    `${API_URL}/${id}`,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* =========================================================
   UPDATE PDF DOCUMENT DATA
========================================================= */

export const updatePdfDocument = async (
  id,
  data
) => {
  const response = await axios.put(
    `${API_URL}/update/${id}`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* =========================================================
   GENERATE / REGENERATE PDF
========================================================= */

export const generatePdfDocument = async (
  id
) => {
  const response = await axios.post(
    `${API_URL}/${id}/generate-pdf`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* =========================================================
   DELETE DOCUMENT
========================================================= */

export const deletePdfDocument = async (
  id
) => {
  const response = await axios.delete(
    `${API_URL}/${id}`,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* =========================================================
   GET FULL PDF URL
========================================================= */

export const getPdfFileUrl = (
  fileUrl
) => {
  if (!fileUrl) {
    return "";
  }

  if (
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://")
  ) {
    return fileUrl;
  }

  return `${BASE_URL}${fileUrl}`;
};