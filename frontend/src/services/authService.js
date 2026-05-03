import axios from "axios";

const API = "https://mediumaquamarine-eel-186314.hostingersite.com/api/auth";

export const loginUser = async (data) => {
  return await axios.post(`${API}/login`, data);
};
