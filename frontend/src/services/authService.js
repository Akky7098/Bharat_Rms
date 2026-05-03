import axios from "axios";

const API = "http://localhost:3000/api/auth";

export const loginUser = async (data) => {
  return await axios.post(`${API}/login`, data);
};
