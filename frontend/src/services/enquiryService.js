import axios from "axios";

const API_URL = "https://mediumaquamarine-eel-186314.hostingersite.com/api/enquiry";

export const getAllEnquiries = async (params = {}) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });

  return response.data;
};
