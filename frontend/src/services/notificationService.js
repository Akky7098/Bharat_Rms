import axios from "axios";

const API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/notifications";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// GET ALL
export const getNotifications = async () => {
  const response = await axios.get(API_URL, {
    headers: authHeaders(),
  });

  return response.data?.data || [];
};

// MARK SINGLE READ
export const markNotificationRead = async (id) => {
  const response = await axios.patch(
    `${API_URL}/${id}/read`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// MARK ALL READ
export const markAllNotificationsRead = async () => {
  const response = await axios.patch(
    `${API_URL}/read-all`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// CLEAR SINGLE
export const clearNotification = async (id) => {
  const response = await axios.patch(
    `${API_URL}/${id}/clear`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

// DELETE SINGLE (only if backend route exists)
export const deleteNotification = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: authHeaders(),
  });

  return response.data;
};

// CLEAR ALL (only if backend route exists)
export const clearAllNotifications = async () => {
  const response = await axios.patch(
    `${API_URL}/clear-all`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};