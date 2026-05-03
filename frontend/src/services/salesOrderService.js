import axios from "axios";

const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/sales-order";
const ENQUIRY_API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/enquiry";

const getToken = () => localStorage.getItem("token");

export const getAllSalesOrders = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    params,
  });

  return response.data;
};

export const createSalesOrder = async (data) => {
  const response = await axios.post(`${API_URL}/create`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data;
};

export const getProductConfig = async () => {
  const response = await axios.get(`${ENQUIRY_API_URL}/product-config`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data.data;
};

export const getSalesPersons = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    "https://bharatspecialsteels.bharatspecialsteels.com/api/user/sales-persons",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
};