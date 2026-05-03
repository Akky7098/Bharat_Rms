import axios from "axios";

const API_URL = "https://bharatspecialsteels.bharatspecialsteels.com/api/dashboard";
const getToken = () => localStorage.getItem("token");

export const getDashboardSummary = async (params = {}) => {
  const response = await axios.get(`${API_URL}/summary`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    params,
  });

  return response.data;
};