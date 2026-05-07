import axios from "axios";

const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/dispatch";

const getToken = () => localStorage.getItem("token");

export const createDispatch = async (data) => {
  const response = await axios.post(`${API_URL}/create`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data;
};

export const updateDispatch = async (id, data) => {
  const response = await axios.put(`${API_URL}/update/${id}`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data;
};

export const getDispatches = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    params,
  });

  return response.data;
};