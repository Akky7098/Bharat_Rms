import axios from "axios";

const API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/enquiry";

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

export const getLostEnquiryReasons = async (params = {}) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/lost-reasons`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    }
  );

  return response.data;
};

