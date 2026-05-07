import axios from "axios";

const API_URL = "http://bharatspecialsteels.bharatspecialsteels.com/api/notifications";

const getToken = () => localStorage.getItem("token");

export const getNotifications = async () => {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data.data;
};