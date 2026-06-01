import axios from "axios";

const TIMESHEET_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/timesheet";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const getTimesheets = async (params = {}) => {
  const response = await axios.get(TIMESHEET_API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const createTimesheet = async (data) => {
  const response = await axios.post(`${TIMESHEET_API_URL}/create`, data, {
    headers: authHeaders(),
  });

  return response.data;
};