import axios from "axios";

const ATTENDANCE_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/attendance";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const getTodayAttendance = async () => {
  const response = await axios.get(`${ATTENDANCE_API_URL}/today`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getAttendanceList = async (params = {}) => {
  let page = 1;
  let allData = [];
  let totalPages = 1;

  do {
    const response = await axios.get(ATTENDANCE_API_URL, {
      headers: authHeaders(),
      params: {
        ...params,
        page,
        limit: 100,
      },
    });

    const result = response.data;

    allData = [...allData, ...(result.data || [])];
    totalPages = result.pagination?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return {
    success: true,
    data: allData,
  };
};

export const checkInAttendance = async (data) => {
  const response = await axios.post(`${ATTENDANCE_API_URL}/check-in`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

export const checkOutAttendance = async (data) => {
  const response = await axios.post(`${ATTENDANCE_API_URL}/check-out`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

export const requestAttendanceRegularization = async (data) => {
  const response = await axios.post(`${ATTENDANCE_API_URL}/regularize`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

export const approveAttendanceRegularization = async (
  attendanceId,
  data = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/${attendanceId}/regularize/approve`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

export const rejectAttendanceRegularization = async (
  attendanceId,
  data = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/${attendanceId}/regularize/reject`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};