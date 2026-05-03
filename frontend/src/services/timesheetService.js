import axios from "axios";

const API_URL = "http://localhost:3000/api/timesheet";

const getToken = () => localStorage.getItem("token");

export const getTimesheets = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    params,
  });

  return response.data;
};

export const createTimesheet = async (data) => {
  const response = await axios.post(`${API_URL}/create`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data;
};