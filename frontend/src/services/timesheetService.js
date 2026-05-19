import axios from "axios";

const TIMESHEET_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/timesheet";

const ATTENDANCE_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/attendance";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/* =========================
   TIMESHEET / WORK REPORT
========================= */

export const getTimesheets = async (params = {}) => {
  const response = await axios.get(TIMESHEET_API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
};

export const createTimesheet = async (data) => {
  const response = await axios.post(`${TIMESHEET_API_URL}/create`, data, {
    headers: authHeaders(),
  });

  return response.data;
};

/* =========================
   ATTENDANCE
========================= */

export const getTodayAttendance = async () => {
  const response = await axios.get(`${ATTENDANCE_API_URL}/today`, {
    headers: authHeaders(),
  });

  return response.data;
};

export const getAttendanceList = async (params = {}) => {
  const response = await axios.get(ATTENDANCE_API_URL, {
    headers: authHeaders(),
    params,
  });

  return response.data;
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

export const approveAttendanceRegularization = async (attendanceId, data = {}) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/${attendanceId}/regularize/approve`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

export const rejectAttendanceRegularization = async (attendanceId, data = {}) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/${attendanceId}/regularize/reject`,
    data,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};