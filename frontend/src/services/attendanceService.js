import axios from "axios";

const ATTENDANCE_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/attendance";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/* ==========================================================
   TODAY ATTENDANCE
========================================================== */

export const getTodayAttendance = async () => {
  const response = await axios.get(
    `${ATTENDANCE_API_URL}/today`,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   ATTENDANCE LIST
========================================================== */

export const getAttendanceList = async (params = {}) => {
  let page = 1;
  let totalPages = 1;
  let allData = [];

  do {
    const response = await axios.get(
      ATTENDANCE_API_URL,
      {
        headers: authHeaders(),
        params: {
          ...params,
          page,
          limit: 100,
        },
      }
    );

    const result = response.data;

    allData = [
      ...allData,
      ...(result.data || []),
    ];

    totalPages =
      result.pagination?.totalPages || 1;

    page++;
  } while (page <= totalPages);

  return {
    success: true,
    data: allData,
  };
};

/* ==========================================================
   CHECK IN
========================================================== */

export const checkInAttendance = async (payload) => {
  const response = await axios.post(
    `${ATTENDANCE_API_URL}/check-in`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   CHECK OUT
========================================================== */

export const checkOutAttendance = async (payload) => {
  const response = await axios.post(
    `${ATTENDANCE_API_URL}/check-out`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   REGULARIZATION
========================================================== */

export const requestAttendanceRegularization =
  async (payload) => {
    const response = await axios.post(
      `${ATTENDANCE_API_URL}/regularize`,
      payload,
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  };

export const approveAttendanceRegularization =
  async (
    attendanceId,
    payload = {}
  ) => {
    const response = await axios.patch(
      `${ATTENDANCE_API_URL}/${attendanceId}/regularize/approve`,
      payload,
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  };

export const rejectAttendanceRegularization =
  async (
    attendanceId,
    payload = {}
  ) => {
    const response = await axios.patch(
      `${ATTENDANCE_API_URL}/${attendanceId}/regularize/reject`,
      payload,
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  };

/* ==========================================================
   APPLY LEAVE
========================================================== */

export const applyAttendanceLeave =
  async (payload) => {
    const response = await axios.post(
      `${ATTENDANCE_API_URL}/leave`,
      payload,
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  };

/* ==========================================================
   LEAVE SUMMARY
========================================================== */

export const getAttendanceLeaveSummary =
  async (employeeId = "") => {
    const response = await axios.get(
      `${ATTENDANCE_API_URL}/leave/summary`,
      {
        headers: authHeaders(),
        params: employeeId
          ? {
              employeeId,
            }
          : {},
      }
    );

    return response.data;
  };

/* ==========================================================
   LEAVE REQUEST LIST
========================================================== */

export const getAttendanceLeaveRequests =
  async (params = {}) => {
    const response = await axios.get(
      `${ATTENDANCE_API_URL}/leave/requests`,
      {
        headers: authHeaders(),
        params,
      }
    );

    return response.data;
  };
  /* ==========================================================
   APPROVE LEAVE
========================================================== */

export const approveAttendanceLeave = async (
  leaveRequestId,
  payload = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/approve`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   REJECT LEAVE
========================================================== */

export const rejectAttendanceLeave = async (
  leaveRequestId,
  payload = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/reject`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   CANCEL LEAVE
========================================================== */

export const cancelAttendanceLeave = async (
  leaveRequestId
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/cancel`,
    {},
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   UPDATE EMPLOYEE WORK MODE (ADMIN)
========================================================== */

export const updateAttendanceEmployeeWorkMode = async (
  employeeId,
  workMode
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/employees/${employeeId}/work-mode`,
    {
      workMode,
    },
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   APPLY WORK FROM HOME
   (Requires backend route)
========================================================== */

export const applyWorkFromHome = async (
  payload
) => {
  const response = await axios.post(
    `${ATTENDANCE_API_URL}/work-from-home`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   APPROVE WORK FROM HOME
========================================================== */

export const approveWorkFromHome = async (
  requestId,
  payload = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/work-from-home/${requestId}/approve`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   REJECT WORK FROM HOME
========================================================== */

export const rejectWorkFromHome = async (
  requestId,
  payload = {}
) => {
  const response = await axios.patch(
    `${ATTENDANCE_API_URL}/work-from-home/${requestId}/reject`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return response.data;
};

/* ==========================================================
   ATTENDANCE CALENDAR
========================================================== */

export const getAttendanceCalendar = async (
  month,
  year,
  employeeId = ""
) => {
  const response = await axios.get(
    `${ATTENDANCE_API_URL}/calendar`,
    {
      headers: authHeaders(),
      params: {
        month,
        year,
        employeeId,
      },
    }
  );

  return response.data;
};

/* ==========================================================
   PENDING LEAVE REQUESTS
========================================================== */

export const getPendingLeaveRequests =
  async () => {
    const response = await axios.get(
      `${ATTENDANCE_API_URL}/leave/requests`,
      {
        headers: authHeaders(),
        params: {
          status: "pending",
        },
      }
    );

    return response.data;
  };

/* ==========================================================
   PENDING WORK FROM HOME REQUESTS
========================================================== */

export const getPendingWorkFromHomeRequests =
  async () => {
    const response = await axios.get(
      `${ATTENDANCE_API_URL}/work-from-home`,
      {
        headers: authHeaders(),
        params: {
          status: "pending",
        },
      }
    );

    return response.data;
  };