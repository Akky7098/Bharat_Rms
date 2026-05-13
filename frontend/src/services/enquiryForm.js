import axios from "axios";

const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/enquiry";
export const createEnquiry = async (formData) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(`${API_URL}/create`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getProductConfig = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/product-config`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.data;
};
export const updateEnquiryWorkflow = async (id, data) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/${id}/update-workflow`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};