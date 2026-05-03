import axios from "axios";

const API = "https://bharatspecialsteels.bharatspecialsteels.com/api/auth";

export const loginUser = async (data) => {
  return await axios.post(`${API}/login`, data);
};
