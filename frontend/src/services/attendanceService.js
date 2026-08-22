import axios from "axios";

/* ==========================================================
   BASE URL

   LOCAL TESTING
========================================================== */

// const BASE_URL = "http://localhost:5000";

/*
 * PRODUCTION
 *
 * Production backend.
 *
 * REACT_APP_BACKEND_URL can override this when required.
 */

const BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

const ATTENDANCE_API_URL =
  `${BASE_URL}/api/attendance`;

/* ==========================================================
   AUTH HELPERS
========================================================== */

const getToken = () =>
  localStorage.getItem("token");

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

export const getAttendanceList = async (
  params = {}
) => {
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

    const result =
      response.data;

    allData = [
      ...allData,
      ...(result.data || []),
    ];

    totalPages =
      result.pagination
        ?.totalPages ||
      1;

    page++;
  } while (
    page <= totalPages
  );

  return {
    success: true,
    data: allData,
  };
};

/* ==========================================================
   CHECK IN
========================================================== */

export const checkInAttendance = async (
  payload
) => {
  const response =
    await axios.post(
      `${ATTENDANCE_API_URL}/check-in`,
      payload,
      {
        headers:
          authHeaders(),
      }
    );

  return response.data;
};

/* ==========================================================
   CHECK OUT
========================================================== */

export const checkOutAttendance = async (
  payload
) => {
  const response =
    await axios.post(
      `${ATTENDANCE_API_URL}/check-out`,
      payload,
      {
        headers:
          authHeaders(),
      }
    );

  return response.data;
};

/* ==========================================================
   REGULARIZATION
========================================================== */

export const requestAttendanceRegularization =
  async (payload) => {
    const response =
      await axios.post(
        `${ATTENDANCE_API_URL}/regularize`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

export const approveAttendanceRegularization =
  async (
    attendanceId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/${attendanceId}/regularize/approve`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

export const rejectAttendanceRegularization =
  async (
    attendanceId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/${attendanceId}/regularize/reject`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   APPLY LEAVE
========================================================== */

export const applyAttendanceLeave =
  async (payload) => {
    const response =
      await axios.post(
        `${ATTENDANCE_API_URL}/leave`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   LEAVE SUMMARY
========================================================== */

export const getAttendanceLeaveSummary =
  async (
    employeeId = ""
  ) => {
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/leave/summary`,
        {
          headers:
            authHeaders(),

          params:
            employeeId
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
  async (
    params = {}
  ) => {
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/leave/requests`,
        {
          headers:
            authHeaders(),

          params,
        }
      );

    return response.data;
  };

/* ==========================================================
   APPROVE LEAVE
========================================================== */

export const approveAttendanceLeave =
  async (
    leaveRequestId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/approve`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   REJECT LEAVE
========================================================== */

export const rejectAttendanceLeave =
  async (
    leaveRequestId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/reject`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   CANCEL LEAVE
========================================================== */

export const cancelAttendanceLeave =
  async (
    leaveRequestId
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/leave/${leaveRequestId}/cancel`,
        {},
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   UPDATE EMPLOYEE WORK MODE
========================================================== */

export const updateAttendanceEmployeeWorkMode =
  async (
    employeeId,
    workMode
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/employees/${employeeId}/work-mode`,
        {
          workMode,
        },
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   APPLY WORK FROM HOME
========================================================== */

export const applyWorkFromHome =
  async (
    payload
  ) => {
    const response =
      await axios.post(
        `${ATTENDANCE_API_URL}/work-from-home`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   APPROVE WORK FROM HOME
========================================================== */

export const approveWorkFromHome =
  async (
    requestId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/work-from-home/${requestId}/approve`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   REJECT WORK FROM HOME
========================================================== */

export const rejectWorkFromHome =
  async (
    requestId,
    payload = {}
  ) => {
    const response =
      await axios.patch(
        `${ATTENDANCE_API_URL}/work-from-home/${requestId}/reject`,
        payload,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   ATTENDANCE CALENDAR
========================================================== */

export const getAttendanceCalendar =
  async (
    month,
    year,
    employeeId = ""
  ) => {
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/calendar`,
        {
          headers:
            authHeaders(),

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
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/leave/requests`,
        {
          headers:
            authHeaders(),

          params: {
            status:
              "pending",
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
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/work-from-home`,
        {
          headers:
            authHeaders(),

          params: {
            status:
              "pending",
          },
        }
      );

    return response.data;
  };

/* ==========================================================
   WORKDAY LOCATION TRACKING
========================================================== */

/* ==========================================================
   CREATE LOCATION CHECKPOINT

   POST
   /api/attendance/location/checkpoint

   IMPORTANT:

   employeeId is NOT sent.

   Backend identifies employee from JWT / req.user.

   Payload example:

   {
     latitude: 28.4089,
     longitude: 77.3178,
     accuracy: 18,
     source: "periodic",
     capturedAt: "2026-08-22T08:30:00.000Z"
   }

   Common sources used by frontend:

   check_in
   check_out
   periodic
   app_open
   manual_refresh

   Keep backend source validation consistent with these.
========================================================== */

export const createAttendanceLocationCheckpoint =
  async (
    payload = {}
  ) => {
    const latitude =
      Number(
        payload.latitude
      );

    const longitude =
      Number(
        payload.longitude
      );

    const accuracy =
      payload.accuracy ===
        null ||
      payload.accuracy ===
        undefined
        ? null
        : Number(
            payload.accuracy
          );

    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {
      throw new Error(
        "Valid latitude and longitude are required."
      );
    }

    const capturedAt =
      payload.capturedAt ||
      new Date()
        .toISOString();

    const response =
      await axios.post(
        `${ATTENDANCE_API_URL}/location/checkpoint`,
        {
          latitude,

          longitude,

          accuracy:
            Number.isFinite(
              accuracy
            )
              ? accuracy
              : null,

          source:
            payload.source ||
            "periodic",

          /*
           * Preserve actual browser capture time.
           *
           * This is useful when network request is slightly delayed.
           */
          capturedAt,
        },
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   GET CURRENT EMPLOYEE TRACKING STATUS

   GET
   /api/attendance/location/status

   Used by GlobalAttendanceLocationTracker.

   Backend should tell us whether THIS logged-in employee
   currently has an active attendance session.

   Example response:

   {
     success: true,
     data: {
       active: true
     }
   }

   Optional useful backend fields:

   {
     active: true,
     trackingActive: true,
     lastCheckpointAt: "...",
     attendanceStatus: "checked_in"
   }
========================================================== */

export const getAttendanceLocationTrackingStatus =
  async () => {
    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/location/status`,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* ==========================================================
   GET EMPLOYEE LOCATION HISTORY

   SUPER ADMIN ONLY

   GET
   /api/attendance/location/history/:employeeId

   Optional query:

   ?date=2026-08-22

   IMPORTANT:

   When selected date is 19 August,
   frontend sends:

   date=2026-08-19

   Therefore Super Admin sees that exact day's trail,
   not today's trail.
========================================================== */

export const getEmployeeAttendanceLocationHistory =
  async (
    employeeId,
    date = ""
  ) => {
    if (!employeeId) {
      throw new Error(
        "Employee ID is required."
      );
    }

    const response =
      await axios.get(
        `${ATTENDANCE_API_URL}/location/history/${employeeId}`,
        {
          headers:
            authHeaders(),

          params:
            date
              ? {
                  date,
                }
              : {},
        }
      );

    return response.data;
  };