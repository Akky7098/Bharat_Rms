import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL || "https://bharatspecialsteels.bharatspecialsteels.com/api/documents";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://bharatspecialsteels.bharatspecialsteels.com";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

export const getFullFileUrl = (fileUrl) => {
  if (!fileUrl) return "#";
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${BACKEND_URL}${fileUrl}`;
};

export const createDocumentFolder = async (data) => {
  return axios.post(`${API_URL}/folders`, data, authHeaders());
};

export const getDocumentFolders = async () => {
  return axios.get(`${API_URL}/folders`, authHeaders());
};

export const deleteDocumentFolder = async (folderId) => {
  return axios.delete(`${API_URL}/folders/${folderId}`, authHeaders());
};

export const uploadDocumentFile = async (data, file, onUploadProgress) => {
  const formData = new FormData();

  formData.append("data", JSON.stringify(data));
  formData.append("file", file);

  return axios.post(`${API_URL}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });
};

export const getDocuments = async (folderId) => {
  const url = folderId ? `${API_URL}?folderId=${folderId}` : API_URL;
  return axios.get(url, authHeaders());
};

export const deleteDocumentFile = async (documentId) => {
  return axios.delete(`${API_URL}/${documentId}`, authHeaders());
};