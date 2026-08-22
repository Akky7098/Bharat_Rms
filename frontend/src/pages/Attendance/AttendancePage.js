import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  getTodayAttendance,
  getAttendanceList,
  checkInAttendance,
  checkOutAttendance,
  requestAttendanceRegularization,
  approveAttendanceRegularization,
  rejectAttendanceRegularization,
  applyAttendanceLeave,
  getAttendanceLeaveSummary,
  getAttendanceLeaveRequests,
  applyWorkFromHome as applyAttendanceWorkFromHome,
  getPendingWorkFromHomeRequests as getAttendanceWorkFromHomeRequests,
  getEmployeeAttendanceLocationHistory,
} from "../../services/attendanceService";

import {
  getSalesPersons,
} from "../../services/salesOrderService";

import {
  getTimesheets,
} from "../../services/timesheetService";

/* =========================================================
   DESKTOP / SHARED COMPONENTS
========================================================= */

import AttendanceHeader from "./components/AttendanceHeader";
import AttendanceSummaryCards from "./components/AttendanceSummaryCards";
import AttendanceTodayCard from "./components/AttendanceTodayCard";
import AttendanceFilters from "./components/AttendanceFilters";
import AttendanceCalendar from "./components/AttendanceCalendar";
import AttendanceDayDetails from "./components/AttendanceDayDetails";
import AttendanceAdminOverview from "./components/AttendanceAdminOverview";
import RegularizationQueue from "./components/RegularizationQueue";
import RegularizationModal from "./components/RegularizationModal";
import LeaveModal from "./components/LeaveModal";
import WfhModal from "./components/WfhModal";
import LocationHistoryModal from "./components/LocationHistoryModal";
import ReportsCard from "./components/ReportsCard";

/* =========================================================
   LOCATION TRACKING
========================================================= */

import {
  captureAttendanceLocationNow,
} from "./hooks/useAttendanceLocationTracking";

/* =========================================================
   HELPERS
========================================================= */

import {
  MONTHS,
  clockValue,
  displayCheckIn,
  displayCheckOut,
  employeeIdOf,
  formatDate,
  formatMinutes,
  getDateKey,
  getHealth,
  isLeadership,
  isSunday,
  makeDateKey,
  normalizeHistory,
  parseDateKey,
  sameEmployee,
} from "./utils/attendanceHelpers";

import "../Attendance.css";

/* =========================================================
   ATTENDANCE PAGE
========================================================= */

export default function AttendancePage() {
  /* =========================================================
     LOGGED-IN USER
  ========================================================= */

  const user = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  /* =========================================================
     PERMISSIONS
  ========================================================= */

  const isUser =
    user?.role === "user";

  const isAdmin =
    user?.role === "admin";

  const isSuperAdmin =
    user?.role === "super_admin";

  const canMarkAttendance =
    isUser || isAdmin;

  const canManageUsers =
    isAdmin || isSuperAdmin;

  const canApproveRegularization =
    isSuperAdmin;

  /* =========================================================
     TODAY
  ========================================================= */

  const todayKey = useMemo(
    () => getDateKey(),
    []
  );

  const todayParts = useMemo(
    () => parseDateKey(todayKey),
    [todayKey]
  );

  /* =========================================================
     MAIN STATE
  ========================================================= */

  const [
    attendanceList,
    setAttendanceList,
  ] = useState([]);

  const [
    todayAttendance,
    setTodayAttendance,
  ] = useState(null);

  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    ,
    setTimesheets,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(null);

  /* =========================================================
     FILTERS
  ========================================================= */

  const [
    filters,
    setFilters,
  ] = useState({
    month:
      todayParts?.monthIndex ?? 0,

    year:
      todayParts?.year ??
      new Date().getFullYear(),

    employeeId: "",
  });

  /* =========================================================
     REGULARIZATION
  ========================================================= */

  const [
    regularize,
    setRegularize,
  ] = useState({
    open: false,
    date: "",
    attendance: null,
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
    submitting: false,
  });

  /* =========================================================
     LEAVE
  ========================================================= */

  const [
    leaveSummary,
    setLeaveSummary,
  ] = useState({
    balance: {},
    requests: [],
  });

  const [
    leaveRequests,
    setLeaveRequests,
  ] = useState([]);

  const [
    leaveModal,
    setLeaveModal,
  ] = useState({
    open: false,
    leaveType: "paid_leave",
    duration: "full_day",
    fromDate: todayKey,
    toDate: todayKey,
    reason: "",
  });

  /* =========================================================
     WFH
  ========================================================= */

  const [
    wfhRequests,
    setWfhRequests,
  ] = useState([]);

  const [
    wfhModal,
    setWfhModal,
  ] = useState({
    open: false,
    fromDate: todayKey,
    toDate: todayKey,
    reason: "",
  });

  /* =========================================================
     LOCATION HISTORY
  ========================================================= */

  const [
    historyModal,
    setHistoryModal,
  ] = useState({
    open: false,
    loading: false,
    employee: null,
    dateKey: "",
    checkpoints: [],
    error: "",
  });

  const [
    latestLocations,
    setLatestLocations,
  ] = useState({});

  /* =========================================================
     SELECTED MONTH / YEAR
  ========================================================= */

  const selectedMonth =
    Number(filters.month);

  const selectedYear =
    Number(filters.year);

  const daysInMonth =
    useMemo(
      () =>
        new Date(
          Date.UTC(
            selectedYear,
            selectedMonth + 1,
            0
          )
        ).getUTCDate(),
      [
        selectedYear,
        selectedMonth,
      ]
    );

  const startKey =
    useMemo(
      () =>
        makeDateKey(
          selectedYear,
          selectedMonth,
          1
        ),
      [
        selectedYear,
        selectedMonth,
      ]
    );

  const endKey =
    useMemo(
      () =>
        makeDateKey(
          selectedYear,
          selectedMonth,
          daysInMonth
        ),
      [
        selectedYear,
        selectedMonth,
        daysInMonth,
      ]
    );

  /* =========================================================
     SELECTED CALENDAR DATE
  ========================================================= */

  const selectedDateKey =
    selectedDay
      ? makeDateKey(
          selectedYear,
          selectedMonth,
          selectedDay
        )
      : "";

  /* =========================================================
     IMPORTANT

     NO periodic tracker is mounted here.

     Global 30-minute tracking remains mounted in Dashboard
     through GlobalAttendanceLocationTracker.

     AttendancePage performs only explicit:
     - check_in checkpoint
     - check_out checkpoint
  ========================================================= */

  /* =========================================================
     REFRESH ALL DATA
  ========================================================= */

  const refreshAll =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const jobs = [
            getAttendanceList({
              fromDate:
                startKey,

              toDate:
                endKey,

              employeeId:
                filters.employeeId ||
                undefined,
            }),

            getTodayAttendance(),

            getTimesheets({
              fromDate:
                startKey,

              toDate:
                endKey,
            }),
          ];

          if (
            canManageUsers
          ) {
            jobs.push(
              getSalesPersons()
            );
          }

          if (
            canMarkAttendance
          ) {
            jobs.push(
              getAttendanceLeaveSummary({
                month:
                  selectedMonth + 1,

                year:
                  selectedYear,
              })
            );
          }

          jobs.push(
            getAttendanceLeaveRequests({
              fromDate:
                startKey,

              toDate:
                endKey,
            })
          );

          jobs.push(
            getAttendanceWorkFromHomeRequests({
              fromDate:
                startKey,

              toDate:
                endKey,
            })
          );

          const results =
            await Promise.allSettled(
              jobs
            );

          const valueAt =
            (index) =>
              results[index]
                ?.status ===
              "fulfilled"
                ? results[index]
                    .value
                : null;

          /* ===============================================
             ATTENDANCE LIST
          =============================================== */

          const listResponse =
            valueAt(0);

          const attendanceData =
            listResponse
              ?.data
              ?.items ||
            listResponse?.data ||
            listResponse?.items ||
            [];

          setAttendanceList(
            Array.isArray(
              attendanceData
            )
              ? attendanceData
              : []
          );

          /* ===============================================
             TODAY ATTENDANCE
          =============================================== */

          const todayResponse =
            valueAt(1);

          setTodayAttendance(
            todayResponse?.data ||
            todayResponse ||
            null
          );

          /* ===============================================
             TIMESHEETS
          =============================================== */

          const timesheetResponse =
            valueAt(2);

          const timesheetData =
            timesheetResponse
              ?.data
              ?.items ||
            timesheetResponse?.data ||
            timesheetResponse?.items ||
            [];

          setTimesheets(
            Array.isArray(
              timesheetData
            )
              ? timesheetData
              : []
          );

          let index = 3;

          /* ===============================================
             EMPLOYEE MASTER
          =============================================== */

          if (
            canManageUsers
          ) {
            const employeeResponse =
              valueAt(
                index++
              );

            const employeeData =
              employeeResponse
                ?.data
                ?.salesPersons ||
              employeeResponse
                ?.data ||
              employeeResponse
                ?.salesPersons ||
              [];

            setEmployees(
              Array.isArray(
                employeeData
              )
                ? employeeData
                : []
            );
          }

          /* ===============================================
             LEAVE SUMMARY
          =============================================== */

          if (
            canMarkAttendance
          ) {
            const leaveSummaryResponse =
              valueAt(
                index++
              );

            setLeaveSummary(
              leaveSummaryResponse
                ?.data ||
              leaveSummaryResponse ||
              {
                balance: {},
                requests: [],
              }
            );
          }

          /* ===============================================
             LEAVE REQUESTS
          =============================================== */

          const leaveRequestResponse =
            valueAt(
              index++
            );

          const leaveRequestData =
            leaveRequestResponse
              ?.data
              ?.items ||
            leaveRequestResponse
              ?.data ||
            leaveRequestResponse
              ?.items ||
            [];

          setLeaveRequests(
            Array.isArray(
              leaveRequestData
            )
              ? leaveRequestData
              : []
          );

          /* ===============================================
             WFH REQUESTS
          =============================================== */

          const wfhResponse =
            valueAt(
              index++
            );

          const wfhData =
            wfhResponse
              ?.data
              ?.items ||
            wfhResponse?.data ||
            wfhResponse
              ?.items ||
            [];

          setWfhRequests(
            Array.isArray(
              wfhData
            )
              ? wfhData
              : []
          );
        } catch (error) {
          console.error(
            "Attendance refresh failed:",
            error
          );
        } finally {
          setLoading(false);
        }
      },
      [
        startKey,
        endKey,
        filters.employeeId,
        canManageUsers,
        canMarkAttendance,
        selectedMonth,
        selectedYear,
      ]
    );

  React.useEffect(
    () => {
      refreshAll();
    },
    [refreshAll]
  );

  /* =========================================================
     NORMAL EMPLOYEE MASTER LIST
  ========================================================= */

  const visibleEmployees =
    useMemo(
      () => {
        if (
          !canManageUsers
        ) {
          return [
            {
              ...user,

              _id:
                user._id ||
                user.id,
            },
          ];
        }

        const clean =
          (
            employees || []
          ).filter(
            (employee) =>
              !isLeadership(
                employee
              )
          );

        if (
          filters.employeeId
        ) {
          return clean.filter(
            (employee) =>
              String(
                employee?._id ||
                  employee?.id
              ) ===
              String(
                filters.employeeId
              )
          );
        }

        return clean;
      },
      [
        canManageUsers,
        employees,
        filters.employeeId,
        user,
      ]
    );

  /* =========================================================
     ATTENDANCE FOR SELECTED DATE
  ========================================================= */

  const selectedDateAttendanceRecords =
    useMemo(
      () => {
        if (
          !selectedDateKey
        ) {
          return [];
        }

        return (
          attendanceList ||
          []
        ).filter(
          (attendance) =>
            getDateKey(
              attendance
                ?.attendanceDate
            ) ===
            selectedDateKey
        );
      },
      [
        attendanceList,
        selectedDateKey,
      ]
    );

  /* =========================================================
     SELECTED DATE EMPLOYEE LIST

     Historical attendance is also used as employee source.
  ========================================================= */

  const selectedDateEmployees =
    useMemo(
      () => {
        if (
          !selectedDateKey
        ) {
          return [];
        }

        const employeeMap =
          new Map();

        const emailMap =
          new Map();

        /* ===============================================
           MASTER EMPLOYEES
        =============================================== */

        (
          visibleEmployees ||
          []
        ).forEach(
          (employee) => {
            if (!employee) {
              return;
            }

            const id =
              employee?._id ||
              employee?.id ||
              "";

            const email =
              String(
                employee?.email ||
                  ""
              )
                .trim()
                .toLowerCase();

            if (id) {
              employeeMap.set(
                String(id),
                employee
              );
            }

            if (email) {
              emailMap.set(
                email,
                employee
              );
            }
          }
        );

        /* ===============================================
           MERGE SELECTED-DATE ATTENDANCE EMPLOYEES
        =============================================== */

        selectedDateAttendanceRecords.forEach(
          (
            attendance
          ) => {
            if (!attendance) {
              return;
            }

            const employeeId =
              employeeIdOf(
                attendance
                  ?.employeeId
              );

            const employeeEmail =
              String(
                attendance
                  ?.employeeEmail ||
                  attendance
                    ?.employeeId
                    ?.email ||
                  ""
              )
                .trim()
                .toLowerCase();

            const employeeName =
              attendance
                ?.employeeName ||
              attendance
                ?.employeeId
                ?.name ||
              "Employee";

            const employeeRole =
              attendance
                ?.employeeId
                ?.role ||
              "user";

            let existingEmployee =
              null;

            if (
              employeeId &&
              employeeMap.has(
                String(
                  employeeId
                )
              )
            ) {
              existingEmployee =
                employeeMap.get(
                  String(
                    employeeId
                  )
                );
            }

            if (
              !existingEmployee &&
              employeeEmail &&
              emailMap.has(
                employeeEmail
              )
            ) {
              existingEmployee =
                emailMap.get(
                  employeeEmail
                );
            }

            const mergedEmployee = {
              ...(
                existingEmployee ||
                {}
              ),

              _id:
                existingEmployee
                  ?._id ||
                existingEmployee
                  ?.id ||
                employeeId ||
                undefined,

              id:
                existingEmployee
                  ?.id ||
                existingEmployee
                  ?._id ||
                employeeId ||
                undefined,

              name:
                existingEmployee
                  ?.name ||
                employeeName,

              email:
                existingEmployee
                  ?.email ||
                employeeEmail,

              role:
                existingEmployee
                  ?.role ||
                employeeRole,

              attendanceRecordId:
                attendance?._id ||
                "",
            };

            if (
              canManageUsers &&
              isLeadership(
                mergedEmployee
              )
            ) {
              return;
            }

            if (
              filters.employeeId
            ) {
              const filterId =
                String(
                  filters
                    .employeeId
                );

              const mergedId =
                String(
                  mergedEmployee
                    ?._id ||
                  mergedEmployee
                    ?.id ||
                  ""
                );

              if (
                mergedId !==
                filterId
              ) {
                return;
              }
            }

            if (
              employeeId
            ) {
              employeeMap.set(
                String(
                  employeeId
                ),
                mergedEmployee
              );
            } else if (
              employeeEmail
            ) {
              emailMap.set(
                employeeEmail,
                mergedEmployee
              );
            }
          }
        );

        /* ===============================================
           FINAL LIST FOR EXACT SELECTED DATE
        =============================================== */

        const finalEmployees =
          [];

        const addedKeys =
          new Set();

        selectedDateAttendanceRecords.forEach(
          (
            attendance
          ) => {
            const employeeId =
              employeeIdOf(
                attendance
                  ?.employeeId
              );

            const employeeEmail =
              String(
                attendance
                  ?.employeeEmail ||
                  attendance
                    ?.employeeId
                    ?.email ||
                  ""
              )
                .trim()
                .toLowerCase();

            let employee =
              null;

            if (
              employeeId
            ) {
              employee =
                employeeMap.get(
                  String(
                    employeeId
                  )
                ) ||
                null;
            }

            if (
              !employee &&
              employeeEmail
            ) {
              employee =
                emailMap.get(
                  employeeEmail
                ) ||
                null;
            }

            if (!employee) {
              employee = {
                _id:
                  employeeId ||
                  undefined,

                id:
                  employeeId ||
                  undefined,

                name:
                  attendance
                    ?.employeeName ||
                  attendance
                    ?.employeeId
                    ?.name ||
                  "Employee",

                email:
                  attendance
                    ?.employeeEmail ||
                  attendance
                    ?.employeeId
                    ?.email ||
                  "",

                role:
                  attendance
                    ?.employeeId
                    ?.role ||
                  "user",
              };
            }

            if (
              canManageUsers &&
              isLeadership(
                employee
              )
            ) {
              return;
            }

            if (
              filters.employeeId
            ) {
              const employeeIdentifier =
                String(
                  employee
                    ?._id ||
                  employee?.id ||
                  ""
                );

              if (
                employeeIdentifier !==
                String(
                  filters.employeeId
                )
              ) {
                return;
              }
            }

            const uniqueKey =
              employee?._id ||
              employee?.id ||
              employee?.email ||
              attendance?._id;

            if (
              !uniqueKey ||
              addedKeys.has(
                String(
                  uniqueKey
                )
              )
            ) {
              return;
            }

            addedKeys.add(
              String(
                uniqueKey
              )
            );

            finalEmployees.push(
              employee
            );
          }
        );

        /*
         * For user/admin looking at own empty date,
         * still show own employee card.
         */
        if (
          finalEmployees.length ===
            0 &&
          !canManageUsers &&
          user
        ) {
          finalEmployees.push({
            ...user,

            _id:
              user._id ||
              user.id,
          });
        }

        return finalEmployees;
      },
      [
        selectedDateKey,
        selectedDateAttendanceRecords,
        visibleEmployees,
        canManageUsers,
        filters.employeeId,
        user,
      ]
    );

  /* =========================================================
     FIND ATTENDANCE FOR EMPLOYEE + DATE
  ========================================================= */

  const attendanceForEmployee =
    useCallback(
      (
        employee,
        dateKey
      ) => {
        if (
          !employee ||
          !dateKey
        ) {
          return null;
        }

        const employeeId =
          employee?._id ||
          employee?.id ||
          "";

        const employeeEmail =
          String(
            employee?.email ||
              ""
          )
            .trim()
            .toLowerCase();

        return (
          attendanceList.find(
            (
              attendance
            ) => {
              if (
                getDateKey(
                  attendance
                    ?.attendanceDate
                ) !==
                dateKey
              ) {
                return false;
              }

              const recordEmployeeId =
                employeeIdOf(
                  attendance
                    ?.employeeId
                );

              const recordEmail =
                String(
                  attendance
                    ?.employeeEmail ||
                    attendance
                      ?.employeeId
                      ?.email ||
                    ""
                )
                  .trim()
                  .toLowerCase();

              const idMatches =
                Boolean(
                  employeeId &&
                    recordEmployeeId
                ) &&
                String(
                  recordEmployeeId
                ) ===
                  String(
                    employeeId
                  );

              const emailMatches =
                Boolean(
                  employeeEmail &&
                    recordEmail
                ) &&
                recordEmail ===
                  employeeEmail;

              return (
                idMatches ||
                emailMatches
              );
            }
          ) ||
          null
        );
      },
      [
        attendanceList,
      ]
    );

  /* =========================================================
     OWN ATTENDANCE
  ========================================================= */

  const ownAttendance =
    useCallback(
      (
        dateKey
      ) => {
        if (
          dateKey ===
            todayKey &&
          todayAttendance
        ) {
          return todayAttendance;
        }

        return (
          attendanceList.find(
            (
              attendance
            ) =>
              getDateKey(
                attendance
                  ?.attendanceDate
              ) ===
                dateKey &&
              sameEmployee(
                attendance,
                user
              )
          ) ||
          null
        );
      },
      [
        attendanceList,
        todayAttendance,
        todayKey,
        user,
      ]
    );

  /* =========================================================
     CALENDAR ATTENDANCE
  ========================================================= */

  const calendarAttendance =
    useCallback(
      (
        dateKey
      ) => {
        if (
          canMarkAttendance &&
          !filters.employeeId
        ) {
          return ownAttendance(
            dateKey
          );
        }

        if (
          filters.employeeId
        ) {
          const employee =
            visibleEmployees.find(
              (
                item
              ) =>
                String(
                  item?._id ||
                    item?.id
                ) ===
                String(
                  filters
                    .employeeId
                )
            );

          if (employee) {
            return attendanceForEmployee(
              employee,
              dateKey
            );
          }
        }

        return (
          attendanceList.find(
            (
              attendance
            ) =>
              getDateKey(
                attendance
                  ?.attendanceDate
              ) ===
              dateKey
          ) ||
          null
        );
      },
      [
        canMarkAttendance,
        filters.employeeId,
        ownAttendance,
        visibleEmployees,
        attendanceForEmployee,
        attendanceList,
      ]
    );

  /* =========================================================
     PENDING / SUMMARY
  ========================================================= */

  const pendingRegs =
    useMemo(
      () =>
        attendanceList.filter(
          (
            attendance
          ) =>
            attendance
              ?.regularization
              ?.status ===
            "pending"
        ),
      [
        attendanceList,
      ]
    );

  const approvedWfhCount =
    useMemo(
      () =>
        wfhRequests.filter(
          (
            request
          ) =>
            request?.status ===
            "approved"
        ).length,
      [
        wfhRequests,
      ]
    );

  const pendingWfhCount =
    useMemo(
      () =>
        wfhRequests.filter(
          (
            request
          ) =>
            request?.status ===
            "pending"
        ).length,
      [
        wfhRequests,
      ]
    );

  const pendingLeaveCount =
    useMemo(
      () =>
        leaveRequests.filter(
          (
            request
          ) =>
            request?.status ===
            "pending"
        ).length,
      [
        leaveRequests,
      ]
    );

  /* =========================================================
     TODAY STATUS
  ========================================================= */

  const todayHealth =
    useMemo(
      () =>
        getHealth(
          todayAttendance,
          todayKey,
          todayKey
        ),
      [
        todayAttendance,
        todayKey,
      ]
    );

  const todayCheckedIn =
    Boolean(
      todayAttendance
        ?.checkIn
        ?.time
    );

  const todayCheckedOut =
    Boolean(
      todayAttendance
        ?.checkOut
        ?.time
    );

  const paidLeaveRemaining =
    leaveSummary?.balance
      ?.paidLeaveRemaining ??
    leaveSummary?.balance
      ?.remaining ??
    leaveSummary?.balance
      ?.availablePaidLeave ??
    "-";

  /* =========================================================
     OPEN REGULARIZATION
  ========================================================= */

  const openRegularize =
    (
      dateKey,
      attendance = null
    ) => {
      if (
        !canMarkAttendance
      ) {
        return;
      }

      if (
        isSunday(
          dateKey
        )
      ) {
        window.alert(
          "Sunday regularization is not allowed."
        );

        return;
      }

      if (
        dateKey >
        todayKey
      ) {
        window.alert(
          "Future attendance cannot be regularized."
        );

        return;
      }

      if (
        attendance
          ?.regularization
          ?.status ===
        "pending"
      ) {
        window.alert(
          "A regularization request is already pending."
        );

        return;
      }

      if (
        [
          "on_leave",
          "loss_of_pay",
        ].includes(
          attendance
            ?.attendanceStatus
        )
      ) {
        window.alert(
          "Regularization is not allowed for approved leave."
        );

        return;
      }

      setRegularize({
        open: true,

        date:
          dateKey,

        attendance,

        requestedCheckIn:
          clockValue(
            attendance
              ?.regularization
              ?.requestedCheckIn ||
              attendance
                ?.checkIn
                ?.time
          ),

        requestedCheckOut:
          clockValue(
            attendance
              ?.regularization
              ?.requestedCheckOut ||
              attendance
                ?.checkOut
                ?.time
          ),

        reason: "",

        submitting:
          false,
      });
    };

  /* =========================================================
     SUBMIT REGULARIZATION
  ========================================================= */

  const submitRegularization =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !regularize
          .requestedCheckIn ||
        !regularize
          .requestedCheckOut
      ) {
        window.alert(
          "Please enter both Check In and Check Out."
        );

        return;
      }

      if (
        regularize
          .requestedCheckOut <=
        regularize
          .requestedCheckIn
      ) {
        window.alert(
          "Check Out must be later than Check In."
        );

        return;
      }

      if (
        !regularize
          .reason
          .trim()
      ) {
        window.alert(
          "Please enter reason."
        );

        return;
      }

      try {
        setRegularize(
          (
            previous
          ) => ({
            ...previous,

            submitting:
              true,
          })
        );

        await requestAttendanceRegularization({
          attendanceDate:
            regularize.date,

          type:
            "wrong_time",

          requestedCheckIn:
            regularize
              .requestedCheckIn,

          requestedCheckOut:
            regularize
              .requestedCheckOut,

          reason:
            regularize
              .reason
              .trim(),
        });

        setRegularize(
          (
            previous
          ) => ({
            ...previous,

            open:
              false,

            submitting:
              false,
          })
        );

        await refreshAll();
      } catch (error) {
        setRegularize(
          (
            previous
          ) => ({
            ...previous,

            submitting:
              false,
          })
        );

        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "Regularization failed."
        );
      }
    };

  /* =========================================================
     CHECK IN

     No periodic timer here.

     Global tracker continues separately.
  ========================================================= */

  const handleCheckIn =
    async () => {
      try {
        setActionLoading(
          "checkin"
        );

        await checkInAttendance();

        /*
         * Explicit immediate checkpoint.
         */
        await captureAttendanceLocationNow(
          "check_in",
          {
            force: true,
            verifyStatus: false,
          }
        );

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "Check-in failed."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =========================================================
     CHECK OUT

     Capture final checkpoint BEFORE attendance closes.
  ========================================================= */

  const handleCheckOut =
    async () => {
      try {
        setActionLoading(
          "checkout"
        );

        await captureAttendanceLocationNow(
          "check_out",
          {
            force: true,
            verifyStatus: false,
          }
        );

        await checkOutAttendance();

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "Check-out failed."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =========================================================
     APPROVE REGULARIZATION
  ========================================================= */

  const approveReg =
    async (
      attendance
    ) => {
      try {
        setActionLoading(
          attendance._id
        );

        await approveAttendanceRegularization(
          attendance._id
        );

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            "Approval failed."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =========================================================
     REJECT REGULARIZATION
  ========================================================= */

  const rejectReg =
    async (
      attendance
    ) => {
      const reason =
        window.prompt(
          "Rejection reason:"
        );

      if (
        reason ===
        null
      ) {
        return;
      }

      try {
        setActionLoading(
          attendance._id
        );

        await rejectAttendanceRegularization(
          attendance._id,
          {
            reason,
          }
        );

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            "Rejection failed."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /* =========================================================
     LEAVE
  ========================================================= */

  const submitLeave =
    async (
      event
    ) => {
      event.preventDefault();

      try {
        await applyAttendanceLeave({
          leaveType:
            leaveModal
              .leaveType,

          duration:
            leaveModal
              .duration,

          fromDate:
            leaveModal
              .fromDate,

          toDate:
            leaveModal
              .toDate,

          reason:
            leaveModal
              .reason
              .trim(),
        });

        setLeaveModal(
          (
            previous
          ) => ({
            ...previous,

            open:
              false,

            reason:
              "",
          })
        );

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "Leave request failed."
        );
      }
    };

  /* =========================================================
     WFH
  ========================================================= */

  const submitWfh =
    async (
      event
    ) => {
      event.preventDefault();

      try {
        await applyAttendanceWorkFromHome({
          fromDate:
            wfhModal
              .fromDate,

          toDate:
            wfhModal
              .toDate,

          reason:
            wfhModal
              .reason
              .trim(),
        });

        setWfhModal(
          (
            previous
          ) => ({
            ...previous,

            open:
              false,

            reason:
              "",
          })
        );

        await refreshAll();
      } catch (error) {
        window.alert(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "WFH request failed."
        );
      }
    };

  /* =========================================================
     OPEN LOCATION HISTORY
  ========================================================= */

  const openHistory =
    async (
      employee,
      dateKey
    ) => {
      if (
        !isSuperAdmin
      ) {
        return;
      }

      const employeeId =
        employee?._id ||
        employee?.id ||
        employeeIdOf(
          employee?.employeeId
        );

      if (
        !employeeId ||
        !dateKey
      ) {
        return;
      }

      setHistoryModal({
        open: true,
        loading: true,
        employee,
        dateKey,
        checkpoints: [],
        error: "",
      });

      try {
        const response =
          await getEmployeeAttendanceLocationHistory(
            employeeId,
            dateKey
          );

        const checkpoints =
          normalizeHistory(
            response
          );

        setHistoryModal(
          (
            previous
          ) => ({
            ...previous,

            loading:
              false,

            checkpoints,
          })
        );

        if (
          checkpoints.length
        ) {
          setLatestLocations(
            (
              previous
            ) => ({
              ...previous,

              [`${employeeId}:${dateKey}`]:
                checkpoints[
                  checkpoints.length -
                    1
                ],
            })
          );
        }
      } catch (error) {
        setHistoryModal(
          (
            previous
          ) => ({
            ...previous,

            loading:
              false,

            error:
              error
                ?.response
                ?.data
                ?.message ||
              error?.message ||
              "Unable to load location history.",
          })
        );
      }
    };

  /* =========================================================
     LOAD LATEST LOCATION FOR EMPLOYEE + DATE
  ========================================================= */

  const loadLatest =
    useCallback(
      async (
        employee,
        dateKey
      ) => {
        if (
          !isSuperAdmin
        ) {
          return;
        }

        const employeeId =
          employee?._id ||
          employee?.id ||
          employeeIdOf(
            employee?.employeeId
          );

        if (
          !employeeId ||
          !dateKey
        ) {
          return;
        }

        const cacheKey =
          `${employeeId}:${dateKey}`;

        if (
          Object.prototype
            .hasOwnProperty
            .call(
              latestLocations,
              cacheKey
            )
        ) {
          return;
        }

        try {
          const response =
            await getEmployeeAttendanceLocationHistory(
              employeeId,
              dateKey
            );

          const points =
            normalizeHistory(
              response
            );

          setLatestLocations(
            (
              previous
            ) => ({
              ...previous,

              [cacheKey]:
                points.length
                  ? points[
                      points.length -
                        1
                    ]
                  : null,
            })
          );
        } catch {
          setLatestLocations(
            (
              previous
            ) => ({
              ...previous,

              [cacheKey]:
                null,
            })
          );
        }
      },
      [
        isSuperAdmin,
        latestLocations,
      ]
    );

  /* =========================================================
     TODAY TEAM
  ========================================================= */

  const todayTeam =
    useMemo(
      () => {
        if (
          !canManageUsers
        ) {
          return [];
        }

        return attendanceList.filter(
          (
            attendance
          ) =>
            getDateKey(
              attendance
                ?.attendanceDate
            ) ===
            todayKey
        );
      },
      [
        attendanceList,
        canManageUsers,
        todayKey,
      ]
    );

  /* =========================================================
     PWA MONTH / YEAR HELPERS
  ========================================================= */

  const currentYear =
    new Date().getFullYear();

  const pwaYears =
    useMemo(
      () =>
        Array.from(
          {
            length: 5,
          },
          (
            _,
            index
          ) =>
            currentYear -
            index
        ),
      [
        currentYear,
      ]
    );

  const pwaSetMonth =
    (
      monthIndex
    ) => {
      setSelectedDay(
        null
      );

      setFilters(
        (
          previous
        ) => ({
          ...previous,

          month:
            monthIndex,
        })
      );
    };

  const pwaSetYear =
    (
      year
    ) => {
      setSelectedDay(
        null
      );

      setFilters(
        (
          previous
        ) => ({
          ...previous,

          year,
        })
      );
    };

  const pwaSetEmployee =
    (
      employeeId
    ) => {
      setSelectedDay(
        null
      );

      setFilters(
        (
          previous
        ) => ({
          ...previous,

          employeeId,
        })
      );
    };

  /* =========================================================
     PWA CALENDAR CELLS
  ========================================================= */

  const pwaCalendarCells =
    useMemo(
      () => {
        const firstDay =
          new Date(
            Date.UTC(
              selectedYear,
              selectedMonth,
              1
            )
          ).getUTCDay();

        return [
          ...Array(
            firstDay
          ).fill(null),

          ...Array.from(
            {
              length:
                daysInMonth,
            },
            (
              _,
              index
            ) =>
              index + 1
          ),
        ];
      },
      [
        selectedYear,
        selectedMonth,
        daysInMonth,
      ]
    );

  /* =========================================================
     CLOSE SELECTED DATE
  ========================================================= */

  const closeSelectedDay =
    () => {
      setSelectedDay(
        null
      );
    };

  /* =========================================================
     BACK TO DASHBOARD
  ========================================================= */

  const goDashboardHome =
    () => {
      if (
        typeof window
          .__goDashboardHome ===
        "function"
      ) {
        window
          .__goDashboardHome();

        return;
      }

      window.location.href =
        "/dashboard#dashboard";
    };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {/* =====================================================
          PWA / MOBILE UI

          Restored from previous production architecture.

          Uses the SAME current state/functions as desktop.
      ===================================================== */}

      <div className="attendance-pwa-ui">
        {/* ===================================================
            PWA HEADER
        =================================================== */}

        <header className="att-pwa-header">
          <div className="att-pwa-header-row">
            <button
              type="button"
              className="att-pwa-back"
              onClick={
                goDashboardHome
              }
              aria-label="Back to dashboard"
            >
              ‹
            </button>

            <div className="att-pwa-header-copy">
              <span>
                BHARAT RMS HRMS
              </span>

              <h2>
                Attendance & Leave
              </h2>

              <p>
                Attendance, leave,
                WFH and location audit
              </p>
            </div>

            <button
              type="button"
              className={`att-pwa-refresh ${
                loading
                  ? "spinning"
                  : ""
              }`}
              onClick={
                refreshAll
              }
              disabled={
                loading
              }
              aria-label="Refresh attendance"
            >
              ↻
            </button>
          </div>
        </header>

        {/* ===================================================
            PWA SCROLL AREA
        =================================================== */}

        <div className="att-pwa-scroll">
          {/* =================================================
              QUICK ACTIONS

              user/admin only
          ================================================= */}

          {canMarkAttendance && (
            <div className="att-pwa-quick-actions">
              <button
                type="button"
                className="att-pwa-quick-action regularize"
                onClick={() =>
                  openRegularize(
                    selectedDateKey ||
                      todayKey,

                    selectedDateKey
                      ? ownAttendance(
                          selectedDateKey
                        )
                      : todayAttendance
                  )
                }
              >
                <span>
                  ⏱
                </span>

                <div>
                  <strong>
                    Regularize
                  </strong>

                  <small>
                    Correct attendance
                  </small>
                </div>
              </button>

              <button
                type="button"
                className="att-pwa-quick-action wfh"
                onClick={() =>
                  setWfhModal(
                    (
                      previous
                    ) => ({
                      ...previous,

                      open:
                        true,

                      fromDate:
                        selectedDateKey ||
                        todayKey,

                      toDate:
                        selectedDateKey ||
                        todayKey,
                    })
                  )
                }
              >
                <span>
                  ⌂
                </span>

                <div>
                  <strong>
                    WFH
                  </strong>

                  <small>
                    Apply remote work
                  </small>
                </div>
              </button>

              <button
                type="button"
                className="att-pwa-quick-action leave"
                onClick={() =>
                  setLeaveModal(
                    (
                      previous
                    ) => ({
                      ...previous,

                      open:
                        true,

                      fromDate:
                        selectedDateKey ||
                        todayKey,

                      toDate:
                        selectedDateKey ||
                        todayKey,
                    })
                  )
                }
              >
                <span>
                  🏖
                </span>

                <div>
                  <strong>
                    Leave
                  </strong>

                  <small>
                    Apply leave
                  </small>
                </div>
              </button>
            </div>
          )}

          {/* =================================================
              PWA INSIGHT CARDS
          ================================================= */}

          <div className="att-pwa-insight-grid">
            <div className="att-pwa-insight-card today">
              <span>
                Today Status
              </span>

              <strong>
                {todayHealth.label}
              </strong>

              <small>
                {todayCheckedIn
                  ? `In ${displayCheckIn(
                      todayAttendance
                    )}`
                  : "Attendance not marked"}
              </small>
            </div>

            {canMarkAttendance && (
              <>
                <div className="att-pwa-insight-card leave">
                  <span>
                    Paid Leave
                  </span>

                  <strong>
                    {
                      paidLeaveRemaining
                    }
                  </strong>

                  <small>
                    Available balance
                  </small>
                </div>

                <div className="att-pwa-insight-card pending">
                  <span>
                    Regularization
                  </span>

                  <strong>
                    {
                      pendingRegs.length
                    }
                  </strong>

                  <small>
                    Pending requests
                  </small>
                </div>

                <div className="att-pwa-insight-card wfh">
                  <span>
                    Approved WFH
                  </span>

                  <strong>
                    {
                      approvedWfhCount
                    }
                  </strong>

                  <small>
                    Selected period
                  </small>
                </div>
              </>
            )}

            {canManageUsers && (
              <>
                <div className="att-pwa-insight-card pending">
                  <span>
                    Leave Pending
                  </span>

                  <strong>
                    {
                      pendingLeaveCount
                    }
                  </strong>

                  <small>
                    Approval queue
                  </small>
                </div>

                <div className="att-pwa-insight-card wfh">
                  <span>
                    WFH Pending
                  </span>

                  <strong>
                    {
                      pendingWfhCount
                    }
                  </strong>

                  <small>
                    Approval queue
                  </small>
                </div>
              </>
            )}
          </div>

          {/* =================================================
              PWA MONTH FILTER
          ================================================= */}

          <div className="att-pwa-filter-card">
            <div className="att-pwa-card-title">
              <div>
                <span>
                  REPORTING PERIOD
                </span>

                <h3>
                  Month Filter
                </h3>
              </div>

              <b>
                {
                  MONTHS[
                    selectedMonth
                  ]
                }{" "}
                {
                  selectedYear
                }
              </b>
            </div>

            <div className="att-pwa-month-scroll">
              {MONTHS.map(
                (
                  month,
                  index
                ) => (
                  <button
                    type="button"
                    key={
                      month
                    }
                    className={
                      selectedMonth ===
                      index
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      pwaSetMonth(
                        index
                      )
                    }
                  >
                    {month.slice(
                      0,
                      3
                    )}
                  </button>
                )
              )}
            </div>

            <div className="att-pwa-year-row">
              {pwaYears.map(
                (
                  year
                ) => (
                  <button
                    type="button"
                    key={
                      year
                    }
                    className={
                      selectedYear ===
                      year
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      pwaSetYear(
                        year
                      )
                    }
                  >
                    {year}
                  </button>
                )
              )}
            </div>

            {canManageUsers && (
              <div className="att-pwa-employee-row">
                <button
                  type="button"
                  className={
                    !filters.employeeId
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    pwaSetEmployee(
                      ""
                    )
                  }
                >
                  All
                </button>

                {visibleEmployees.map(
                  (
                    employee
                  ) => (
                    <button
                      type="button"
                      key={
                        employee._id ||
                        employee.id
                      }
                      className={
                        String(
                          filters
                            .employeeId
                        ) ===
                        String(
                          employee._id ||
                            employee.id
                        )
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        pwaSetEmployee(
                          employee._id ||
                            employee.id
                        )
                      }
                    >
                      {employee.name ||
                        employee.email}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* =================================================
              PWA TODAY ATTENDANCE
          ================================================= */}

          {canMarkAttendance && (
            <div className="att-pwa-today-card">
              <div className="att-pwa-today-top">
                <div>
                  <span>
                    TODAY'S ATTENDANCE
                  </span>

                  <h3>
                    {todayCheckedIn
                      ? `Checked in at ${displayCheckIn(
                          todayAttendance
                        )}`
                      : "Ready to check in"}
                  </h3>

                  <p>
                    {todayCheckedOut
                      ? `Checked out at ${displayCheckOut(
                          todayAttendance
                        )}`
                      : todayCheckedIn
                      ? "Attendance is active. Location tracking will continue."
                      : "Location will be captured securely at Check In."}
                  </p>
                </div>

                <span
                  className={`att-pwa-pill ${todayHealth.className}`}
                >
                  {
                    todayHealth.label
                  }
                </span>
              </div>

              <div className="att-pwa-detail-grid">
                <div>
                  <span>
                    Check In
                  </span>

                  <b>
                    {displayCheckIn(
                      todayAttendance
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Check Out
                  </span>

                  <b>
                    {displayCheckOut(
                      todayAttendance
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Working
                  </span>

                  <b>
                    {formatMinutes(
                      todayAttendance
                        ?.totalWorkingMinutes
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Mode
                  </span>

                  <b>
                    {todayAttendance
                      ?.workMode ===
                    "work_from_home"
                      ? "WFH"
                      : "Office"}
                  </b>
                </div>
              </div>

              <div className="att-pwa-action-grid">
                <button
                  type="button"
                  className="checkin"
                  disabled={
                    todayCheckedIn ||
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={
                    handleCheckIn
                  }
                >
                  {actionLoading ===
                  "checkin"
                    ? "Checking In..."
                    : todayCheckedIn
                    ? "Checked In"
                    : "Check In"}
                </button>

                <button
                  type="button"
                  className="checkout"
                  disabled={
                    !todayCheckedIn ||
                    todayCheckedOut ||
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={
                    handleCheckOut
                  }
                >
                  {actionLoading ===
                  "checkout"
                    ? "Checking Out..."
                    : todayCheckedOut
                    ? "Checked Out"
                    : "Check Out"}
                </button>
              </div>

              <button
                type="button"
                className="att-pwa-regularize-btn"
                disabled={
                  todayAttendance
                    ?.regularization
                    ?.status ===
                  "pending"
                }
                onClick={() =>
                  openRegularize(
                    todayKey,
                    todayAttendance
                  )
                }
              >
                Request Regularization
              </button>
            </div>
          )}

          {/* =================================================
              PWA TEAM / SUPER ADMIN OVERVIEW
          ================================================= */}

          {canManageUsers && (
            <div className="att-pwa-section">
              <div className="att-pwa-section-head">
                <div>
                  <span>
                    LIVE OVERVIEW
                  </span>

                  <h3>
                    Today's Team
                  </h3>
                </div>

                <b>
                  {
                    todayTeam.length
                  }{" "}
                  records
                </b>
              </div>

              {todayTeam.length ===
              0 ? (
                <div className="att-pwa-empty">
                  No attendance records
                  for today.
                </div>
              ) : (
                todayTeam.map(
                  (
                    attendance
                  ) => {
                    const employeeId =
                      employeeIdOf(
                        attendance
                          ?.employeeId
                      );

                    const employee = {
                      _id:
                        employeeId,

                      id:
                        employeeId,

                      name:
                        attendance
                          ?.employeeName ||
                        attendance
                          ?.employeeId
                          ?.name ||
                        "Employee",

                      email:
                        attendance
                          ?.employeeEmail ||
                        attendance
                          ?.employeeId
                          ?.email ||
                        "",
                    };

                    const health =
                      getHealth(
                        attendance,
                        todayKey,
                        todayKey
                      );

                    const point =
                      latestLocations[
                        `${employeeId}:${todayKey}`
                      ];

                    return (
                      <div
                        key={
                          attendance._id ||
                          `${employeeId}-${todayKey}`
                        }
                        className="att-pwa-attendance-card"
                      >
                        <div className="att-pwa-card-top">
                          <div>
                            <h4>
                              {
                                employee.name
                              }
                            </h4>

                            <p>
                              {
                                employee.email
                              }
                            </p>
                          </div>

                          <span
                            className={`att-pwa-pill ${health.className}`}
                          >
                            {
                              health.label
                            }
                          </span>
                        </div>

                        <div className="att-pwa-detail-grid">
                          <div>
                            <span>
                              Check In
                            </span>

                            <b>
                              {displayCheckIn(
                                attendance
                              )}
                            </b>
                          </div>

                          <div>
                            <span>
                              Check Out
                            </span>

                            <b>
                              {displayCheckOut(
                                attendance
                              )}
                            </b>
                          </div>

                          <div>
                            <span>
                              Total
                            </span>

                            <b>
                              {formatMinutes(
                                attendance
                                  ?.totalWorkingMinutes
                              )}
                            </b>
                          </div>

                          <div>
                            <span>
                              Mode
                            </span>

                            <b>
                              {attendance
                                ?.workMode ===
                              "work_from_home"
                                ? "WFH"
                                : "Office"}
                            </b>
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <div className="att-pwa-location-actions">
                            <button
                              type="button"
                              className="att-pwa-location-history-btn"
                              onClick={() =>
                                openHistory(
                                  employee,
                                  todayKey
                                )
                              }
                            >
                              {point
                                ? "Location History"
                                : "Check Location History"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                )
              )}
            </div>
          )}

          {/* =================================================
              PWA REGULARIZATION QUEUE

              SUPER ADMIN ONLY
          ================================================= */}

          {canApproveRegularization &&
            pendingRegs.length >
              0 && (
              <div className="att-pwa-section">
                <div className="att-pwa-section-head">
                  <div>
                    <span>
                      APPROVAL QUEUE
                    </span>

                    <h3>
                      Regularization
                    </h3>
                  </div>

                  <b>
                    {
                      pendingRegs.length
                    }{" "}
                    pending
                  </b>
                </div>

                {pendingRegs.map(
                  (
                    attendance
                  ) => (
                    <div
                      key={
                        attendance._id
                      }
                      className="att-pwa-request-card"
                    >
                      <div className="att-pwa-request-card-head">
                        <div>
                          <h4>
                            {attendance
                              ?.employeeName ||
                              "Employee"}
                          </h4>

                          <p>
                            {formatDate(
                              attendance
                                ?.attendanceDate
                            )}
                          </p>
                        </div>

                        <span>
                          Pending
                        </span>
                      </div>

                      <div className="att-pwa-detail-grid">
                        <div>
                          <span>
                            Requested In
                          </span>

                          <b>
                            {attendance
                              ?.regularization
                              ?.requestedCheckIn
                              ? displayCheckIn(
                                  {
                                    ...attendance,

                                    regularization:
                                      {
                                        ...attendance
                                          .regularization,

                                        status:
                                          "approved",
                                      },
                                  }
                                )
                              : "-"}
                          </b>
                        </div>

                        <div>
                          <span>
                            Requested Out
                          </span>

                          <b>
                            {attendance
                              ?.regularization
                              ?.requestedCheckOut
                              ? displayCheckOut(
                                  {
                                    ...attendance,

                                    regularization:
                                      {
                                        ...attendance
                                          .regularization,

                                        status:
                                          "approved",
                                      },
                                  }
                                )
                              : "-"}
                          </b>
                        </div>
                      </div>

                      <div className="att-pwa-reason">
                        <span>
                          Reason
                        </span>

                        <p>
                          {attendance
                            ?.regularization
                            ?.reason ||
                            "-"}
                        </p>
                      </div>

                      <div className="att-pwa-request-actions">
                        <button
                          type="button"
                          disabled={
                            actionLoading ===
                            attendance._id
                          }
                          onClick={() =>
                            approveReg(
                              attendance
                            )
                          }
                        >
                          {actionLoading ===
                          attendance._id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          className="reject"
                          disabled={
                            actionLoading ===
                            attendance._id
                          }
                          onClick={() =>
                            rejectReg(
                              attendance
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          {/* =================================================
              PWA CALENDAR
          ================================================= */}

          <div className="att-pwa-calendar-card">
            <div className="att-pwa-card-title">
              <div>
                <span>
                  MONTHLY VIEW
                </span>

                <h3>
                  Attendance Calendar
                </h3>
              </div>

              <b>
                {
                  MONTHS[
                    selectedMonth
                  ]
                }{" "}
                {
                  selectedYear
                }
              </b>
            </div>

            <div className="att-pwa-legend-row">
              <span>
                <b className="complete" />
                Present
              </span>

              <span>
                <b className="leave" />
                Leave
              </span>

              <span>
                <b className="short" />
                Short
              </span>

              <span>
                <b className="missing" />
                Missing
              </span>

              <span>
                <b className="off" />
                Sunday
              </span>
            </div>

            <div className="att-pwa-calendar-grid">
              {[
                "S",
                "M",
                "T",
                "W",
                "T",
                "F",
                "S",
              ].map(
                (
                  day,
                  index
                ) => (
                  <div
                    key={`${day}-${index}`}
                    className="week-name att-pwa-week-name"
                  >
                    {day}
                  </div>
                )
              )}

              {pwaCalendarCells.map(
                (
                  day,
                  index
                ) => {
                  if (
                    !day
                  ) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="att-pwa-empty-day"
                      />
                    );
                  }

                  const dateKey =
                    makeDateKey(
                      selectedYear,
                      selectedMonth,
                      day
                    );

                  const attendance =
                    calendarAttendance(
                      dateKey
                    );

                  const health =
                    getHealth(
                      attendance,
                      dateKey,
                      todayKey
                    );

                  return (
                    <button
                      key={
                        dateKey
                      }
                      type="button"
                      className={`att-pwa-day att-pwa-calendar-day ${health.className} ${
                        selectedDay ===
                        day
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedDay(
                          day
                        )
                      }
                      title={
                        health.label
                      }
                    >
                      {day}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* =================================================
              PWA MONTHLY RECORDS
          ================================================= */}

        

          {/* =================================================
              SAFE PWA BOTTOM SPACE
          ================================================= */}

          <div className="att-pwa-bottom-space" />
        </div>
      </div>

      {/* =====================================================
          DESKTOP UI

          Existing production desktop UI preserved.
      ===================================================== */}

      <div className="attendance-desktop-ui">
        <main className="timesheet-container">
          {/* =================================================
              HEADER
          ================================================= */}

          <AttendanceHeader
            user={
              user
            }
            canMarkAttendance={
              canMarkAttendance
            }
            isSuperAdmin={
              isSuperAdmin
            }
            onRegularize={() =>
              openRegularize(
                todayKey,
                todayAttendance
              )
            }
            onLeave={() =>
              setLeaveModal(
                (
                  previous
                ) => ({
                  ...previous,

                  open:
                    true,
                })
              )
            }
            onWfh={() =>
              setWfhModal(
                (
                  previous
                ) => ({
                  ...previous,

                  open:
                    true,
                })
              )
            }
          />

          {/* =================================================
              SUMMARY
          ================================================= */}

          <AttendanceSummaryCards
            todayAttendance={
              todayAttendance
            }
            leaveSummary={
              leaveSummary
            }
            pendingRegularizations={
              pendingRegs.length
            }
            approvedWfhCount={
              approvedWfhCount
            }
          />

          {/* =================================================
              TODAY
          ================================================= */}

          <AttendanceTodayCard
            attendance={
              todayAttendance
            }
            canMarkAttendance={
              canMarkAttendance
            }
            actionLoading={
              actionLoading
            }
            onCheckIn={
              handleCheckIn
            }
            onCheckOut={
              handleCheckOut
            }
            onRegularize={() =>
              openRegularize(
                todayKey,
                todayAttendance
              )
            }
          />

          {/* =================================================
              FILTERS
          ================================================= */}

          <AttendanceFilters
            filters={
              filters
            }
            setFilters={(
              updater
            ) => {
              setSelectedDay(
                null
              );

              setFilters(
                updater
              );
            }}
            employees={
              visibleEmployees
            }
            canManageUsers={
              canManageUsers
            }
          />

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div className="attendance-admin-card">
              <div className="empty-state">
                Loading attendance...
              </div>
            </div>
          ) : null}

          {/* =================================================
              REGULARIZATION QUEUE
          ================================================= */}

          {!loading &&
          canApproveRegularization ? (
            <RegularizationQueue
              items={
                pendingRegs
              }
              actionLoading={
                actionLoading
              }
              onApprove={
                approveReg
              }
              onReject={
                rejectReg
              }
            />
          ) : null}

          {/* =================================================
              TODAY ADMIN OVERVIEW
          ================================================= */}

          {!loading &&
          canManageUsers ? (
            <AttendanceAdminOverview
              records={
                todayTeam
              }
              todayKey={
                todayKey
              }
              isSuperAdmin={
                isSuperAdmin
              }
              latestLocations={
                latestLocations
              }
              onHistory={
                openHistory
              }
            />
          ) : null}

          {/* =================================================
              REPORT + CALENDAR
          ================================================= */}

          {!loading ? (
            <div className="timesheet-main-grid">
              <ReportsCard
                records={
                  attendanceList
                }
                todayKey={
                  todayKey
                }
                monthName={
                  MONTHS[
                    selectedMonth
                  ]
                }
                year={
                  selectedYear
                }
              />

              <AttendanceCalendar
                year={
                  selectedYear
                }
                month={
                  selectedMonth
                }
                daysInMonth={
                  daysInMonth
                }
                attendanceForDate={
                  calendarAttendance
                }
                selectedDay={
                  selectedDay
                }
                setSelectedDay={
                  setSelectedDay
                }
                todayKey={
                  todayKey
                }
              />
            </div>
          ) : null}
        </main>
      </div>

      {/* =====================================================
          SHARED SELECTED DATE POPUP

          IMPORTANT:
          This is OUTSIDE desktop/PWA wrappers.

          Therefore both desktop AND PWA use exactly the same
          new detailed view + location history functionality.
      ===================================================== */}

      {selectedDateKey ? (
        <div
          className="timesheet-modal-overlay"
          role="presentation"
          onMouseDown={
            closeSelectedDay
          }
        >
          <div
            className="timesheet-modal attendance-day-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Attendance details for ${selectedDateKey}`}
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="attendance-eyebrow">
                  DAILY DETAIL
                </span>

                <h3>
                  Attendance Details
                </h3>

                <p>
                  {
                    selectedDateKey
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeSelectedDay
                }
                aria-label="Close attendance details"
              >
                ×
              </button>
            </div>

            <div className="modal-body attendance-day-modal-body">
              <AttendanceDayDetails
                selectedDateKey={
                  selectedDateKey
                }
                employees={
                  selectedDateEmployees
                }
                attendanceForEmployee={
                  attendanceForEmployee
                }
                todayKey={
                  todayKey
                }
                isSuperAdmin={
                  isSuperAdmin
                }
                latestLocations={
                  latestLocations
                }
                loadLatest={
                  loadLatest
                }
                onHistory={
                  openHistory
                }
                canMarkAttendance={
                  canMarkAttendance
                }
                currentUser={
                  user
                }
                onRegularize={
                  openRegularize
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          SHARED MODALS

          Same modals used by web AND PWA.
      ===================================================== */}

      <RegularizationModal
        state={
          regularize
        }
        setState={
          setRegularize
        }
        onSubmit={
          submitRegularization
        }
      />

      {!isSuperAdmin ? (
        <LeaveModal
          state={
            leaveModal
          }
          setState={
            setLeaveModal
          }
          summary={
            leaveSummary
          }
          onSubmit={
            submitLeave
          }
        />
      ) : null}

      {canMarkAttendance ? (
        <WfhModal
          state={
            wfhModal
          }
          setState={
            setWfhModal
          }
          onSubmit={
            submitWfh
          }
        />
      ) : null}

      <LocationHistoryModal
        state={
          historyModal
        }
        onClose={() =>
          setHistoryModal(
            (
              previous
            ) => ({
              ...previous,

              open:
                false,
            })
          )
        }
      />
    </>
  );
}