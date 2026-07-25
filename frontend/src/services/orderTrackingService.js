import axios from "axios";

/*
 * LOCAL TESTING
 * Delete this localhost line and uncomment
 * the production block before build.
 */
const BASE_URL = "http://localhost:5000";

// const BASE_URL =
//   process.env.REACT_APP_BACKEND_URL ||
//   "https://bharatspecialsteels.bharatspecialsteels.com";

const API_URL = `${BASE_URL}/api/order-tracking`;

const getToken = () =>
  localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const requestConfig = (
  params = {}
) => ({
  headers: authHeaders(),
  params,
});

/* =========================================================
   FORM DATA HELPERS
========================================================= */

const appendValue = (
  formData,
  key,
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (
        item !== undefined &&
        item !== null &&
        item !== ""
      ) {
        formData.append(key, item);
      }
    });

    return;
  }

  formData.append(key, value);
};

const appendFiles = (
  formData,
  files = []
) => {
  Array.from(files || []).forEach(
    (file) => {
      if (file) {
        formData.append(
          "files",
          file
        );
      }
    }
  );
};

const buildFormData = (
  payload = {},
  files = []
) => {
  const formData =
    new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      appendValue(
        formData,
        key,
        value
      );
    }
  );

  appendFiles(formData, files);

  return formData;
};

const multipartConfig = () => ({
  headers: {
    ...authHeaders(),
  },
});

/* =========================================================
   DASHBOARD
========================================================= */

export const getOrderTrackingDashboard =
  async () => {
    const response =
      await axios.get(
        `${API_URL}/dashboard`,
        requestConfig()
      );

    return response.data;
  };

/* =========================================================
   TRACKING LIST
========================================================= */

export const getOrderTrackingList =
  async (params = {}) => {
    const response =
      await axios.get(
        API_URL,
        requestConfig(params)
      );

    return response.data;
  };

/* =========================================================
   TRACKING DETAILS
========================================================= */

export const getOrderTrackingById =
  async (trackingId) => {
    const response =
      await axios.get(
        `${API_URL}/${trackingId}`,
        requestConfig()
      );

    return response.data;
  };

/* =========================================================
   SYNC APPROVED SALES ORDERS
========================================================= */

export const syncApprovedSalesOrders =
  async () => {
    const response =
      await axios.post(
        `${API_URL}/sync-approved-orders`,
        {},
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export const updateOrderTrackingStatus =
  async (
    trackingId,
    payload = {},
    files = []
  ) => {
    const formData =
      buildFormData(
        payload,
        files
      );

    const response =
      await axios.patch(
        `${API_URL}/${trackingId}/status`,
        formData,
        multipartConfig()
      );

    return response.data;
  };

/* =========================================================
   REQUEST ORDER UPDATE
========================================================= */

export const requestOrderTrackingUpdate =
  async (trackingId) => {
    const response =
      await axios.post(
        `${API_URL}/${trackingId}/request-update`,
        {},
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   GET CHAT MESSAGES
========================================================= */

export const getOrderTrackingMessages =
  async (
    trackingId,
    params = {}
  ) => {
    const response =
      await axios.get(
        `${API_URL}/${trackingId}/messages`,
        requestConfig(params)
      );

    return response.data;
  };

/* =========================================================
   SEND CHAT MESSAGE
========================================================= */

export const sendOrderTrackingMessage =
  async (
    trackingId,
    payload = {},
    files = []
  ) => {
    const formData =
      buildFormData(
        payload,
        files
      );

    const response =
      await axios.post(
        `${API_URL}/${trackingId}/messages`,
        formData,
        multipartConfig()
      );

    return response.data;
  };

/* =========================================================
   MARK MESSAGES AS READ
========================================================= */

export const markOrderTrackingMessagesRead =
  async (trackingId) => {
    const response =
      await axios.patch(
        `${API_URL}/${trackingId}/messages/read`,
        {},
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   CLOSE CHAT
========================================================= */

export const closeOrderTrackingChat =
  async (trackingId) => {
    const response =
      await axios.patch(
        `${API_URL}/${trackingId}/close-chat`,
        {},
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   REOPEN CHAT
========================================================= */

export const reopenOrderTrackingChat =
  async (trackingId) => {
    const response =
      await axios.patch(
        `${API_URL}/${trackingId}/reopen-chat`,
        {},
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };

  /* =========================================================
   DELETE MESSAGE FOR EVERYONE
========================================================= */

export const deleteOrderTrackingMessage =
  async (
    trackingId,
    messageId
  ) => {
    const response =
      await axios.delete(
        `${API_URL}/${trackingId}/messages/${messageId}`,
        {
          headers: authHeaders(),
        }
      );

    return response.data;
  };