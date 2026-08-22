// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useState,
// } from "react";


// import {
//   getTodayAttendance,
//   getAttendanceList,
//   checkInAttendance,
//   checkOutAttendance,

//   requestAttendanceRegularization,
//   approveAttendanceRegularization,
//   rejectAttendanceRegularization,

//   applyAttendanceLeave,
//   getAttendanceLeaveSummary,
//   getAttendanceLeaveRequests,
//   approveAttendanceLeave,
//   rejectAttendanceLeave,
//   cancelAttendanceLeave,

//   applyWorkFromHome as applyAttendanceWorkFromHome,
//   getPendingWorkFromHomeRequests as getAttendanceWorkFromHomeRequests,
//   approveWorkFromHome as approveAttendanceWorkFromHome,
//   rejectWorkFromHome as rejectAttendanceWorkFromHome,
// } from "../services/attendanceService";

// import { getSalesPersons } from "../services/salesOrderService";
// import { getTimesheets } from "../services/timesheetService";

// import "./Attendance.css";

// /* =====================================================
//    CONSTANTS
// ===================================================== */

// const months = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];

// const REQUIRED_WORK_MINUTES = 9 * 60;

// const INDIA_TIME_ZONE = "Asia/Kolkata";

// const LEAVE_TYPES = [
//   {
//     value: "paid_leave",
//     label: "Paid Leave",
//   },
//   {
//     value: "loss_of_pay",
//     label: "Loss of Pay",
//   },
// ];

// const LEAVE_DURATIONS = [
//   {
//     value: "full_day",
//     label: "Full Day",
//   },
//   {
//     value: "first_half",
//     label: "First Half",
//   },
//   {
//     value: "second_half",
//     label: "Second Half",
//   },
// ];

// /* =====================================================
//    INDIA DATE / TIME HELPERS

//    Do not use browser-local date calculations for API keys.
//    All calendar keys are calculated using Asia/Kolkata.
// ===================================================== */

// const getIndiaDateParts = (value = new Date()) => {
//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return {
//       year: "",
//       month: "",
//       day: "",
//     };
//   }

//   const parts = new Intl.DateTimeFormat("en-CA", {
//     timeZone: INDIA_TIME_ZONE,
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   }).formatToParts(date);

//   return {
//     year:
//       parts.find((part) => part.type === "year")
//         ?.value || "",

//     month:
//       parts.find((part) => part.type === "month")
//         ?.value || "",

//     day:
//       parts.find((part) => part.type === "day")
//         ?.value || "",
//   };
// };

// const getDateKey = (value = new Date()) => {
//   if (!value) return "";

//   /*
//    * Preserve an already-valid date-only string.
//    */
//   if (
//     typeof value === "string" &&
//     /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
//   ) {
//     return value.trim();
//   }

//   const parts = getIndiaDateParts(value);

//   if (!parts.year || !parts.month || !parts.day) {
//     return "";
//   }

//   return `${parts.year}-${parts.month}-${parts.day}`;
// };

// const makeIndiaDateKey = (
//   year,
//   monthIndex,
//   day
// ) => {
//   return `${String(year).padStart(4, "0")}-${String(
//     monthIndex + 1
//   ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// };

// const parseDateKeyParts = (dateKey) => {
//   const match = String(dateKey || "").match(
//     /^(\d{4})-(\d{2})-(\d{2})$/
//   );

//   if (!match) {
//     return null;
//   }

//   return {
//     year: Number(match[1]),
//     monthIndex: Number(match[2]) - 1,
//     day: Number(match[3]),
//   };
// };

// const isSundayByDateKey = (dateKey) => {
//   const parts = parseDateKeyParts(dateKey);

//   if (!parts) return false;

//   return (
//     new Date(
//       Date.UTC(
//         parts.year,
//         parts.monthIndex,
//         parts.day
//       )
//     ).getUTCDay() === 0
//   );
// };

// const formatTime = (date) => {
//   if (!date) return "-";

//   const parsedDate = new Date(date);

//   if (Number.isNaN(parsedDate.getTime())) {
//     return "-";
//   }

//   return parsedDate.toLocaleTimeString("en-IN", {
//     timeZone: INDIA_TIME_ZONE,
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const formatDate = (date) => {
//   if (!date) return "-";

//   const parsedDate = new Date(date);

//   if (Number.isNaN(parsedDate.getTime())) {
//     return "-";
//   }

//   return parsedDate.toLocaleDateString("en-IN", {
//     timeZone: INDIA_TIME_ZONE,
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const formatReadableDate = (dateKey) => {
//   const parts = parseDateKeyParts(dateKey);

//   if (!parts) return "-";

//   const safeDate = new Date(
//     `${dateKey}T00:00:00+05:30`
//   );

//   return safeDate.toLocaleDateString("en-IN", {
//     timeZone: INDIA_TIME_ZONE,
//     weekday: "long",
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// };

// const formatRegularizedTime = (date) => {
//   return formatTime(date);
// };

// const formatStatus = (status) => {
//   return String(status || "-")
//     .replaceAll("_", " ")
//     .replace(/\b\w/g, (character) =>
//       character.toUpperCase()
//     );
// };

// const formatMinutes = (minutes) => {
//   const totalMinutes = Number(minutes || 0);

//   if (!totalMinutes) return "-";

//   const hours = Math.floor(totalMinutes / 60);
//   const remainingMinutes = totalMinutes % 60;

//   if (hours && remainingMinutes) {
//     return `${hours}h ${remainingMinutes}m`;
//   }

//   if (hours) {
//     return `${hours}h`;
//   }

//   return `${remainingMinutes}m`;
// };

// const getCurrentYearOptions = () => {
//   const currentIndiaYear = Number(
//     getIndiaDateParts(new Date()).year
//   );

//   return Array.from(
//     { length: 5 },
//     (_, index) => currentIndiaYear - index
//   );
// };

// /* =====================================================
//    EMPLOYEE HELPERS
// ===================================================== */

// const getEmployeeId = (value) => {
//   if (!value) return "";

//   if (typeof value === "string") {
//     return value;
//   }

//   return value._id || value.id || "";
// };

// const isSameEmployee = (record, user) => {
//   const userId = user?._id || user?.id;

//   const recordId =
//     getEmployeeId(record?.employeeId) ||
//     record?._id ||
//     record?.id;

//   return (
//     String(recordId || "") === String(userId || "") ||
//     String(record?.employeeEmail || "")
//       .trim()
//       .toLowerCase() ===
//       String(user?.email || "")
//         .trim()
//         .toLowerCase() ||
//     String(record?.employeeName || "")
//       .trim()
//       .toLowerCase() ===
//       String(user?.name || "")
//         .trim()
//         .toLowerCase()
//   );
// };

// const isLeadershipUser = (item = {}) => {
//   const role = String(
//     item.role ||
//       item.employeeRole ||
//       item.employeeId?.role ||
//       ""
//   ).toLowerCase();

//   const name = String(
//     item.name ||
//       item.employeeName ||
//       item.employeeId?.name ||
//       ""
//   ).toLowerCase();

//   const email = String(
//     item.email ||
//       item.employeeEmail ||
//       item.employeeId?.email ||
//       ""
//   ).toLowerCase();

//   return (
//     role === "super_admin" ||
//     name.includes("nilesh") ||
//     email.includes("nilesh")
//   );
// };

// /* =====================================================
//    ATTENDANCE HELPERS
// ===================================================== */

// const isWorkFromHomeAttendance = (attendance) => {
//   return (
//     attendance?.workMode === "work_from_home" ||
//     attendance?.attendanceSource ===
//       "work_from_home"
//   );
// };

// const getWorkLocationText = (attendance) => {
//   if (!isWorkFromHomeAttendance(attendance)) {
//     return "";
//   }

//   return (
//     attendance?.checkIn?.locationAddress ||
//     attendance?.checkOut?.locationAddress ||
//     "Location captured"
//   );
// };

// const getWorkLocationMapLink = (attendance) => {
//   if (!isWorkFromHomeAttendance(attendance)) {
//     return "";
//   }

//   return (
//     attendance?.checkIn?.googleMapLink ||
//     attendance?.checkOut?.googleMapLink ||
//     ""
//   );
// };

// const getDisplayCheckIn = (attendance) => {
//   if (
//     attendance?.regularization?.status ===
//     "approved"
//   ) {
//     const approvedRequestedCheckIn =
//       attendance.regularization
//         ?.requestedCheckIn;

//     if (approvedRequestedCheckIn) {
//       return formatRegularizedTime(
//         approvedRequestedCheckIn
//       );
//     }
//   }

//   return formatTime(attendance?.checkIn?.time);
// };

// const getDisplayCheckOut = (attendance) => {
//   if (
//     attendance?.regularization?.status ===
//     "approved"
//   ) {
//     const approvedRequestedCheckOut =
//       attendance.regularization
//         ?.requestedCheckOut;

//     if (approvedRequestedCheckOut) {
//       return formatRegularizedTime(
//         approvedRequestedCheckOut
//       );
//     }
//   }

//   return formatTime(attendance?.checkOut?.time);
// };

// const getRegularizationTypeLabel = (type) => {
//   if (type === "missed_check_in") {
//     return "Missing Check-in";
//   }

//   if (type === "missed_check_out") {
//     return "Missing Check-out / Short Hours";
//   }

//   if (type === "wrong_time") {
//     return "Wrong Attendance Time";
//   }

//   return formatStatus(type);
// };

// const getLeaveTypeLabel = (leaveType) => {
//   if (leaveType === "paid_leave") {
//     return "Paid Leave";
//   }

//   if (leaveType === "loss_of_pay") {
//     return "Loss of Pay";
//   }

//   return formatStatus(leaveType);
// };

// const getLeaveDurationLabel = (duration) => {
//   if (duration === "full_day") {
//     return "Full Day";
//   }

//   if (duration === "first_half") {
//     return "First Half";
//   }

//   if (duration === "second_half") {
//     return "Second Half";
//   }

//   return formatStatus(duration);
// };

// const AttendancePage = () => {

//   const user = JSON.parse(
//     localStorage.getItem("user") || "{}"
//   );

//   const isUser = user?.role === "user";
//   const isAdmin = user?.role === "admin";
//   const isSuperAdmin =
//     user?.role === "super_admin";

//   const canMarkAttendance =
//     isUser || isAdmin;

//   const canManageUsers =
//     isAdmin || isSuperAdmin;

//   /*
//    * Preserve your current production regularization rule.
//    */
//   const canApproveRegularization =
//     isSuperAdmin;

//   const canProcessNormalUserLeave =
//     isAdmin || isSuperAdmin;

//   const canProcessAdminLeave =
//     isSuperAdmin;

//   const indiaTodayKey = useMemo(
//     () => getDateKey(new Date()),
//     []
//   );

//   const indiaTodayParts = useMemo(
//     () => parseDateKeyParts(indiaTodayKey),
//     [indiaTodayKey]
//   );

//   const [attendanceList, setAttendanceList] =
//     useState([]);

//   const [todayAttendance, setTodayAttendance] =
//     useState(null);

//   const [employees, setEmployees] = useState([]);

//   const [
//     todayReportSubmitted,
//     setTodayReportSubmitted,
//   ] = useState(false);

//   const [selectedDay, setSelectedDay] =
//     useState(null);

//   const [weekPage, setWeekPage] =
//     useState(0);

//   const [
//     attendanceLoading,
//     setAttendanceLoading,
//   ] = useState(false);

//   const [
//     adminActionLoading,
//     setAdminActionLoading,
//   ] = useState("");

//   /* ===================================================
//      REGULARIZATION STATE
//   =================================================== */

//   const [
//     regularizeModal,
//     setRegularizeModal,
//   ] = useState({
//     open: false,
//     date: "",
//     type: "missed_check_out",
//   });

//   const [
//     regularizeForm,
//     setRegularizeForm,
//   ] = useState({
//     requestedCheckIn: "",
//     requestedCheckOut: "",
//     reason: "",
//   });

//   const [
//     regularizeSubmitting,
//     setRegularizeSubmitting,
//   ] = useState(false);

//   /* ===================================================
//      LEAVE STATE
//   =================================================== */

//   const [leaveSummary, setLeaveSummary] =
//     useState({
//       balance: {
//         monthlyPaidLeaveEntitlement: 1,
//         approvedPaidLeave: 0,
//         pendingPaidLeave: 0,
//         availablePaidLeave: 1,
//         approvedLossOfPay: 0,
//         lossOfPayAvailable: true,
//       },
//       requests: [],
//     });

//   const [
//     leaveRequests,
//     setLeaveRequests,
//   ] = useState([]);

//  const [, setLeavePagination] = useState({
//   totalRecords: 0,
//   currentPage: 1,
//   totalPages: 1,
//   limit: 20,
// });

//   const [
//     leaveLoading,
//     setLeaveLoading,
//   ] = useState(false);

//   const [
//     leaveActionLoading,
//     setLeaveActionLoading,
//   ] = useState("");

//   const [leaveModal, setLeaveModal] =
//     useState({
//       open: false,
//       mode: "apply",
//       request: null,
//     });

//   const [leaveForm, setLeaveForm] =
//     useState({
//       leaveType: "paid_leave",
//       duration: "full_day",
//       fromDate: indiaTodayKey,
//       toDate: indiaTodayKey,
//       reason: "",
//     });

//   /* ===================================================
//      WFH MANAGEMENT STATE

//      Current backend supports management-controlled
//      work-mode change, not employee WFH request.
//   =================================================== */

//   /* ===================================================
//      WORK FROM HOME REQUEST STATE
//   =================================================== */

//   const [
//     workFromHomeModal,
//     setWorkFromHomeModal,
//   ] = useState({
//     open: false,
//     fromDate: indiaTodayKey,
//     toDate: indiaTodayKey,
//     reason: "",
//   });

//   const [
//     workFromHomeRequests,
//     setWorkFromHomeRequests,
//   ] = useState([]);

//   const [
//     workFromHomeLoading,
//     setWorkFromHomeLoading,
//   ] = useState(false);

//   const [
//     workFromHomeActionLoading,
//     setWorkFromHomeActionLoading,
//   ] = useState("");

//   const pendingWorkFromHomeRequest =
//     useMemo(() => {
//       return (
//         workFromHomeRequests.find(
//           (request) =>
//             request.status === "pending" &&
//             isSameEmployee(request, user)
//         ) || null
//       );
//     }, [workFromHomeRequests, user]);

//   const pendingWorkFromHomeRequests =
//     useMemo(() => {
//       return workFromHomeRequests
//         .filter(
//           (request) =>
//             request.status === "pending" &&
//             !isLeadershipUser(request)
//         )
//         .sort(
//           (first, second) =>
//             new Date(second.createdAt) -
//             new Date(first.createdAt)
//         );
//     }, [workFromHomeRequests]);
//   /* ===================================================
//      FILTERS
//   =================================================== */

//   const [filters, setFilters] = useState({
//     month:
//       indiaTodayParts?.monthIndex ?? 0,

//     year:
//       indiaTodayParts?.year ??
//       new Date().getFullYear(),

//     employeeId: "",
//   });

//   const selectedMonth = Number(filters.month);
//   const selectedYear = Number(filters.year);

//   const daysInSelectedMonth = useMemo(() => {
//     return new Date(
//       Date.UTC(
//         selectedYear,
//         selectedMonth + 1,
//         0
//       )
//     ).getUTCDate();
//   }, [selectedMonth, selectedYear]);

//   const selectedMonthStartKey = useMemo(() => {
//     return makeIndiaDateKey(
//       selectedYear,
//       selectedMonth,
//       1
//     );
//   }, [selectedYear, selectedMonth]);

//   const selectedMonthEndKey = useMemo(() => {
//     return makeIndiaDateKey(
//       selectedYear,
//       selectedMonth,
//       daysInSelectedMonth
//     );
//   }, [
//     selectedYear,
//     selectedMonth,
//     daysInSelectedMonth,
//   ]);

//   const loggedInEmployee = useMemo(() => {
//     return {
//       _id: user._id || user.id,
//       id: user._id || user.id,
//       name: user.name || "Me",
//       email: user.email || "",
//       role: user.role,
//     };
//   }, [user]);

//   const allEmployeesForView = useMemo(() => {
//     const employeeMap = new Map();

//     employees.forEach((employee) => {
//       if (isLeadershipUser(employee)) return;

//       const employeeId =
//         employee._id || employee.id;

//       if (employeeId) {
//         employeeMap.set(
//           String(employeeId),
//           employee
//         );
//       }
//     });

//     if (
//       isAdmin &&
//       loggedInEmployee._id &&
//       !isLeadershipUser(loggedInEmployee)
//     ) {
//       employeeMap.set(
//         String(loggedInEmployee._id),
//         loggedInEmployee
//       );
//     }

//     attendanceList.forEach((attendance) => {
//       if (isLeadershipUser(attendance)) {
//         return;
//       }

//       const employeeId = getEmployeeId(
//         attendance.employeeId
//       );

//       if (!employeeId) return;

//       if (!employeeMap.has(String(employeeId))) {
//         employeeMap.set(String(employeeId), {
//           _id: employeeId,
//           id: employeeId,
//           name:
//             attendance.employeeName ||
//             "Employee",
//           email:
//             attendance.employeeEmail || "",
//           role:
//             attendance.employeeRole || "",
//         });
//       }
//     });

//     return Array.from(
//       employeeMap.values()
//     ).sort((first, second) =>
//       String(first.name || "").localeCompare(
//         String(second.name || "")
//       )
//     );
//   }, [
//     employees,
//     attendanceList,
//     isAdmin,
//     loggedInEmployee,
//   ]);

//   const effectiveTodayAttendance = useMemo(() => {
//     const attendanceFromList =
//       attendanceList.find((attendance) => {
//         return (
//           getDateKey(attendance.attendanceDate) ===
//             indiaTodayKey &&
//           isSameEmployee(attendance, user)
//         );
//       });

//     return (
//       attendanceFromList ||
//       todayAttendance
//     );
//   }, [
//     attendanceList,
//     todayAttendance,
//     indiaTodayKey,
//     user,
//   ]);

//   const todayCheckedIn = Boolean(
//     effectiveTodayAttendance?.checkIn?.time
//   );

//   const todayCheckedOut = Boolean(
//     effectiveTodayAttendance?.checkOut?.time
//   );

//   const regularizationStartKey = useMemo(() => {
//     const todayParts =
//       parseDateKeyParts(indiaTodayKey);

//     if (!todayParts) {
//       return indiaTodayKey;
//     }

//     const date = new Date(
//       Date.UTC(
//         todayParts.year,
//         todayParts.monthIndex,
//         todayParts.day
//       )
//     );

//     date.setUTCDate(date.getUTCDate() - 9);

//     return `${date.getUTCFullYear()}-${String(
//       date.getUTCMonth() + 1
//     ).padStart(2, "0")}-${String(
//       date.getUTCDate()
//     ).padStart(2, "0")}`;
//   }, [indiaTodayKey]);

//   /* ===================================================
//      FETCH ATTENDANCE
//   =================================================== */

//   const fetchAttendance = useCallback(async () => {
//     try {
//       const params = {
//         fromDate: selectedMonthStartKey,
//         toDate: selectedMonthEndKey,
//         limit: 100,
//       };

//       if (
//         canManageUsers &&
//         filters.employeeId
//       ) {
//         params.employeeId =
//           filters.employeeId;
//       }

//       const response =
//         await getAttendanceList(params);

//       setAttendanceList(
//         response.data || []
//       );
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           "Failed to load attendance"
//       );
//     }
//   }, [
//     selectedMonthStartKey,
//     selectedMonthEndKey,
//     filters.employeeId,
//     canManageUsers,
//   ]);

//   const fetchTodayAttendance =
//     useCallback(async () => {
//       if (!canMarkAttendance) return;

//       try {
//         const response =
//           await getTodayAttendance();

//         setTodayAttendance(
//           response.data || null
//         );
//       } catch (error) {
//         console.log(
//           "TODAY ATTENDANCE ERROR =>",
//           error
//         );
//       }
//     }, [canMarkAttendance]);

//   const fetchTodayReportStatus =
//     useCallback(async () => {
//       if (!canMarkAttendance) return;

//       try {
//         const response =
//           await getTimesheets({
//             month: selectedMonth,
//             year: selectedYear,
//           });

//         const submitted = (
//           response.data || []
//         ).some((timesheet) => {
//           return (
//             getDateKey(
//               timesheet.reportDate
//             ) === indiaTodayKey
//           );
//         });

//         setTodayReportSubmitted(
//           submitted
//         );
//       } catch (error) {
//         console.log(
//           "TIMESHEET STATUS ERROR =>",
//           error
//         );
//       }
//     }, [
//       canMarkAttendance,
//       selectedMonth,
//       selectedYear,
//       indiaTodayKey,
//     ]);

//   const fetchEmployees = useCallback(async () => {
//     if (!canManageUsers) return;

//     try {
//       const data = await getSalesPersons();

//       setEmployees(data || []);
//     } catch (error) {
//       console.log(
//         "EMPLOYEE FETCH ERROR =>",
//         error
//       );
//     }
//   }, [canManageUsers]);

//   /* ===================================================
//      FETCH LEAVE
//   =================================================== */

//   const fetchMyLeaveSummary =
//     useCallback(async () => {
//       if (!canMarkAttendance) return;

//       try {
//         const monthKey = `${selectedYear}-${String(
//           selectedMonth + 1
//         ).padStart(2, "0")}-01`;

//         const response = await getAttendanceLeaveSummary({
//   month: monthKey,
// });

// setLeaveSummary(
//   response?.data || {
//     balance: {
//       monthlyPaidLeaveEntitlement: 1,
//       approvedPaidLeave: 0,
//       pendingPaidLeave: 0,
//       availablePaidLeave: 1,
//       approvedLossOfPay: 0,
//       lossOfPayAvailable: true,
//     },
//     requests: [],
//   }
// );
//       } catch (error) {
//         console.log(
//           "LEAVE SUMMARY ERROR =>",
//           error
//         );
//       }
//     }, [
//       canMarkAttendance,
//       selectedYear,
//       selectedMonth,
//     ]);

//   const fetchLeaveRequests =
//     useCallback(async () => {
//       try {
//         setLeaveLoading(true);

//         const params = {
//           fromDate: selectedMonthStartKey,
//           toDate: selectedMonthEndKey,
//           page: 1,
//           limit: 100,
//         };

//         if (
//           canManageUsers &&
//           filters.employeeId
//         ) {
//           params.employeeId =
//             filters.employeeId;
//         }

//         const response =
//           await getAttendanceLeaveRequests(
//             params
//           );

//         setLeaveRequests(
//           response.data || []
//         );

//         setLeavePagination(
//           response.pagination || {
//             totalRecords: 0,
//             currentPage: 1,
//             totalPages: 1,
//             limit: 100,
//           }
//         );
//       } catch (error) {
//         console.log(
//           "LEAVE REQUEST FETCH ERROR =>",
//           error
//         );

//         setLeaveRequests([]);
//       } finally {
//         setLeaveLoading(false);
//       }
//     }, [
//       selectedMonthStartKey,
//       selectedMonthEndKey,
//       filters.employeeId,
//       canManageUsers,
//     ]);


//       const fetchWorkFromHomeRequests =
//     useCallback(async () => {
//       try {
//         const params = {
//           fromDate: selectedMonthStartKey,
//           toDate: selectedMonthEndKey,
//           page: 1,
//           limit: 100,
//         };

//         if (
//           canManageUsers &&
//           filters.employeeId
//         ) {
//           params.employeeId =
//             filters.employeeId;
//         }

//         const response =
//   await getAttendanceWorkFromHomeRequests(
//     params
//   );

// const responseData = response?.data;

// const requests = Array.isArray(responseData)
//   ? responseData
//   : Array.isArray(responseData?.requests)
//   ? responseData.requests
//   : Array.isArray(responseData?.workFromHomeRequests)
//   ? responseData.workFromHomeRequests
//   : [];

// setWorkFromHomeRequests(requests);
//       } catch (error) {
//         console.log(
//           "WORK FROM HOME FETCH ERROR =>",
//           error
//         );

//         setWorkFromHomeRequests([]);
//       }
//     }, [
//       selectedMonthStartKey,
//       selectedMonthEndKey,
//       filters.employeeId,
//       canManageUsers,
//     ]);


//    const refreshAll = useCallback(async () => {
//     await Promise.allSettled([
//       fetchAttendance(),
//       fetchTodayAttendance(),
//       fetchTodayReportStatus(),
//       fetchMyLeaveSummary(),
//       fetchLeaveRequests(),
//       fetchWorkFromHomeRequests(),
//     ]);
//   }, [
//     fetchAttendance,
//     fetchTodayAttendance,
//     fetchTodayReportStatus,
//     fetchMyLeaveSummary,
//     fetchLeaveRequests,
//     fetchWorkFromHomeRequests,
//   ]);

//   useEffect(() => {
//     refreshAll();
//   }, [refreshAll]);

//   useEffect(() => {
//     fetchEmployees();
//   }, [fetchEmployees]);

//   /* ===================================================
//      CALENDAR WEEKS
//   =================================================== */

//   const weeks = useMemo(() => {
//     const result = [];
//     let currentWeek = [];

//     for (
//       let day = 1;
//       day <= daysInSelectedMonth;
//       day += 1
//     ) {
//       const dateKey = makeIndiaDateKey(
//         selectedYear,
//         selectedMonth,
//         day
//       );

//       const parts =
//         parseDateKeyParts(dateKey);

//       const dayOfWeek = new Date(
//         Date.UTC(
//           parts.year,
//           parts.monthIndex,
//           parts.day
//         )
//       ).getUTCDay();

//       if (dayOfWeek === 0) {
//         if (currentWeek.length > 0) {
//           result.push(currentWeek);
//           currentWeek = [];
//         }

//         continue;
//       }

//       currentWeek.push(day);

//       if (
//         dayOfWeek === 6 ||
//         day === daysInSelectedMonth
//       ) {
//         result.push(currentWeek);
//         currentWeek = [];
//       }
//     }

//     return result;
//   }, [
//     daysInSelectedMonth,
//     selectedMonth,
//     selectedYear,
//   ]);

//   useEffect(() => {
//     const todayParts =
//       parseDateKeyParts(indiaTodayKey);

//     const isCurrentMonth =
//       todayParts?.monthIndex ===
//         selectedMonth &&
//       todayParts?.year === selectedYear;

//     if (!isCurrentMonth) {
//       setWeekPage(0);
//       return;
//     }

//     const currentWeekIndex =
//       weeks.findIndex((week) =>
//         week.includes(todayParts.day)
//       );

//     setWeekPage(
//       currentWeekIndex >= 0
//         ? currentWeekIndex
//         : 0
//     );
//   }, [
//     selectedMonth,
//     selectedYear,
//     filters.employeeId,
//     weeks,
//     indiaTodayKey,
//   ]);

//   const currentWeekDays = useMemo(() => {
//     return weeks[weekPage] || [];
//   }, [weeks, weekPage]);

//   /* ===================================================
//      FILTERS
//   =================================================== */

//   const handleFilterChange = (event) => {
//     const { name, value } = event.target;

//     setFilters((previous) => ({
//       ...previous,
//       [name]: value,
//     }));
//   };

//   const pwaSetMonth = (monthIndex) => {
//     setFilters((previous) => ({
//       ...previous,
//       month: monthIndex,
//     }));
//   };

//   const pwaSetYear = (year) => {
//     setFilters((previous) => ({
//       ...previous,
//       year,
//     }));
//   };

//   const pwaSetEmployee = (employeeId) => {
//     setFilters((previous) => ({
//       ...previous,
//       employeeId,
//     }));
//   };

//   /* ===================================================
//      ATTENDANCE RECORD LOOKUPS
//   =================================================== */

//   const getAttendanceRecordsByDay =
//     useCallback(
//       (day) => {
//         const dateKey = makeIndiaDateKey(
//           selectedYear,
//           selectedMonth,
//           day
//         );

//         return attendanceList.filter(
//           (attendance) => {
//             if (
//               isLeadershipUser(attendance)
//             ) {
//               return false;
//             }

//             return (
//               getDateKey(
//                 attendance.attendanceDate
//               ) === dateKey
//             );
//           }
//         );
//       },
//       [
//         attendanceList,
//         selectedMonth,
//         selectedYear,
//       ]
//     );

//   // const getAttendanceByDay = (day) => {
//   //   const records =
//   //     getAttendanceRecordsByDay(day);

//   //   if (!canManageUsers) {
//   //     return (
//   //       records.find((record) =>
//   //         isSameEmployee(record, user)
//   //       ) || null
//   //     );
//   //   }

//   //   return records[0] || null;
//   // };

//   const getOwnAttendanceByDateKey =
//     useCallback(
//       (dateKey) => {
//         return (
//           attendanceList.find(
//             (attendance) =>
//               getDateKey(
//                 attendance.attendanceDate
//               ) === dateKey &&
//               isSameEmployee(
//                 attendance,
//                 user
//               )
//           ) || null
//         );
//       },
//       [attendanceList, user]
//     );

//   /* ===================================================
//      LEAVE LOOKUPS

//      Approved leave is shown even when there is no normal
//      attendance record because backend creates a leave
//      attendance record after approval. Pending future leave
//      is resolved from LeaveRequest data.
//   =================================================== */

//   const getLeaveEmployeeId = (leave) => {
//     return (
//       getEmployeeId(leave?.employeeId) ||
//       leave?.employeeId ||
//       ""
//     );
//   };

//  const isLeaveForEmployee =
//   useCallback(
//     (leave, employee) => {
//       const employeeId =
//         employee?._id ||
//         employee?.id;

//       return (
//         String(
//           getLeaveEmployeeId(leave) ||
//             ""
//         ) ===
//           String(
//             employeeId || ""
//           ) ||
//         String(
//           leave?.employeeEmail || ""
//         )
//           .trim()
//           .toLowerCase() ===
//           String(
//             employee?.email || ""
//           )
//             .trim()
//             .toLowerCase()
//       );
//     },
//     []
//   );

//   const isDateInsideLeave = (
//     dateKey,
//     leave
//   ) => {
//     const fromDateKey = getDateKey(
//       leave?.fromDate
//     );

//     const toDateKey = getDateKey(
//       leave?.toDate
//     );

//     return (
//       Boolean(fromDateKey) &&
//       Boolean(toDateKey) &&
//       dateKey >= fromDateKey &&
//       dateKey <= toDateKey
//     );
//   };

//  const getLeaveForDateAndEmployee =
//   useCallback(
//     (dateKey, employee) => {
//       return (
//         leaveRequests.find(
//           (leave) =>
//             leave.status !==
//               "cancelled" &&
//             leave.status !==
//               "rejected" &&
//             isLeaveForEmployee(
//               leave,
//               employee
//             ) &&
//             isDateInsideLeave(
//               dateKey,
//               leave
//             )
//         ) || null
//       );
//     },
//     [
//       leaveRequests,
//       isLeaveForEmployee,
//     ]
//   );

//   const ownLeaveRequests = useMemo(() => {
//   return (
//     leaveSummary?.requests ||
//     leaveRequests.filter((leave) =>
//       isLeaveForEmployee(
//         leave,
//         loggedInEmployee
//       )
//     )
//   );
// }, [
//   leaveSummary,
//   leaveRequests,
//   loggedInEmployee,
//   isLeaveForEmployee,
// ]);

//   const getOwnLeaveForDateKey =
//     useCallback(
//       (dateKey) => {
//         return (
//           ownLeaveRequests.find(
//             (leave) =>
//               ![
//                 "cancelled",
//                 "rejected",
//               ].includes(leave.status) &&
//               isDateInsideLeave(
//                 dateKey,
//                 leave
//               )
//           ) || null
//         );
//       },
//       [ownLeaveRequests]
//     );

//   /* ===================================================
//      STATUS / HEALTH
//   =================================================== */

//   const getHealth = (
//     attendance,
//     leaveRequest = null
//   ) => {
//     if (
//       attendance?.attendanceStatus ===
//       "on_leave"
//     ) {
//       return {
//         label: "Paid Leave",
//         className: "leave",
//       };
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "loss_of_pay"
//     ) {
//       return {
//         label: "Loss of Pay",
//         className: "lop",
//       };
//     }

//     if (
//       leaveRequest?.status === "approved"
//     ) {
//       return {
//         label:
//           leaveRequest.leaveType ===
//           "loss_of_pay"
//             ? "Loss of Pay"
//             : "Paid Leave",
//         className:
//           leaveRequest.leaveType ===
//           "loss_of_pay"
//             ? "lop"
//             : "leave",
//       };
//     }

//     if (
//       leaveRequest?.status === "pending"
//     ) {
//       return {
//         label: "Leave Pending",
//         className: "leave-pending",
//       };
//     }

//     const minutes = Number(
//       attendance?.totalWorkingMinutes || 0
//     );

//     if (
//       attendance?.regularization?.status ===
//       "approved"
//     ) {
//       return {
//         label: "Regularized",
//         className: "complete",
//       };
//     }

//     if (
//       attendance?.regularization?.status ===
//       "pending"
//     ) {
//       return {
//         label: "Regularization Pending",
//         className: "pending",
//       };
//     }

//     if (
//       attendance?.regularization?.status ===
//       "rejected"
//     ) {
//       return {
//         label: "Regularization Rejected",
//         className: "missing",
//       };
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "checked_out"
//     ) {
//       if (
//         minutes <
//         REQUIRED_WORK_MINUTES
//       ) {
//         return {
//           label: "Short Hours",
//           className: "short",
//         };
//       }

//       return {
//         label: "Complete",
//         className: "complete",
//       };
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "checked_in"
//     ) {
//       return {
//         label: "Checkout Pending",
//         className: "pending",
//       };
//     }

//     return {
//       label: "Missing",
//       className: "missing",
//     };
//   };

//   const getDayStatus = (day) => {
//     const dateKey = makeIndiaDateKey(
//       selectedYear,
//       selectedMonth,
//       day
//     );

//     if (isSundayByDateKey(dateKey)) {
//       return "off";
//     }

//     const records =
//       getAttendanceRecordsByDay(day);

//     if (canManageUsers) {
//       const dateLeaves =
//         leaveRequests.filter(
//           (leave) =>
//             ![
//               "cancelled",
//               "rejected",
//             ].includes(leave.status) &&
//             isDateInsideLeave(
//               dateKey,
//               leave
//             )
//         );

//       if (
//         dateLeaves.some(
//           (leave) =>
//             leave.status === "pending"
//         )
//       ) {
//         return "leave-pending";
//       }

//       if (
//         dateLeaves.some(
//           (leave) =>
//             leave.status ===
//               "approved" &&
//             leave.leaveType ===
//               "loss_of_pay"
//         )
//       ) {
//         return "lop";
//       }

//       if (
//         dateLeaves.some(
//           (leave) =>
//             leave.status === "approved"
//         )
//       ) {
//         return "leave";
//       }

//       if (records.length === 0) {
//         return dateKey > indiaTodayKey
//           ? "future"
//           : "missing";
//       }

//       if (
//         records.some(
//           (attendance) =>
//             attendance.attendanceStatus ===
//             "loss_of_pay"
//         )
//       ) {
//         return "lop";
//       }

//       if (
//         records.some(
//           (attendance) =>
//             attendance.attendanceStatus ===
//             "on_leave"
//         )
//       ) {
//         return "leave";
//       }

//       if (
//         records.some(
//           (attendance) =>
//             attendance.regularization
//               ?.status === "pending"
//         )
//       ) {
//         return "warning";
//       }

//       if (
//         records.some(
//           (attendance) =>
//             attendance.attendanceStatus ===
//               "checked_out" &&
//             Number(
//               attendance.totalWorkingMinutes ||
//                 0
//             ) <
//               REQUIRED_WORK_MINUTES
//         )
//       ) {
//         return "short";
//       }

//       if (
//         records.some(
//           (attendance) =>
//             attendance.attendanceStatus ===
//             "checked_in"
//         )
//       ) {
//         return "warning";
//       }

//       return "submitted";
//     }

//     const attendance =
//       records.find((record) =>
//         isSameEmployee(record, user)
//       ) || null;

//     const leaveRequest =
//       getOwnLeaveForDateKey(dateKey);

//     if (
//       attendance?.attendanceStatus ===
//         "on_leave" ||
//       leaveRequest?.status === "approved"
//     ) {
//       return leaveRequest?.leaveType ===
//         "loss_of_pay"
//         ? "lop"
//         : attendance?.attendanceStatus ===
//           "loss_of_pay"
//         ? "lop"
//         : "leave";
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "loss_of_pay"
//     ) {
//       return "lop";
//     }

//     if (
//       leaveRequest?.status === "pending"
//     ) {
//       return "leave-pending";
//     }

//     if (dateKey > indiaTodayKey) {
//       return "future";
//     }

//     const minutes = Number(
//       attendance?.totalWorkingMinutes || 0
//     );

//     if (
//       attendance?.regularization?.status ===
//       "approved"
//     ) {
//       return "submitted";
//     }

//     if (
//       attendance?.regularization?.status ===
//       "pending"
//     ) {
//       return "warning";
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "checked_out"
//     ) {
//       return minutes <
//         REQUIRED_WORK_MINUTES
//         ? "short"
//         : "submitted";
//     }

//     if (
//       attendance?.attendanceStatus ===
//       "checked_in"
//     ) {
//       return "warning";
//     }

//     return "missing";
//   };

//   /* ===================================================
//      SELECTED DAY
//   =================================================== */

//   const selectedDateKey = selectedDay
//     ? makeIndiaDateKey(
//         selectedYear,
//         selectedMonth,
//         selectedDay
//       )
//     : "";

//   // const selectedDateObj = selectedDateKey
//   //   ? new Date(
//   //       `${selectedDateKey}T00:00:00+05:30`
//   //     )
//   //   : null;

//   // const selectedAttendance = selectedDay
//   //   ? getAttendanceByDay(selectedDay)
//   //   : null;

//   const isSelectedSunday =
//     selectedDateKey
//       ? isSundayByDateKey(
//           selectedDateKey
//         )
//       : false;

//   const adminTodayOverview = useMemo(() => {
//     return attendanceList
//       .filter(
//         (attendance) =>
//           getDateKey(
//             attendance.attendanceDate
//           ) === indiaTodayKey &&
//           !isLeadershipUser(attendance)
//       )
//       .sort((first, second) =>
//         String(
//           first.employeeName || ""
//         ).localeCompare(
//           String(
//             second.employeeName || ""
//           )
//         )
//       );
//   }, [attendanceList, indiaTodayKey]);

//   const pendingRegularizations =
//     useMemo(() => {
//       return attendanceList
//         .filter(
//           (attendance) =>
//             attendance.regularization
//               ?.status === "pending" &&
//             !isLeadershipUser(attendance)
//         )
//         .sort(
//           (first, second) =>
//             new Date(
//               second.attendanceDate
//             ) -
//             new Date(
//               first.attendanceDate
//             )
//         );
//     }, [attendanceList]);

//   const pendingLeaveRequests =
//     useMemo(() => {
//       return leaveRequests
//         .filter(
//           (leave) =>
//             leave.status === "pending"
//         )
//         .sort(
//           (first, second) =>
//             new Date(second.createdAt) -
//             new Date(first.createdAt)
//         );
//     }, [leaveRequests]);

//   const currentWeekAttendance =
//     useMemo(() => {
//       const weekDaySet = new Set(
//         currentWeekDays
//       );

//       return [...attendanceList]
//         .filter((attendance) => {
//           if (
//             isLeadershipUser(attendance)
//           ) {
//             return false;
//           }

//           const dateKey = getDateKey(
//             attendance.attendanceDate
//           );

//           const day = Number(
//             dateKey.slice(-2)
//           );

//           return weekDaySet.has(day);
//         })
//         .sort(
//           (first, second) =>
//             new Date(
//               second.attendanceDate
//             ) -
//             new Date(
//               first.attendanceDate
//             )
//         );
//     }, [
//       attendanceList,
//       currentWeekDays,
//     ]);

//   const selectedDayEmployeeRows =
//     useMemo(() => {
//       if (!selectedDay) return [];

//       const dateRecords =
//         getAttendanceRecordsByDay(
//           selectedDay
//         );

//       if (!canManageUsers) {
//         const attendance =
//           dateRecords.find((record) =>
//             isSameEmployee(record, user)
//           ) || null;

//         return [
//           {
//             employee:
//               loggedInEmployee,

//             attendance,

//             leave:
//               getLeaveForDateAndEmployee(
//                 selectedDateKey,
//                 loggedInEmployee
//               ),
//           },
//         ];
//       }

//       const sourceEmployees =
//         filters.employeeId
//           ? allEmployeesForView.filter(
//               (employee) =>
//                 String(
//                   employee._id ||
//                     employee.id
//                 ) ===
//                 String(
//                   filters.employeeId
//                 )
//             )
//           : allEmployeesForView;

//       return sourceEmployees.map(
//         (employee) => {
//           const attendance =
//             dateRecords.find(
//               (record) => {
//                 const attendanceEmployeeId =
//                   getEmployeeId(
//                     record.employeeId
//                   );

//                 return (
//                   String(
//                     attendanceEmployeeId ||
//                       ""
//                   ) ===
//                     String(
//                       employee._id ||
//                         employee.id ||
//                         ""
//                     ) ||
//                   String(
//                     record.employeeName ||
//                       ""
//                   ).toLowerCase() ===
//                     String(
//                       employee.name || ""
//                     ).toLowerCase() ||
//                   String(
//                     record.employeeEmail ||
//                       ""
//                   ).toLowerCase() ===
//                     String(
//                       employee.email || ""
//                     ).toLowerCase()
//                 );
//               }
//             ) || null;

//           const leave =
//             getLeaveForDateAndEmployee(
//               selectedDateKey,
//               employee
//             );

//           return {
//             employee,
//             attendance,
//             leave,
//           };
//         }
//       );
//     }, [
//   selectedDay,
//   selectedDateKey,
//   filters.employeeId,
//   canManageUsers,
//   allEmployeesForView,
//   loggedInEmployee,
//   getAttendanceRecordsByDay,
//   getLeaveForDateAndEmployee,
//   user,
// ]);

//   /* ===================================================
//      LOCATION
//   =================================================== */

//   const getBrowserLocation = () => {
//     return new Promise(
//       (resolve, reject) => {
//         if (!navigator.geolocation) {
//           reject(
//             new Error(
//               "Location is not supported in this browser."
//             )
//           );

//           return;
//         }

//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             resolve({
//               latitude:
//                 position.coords.latitude,

//               longitude:
//                 position.coords.longitude,

//               accuracy:
//                 position.coords.accuracy,
//             });
//           },

//           () => {
//             reject(
//               new Error(
//                 "Location permission denied. Please allow location to mark attendance."
//               )
//             );
//           },

//           {
//             enableHighAccuracy: true,
//             timeout: 15000,
//             maximumAge: 0,
//           }
//         );
//       }
//     );
//   };

//   /* ===================================================
//      CHECK-IN / CHECKOUT

//      Existing behavior preserved.
//   =================================================== */

//   const handleCheckIn = async () => {
//     if (
//       attendanceLoading ||
//       todayCheckedIn
//     ) {
//       return;
//     }

//     try {
//       setAttendanceLoading(true);

//       const location =
//         await getBrowserLocation();

//       await checkInAttendance({
//         ...location,
//         remark:
//           "Checked in from RMS",
//       });

//       alert(
//         "Checked in successfully."
//       );

//       await refreshAll();
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           error?.message ||
//           "Check-in failed"
//       );
//     } finally {
//       setAttendanceLoading(false);
//     }
//   };

//   const handleCheckOut = async () => {
//     if (
//       attendanceLoading ||
//       !todayCheckedIn ||
//       todayCheckedOut
//     ) {
//       return;
//     }

//     if (!todayReportSubmitted) {
//       alert(
//         "Please fill today's work report before checkout."
//       );

//       return;
//     }

//     try {
//       setAttendanceLoading(true);

//       const location =
//         await getBrowserLocation();

//       await checkOutAttendance({
//         ...location,
//         remark:
//           "Checked out from RMS",
//       });

//       alert(
//         "Checked out successfully."
//       );

//       await refreshAll();
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           error?.message ||
//           "Check-out failed"
//       );
//     } finally {
//       setAttendanceLoading(false);
//     }
//   };

//   const isCompletedAttendance = (
//     attendance
//   ) => {
//     return (
//       attendance?.attendanceStatus ===
//         "checked_out" &&
//       Number(
//         attendance?.totalWorkingMinutes ||
//           0
//       ) >= REQUIRED_WORK_MINUTES
//     );
//   };

//   /* ===================================================
//      REGULARIZATION

//      Important IST fix:
//      Send exact HH:mm values. Do not create Date or ISO
//      strings in the browser.
//   =================================================== */

//   const openRegularizeModal = (
//     dateKey,
//     attendance = null
//   ) => {
//     if (!dateKey) return;

//     if (
//       isSundayByDateKey(dateKey)
//     ) {
//       alert(
//         "Sunday regularization is not allowed."
//       );

//       return;
//     }

//     if (
//       dateKey < regularizationStartKey ||
//       dateKey > indiaTodayKey
//     ) {
//       alert(
//         "Regularization is allowed only for the last 10 days."
//       );

//       return;
//     }

//     const leaveRequest =
//       getOwnLeaveForDateKey(dateKey);

//     if (
//       attendance?.attendanceStatus ===
//         "on_leave" ||
//       attendance?.attendanceStatus ===
//         "loss_of_pay" ||
//       leaveRequest?.status === "approved"
//     ) {
//       alert(
//         "Regularization is not allowed for an approved leave date."
//       );

//       return;
//     }

//     if (
//       isCompletedAttendance(attendance)
//     ) {
//       alert(
//         "Attendance is already complete. Regularization is not required."
//       );

//       return;
//     }

//     const totalMinutes = Number(
//       attendance?.totalWorkingMinutes || 0
//     );

//     let finalType =
//       "missed_check_in";

//     if (
//       attendance?.checkIn?.time
//     ) {
//       finalType =
//         "missed_check_out";
//     }

//     if (
//       attendance?.attendanceStatus ===
//         "checked_out" &&
//       totalMinutes > 0 &&
//       totalMinutes <
//         REQUIRED_WORK_MINUTES
//     ) {
//       finalType =
//         "missed_check_out";
//     }

//     setRegularizeModal({
//       open: true,
//       date: dateKey,
//       type: finalType,
//     });

//     setRegularizeForm({
//       requestedCheckIn: "",
//       requestedCheckOut: "",
//       reason: "",
//     });
//   };

//   const openManualRegularizationModal =
//     () => {
//       const defaultDateKey =
//         selectedDateKey ||
//         indiaTodayKey;

//       const attendance =
//         getOwnAttendanceByDateKey(
//           defaultDateKey
//         ) ||
//         effectiveTodayAttendance ||
//         null;

//       openRegularizeModal(
//         defaultDateKey,
//         attendance
//       );
//     };

//   const closeRegularizeModal = () => {
//     if (regularizeSubmitting) {
//       return;
//     }

//     setRegularizeModal({
//       open: false,
//       date: "",
//       type: "missed_check_out",
//     });

//     setRegularizeForm({
//       requestedCheckIn: "",
//       requestedCheckOut: "",
//       reason: "",
//     });
//   };

//   const submitRegularization =
//     async (event) => {
//       event.preventDefault();

//       if (regularizeSubmitting) {
//         return;
//       }

//       if (
//         !regularizeForm.reason.trim()
//       ) {
//         alert("Please enter reason.");
//         return;
//       }

//       if (
//         regularizeModal.type ===
//           "missed_check_out" &&
//         !regularizeForm.requestedCheckOut
//       ) {
//         alert(
//           "Please enter requested check-out time."
//         );

//         return;
//       }

//       if (
//         regularizeModal.type ===
//           "missed_check_in" &&
//         !regularizeForm.requestedCheckIn
//       ) {
//         alert(
//           "Please enter requested check-in time."
//         );

//         return;
//       }

//       try {
//         setRegularizeSubmitting(true);

//         /*
//          * Send plain clock values.
//          *
//          * Correct:
//          * requestedCheckIn: "09:24"
//          *
//          * Do not send:
//          * 2026-07-10T09:24:00+05:30
//          *
//          * Backend combines attendanceDate + HH:mm + IST.
//          */
//         await requestAttendanceRegularization({
//           attendanceDate:
//             regularizeModal.date,

//           type:
//             regularizeModal.type,

//           requestedCheckIn:
//             regularizeForm.requestedCheckIn ||
//             undefined,

//           requestedCheckOut:
//             regularizeForm.requestedCheckOut ||
//             undefined,

//           reason:
//             regularizeForm.reason.trim(),
//         });

//         alert(
//           "Regularization request submitted."
//         );

//         setRegularizeModal({
//           open: false,
//           date: "",
//           type: "missed_check_out",
//         });

//         setRegularizeForm({
//           requestedCheckIn: "",
//           requestedCheckOut: "",
//           reason: "",
//         });

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to submit regularization request"
//         );
//       } finally {
//         setRegularizeSubmitting(false);
//       }
//     };

//   const handleApproveRegularization =
//     async (attendance) => {
//       if (
//         !attendance?._id ||
//         adminActionLoading
//       ) {
//         return;
//       }

//       if (!canApproveRegularization) {
//         alert(
//           "Only super admin can approve regularization."
//         );

//         return;
//       }

//       if (
//         attendance.regularization
//           ?.status !== "pending"
//       ) {
//         alert(
//           "This request is already processed."
//         );

//         return;
//       }

//       const confirmed = window.confirm(
//         `Approve regularization for ${
//           attendance.employeeName ||
//           "this employee"
//         }?`
//       );

//       if (!confirmed) return;

//       try {
//         setAdminActionLoading(
//           attendance._id
//         );

//         await approveAttendanceRegularization(
//           attendance._id,
//           {}
//         );

//         alert(
//           "Regularization approved."
//         );

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to approve request"
//         );
//       } finally {
//         setAdminActionLoading("");
//       }
//     };

//   const handleRejectRegularization =
//     async (attendance) => {
//       if (
//         !attendance?._id ||
//         adminActionLoading
//       ) {
//         return;
//       }

//       if (!canApproveRegularization) {
//         alert(
//           "Only super admin can reject regularization."
//         );

//         return;
//       }

//       if (
//         attendance.regularization
//           ?.status !== "pending"
//       ) {
//         alert(
//           "This request is already processed."
//         );

//         return;
//       }

//       const rejectionReason =
//         window.prompt(
//           `Enter rejection reason for ${
//             attendance.employeeName ||
//             "this employee"
//           }`
//         );

//       if (
//         !rejectionReason ||
//         !rejectionReason.trim()
//       ) {
//         alert(
//           "Rejection reason is required."
//         );

//         return;
//       }

//       try {
//         setAdminActionLoading(
//           attendance._id
//         );

//         await rejectAttendanceRegularization(
//           attendance._id,
//           {
//             rejectionReason:
//               rejectionReason.trim(),
//           }
//         );

//         alert(
//           "Regularization rejected."
//         );

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to reject request"
//         );
//       } finally {
//         setAdminActionLoading("");
//       }
//     };

//   /* ===================================================
//      LEAVE APPLICATION
//   =================================================== */

//   const openLeaveModal = (
//   selectedDate = ""
// ) => {
//   const defaultDate =
//     selectedDate ||
//     selectedDateKey ||
//     indiaTodayKey;

//   if (
//     isSundayByDateKey(defaultDate)
//   ) {
//     alert(
//       "Sunday is a weekly off. Leave application is not required."
//     );

//     return;
//   }

//   /*
//    * A paid leave already used or pending must not be
//    * silently selected again.
//    *
//    * The employee may still open the form and apply LOP.
//    */
//   const defaultLeaveType =
//     hasUsedMonthlyPaidLeave ||
//     hasPendingPaidLeave
//       ? "loss_of_pay"
//       : "paid_leave";

//   if (
//     hasUsedMonthlyPaidLeave ||
//     hasPendingPaidLeave
//   ) {
//     alert(
//       `${getPaidLeaveUnavailableMessage()}\n\nThe form will open with Loss of Pay selected.`
//     );
//   }

//   setLeaveForm({
//     leaveType: defaultLeaveType,
//     duration: "full_day",
//     fromDate: defaultDate,
//     toDate: defaultDate,
//     reason: "",
//   });

//   setLeaveModal({
//     open: true,
//     mode: "apply",
//     request: null,
//   });
// };

//   const closeLeaveModal = () => {
//     if (leaveLoading) return;

//     setLeaveModal({
//       open: false,
//       mode: "apply",
//       request: null,
//     });

//     setLeaveForm({
//       leaveType: "paid_leave",
//       duration: "full_day",
//       fromDate: indiaTodayKey,
//       toDate: indiaTodayKey,
//       reason: "",
//     });
//   };

//   const updateLeaveForm = (event) => {
//     const { name, value } =
//       event.target;

//     setLeaveForm((previous) => {
//       const nextForm = {
//         ...previous,
//         [name]: value,
//       };

//       if (
//         name === "duration" &&
//         value !== "full_day"
//       ) {
//         nextForm.toDate =
//           nextForm.fromDate;
//       }

//       if (
//         name === "fromDate" &&
//         nextForm.duration !==
//           "full_day"
//       ) {
//         nextForm.toDate = value;
//       }

//       return nextForm;
//     });
//   };

//   const submitLeaveApplication =
//     async (event) => {
//       event.preventDefault();

//       if (leaveLoading) return;

//       if (!leaveForm.fromDate) {
//         alert(
//           "Please select leave date."
//         );

//         return;
//       }

//       if (!leaveForm.toDate) {
//         alert(
//           "Please select leave end date."
//         );

//         return;
//       }

//       if (
//         leaveForm.toDate <
//         leaveForm.fromDate
//       ) {
//         alert(
//           "Leave end date cannot be before start date."
//         );

//         return;
//       }

//       if (
//         leaveForm.duration !==
//           "full_day" &&
//         leaveForm.fromDate !==
//           leaveForm.toDate
//       ) {
//         alert(
//           "Half-day leave can be applied for one date only."
//         );

//         return;
//       }

//       if (
//         isSundayByDateKey(
//           leaveForm.fromDate
//         )
//       ) {
//         alert(
//           "Sunday is weekly off. Leave application is not required."
//         );

//         return;
//       }

//       if (
//         !leaveForm.reason.trim()
//       ) {
//         alert(
//           "Please enter leave reason."
//         );

//         return;
//       }

//       if (
//   leaveForm.leaveType ===
//   "paid_leave"
// ) {
//   if (hasPendingPaidLeave) {
//     alert(
//       "You already have a pending paid leave request for this month. Another paid leave request cannot be submitted."
//     );

//     return;
//   }

//   if (hasUsedMonthlyPaidLeave) {
//     alert(
//       "You have already used your paid leave entitlement for this month. Please select Loss of Pay."
//     );

//     return;
//   }
// }

//       try {
//         setLeaveLoading(true);

//         await applyAttendanceLeave({
//           leaveType:
//             leaveForm.leaveType,

//           duration:
//             leaveForm.duration,

//           fromDate:
//             leaveForm.fromDate,

//           toDate:
//             leaveForm.toDate,

//           reason:
//             leaveForm.reason.trim(),
//         });

//         alert(
//           "Leave request submitted successfully."
//         );

//         setLeaveModal({
//           open: false,
//           mode: "apply",
//           request: null,
//         });

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to submit leave request"
//         );
//       } finally {
//         setLeaveLoading(false);
//       }
//     };

//   const canApproveLeaveRequest = (
//     leaveRequest
//   ) => {
//     if (
//       leaveRequest?.employeeRole ===
//       "admin"
//     ) {
//       return canProcessAdminLeave;
//     }

//     return canProcessNormalUserLeave;
//   };

//   const handleApproveLeave =
//     async (leaveRequest) => {
//       if (
//         !leaveRequest?._id ||
//         leaveActionLoading
//       ) {
//         return;
//       }

//       if (
//         !canApproveLeaveRequest(
//           leaveRequest
//         )
//       ) {
//         alert(
//           leaveRequest.employeeRole ===
//             "admin"
//             ? "Only super admin can approve an admin leave request."
//             : "You are not allowed to approve this leave request."
//         );

//         return;
//       }

//       if (
//         leaveRequest.status !==
//         "pending"
//       ) {
//         alert(
//           "This leave request is already processed."
//         );

//         return;
//       }

//       const confirmed = window.confirm(
//         `Approve ${getLeaveTypeLabel(
//           leaveRequest.leaveType
//         )} for ${
//           leaveRequest.employeeName ||
//           "this employee"
//         }?`
//       );

//       if (!confirmed) return;

//       try {
//         setLeaveActionLoading(
//           leaveRequest._id
//         );

//         await approveAttendanceLeave(
//           leaveRequest._id,
//           {}
//         );

//         alert(
//           "Leave request approved."
//         );

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to approve leave request"
//         );
//       } finally {
//         setLeaveActionLoading("");
//       }
//     };

//   const handleRejectLeave =
//     async (leaveRequest) => {
//       if (
//         !leaveRequest?._id ||
//         leaveActionLoading
//       ) {
//         return;
//       }

//       if (
//         !canApproveLeaveRequest(
//           leaveRequest
//         )
//       ) {
//         alert(
//           leaveRequest.employeeRole ===
//             "admin"
//             ? "Only super admin can reject an admin leave request."
//             : "You are not allowed to reject this leave request."
//         );

//         return;
//       }

//       if (
//         leaveRequest.status !==
//         "pending"
//       ) {
//         alert(
//           "This leave request is already processed."
//         );

//         return;
//       }

//       const rejectionReason =
//         window.prompt(
//           `Enter rejection reason for ${
//             leaveRequest.employeeName ||
//             "this employee"
//           }`
//         );

//       if (
//         !rejectionReason ||
//         !rejectionReason.trim()
//       ) {
//         alert(
//           "Rejection reason is required."
//         );

//         return;
//       }

//       try {
//         setLeaveActionLoading(
//           leaveRequest._id
//         );

//         await rejectAttendanceLeave(
//           leaveRequest._id,
//           {
//             rejectionReason:
//               rejectionReason.trim(),
//           }
//         );

//         alert(
//           "Leave request rejected."
//         );

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to reject leave request"
//         );
//       } finally {
//         setLeaveActionLoading("");
//       }
//     };

//   const handleCancelLeave =
//     async (leaveRequest) => {
//       if (
//         !leaveRequest?._id ||
//         leaveActionLoading
//       ) {
//         return;
//       }

//       if (
//         leaveRequest.status !==
//         "pending"
//       ) {
//         alert(
//           "Only a pending leave request can be cancelled."
//         );

//         return;
//       }

//       const confirmed = window.confirm(
//         "Cancel this pending leave request?"
//       );

//       if (!confirmed) return;

//       try {
//         setLeaveActionLoading(
//           leaveRequest._id
//         );

//         await cancelAttendanceLeave(
//           leaveRequest._id
//         );

//         alert(
//           "Leave request cancelled."
//         );

//         await refreshAll();
//       } catch (error) {
//         alert(
//           error?.response?.data?.message ||
//             "Failed to cancel leave request"
//         );
//       } finally {
//         setLeaveActionLoading("");
//       }
//     };

//   /* ===================================================
//      WORK FROM HOME MANAGEMENT

//      Current backend allows admin/super-admin to change
//      employee work mode directly.
//   =================================================== */

//   /* ===================================================
//    WORK FROM HOME REQUEST FLOW

//    Employee/Admin:
//    Apply WFH
//    ↓
//    WorkFromHomeRequest status = pending

//    Approval rule:
//    employeeRole user
//    -> Admin OR Super Admin

//    employeeRole admin
//    -> Super Admin ONLY

//    Backend approval:
//    Loop every approved date
//    -> Skip Sunday
//    -> Upsert Attendance
//    -> attendanceSource = work_from_home
//    -> workMode = work_from_home
//    -> attendanceStatus = checked_in
// =================================================== */

// const openApplyWorkFromHomeModal = (
//   selectedDate = ""
// ) => {
//   if (!canMarkAttendance) {
//     alert(
//       "You are not allowed to apply for Work From Home."
//     );

//     return;
//   }

//   if (pendingWorkFromHomeRequest) {
//     alert(
//       "You already have a pending Work From Home request. Please wait until it is approved or rejected."
//     );

//     return;
//   }

//   const defaultDate =
//     selectedDate ||
//     selectedDateKey ||
//     indiaTodayKey;

//   if (isSundayByDateKey(defaultDate)) {
//     alert(
//       "Sunday is a weekly off. Work From Home application is not required."
//     );

//     return;
//   }

//   setWorkFromHomeModal({
//     open: true,
//     fromDate: defaultDate,
//     toDate: defaultDate,
//     reason: "",
//   });
// };

// const closeWorkFromHomeModal = () => {
//   if (workFromHomeLoading) {
//     return;
//   }

//   setWorkFromHomeModal({
//     open: false,
//     fromDate: indiaTodayKey,
//     toDate: indiaTodayKey,
//     reason: "",
//   });
// };

// const updateWorkFromHomeForm = (
//   event
// ) => {
//   const { name, value } =
//     event.target;

//   setWorkFromHomeModal(
//     (previous) => {
//       const updatedForm = {
//         ...previous,
//         [name]: value,
//       };

//       if (
//         name === "fromDate" &&
//         (!previous.toDate ||
//           previous.toDate <
//             value)
//       ) {
//         updatedForm.toDate = value;
//       }

//       return updatedForm;
//     }
//   );
// };

// const submitWorkFromHomeRequest =
//   async (event) => {
//     event.preventDefault();

//     if (workFromHomeLoading) {
//       return;
//     }

//     const fromDate =
//       String(
//         workFromHomeModal.fromDate ||
//           ""
//       ).trim();

//     const toDate =
//       String(
//         workFromHomeModal.toDate ||
//           ""
//       ).trim();

//     const reason =
//       String(
//         workFromHomeModal.reason ||
//           ""
//       ).trim();

//     if (!fromDate || !toDate) {
//       alert(
//         "Please select Work From Home start and end dates."
//       );

//       return;
//     }

//     if (toDate < fromDate) {
//       alert(
//         "Work From Home end date cannot be before the start date."
//       );

//       return;
//     }

//     if (
//       fromDate === toDate &&
//       isSundayByDateKey(fromDate)
//     ) {
//       alert(
//         "Sunday is a weekly off. Work From Home application is not required."
//       );

//       return;
//     }

//     if (!reason) {
//       alert(
//         "Please enter a clear Work From Home reason."
//       );

//       return;
//     }

//     if (reason.length < 5) {
//       alert(
//         "Please enter a more detailed Work From Home reason."
//       );

//       return;
//     }

//     if (pendingWorkFromHomeRequest) {
//       alert(
//         "You already have a pending Work From Home request."
//       );

//       return;
//     }

//     try {
//       setWorkFromHomeLoading(true);

//       await applyAttendanceWorkFromHome({
//         fromDate,
//         toDate,
//         reason,
//       });

//       alert(
//         "Work From Home request submitted successfully and sent for approval."
//       );

//       setWorkFromHomeModal({
//         open: false,
//         fromDate: indiaTodayKey,
//         toDate: indiaTodayKey,
//         reason: "",
//       });

//       await refreshAll();
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           "Failed to submit Work From Home request"
//       );
//     } finally {
//       setWorkFromHomeLoading(false);
//     }
//   };

// const canProcessWorkFromHomeRequest = (
//   request
// ) => {
//   const employeeRole = String(
//     request?.employeeRole ||
//       request?.employeeId?.role ||
//       ""
//   )
//     .trim()
//     .toLowerCase();

//   /*
//    * Admin employee's WFH:
//    * Super Admin only.
//    */
//   if (employeeRole === "admin") {
//     return isSuperAdmin;
//   }

//   /*
//    * Normal user's WFH:
//    * Admin or Super Admin.
//    */
//   if (employeeRole === "user") {
//     return (
//       isAdmin ||
//       isSuperAdmin
//     );
//   }

//   /*
//    * Unknown/missing role:
//    * Keep restricted to Super Admin.
//    */
//   return isSuperAdmin;
// };

// const getWorkFromHomeApprovalRule = (
//   request
// ) => {
//   const employeeRole = String(
//     request?.employeeRole ||
//       request?.employeeId?.role ||
//       ""
//   )
//     .trim()
//     .toLowerCase();

//   if (employeeRole === "admin") {
//     return "Super Admin Only";
//   }

//   if (employeeRole === "user") {
//     return "Admin / Super Admin";
//   }

//   return "Super Admin Review";
// };

// const handleApproveWorkFromHome =
//   async (request) => {
//     if (
//       !request?._id ||
//       workFromHomeActionLoading
//     ) {
//       return;
//     }

//     if (request.status !== "pending") {
//       alert(
//         "This Work From Home request has already been processed."
//       );

//       return;
//     }

//     if (
//       !canProcessWorkFromHomeRequest(
//         request
//       )
//     ) {
//       const employeeRole = String(
//         request?.employeeRole ||
//           request?.employeeId?.role ||
//           ""
//       ).toLowerCase();

//       alert(
//         employeeRole === "admin"
//           ? "Only Super Admin can approve an Admin Work From Home request."
//           : "You are not allowed to approve this Work From Home request."
//       );

//       return;
//     }

//     const employeeName =
//       request.employeeName ||
//       request.employeeId?.name ||
//       "this employee";

//     const confirmed = window.confirm(
//       `Approve Work From Home for ${employeeName} from ${formatDate(
//         request.fromDate
//       )} to ${formatDate(
//         request.toDate
//       )}?\n\nAttendance will be created for every approved working date.`
//     );

//     if (!confirmed) {
//       return;
//     }

//     try {
//       setWorkFromHomeActionLoading(
//         request._id
//       );

//       /*
//        * Backend approval endpoint must perform:
//        *
//        * 1. Validate role:
//        *    user request -> Admin/Super Admin
//        *    admin request -> Super Admin only
//        *
//        * 2. Set request status = approved.
//        *
//        * 3. Loop every date from fromDate to toDate.
//        *
//        * 4. Skip Sunday.
//        *
//        * 5. Upsert Attendance:
//        *    attendanceSource: "work_from_home"
//        *    workMode: "work_from_home"
//        *    attendanceStatus: "checked_in"
//        */
//       await approveAttendanceWorkFromHome(
//         request._id,
//         {}
//       );

//       alert(
//         "Work From Home approved. Attendance has been created for the approved dates."
//       );

//       await refreshAll();
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           "Failed to approve Work From Home request"
//       );
//     } finally {
//       setWorkFromHomeActionLoading(
//         ""
//       );
//     }
//   };

// const handleRejectWorkFromHome =
//   async (request) => {
//     if (
//       !request?._id ||
//       workFromHomeActionLoading
//     ) {
//       return;
//     }

//     if (request.status !== "pending") {
//       alert(
//         "This Work From Home request has already been processed."
//       );

//       return;
//     }

//     if (
//       !canProcessWorkFromHomeRequest(
//         request
//       )
//     ) {
//       const employeeRole = String(
//         request?.employeeRole ||
//           request?.employeeId?.role ||
//           ""
//       ).toLowerCase();

//       alert(
//         employeeRole === "admin"
//           ? "Only Super Admin can reject an Admin Work From Home request."
//           : "You are not allowed to reject this Work From Home request."
//       );

//       return;
//     }

//     const employeeName =
//       request.employeeName ||
//       request.employeeId?.name ||
//       "this employee";

//     const rejectionReason =
//       window.prompt(
//         `Enter rejection reason for ${employeeName}`
//       );

//     if (
//       !rejectionReason ||
//       !rejectionReason.trim()
//     ) {
//       alert(
//         "Rejection reason is required."
//       );

//       return;
//     }

//     try {
//       setWorkFromHomeActionLoading(
//         request._id
//       );

//       await rejectAttendanceWorkFromHome(
//         request._id,
//         {
//           rejectionReason:
//             rejectionReason.trim(),
//         }
//       );

//       alert(
//         "Work From Home request rejected."
//       );

//       await refreshAll();
//     } catch (error) {
//       alert(
//         error?.response?.data?.message ||
//           "Failed to reject Work From Home request"
//       );
//     } finally {
//       setWorkFromHomeActionLoading(
//         ""
//       );
//     }
//   };

 

//   /* ===================================================
//      LATE CHECK-IN
//   =================================================== */

//   // const isLateCheckIn = (
//   //   attendance
//   // ) => {
//   //   const checkIn =
//   //     attendance?.regularization
//   //       ?.status === "approved" &&
//   //     attendance?.regularization
//   //       ?.requestedCheckIn
//   //       ? attendance.regularization
//   //           .requestedCheckIn
//   //       : attendance?.checkIn?.time;

//   //   if (!checkIn) return false;

//   //   const time = new Date(
//   //     checkIn
//   //   ).toLocaleTimeString("en-IN", {
//   //     timeZone: INDIA_TIME_ZONE,
//   //     hour: "2-digit",
//   //     minute: "2-digit",
//   //     hour12: false,
//   //   });

//   //   return time > "09:45";
//   // };

//   /* ===================================================
//      PWA DERIVED DATA
//   =================================================== */

//   const pwaTodayLeave =
//     getOwnLeaveForDateKey(
//       indiaTodayKey
//     );

//   const pwaTodayHealth = getHealth(
//     effectiveTodayAttendance,
//     pwaTodayLeave
//   );

//     const paidLeaveEntitlement = Number(
//   leaveSummary?.balance
//     ?.monthlyPaidLeaveEntitlement || 1
// );

// const approvedPaidLeave = Number(
//   leaveSummary?.balance
//     ?.approvedPaidLeave || 0
// );

// const pendingPaidLeave = Number(
//   leaveSummary?.balance
//     ?.pendingPaidLeave || 0
// );

// const availablePaidLeave = Number(
//   leaveSummary?.balance
//     ?.availablePaidLeave || 0
// );

// const hasUsedMonthlyPaidLeave =
//   approvedPaidLeave >=
//     paidLeaveEntitlement ||
//   availablePaidLeave <= 0;

// const hasPendingPaidLeave =
//   pendingPaidLeave > 0;

// const getPaidLeaveUnavailableMessage =
//   () => {
//     if (hasPendingPaidLeave) {
//       return "You already have a pending paid leave request for this month. Please wait until it is approved or rejected.";
//     }

//     return "You have already used your paid leave entitlement for this month. Please select Loss of Pay.";
//   };


//   const approvedWorkFromHomeThisMonth =
//   useMemo(() => {
//     return workFromHomeRequests.filter(
//       (request) => {
//         if (
//           request.status !== "approved"
//         ) {
//           return false;
//         }

//         const requestFromDate =
//           getDateKey(
//             request.fromDate
//           );

//         const requestToDate =
//           getDateKey(
//             request.toDate
//           );

//         return (
//           requestFromDate <=
//             selectedMonthEndKey &&
//           requestToDate >=
//             selectedMonthStartKey
//         );
//       }
//     ).length;
//   }, [
//     workFromHomeRequests,
//     selectedMonthStartKey,
//     selectedMonthEndKey,
//   ]);



//   const pwaRefreshAll = async () => {
//     await refreshAll();
//   };

//   /*
//    * Keep your existing downloadMonthlyAttendanceCsv
//    * function below this point.

//    * Add on_leave and loss_of_pay handling in Part 2 so:
//    * Paid leave = PL
//    * Loss of Pay = LOP
//    * Approved leave does not count as absent.
//    */
//      return (
//     <>
//       {/* =====================================================
//           MOBILE / PWA UI
//       ===================================================== */}

//      <div className="attendance-pwa-ui">
//   <header className="att-pwa-header">
//     <div className="att-pwa-header-row">

//   <button
//   type="button"
//   className="att-pwa-back"
//   onClick={() => {
//     if (
//       typeof window.__goDashboardHome ===
//       "function"
//     ) {
//       window.__goDashboardHome();
//       return;
//     }

//     window.location.href =
//       "/dashboard#dashboard";
//   }}
//   aria-label="Back to dashboard"
// >
//   ‹
// </button>

//   <div className="att-pwa-header-copy">
//     <span>BHARAT RMS HRMS</span>

//     <h2>Attendance & Leave</h2>

//     <p>
//       Attendance, leave and work-mode management
//     </p>
//   </div>

//   <button
//     type="button"
//     className={`att-pwa-refresh ${
//       attendanceLoading ||
//       leaveLoading ||
//       workFromHomeLoading
//         ? "spinning"
//         : ""
//     }`}
//     onClick={pwaRefreshAll}
//     disabled={
//       attendanceLoading ||
//       leaveLoading ||
//       workFromHomeLoading
//     }
//     aria-label="Refresh"
//   >
//     ↻
//   </button>

// </div>
//   </header>

//   <div className="att-pwa-scroll">
//           {/* =================================================
//               PWA QUICK ACTIONS
//           ================================================= */}

//           <div className="att-pwa-quick-actions">
//   {canMarkAttendance && (
//     <>
//       {/* Keep your existing three quick-action buttons unchanged */}
//     </>
//   )}
// </div>

// {/* =================================================
//     PWA PREMIUM INSIGHT CARDS
// ================================================= */}

// <div className="att-pwa-insight-grid">
//   <div className="att-pwa-insight-card today">
//     <span>
//       Today Status
//     </span>

//     <strong>
//       {todayCheckedOut
//         ? "Completed"
//         : todayCheckedIn
//         ? "Checkout Pending"
//         : "Not Checked In"}
//     </strong>

//     <small>
//       {todayCheckedIn
//         ? `In ${getDisplayCheckIn(
//             effectiveTodayAttendance
//           )}`
//         : "Attendance not marked"}
//     </small>
//   </div>

//   <div className="att-pwa-insight-card leave">
//     <span>
//       Paid Leave
//     </span>

//     <strong>
//       {availablePaidLeave}
//     </strong>

//     <small>
//       Available this month
//     </small>
//   </div>

//   <div className="att-pwa-insight-card pending">
//     <span>
//       Leave Pending
//     </span>

//     <strong>
//       {pendingPaidLeave}
//     </strong>

//     <small>
//       Awaiting decision
//     </small>
//   </div>

//   <div className="att-pwa-insight-card lop">
//     <span>
//       Approved LOP
//     </span>

//     <strong>
//       {Number(
//         leaveSummary?.balance
//           ?.approvedLossOfPay || 0
//       )}
//     </strong>

//     <small>
//       Current month
//     </small>
//   </div>

//   <div className="att-pwa-insight-card wfh">
//     <span>
//       Approved WFH
//     </span>

//     <strong>
//       {approvedWorkFromHomeThisMonth}
//     </strong>

//     <small>
//       Current month
//     </small>
//   </div>
// </div>

// {/* =================================================
//     PWA MONTH FILTER
// ================================================= */}
//           {/* =================================================
//               PWA MONTH FILTER
//           ================================================= */}

//           <div className="att-pwa-filter-card">
//             <div className="att-pwa-card-title">
//               <div>
//                 <span>REPORTING PERIOD</span>
//                 <h3>Month Filter</h3>
//               </div>

//               <b>
//                 {months[selectedMonth]}{" "}
//                 {selectedYear}
//               </b>
//             </div>

//             <div className="att-pwa-month-scroll">
//               {months.map((month, index) => (
//                 <button
//                   type="button"
//                   key={month}
//                   className={
//                     selectedMonth === index
//                       ? "active"
//                       : ""
//                   }
//                   onClick={() =>
//                     pwaSetMonth(index)
//                   }
//                 >
//                   {month.slice(0, 3)}
//                 </button>
//               ))}
//             </div>

//             <div className="att-pwa-year-row">
//               {getCurrentYearOptions().map(
//                 (year) => (
//                   <button
//                     type="button"
//                     key={year}
//                     className={
//                       selectedYear === year
//                         ? "active"
//                         : ""
//                     }
//                     onClick={() =>
//                       pwaSetYear(year)
//                     }
//                   >
//                     {year}
//                   </button>
//                 )
//               )}
//             </div>

//             {canManageUsers && (
//               <div className="att-pwa-employee-row">
//                 <button
//                   type="button"
//                   className={
//                     !filters.employeeId
//                       ? "active"
//                       : ""
//                   }
//                   onClick={() =>
//                     pwaSetEmployee("")
//                   }
//                 >
//                   All
//                 </button>

//                 {allEmployeesForView.map(
//                   (employee) => (
//                     <button
//                       type="button"
//                       key={
//                         employee._id ||
//                         employee.id
//                       }
//                       className={
//                         String(
//                           filters.employeeId
//                         ) ===
//                         String(
//                           employee._id ||
//                             employee.id
//                         )
//                           ? "active"
//                           : ""
//                       }
//                       onClick={() =>
//                         pwaSetEmployee(
//                           employee._id ||
//                             employee.id
//                         )
//                       }
//                     >
//                       {employee.name}
//                     </button>
//                   )
//                 )}
//               </div>
//             )}
//           </div>

//           {/* =================================================
//               PWA LEAVE BALANCE
//           ================================================= */}

//          {canMarkAttendance && (
//   <div className="att-pwa-leave-balance">
//     <div className="att-pwa-card-title">
//       <div>
//         <span>
//           MONTHLY LEAVE
//         </span>

//         <h3>
//           Leave Balance
//         </h3>
//       </div>

//       <button
//         type="button"
//         onClick={() =>
//           openLeaveModal()
//         }
//       >
//         Apply
//       </button>
//     </div>

//     <div className="att-pwa-leave-grid">
//       <div>
//         <span>
//           Available PL
//         </span>

//         <strong>
//           {availablePaidLeave}
//         </strong>
//       </div>

//       <div>
//         <span>
//           Pending
//         </span>

//         <strong>
//           {pendingPaidLeave}
//         </strong>
//       </div>

//       <div>
//         <span>
//           Approved
//         </span>

//         <strong>
//           {approvedPaidLeave}
//         </strong>
//       </div>
//     </div>
//   </div>
// )}

//           {/* =================================================
//               PWA TODAY ATTENDANCE
//           ================================================= */}

//           {canMarkAttendance && (
//             <div className="att-pwa-today-card">
//               <div className="att-pwa-today-top">
//                 <div>
//                   <span>
//                     TODAY’S ATTENDANCE
//                   </span>

//                   <h3>
//                     {todayCheckedIn
//                       ? `Checked in at ${formatTime(
//                           effectiveTodayAttendance
//                             ?.checkIn?.time
//                         )}`
//                       : pwaTodayLeave?.status ===
//                         "approved"
//                       ? getLeaveTypeLabel(
//                           pwaTodayLeave.leaveType
//                         )
//                       : "Ready to check in"}
//                   </h3>

//                   <p>
//                     {todayCheckedOut
//                       ? `Checked out at ${formatTime(
//                           effectiveTodayAttendance
//                             ?.checkOut?.time
//                         )}`
//                       : pwaTodayLeave?.status ===
//                         "pending"
//                       ? "Leave request is awaiting approval."
//                       : "Location will be captured securely."}
//                   </p>
//                 </div>

//                 <span
//                   className={`att-pwa-pill ${pwaTodayHealth.className}`}
//                 >
//                   {pwaTodayHealth.label}
//                 </span>
//               </div>

//               {isWorkFromHomeAttendance(
//                 effectiveTodayAttendance
//               ) && (
//                 <div className="att-pwa-location-box">
//                   <b>
//                     Work From Home
//                   </b>

//                   <p>
//                     {getWorkLocationText(
//                       effectiveTodayAttendance
//                     )}
//                   </p>

//                   {getWorkLocationMapLink(
//                     effectiveTodayAttendance
//                   ) && (
//                     <a
//                       href={getWorkLocationMapLink(
//                         effectiveTodayAttendance
//                       )}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       View exact map
//                     </a>
//                   )}
//                 </div>
//               )}

//               {pwaTodayLeave && (
//                 <div
//                   className={`att-pwa-leave-inline ${pwaTodayLeave.status}`}
//                 >
//                   <div>
//                     <span>
//                       {getLeaveTypeLabel(
//                         pwaTodayLeave.leaveType
//                       )}
//                     </span>

//                     <strong>
//                       {getLeaveDurationLabel(
//                         pwaTodayLeave.duration
//                       )}
//                     </strong>
//                   </div>

//                   <b>
//                     {formatStatus(
//                       pwaTodayLeave.status
//                     )}
//                   </b>
//                 </div>
//               )}

//               {!pwaTodayLeave ||
//               !["approved"].includes(
//                 pwaTodayLeave.status
//               ) ? (
//                 <div className="att-pwa-action-grid">
//                   <button
//                     type="button"
//                     className="checkin"
//                     disabled={
//                       attendanceLoading ||
//                       todayCheckedIn
//                     }
//                     onClick={handleCheckIn}
//                   >
//                     {attendanceLoading &&
//                     !todayCheckedIn
//                       ? "Checking In..."
//                       : todayCheckedIn
//                       ? "Checked In"
//                       : "Check In"}
//                   </button>

//                   <button
//                     type="button"
//                     className="checkout"
//                     disabled={
//                       attendanceLoading ||
//                       !todayCheckedIn ||
//                       todayCheckedOut
//                     }
//                     onClick={handleCheckOut}
//                   >
//                     {attendanceLoading &&
//                     todayCheckedIn &&
//                     !todayCheckedOut
//                       ? "Checking Out..."
//                       : todayCheckedOut
//                       ? "Checked Out"
//                       : "Check Out"}
//                   </button>
//                 </div>
//               ) : null}

//               {todayCheckedIn &&
//                 !todayCheckedOut &&
//                 effectiveTodayAttendance
//                   ?.regularization?.status !==
//                   "pending" && (
//                   <button
//                     type="button"
//                     className="att-pwa-regularize-btn"
//                     onClick={() =>
//                       openRegularizeModal(
//                         indiaTodayKey,
//                         effectiveTodayAttendance
//                       )
//                     }
//                   >
//                     Request Regularization
//                   </button>
//                 )}
//             </div>
//           )}
           
//            {/* =================================================
//     PWA PENDING WFH APPROVAL
// ================================================= */}

// {canManageUsers &&
//   pendingWorkFromHomeRequests.length > 0 && (
//     <div className="att-pwa-section">
//       <div className="att-pwa-section-head">
//         <div>
//           <span>
//             APPROVAL QUEUE
//           </span>

//           <h3>
//             Work From Home Requests
//           </h3>
//         </div>

//         <b>
//           {
//             pendingWorkFromHomeRequests.length
//           }{" "}
//           pending
//         </b>
//       </div>

//       {pendingWorkFromHomeRequests.map(
//         (workFromHomeRequest) => {
//           const canProcess =
//             canProcessWorkFromHomeRequest(
//               workFromHomeRequest
//             );

//           return (
//             <div
//               key={workFromHomeRequest._id}
//               className="att-pwa-wfh-request-card"
//             >
//               <div className="att-pwa-request-card-head">
//                 <div>
//                   <h4>
//                     {workFromHomeRequest.employeeName ||
//                       "-"}
//                   </h4>

//                   <p>
//                     {formatDate(
//                       workFromHomeRequest.fromDate
//                     )}

//                     {getDateKey(
//                       workFromHomeRequest.fromDate
//                     ) !==
//                       getDateKey(
//                         workFromHomeRequest.toDate
//                       ) &&
//                       ` - ${formatDate(
//                         workFromHomeRequest.toDate
//                       )}`}
//                   </p>
//                 </div>

//                 <span className="att-wfh-pending-pill">
//                   Pending
//                 </span>
//               </div>

//               <div className="att-pwa-detail-grid">
//                 <div>
//                   <span>
//                     Employee Role
//                   </span>

//                   <b>
//                     {formatStatus(
//                       workFromHomeRequest.employeeRole
//                     )}
//                   </b>
//                 </div>

//                 <div>
//                   <span>
//                     Approval Rule
//                   </span>

//                   <b>
//   {getWorkFromHomeApprovalRule(
//     workFromHomeRequest
//   )}
// </b>
//                 </div>
//               </div>

//               <div className="att-pwa-reason">
//                 <span>
//                   Reason
//                 </span>

//                 <p>
//                   {workFromHomeRequest.reason ||
//                     "-"}
//                 </p>
//               </div>

//               {canProcess ? (
//                 <div className="att-pwa-request-actions">
//                   <button
//                     type="button"
//                     disabled={
//                       workFromHomeActionLoading ===
//                       workFromHomeRequest._id
//                     }
//                     onClick={() =>
//                       handleApproveWorkFromHome(
//                         workFromHomeRequest
//                       )
//                     }
//                   >
//                     {workFromHomeActionLoading ===
//                     workFromHomeRequest._id
//                       ? "Processing..."
//                       : "Approve"}
//                   </button>

//                   <button
//                     type="button"
//                     className="reject"
//                     disabled={
//                       workFromHomeActionLoading ===
//                       workFromHomeRequest._id
//                     }
//                     onClick={() =>
//                       handleRejectWorkFromHome(
//                         workFromHomeRequest
//                       )
//                     }
//                   >
//                     Reject
//                   </button>
//                 </div>
//               ) : (
//                 <div className="att-wfh-restricted-note">
//                   Admin WFH requests can be
//                   approved only by Super Admin.
//                 </div>
//               )}
//             </div>
//           );
//         }
//       )}
//     </div>
//   )}


//           {/* =================================================
//               PWA PENDING LEAVE APPROVAL
//           ================================================= */}

//           {canManageUsers &&
//             pendingLeaveRequests.length > 0 && (
//               <div className="att-pwa-section">
//                 <div className="att-pwa-section-head">
//                   <div>
//                     <span>
//                       APPROVAL QUEUE
//                     </span>

//                     <h3>
//                       Leave Requests
//                     </h3>
//                   </div>

//                   <b>
//                     {
//                       pendingLeaveRequests.length
//                     }{" "}
//                     pending
//                   </b>
//                 </div>

//                 {pendingLeaveRequests.map(
//                   (leaveRequest) => (
//                     <div
//                       key={leaveRequest._id}
//                       className="att-pwa-leave-request-card"
//                     >
//                       <div className="att-pwa-request-card-head">
//                         <div>
//                           <h4>
//                             {leaveRequest.employeeName ||
//                               "-"}
//                           </h4>

//                           <p>
//                             {formatDate(
//                               leaveRequest.fromDate
//                             )}

//                             {getDateKey(
//                               leaveRequest.fromDate
//                             ) !==
//                               getDateKey(
//                                 leaveRequest.toDate
//                               ) &&
//                               ` - ${formatDate(
//                                 leaveRequest.toDate
//                               )}`}
//                           </p>
//                         </div>

//                         <span
//                           className={`leave-type ${leaveRequest.leaveType}`}
//                         >
//                           {getLeaveTypeLabel(
//                             leaveRequest.leaveType
//                           )}
//                         </span>
//                       </div>

//                       <div className="att-pwa-detail-grid">
//                         <div>
//                           <span>
//                             Duration
//                           </span>

//                           <b>
//                             {getLeaveDurationLabel(
//                               leaveRequest.duration
//                             )}
//                           </b>
//                         </div>

//                         <div>
//                           <span>
//                             Role
//                           </span>

//                           <b>
//                             {formatStatus(
//                               leaveRequest.employeeRole
//                             )}
//                           </b>
//                         </div>
//                       </div>

//                       <div className="att-pwa-reason">
//                         <span>
//                           Reason
//                         </span>

//                         <p>
//                           {leaveRequest.reason ||
//                             "-"}
//                         </p>
//                       </div>

//                       {canApproveLeaveRequest(
//                         leaveRequest
//                       ) && (
//                         <div className="att-pwa-request-actions">
//                           <button
//                             type="button"
//                             disabled={
//                               leaveActionLoading ===
//                               leaveRequest._id
//                             }
//                             onClick={() =>
//                               handleApproveLeave(
//                                 leaveRequest
//                               )
//                             }
//                           >
//                             {leaveActionLoading ===
//                             leaveRequest._id
//                               ? "Processing..."
//                               : "Approve"}
//                           </button>

//                           <button
//                             type="button"
//                             className="reject"
//                             disabled={
//                               leaveActionLoading ===
//                               leaveRequest._id
//                             }
//                             onClick={() =>
//                               handleRejectLeave(
//                                 leaveRequest
//                               )
//                             }
//                           >
//                             Reject
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   )
//                 )}
//               </div>
//             )}

//           {/* =================================================
//               PWA MY LEAVE REQUESTS
//           ================================================= */}

//           {canMarkAttendance &&
//             ownLeaveRequests.length > 0 && (
//               <div className="att-pwa-section">
//                 <div className="att-pwa-section-head">
//                   <div>
//                     <span>
//                       MY REQUESTS
//                     </span>

//                     <h3>
//                       Leave History
//                     </h3>
//                   </div>

//                   <b>
//                     {ownLeaveRequests.length}
//                   </b>
//                 </div>

//                 {ownLeaveRequests
//                   .slice(0, 5)
//                   .map((leaveRequest) => (
//                     <div
//                       key={leaveRequest._id}
//                       className="att-pwa-my-leave-card"
//                     >
//                       <div>
//                         <span>
//                           {getLeaveTypeLabel(
//                             leaveRequest.leaveType
//                           )}
//                         </span>

//                         <strong>
//                           {formatDate(
//                             leaveRequest.fromDate
//                           )}
//                         </strong>

//                         <small>
//                           {getLeaveDurationLabel(
//                             leaveRequest.duration
//                           )}
//                         </small>
//                       </div>

//                       <div>
//                         <b
//                           className={`leave-status ${leaveRequest.status}`}
//                         >
//                           {formatStatus(
//                             leaveRequest.status
//                           )}
//                         </b>

//                         {leaveRequest.status ===
//                           "pending" && (
//                           <button
//                             type="button"
//                             disabled={
//                               leaveActionLoading ===
//                               leaveRequest._id
//                             }
//                             onClick={() =>
//                               handleCancelLeave(
//                                 leaveRequest
//                               )
//                             }
//                           >
//                             Cancel
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             )}

//           {/* =================================================
//               PWA REGULARIZATION REQUESTS
//           ================================================= */}

//           {canManageUsers &&
//             pendingRegularizations.length >
//               0 && (
//               <div className="att-pwa-section">
//                 <div className="att-pwa-section-head">
//                   <div>
//                     <span>
//                       APPROVAL QUEUE
//                     </span>

//                     <h3>
//                       Regularization
//                     </h3>
//                   </div>

//                   <b>
//                     {
//                       pendingRegularizations.length
//                     }{" "}
//                     pending
//                   </b>
//                 </div>

//                 {pendingRegularizations.map(
//                   (attendance) => (
//                     <div
//                       key={attendance._id}
//                       className="att-pwa-request-card"
//                     >
//                       <div className="att-pwa-request-card-head">
//                         <div>
//                           <h4>
//                             {attendance.employeeName ||
//                               "-"}
//                           </h4>

//                           <p>
//                             {formatDate(
//                               attendance.attendanceDate
//                             )}
//                           </p>
//                         </div>

//                         <span>
//                           {getRegularizationTypeLabel(
//                             attendance.regularization
//                               ?.type
//                           )}
//                         </span>
//                       </div>

//                       <div className="att-pwa-detail-grid">
//                         <div>
//                           <span>
//                             Requested In
//                           </span>

//                           <b>
//                             {formatRegularizedTime(
//                               attendance
//                                 .regularization
//                                 ?.requestedCheckIn
//                             )}
//                           </b>
//                         </div>

//                         <div>
//                           <span>
//                             Requested Out
//                           </span>

//                           <b>
//                             {formatRegularizedTime(
//                               attendance
//                                 .regularization
//                                 ?.requestedCheckOut
//                             )}
//                           </b>
//                         </div>
//                       </div>

//                       <p className="att-pwa-reason">
//                         {attendance.regularization
//                           ?.reason || "-"}
//                       </p>

//                       {canApproveRegularization && (
//                         <div className="att-pwa-request-actions">
//                           <button
//                             type="button"
//                             disabled={
//                               adminActionLoading ===
//                               attendance._id
//                             }
//                             onClick={() =>
//                               handleApproveRegularization(
//                                 attendance
//                               )
//                             }
//                           >
//                             Approve
//                           </button>

//                           <button
//                             type="button"
//                             className="reject"
//                             disabled={
//                               adminActionLoading ===
//                               attendance._id
//                             }
//                             onClick={() =>
//                               handleRejectRegularization(
//                                 attendance
//                               )
//                             }
//                           >
//                             Reject
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   )
//                 )}
//               </div>
//             )}

//           {/* =================================================
//               PWA TEAM ATTENDANCE
//           ================================================= */}

//           {canManageUsers && (
//             <div className="att-pwa-section">
//               <div className="att-pwa-section-head">
//                 <div>
//                   <span>
//                     LIVE OVERVIEW
//                   </span>

//                   <h3>
//                     Today’s Team
//                   </h3>
//                 </div>

//                 <b>
//                   {adminTodayOverview.length}{" "}
//                   records
//                 </b>
//               </div>

//               {adminTodayOverview.length ===
//               0 ? (
//                 <div className="att-pwa-empty">
//                   No attendance records for today
//                 </div>
//               ) : (
//                 adminTodayOverview.map(
//                   (attendance) => {
//                     const employee = {
//                       _id: getEmployeeId(
//                         attendance.employeeId
//                       ),

//                       name:
//                         attendance.employeeName,

//                       email:
//                         attendance.employeeEmail,
//                     };

//                     const todayLeave =
//                       getLeaveForDateAndEmployee(
//                         indiaTodayKey,
//                         employee
//                       );

//                     const health = getHealth(
//                       attendance,
//                       todayLeave
//                     );

//                     return (
//                       <div
//                         key={attendance._id}
//                         className="att-pwa-attendance-card"
//                       >
//                         <div className="att-pwa-card-top">
//                           <div>
//                             <h4>
//                               {attendance.employeeName ||
//                                 "Employee"}
//                             </h4>

//                             <p>
//                               {formatDate(
//                                 attendance.attendanceDate
//                               )}
//                             </p>
//                           </div>

//                           <span
//                             className={`att-pwa-pill ${health.className}`}
//                           >
//                             {health.label}
//                           </span>
//                         </div>

//                         {isWorkFromHomeAttendance(
//                           attendance
//                         ) && (
//                           <div className="att-pwa-location-box small">
//                             <b>
//                               WFH Location
//                             </b>

//                             <p>
//                               {getWorkLocationText(
//                                 attendance
//                               )}
//                             </p>

//                             {getWorkLocationMapLink(
//                               attendance
//                             ) && (
//                               <a
//                                 href={getWorkLocationMapLink(
//                                   attendance
//                                 )}
//                                 target="_blank"
//                                 rel="noreferrer"
//                               >
//                                 Map
//                               </a>
//                             )}
//                           </div>
//                         )}

//                         <div className="att-pwa-detail-grid">
//                           <div>
//                             <span>
//                               Check In
//                             </span>

//                             <b>
//                               {getDisplayCheckIn(
//                                 attendance
//                               )}
//                             </b>
//                           </div>

//                           <div>
//                             <span>
//                               Check Out
//                             </span>

//                             <b>
//                               {getDisplayCheckOut(
//                                 attendance
//                               )}
//                             </b>
//                           </div>

//                           <div>
//                             <span>
//                               Total
//                             </span>

//                             <b>
//                               {formatMinutes(
//                                 attendance.totalWorkingMinutes
//                               )}
//                             </b>
//                           </div>

//                           <div>
//                             <span>
//                               Mode
//                             </span>

//                             <b>
//                               {attendance.workMode ===
//                               "work_from_home"
//                                 ? "WFH"
//                                 : "Office"}
//                             </b>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   }
//                 )
//               )}
//             </div>
//           )}

//           {/* =================================================
//               PWA CALENDAR
//           ================================================= */}

//           <div className="att-pwa-calendar-card">
//             <div className="att-pwa-card-title">
//               <div>
//                 <span>
//                   MONTHLY VIEW
//                 </span>

//                 <h3>
//                   Attendance Calendar
//                 </h3>
//               </div>

//               <b>
//                 {months[selectedMonth]}{" "}
//                 {selectedYear}
//               </b>
//             </div>

//             <div className="att-pwa-legend-row">
//               <span>
//                 <b className="complete" />
//                 Present
//               </span>

//               <span>
//                 <b className="leave" />
//                 Leave
//               </span>

//               <span>
//                 <b className="lop" />
//                 LOP
//               </span>

//               <span>
//                 <b className="leave-pending" />
//                 Leave Pending
//               </span>

//               <span>
//                 <b className="short" />
//                 Short
//               </span>

//               <span>
//                 <b className="missing" />
//                 Missing
//               </span>
//             </div>

//             <div className="att-pwa-calendar-grid">
//               {[
//   "S",
//   "M",
//   "T",
//   "W",
//   "T",
//   "F",
//   "S",
// ].map((day, index) => (
//   <div
//     key={`${day}-${index}`}
//     className="week-name att-pwa-week-name"
//   >
//     {day}
//   </div>
// ))}

//               {Array.from({
//                 length: new Date(
//                   Date.UTC(
//                     selectedYear,
//                     selectedMonth,
//                     1
//                   )
//                 ).getUTCDay(),
//               }).map((_, index) => (
//                 <div
//                   key={`empty-${index}`}
//                   className="att-pwa-empty-day"
//                 />
//               ))}

//               {Array.from(
//                 {
//                   length:
//                     daysInSelectedMonth,
//                 },
//                 (_, index) => {
//                   const day = index + 1;

//                   const status =
//                     getDayStatus(day);

//                   return (
//                     <button
//   key={day}
//   type="button"
//   className={`att-pwa-day att-pwa-calendar-day ${status}`}
//   onClick={() =>
//     setSelectedDay(day)
//   }
// >
//   {day}
// </button>
//                   );
//                 }
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* =====================================================
//           DESKTOP UI
//       ===================================================== */}

//       <div className="attendance-desktop-ui">
//         <div className="timesheet-container">
//           <div className="timesheet-header">
//             <div>
//               <span className="attendance-eyebrow">
//                 BHARAT RMS HRMS
//               </span>

//               <h2>
//                 Attendance & Leave
//               </h2>

//               <p>
//                 Office attendance, regularization,
//                 leave and work-mode management
//               </p>
//             </div>

//             <div className="timesheet-header-actions">
//               <div className="attendance-hero-actions">
//   {canMarkAttendance && (
//     <>
//       <button
//         type="button"
//         className="attendance-hero-btn regularization"
//         onClick={
//           openManualRegularizationModal
//         }
//       >
//         <span>⏱</span>

//         Request Regularization
//       </button>

//       <button
//         type="button"
//         className="attendance-hero-btn wfh"
//         disabled={
//           workFromHomeLoading ||
//           Boolean(
//             pendingWorkFromHomeRequest
//           )
//         }
//         onClick={() =>
//           openApplyWorkFromHomeModal(
//             selectedDateKey ||
//               indiaTodayKey
//           )
//         }
//       >
//         <span>⌂</span>

//         {pendingWorkFromHomeRequest
//           ? "WFH Pending"
//           : "Apply WFH"}
//       </button>

//       <button
//         type="button"
//         className="attendance-hero-btn leave"
//         onClick={() =>
//           openLeaveModal(
//             selectedDateKey ||
//               indiaTodayKey
//           )
//         }
//       >
//         <span>🏖</span>

//         Apply Leave
//       </button>
//     </>
//   )}
// </div>

//               {/* {canManageUsers && (
//                 <button
//                   type="button"
//                   className="attendance-wfh-btn"
//                   onClick={() =>
//                     openWorkFromHomeModal()
//                   }
//                 >
//                   Manage Work Mode
//                 </button>
//               )} */}
//             </div>
//           </div>

//           {/* =================================================
//               DESKTOP SUMMARY CARDS
//           ================================================= */}

//           {/* =================================================
//     DESKTOP WORK FROM HOME CARD
// ================================================= */}

// {/* {canMarkAttendance && (
//   <div className="attendance-wfh-overview-card">
//     <div className="attendance-wfh-overview-icon">
//       ⌂
//     </div>

//     <div className="attendance-wfh-overview-copy">
//       <span>
//         FLEXIBLE WORK
//       </span>

//       <h3>
//         Work From Home
//       </h3>

//       <p>
//         {pendingWorkFromHomeRequest
//           ? `Your WFH request from ${formatDate(
//               pendingWorkFromHomeRequest.fromDate
//             )} to ${formatDate(
//               pendingWorkFromHomeRequest.toDate
//             )} is awaiting approval.`
//           : isWorkFromHomeAttendance(
//               effectiveTodayAttendance
//             )
//           ? "Your Work From Home request is approved for today."
//           : isAdmin
//           ? "Your request requires approval from Super Admin."
//           : "Apply for remote work. Approval is required from Admin or Super Admin."}
//       </p>
//     </div>

//     <div className="attendance-wfh-overview-meta">
//       <span>
//         Today’s Mode
//       </span>

//       <strong>
//         {isWorkFromHomeAttendance(
//           effectiveTodayAttendance
//         )
//           ? "Work From Home"
//           : "Office"}
//       </strong>
//     </div>

//     <div className="attendance-wfh-overview-meta">
//       <span>
//         Request Status
//       </span>

//       <strong
//         className={
//           pendingWorkFromHomeRequest
//             ? "pending"
//             : isWorkFromHomeAttendance(
//                 effectiveTodayAttendance
//               )
//             ? "approved"
//             : ""
//         }
//       >
//         {pendingWorkFromHomeRequest
//           ? "Pending Approval"
//           : isWorkFromHomeAttendance(
//               effectiveTodayAttendance
//             )
//           ? "Approved"
//           : "No Active Request"}
//       </strong>
//     </div>

//     <button
//       type="button"
//       className="attendance-wfh-card-btn"
//       disabled={
//         workFromHomeLoading ||
//         Boolean(
//           pendingWorkFromHomeRequest
//         )
//       }
//       onClick={() =>
//         openApplyWorkFromHomeModal(
//           selectedDateKey ||
//             indiaTodayKey
//         )
//       }
//     >
//       {pendingWorkFromHomeRequest
//         ? "Request Pending"
//         : "Apply Work From Home"}
//     </button>
//   </div>
// )} */}

// {/* =================================================
//     DESKTOP SUMMARY CARDS
// ================================================= */}

// <div className="attendance-summary-grid">
//             <div className="attendance-summary-card">
//               <span>
//                 Today Status
//               </span>

//               <strong>
//                 {pwaTodayHealth.label}
//               </strong>

//               <small>
//                 {todayCheckedIn
//                   ? `In ${formatTime(
//                       effectiveTodayAttendance
//                         ?.checkIn?.time
//                     )}`
//                   : "No check-in"}
//               </small>
//             </div>

//             {canMarkAttendance && (
//               <>
//                 <div className="attendance-summary-card leave">
//                   <span>
//                     Paid Leave Available
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.availablePaidLeave ||
//                         0
//                     )}
//                   </strong>

//                   <small>
//                     Monthly entitlement
//                   </small>
//                 </div>

//                 <div className="attendance-summary-card pending">
//                   <span>
//                     Leave Pending
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.pendingPaidLeave ||
//                         0
//                     )}
//                   </strong>

//                   <small>
//                     Awaiting decision
//                   </small>
//                 </div>

//                 <div className="attendance-summary-card lop">
//                   <span>
//                     Approved LOP
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.approvedLossOfPay ||
//                         0
//                     )}
//                   </strong>

//                   <small>
//                     Current month
//                   </small>
//                 </div>

//                 <div className="attendance-summary-card wfh">
//   <span>
//     APPROVED WFH
//   </span>

//   <strong>
//     {
//       approvedWorkFromHomeThisMonth
//     }
//   </strong>

//   <small>
//     Current month
//   </small>
// </div>

//               </>
//             )}

//             {canManageUsers && (
//   <>
//     <div className="attendance-summary-card warning">
//       <span>
//         Pending Regularization
//       </span>

//       <strong>
//         {
//           pendingRegularizations.length
//         }
//       </strong>

//       <small>
//         Requires review
//       </small>
//     </div>

//     <div className="attendance-summary-card leave">
//       <span>
//         Pending Leave
//       </span>

//       <strong>
//         {
//           pendingLeaveRequests.length
//         }
//       </strong>

//       <small>
//         Requires approval
//       </small>
//     </div>

//     <div className="attendance-summary-card wfh">
//       <span>
//         Pending WFH
//       </span>

//       <strong>
//         {
//           pendingWorkFromHomeRequests.length
//         }
//       </strong>

//       <small>
//         Requires approval
//       </small>
//     </div>
//   </>
// )}
//           </div>

//           {/* =================================================
//               DESKTOP TODAY ATTENDANCE
//           ================================================= */}

//           {canMarkAttendance && (
//             <div className="attendance-action-card">
//               <div>
//                 <span className="attendance-eyebrow">
//                   TODAY
//                 </span>

//                 <h3>
//                   Today’s Attendance
//                 </h3>

//                 <p>
//                   {todayCheckedIn
//                     ? `Checked in at ${formatTime(
//                         effectiveTodayAttendance
//                           ?.checkIn?.time
//                       )}`
//                     : pwaTodayLeave?.status ===
//                       "approved"
//                     ? `${getLeaveTypeLabel(
//                         pwaTodayLeave.leaveType
//                       )} approved`
//                     : "Please check in from your approved location."}

//                   {todayCheckedOut
//                     ? ` · Checked out at ${formatTime(
//                         effectiveTodayAttendance
//                           ?.checkOut?.time
//                       )}`
//                     : ""}
//                 </p>

//                 {isWorkFromHomeAttendance(
//                   effectiveTodayAttendance
//                 ) && (
//                   <div className="wfh-location-line">
//                     <b>
//                       WFH Location:
//                     </b>{" "}

//                     {getWorkLocationText(
//                       effectiveTodayAttendance
//                     )}

//                     {getWorkLocationMapLink(
//                       effectiveTodayAttendance
//                     ) && (
//                       <a
//                         href={getWorkLocationMapLink(
//                           effectiveTodayAttendance
//                         )}
//                         target="_blank"
//                         rel="noreferrer"
//                         className="wfh-map-link"
//                       >
//                         View Exact Map
//                       </a>
//                     )}
//                   </div>
//                 )}

//                 {pwaTodayLeave && (
//                   <div
//                     className={`attendance-today-leave ${pwaTodayLeave.status}`}
//                   >
//                     <strong>
//                       {getLeaveTypeLabel(
//                         pwaTodayLeave.leaveType
//                       )}
//                     </strong>

//                     <span>
//                       {getLeaveDurationLabel(
//                         pwaTodayLeave.duration
//                       )}{" "}
//                       ·{" "}
//                       {formatStatus(
//                         pwaTodayLeave.status
//                       )}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {!pwaTodayLeave ||
//               pwaTodayLeave.status !==
//                 "approved" ? (
//                 <div className="attendance-action-buttons">
//                   <button
//                     type="button"
//                     className="attendance-checkin-btn"
//                     onClick={handleCheckIn}
//                     disabled={
//                       attendanceLoading ||
//                       todayCheckedIn
//                     }
//                   >
//                     {attendanceLoading &&
//                     !todayCheckedIn
//                       ? "Checking In..."
//                       : todayCheckedIn
//                       ? "Checked In"
//                       : "Check In"}
//                   </button>

//                   <button
//                     type="button"
//                     className="attendance-checkout-btn"
//                     onClick={handleCheckOut}
//                     disabled={
//                       attendanceLoading ||
//                       !todayCheckedIn ||
//                       todayCheckedOut
//                     }
//                   >
//                     {attendanceLoading &&
//                     todayCheckedIn &&
//                     !todayCheckedOut
//                       ? "Checking Out..."
//                       : todayCheckedOut
//                       ? "Checked Out"
//                       : "Check Out"}
//                   </button>
                  

//                   {todayCheckedIn &&
//                     !todayCheckedOut &&
//                     effectiveTodayAttendance
//                       ?.regularization
//                       ?.status !==
//                       "pending" && (
//                       <button
//                         type="button"
//                         className="attendance-regularize-btn"
//                         onClick={() =>
//                           openRegularizeModal(
//                             indiaTodayKey,
//                             effectiveTodayAttendance
//                           )
//                         }
//                       >
//                         Regularize
//                       </button>
//                     )}
//                 </div>
//               ) : null}
//             </div>
//           )}

//           {/* =================================================
//               DESKTOP FILTERS
//           ================================================= */}

//           <div className="timesheet-filter-card">
//             <div className="filter-title">
//               <h3>
//                 Attendance Filters
//               </h3>

//               <p>
//                 View records by employee,
//                 month and year
//               </p>
//             </div>

//             <div className="timesheet-filter-grid">
//               {canManageUsers && (
//                 <div className="filter-field">
//                   <label>
//                     Employee
//                   </label>

//                   <select
//                     name="employeeId"
//                     value={
//                       filters.employeeId
//                     }
//                     onChange={
//                       handleFilterChange
//                     }
//                   >
//                     <option value="">
//                       All Employees
//                     </option>

//                     {allEmployeesForView.map(
//                       (employee) => (
//                         <option
//                           key={
//                             employee._id ||
//                             employee.id
//                           }
//                           value={
//                             employee._id ||
//                             employee.id
//                           }
//                         >
//                           {employee.name}
//                         </option>
//                       )
//                     )}
//                   </select>
//                 </div>
//               )}

//               <div className="filter-field">
//                 <label>
//                   Month
//                 </label>

//                 <select
//                   name="month"
//                   value={filters.month}
//                   onChange={
//                     handleFilterChange
//                   }
//                 >
//                   {months.map(
//                     (month, index) => (
//                       <option
//                         key={month}
//                         value={index}
//                       >
//                         {month}
//                       </option>
//                     )
//                   )}
//                 </select>
//               </div>

//               <div className="filter-field">
//                 <label>
//                   Year
//                 </label>

//                 <select
//                   name="year"
//                   value={filters.year}
//                   onChange={
//                     handleFilterChange
//                   }
//                 >
//                   {getCurrentYearOptions().map(
//                     (year) => (
//                       <option
//                         key={year}
//                         value={year}
//                       >
//                         {year}
//                       </option>
//                     )
//                   )}
//                 </select>
//               </div>
//             </div>
//           </div>

//           {/* =================================================
//               DESKTOP LEAVE APPROVAL TABLE
//           ================================================= */}

//           {canManageUsers &&
//             pendingLeaveRequests.length > 0 && (
//               <div className="attendance-admin-card">
//                 <div className="section-heading">
//                   <div>
//                     <span className="attendance-eyebrow">
//                       APPROVAL QUEUE
//                     </span>

//                     <h3>
//                       Leave Requests
//                     </h3>
//                   </div>

//                   <span>
//                     {
//                       pendingLeaveRequests.length
//                     }{" "}
//                     pending
//                   </span>
//                 </div>

//                 <div className="attendance-admin-table-wrap">
//                   <table className="attendance-admin-table">
//                     <thead>
//                       <tr>
//                         <th>
//                           Employee
//                         </th>

//                         <th>
//                           Leave
//                         </th>

//                         <th>
//                           Duration
//                         </th>

//                         <th>
//                           Dates
//                         </th>

//                         <th>
//                           Reason
//                         </th>

//                         <th>
//                           Action
//                         </th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {pendingLeaveRequests.map(
//                         (leaveRequest) => (
//                           <tr
//                             key={
//                               leaveRequest._id
//                             }
//                           >
//                             <td>
//                               <strong>
//                                 {leaveRequest.employeeName ||
//                                   "-"}
//                               </strong>

//                               <small>
//                                 {formatStatus(
//                                   leaveRequest.employeeRole
//                                 )}
//                               </small>
//                             </td>

//                             <td>
//                               <span
//                                 className={`attendance-leave-pill ${leaveRequest.leaveType}`}
//                               >
//                                 {getLeaveTypeLabel(
//                                   leaveRequest.leaveType
//                                 )}
//                               </span>
//                             </td>

//                             <td>
//                               {getLeaveDurationLabel(
//                                 leaveRequest.duration
//                               )}
//                             </td>

//                             <td>
//                               {formatDate(
//                                 leaveRequest.fromDate
//                               )}

//                               {getDateKey(
//                                 leaveRequest.fromDate
//                               ) !==
//                                 getDateKey(
//                                   leaveRequest.toDate
//                                 ) &&
//                                 ` - ${formatDate(
//                                   leaveRequest.toDate
//                                 )}`}
//                             </td>

//                             <td>
//                               <div className="attendance-reason-cell">
//                                 {leaveRequest.reason ||
//                                   "-"}
//                               </div>
//                             </td>

//                             <td>
//                               {canApproveLeaveRequest(
//                                 leaveRequest
//                               ) ? (
//                                 <div className="attendance-table-actions">
//                                   <button
//                                     type="button"
//                                     className="regularization-approve-btn"
//                                     disabled={
//                                       leaveActionLoading ===
//                                       leaveRequest._id
//                                     }
//                                     onClick={() =>
//                                       handleApproveLeave(
//                                         leaveRequest
//                                       )
//                                     }
//                                   >
//                                     Approve
//                                   </button>

//                                   <button
//                                     type="button"
//                                     className="regularization-reject-btn"
//                                     disabled={
//                                       leaveActionLoading ===
//                                       leaveRequest._id
//                                     }
//                                     onClick={() =>
//                                       handleRejectLeave(
//                                         leaveRequest
//                                       )
//                                     }
//                                   >
//                                     Reject
//                                   </button>
//                                 </div>
//                               ) : (
//                                 <span>
//                                   Super admin approval
//                                 </span>
//                               )}
//                             </td>
//                           </tr>
//                         )
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//           {/* =================================================
//               DESKTOP TEAM TODAY
//           ================================================= */}

//           {canManageUsers && (
//             <div className="attendance-admin-card">
//               <div className="section-heading">
//                 <div>
//                   <span className="attendance-eyebrow">
//                     LIVE OVERVIEW
//                   </span>

//                   <h3>
//                     Today Attendance
//                   </h3>
//                 </div>

//                 <span>
//                   {adminTodayOverview.length}{" "}
//                   records
//                 </span>
//               </div>

//               {adminTodayOverview.length ===
//               0 ? (
//                 <div className="empty-state">
//                   No attendance records for today
//                 </div>
//               ) : (
//                 <div className="attendance-admin-table-wrap">
//                   <table className="attendance-admin-table">
//                     <thead>
//                       <tr>
//                         <th>
//                           Employee
//                         </th>

//                         <th>
//                           Check In
//                         </th>

//                         <th>
//                           Check Out
//                         </th>

//                         <th>
//                           Total
//                         </th>

//                         <th>
//                           Mode
//                         </th>

//                         <th>
//                           Status
//                         </th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {adminTodayOverview.map(
//                         (attendance) => {
//                           const health =
//                             getHealth(
//                               attendance
//                             );

//                           return (
//                             <tr
//                               key={
//                                 attendance._id
//                               }
//                             >
//                               <td>
//                                 <strong>
//                                   {attendance.employeeName ||
//                                     "-"}
//                                 </strong>

//                                 {isWorkFromHomeAttendance(
//                                   attendance
//                                 ) && (
//                                   <div className="wfh-location-mini">
//                                     {getWorkLocationText(
//                                       attendance
//                                     )}

//                                     {getWorkLocationMapLink(
//                                       attendance
//                                     ) && (
//                                       <a
//                                         href={getWorkLocationMapLink(
//                                           attendance
//                                         )}
//                                         target="_blank"
//                                         rel="noreferrer"
//                                         className="wfh-map-link mini"
//                                       >
//                                         Map
//                                       </a>
//                                     )}
//                                   </div>
//                                 )}
//                               </td>

//                               <td>
//                                 {getDisplayCheckIn(
//                                   attendance
//                                 )}
//                               </td>

//                               <td>
//                                 {getDisplayCheckOut(
//                                   attendance
//                                 )}
//                               </td>

//                               <td>
//                                 {formatMinutes(
//                                   attendance.totalWorkingMinutes
//                                 )}
//                               </td>

//                               <td>
//                                 {attendance.workMode ===
//                                 "work_from_home"
//                                   ? "Work From Home"
//                                   : "Office"}
//                               </td>

//                               <td>
//                                 <span
//                                   className={`attendance-health-pill ${health.className}`}
//                                 >
//                                   {health.label}
//                                 </span>
//                               </td>
//                             </tr>
//                           );
//                         }
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* =================================================
//               DESKTOP REGULARIZATION APPROVALS
//           ================================================= */}

//           {canManageUsers &&
//             pendingRegularizations.length >
//               0 && (
//               <div className="attendance-admin-card">
//                 <div className="section-heading">
//                   <div>
//                     <span className="attendance-eyebrow">
//                       APPROVAL QUEUE
//                     </span>

//                     <h3>
//                       Regularization Requests
//                     </h3>
//                   </div>

//                   <span>
//                     {
//                       pendingRegularizations.length
//                     }{" "}
//                     pending
//                   </span>
//                 </div>

//                 <div className="regularization-request-grid">
//                   {pendingRegularizations.map(
//                     (attendance) => (
//                       <div
//                         key={attendance._id}
//                         className="regularization-request-card"
//                       >
//                         <div className="regularization-request-top">
//                           <div>
//                             <h4>
//                               {attendance.employeeName ||
//                                 "-"}
//                             </h4>

//                             <p>
//                               {formatDate(
//                                 attendance.attendanceDate
//                               )}
//                             </p>
//                           </div>

//                           <span>
//                             {getRegularizationTypeLabel(
//                               attendance.regularization
//                                 ?.type
//                             )}
//                           </span>
//                         </div>

//                         <div className="regularization-request-info">
//                           <p>
//                             <b>
//                               Requested In:
//                             </b>{" "}

//                             {formatRegularizedTime(
//                               attendance
//                                 .regularization
//                                 ?.requestedCheckIn
//                             )}
//                           </p>

//                           <p>
//                             <b>
//                               Requested Out:
//                             </b>{" "}

//                             {formatRegularizedTime(
//                               attendance
//                                 .regularization
//                                 ?.requestedCheckOut
//                             )}
//                           </p>

//                           <p>
//                             <b>
//                               Reason:
//                             </b>{" "}

//                             {attendance.regularization
//                               ?.reason || "-"}
//                           </p>
//                         </div>

//                         {canApproveRegularization && (
//                           <div className="regularization-request-actions">
//                             <button
//                               type="button"
//                               className="regularization-approve-btn"
//                               disabled={
//                                 adminActionLoading ===
//                                 attendance._id
//                               }
//                               onClick={() =>
//                                 handleApproveRegularization(
//                                   attendance
//                                 )
//                               }
//                             >
//                               Approve
//                             </button>

//                             <button
//                               type="button"
//                               className="regularization-reject-btn"
//                               disabled={
//                                 adminActionLoading ===
//                                 attendance._id
//                               }
//                               onClick={() =>
//                                 handleRejectRegularization(
//                                   attendance
//                                 )
//                               }
//                             >
//                               Reject
//                             </button>
//                           </div>
//                         )}
//                       </div>
//                     )
//                   )}
//                 </div>
//               </div>
//             )}

//           {/* =================================================
//               DESKTOP CALENDAR
//           ================================================= */}

//           <div className="timesheet-main-grid">
//             <div className="timesheet-left">
//               <div className="reports-card">
//                 <div className="section-heading">
//                   <div>
//                     <span className="attendance-eyebrow">
//                       WEEKLY VIEW
//                     </span>

//                     <h3>
//                       Week {weekPage + 1}
//                     </h3>
//                   </div>

//                   <span>
//                     {
//                       currentWeekAttendance.length
//                     }{" "}
//                     records
//                   </span>
//                 </div>

//                 <div className="week-pagination">
//                   <button
//                     type="button"
//                     disabled={weekPage <= 0}
//                     onClick={() =>
//                       setWeekPage(
//                         (previous) =>
//                           previous - 1
//                       )
//                     }
//                   >
//                     Previous Week
//                   </button>

//                   <strong>
//                     {currentWeekDays.length >
//                     0
//                       ? `${
//                           months[selectedMonth]
//                         } ${
//                           currentWeekDays[0]
//                         } - ${
//                           currentWeekDays[
//                             currentWeekDays.length -
//                               1
//                           ]
//                         }, ${selectedYear}`
//                       : "-"}
//                   </strong>

//                   <button
//                     type="button"
//                     disabled={
//                       weekPage >=
//                       weeks.length - 1
//                     }
//                     onClick={() =>
//                       setWeekPage(
//                         (previous) =>
//                           previous + 1
//                       )
//                     }
//                   >
//                     Next Week
//                   </button>
//                 </div>

//                 <div className="report-list">
//                   {currentWeekAttendance.length ===
//                   0 ? (
//                     <div className="empty-state">
//                       No attendance record found in this week
//                     </div>
//                   ) : (
//                     currentWeekAttendance.map(
//                       (attendance) => {
//                         const health =
//                           getHealth(
//                             attendance
//                           );

//                         return (
//                           <div
//                             key={
//                               attendance._id
//                             }
//                             className="report-item"
//                           >
//                             <div className="report-top">
//                               <strong>
//                                 {formatDate(
//                                   attendance.attendanceDate
//                                 )}
//                               </strong>

//                               {canManageUsers && (
//                                 <span>
//                                   {attendance.employeeName ||
//                                     "-"}
//                                 </span>
//                               )}
//                             </div>

//                             <p>
//                               <b>
//                                 Check In:
//                               </b>{" "}

//                               {getDisplayCheckIn(
//                                 attendance
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Check Out:
//                               </b>{" "}

//                               {getDisplayCheckOut(
//                                 attendance
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Total Time:
//                               </b>{" "}

//                               {formatMinutes(
//                                 attendance.totalWorkingMinutes
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Status:
//                               </b>{" "}

//                               <span
//                                 className={`attendance-health-pill ${health.className}`}
//                               >
//                                 {health.label}
//                               </span>
//                             </p>
//                           </div>
//                         );
//                       }
//                     )
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="timesheet-right">
//               <div className="calendar-card">
//                 <div className="section-heading">
//                   <div>
//                     <span className="attendance-eyebrow">
//                       MONTHLY VIEW
//                     </span>

//                     <h3>
//                       Attendance Calendar
//                     </h3>
//                   </div>

//                   <span>
//                     {months[selectedMonth]}{" "}
//                     {selectedYear}
//                   </span>
//                 </div>

//                 <div className="calendar-legend">
//                   <span>
//                     <b className="dot green" />
//                     Complete
//                   </span>

//                   <span>
//                     <b className="dot leave" />
//                     Paid Leave
//                   </span>

//                   <span>
//                     <b className="dot lop" />
//                     LOP
//                   </span>

//                   <span>
//                     <b className="dot leave-pending" />
//                     Leave Pending
//                   </span>

//                   <span>
//                     <b className="dot red-light" />
//                     Short Hours
//                   </span>

//                   <span>
//                     <b className="dot red" />
//                     Missing
//                   </span>
//                 </div>

//                 <div className="calendar-grid">
//                   {[
//                     "Sun",
//                     "Mon",
//                     "Tue",
//                     "Wed",
//                     "Thu",
//                     "Fri",
//                     "Sat",
//                   ].map((day) => (
//                     <div
//                       key={day}
//                       className="week-name"
//                     >
//                       {day}
//                     </div>
//                   ))}

//                   {Array.from({
//                     length: new Date(
//                       Date.UTC(
//                         selectedYear,
//                         selectedMonth,
//                         1
//                       )
//                     ).getUTCDay(),
//                   }).map((_, index) => (
//                     <div
//                       key={`empty-${index}`}
//                       className="empty-day"
//                     />
//                   ))}

//                   {Array.from(
//                     {
//                       length:
//                         daysInSelectedMonth,
//                     },
//                     (_, index) => {
//                       const day =
//                         index + 1;

//                       const status =
//                         getDayStatus(day);

//                       return (
//                         <button
//                           key={day}
//                           className={`calendar-day ${status}`}
//                           onClick={() =>
//                             setSelectedDay(
//                               day
//                             )
//                           }
//                           type="button"
//                         >
//                           <strong>
//                             {day}
//                           </strong>
//                         </button>
//                       );
//                     }
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* =====================================================
//           SELECTED DAY MODAL
//       ===================================================== */}

//       {selectedDay && (
//         <div className="timesheet-modal-overlay">
//           <div className="timesheet-modal attendance-day-modal">
//             <div className="modal-header">
//               <div>
//                 <span className="attendance-eyebrow">
//                   DAILY DETAIL
//                 </span>

//                 <h3>
//                   {selectedDay}{" "}
//                   {months[selectedMonth]}{" "}
//                   {selectedYear}
//                 </h3>

//                 <p>
//                   {canManageUsers
//                     ? `${selectedDayEmployeeRows.length} employee record(s)`
//                     : "Attendance and leave details"}
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() =>
//                   setSelectedDay(null)
//                 }
//               >
//                 ×
//               </button>
//             </div>

//             <div className="modal-body">
//               {isSelectedSunday && (
//                 <div className="attendance-warning-box sunday">
//                   Sunday is weekly off.
//                   Regularization and leave are
//                   not required.
//                 </div>
//               )}

//               {selectedDayEmployeeRows.map(
//                 ({
//                   employee,
//                   attendance,
//                   leave,
//                 }) => {
//                   const minutes = Number(
//                     attendance
//                       ?.totalWorkingMinutes || 0
//                   );

//                   const employeeId =
//                     employee?._id ||
//                     employee?.id ||
//                     "";

//                   const isOwnRow =
//                     String(employeeId) ===
//                       String(
//                         user._id ||
//                           user.id ||
//                           ""
//                       ) ||
//                     String(
//                       employee?.email || ""
//                     ).toLowerCase() ===
//                       String(
//                         user.email || ""
//                       ).toLowerCase();

//                   const rowShortHours =
//                     attendance
//                       ?.attendanceStatus ===
//                       "checked_out" &&
//                     minutes > 0 &&
//                     minutes <
//                       REQUIRED_WORK_MINUTES;

//                   const approvedLeave =
//                     attendance
//                       ?.attendanceStatus ===
//                       "on_leave" ||
//                     attendance
//                       ?.attendanceStatus ===
//                       "loss_of_pay" ||
//                     leave?.status ===
//                       "approved";

//                   const rowCanRegularize =
//                     isOwnRow &&
//                     canMarkAttendance &&
//                     !isSelectedSunday &&
//                     selectedDateKey >=
//                       regularizationStartKey &&
//                     selectedDateKey <=
//                       indiaTodayKey &&
//                     !approvedLeave &&
//                     (!attendance ||
//                       attendance.attendanceStatus ===
//                         "not_checked_in" ||
//                       attendance.attendanceStatus ===
//                         "checked_in" ||
//                       attendance.attendanceStatus ===
//                         "absent" ||
//                       rowShortHours) &&
//                     !isCompletedAttendance(
//                       attendance
//                     ) &&
//                     ![
//                       "pending",
//                       "approved",
//                     ].includes(
//                       attendance?.regularization
//                         ?.status
//                     );

//                   const rowCanApplyLeave =
//                     isOwnRow &&
//                     canMarkAttendance &&
//                     !isSelectedSunday &&
//                     !attendance?.checkIn?.time &&
//                     !attendance?.checkOut?.time &&
//                     !leave;

//                   const health = getHealth(
//                     attendance,
//                     leave
//                   );

//                   return (
//                     <div
//                       key={`${employeeId}-${selectedDateKey}`}
//                       className="employee-attendance-day-card"
//                     >
//                       <div className="employee-attendance-day-top">
//                         <div>
//                           <h4>
//                             {employee?.name ||
//                               attendance?.employeeName ||
//                               "-"}
//                           </h4>

//                           <p>
//                             {formatReadableDate(
//                               selectedDateKey
//                             )}
//                           </p>

//                           {isWorkFromHomeAttendance(
//                             attendance
//                           ) && (
//                             <div className="wfh-location-line">
//                               <b>
//                                 WFH Location:
//                               </b>{" "}

//                               {getWorkLocationText(
//                                 attendance
//                               )}

//                               {getWorkLocationMapLink(
//                                 attendance
//                               ) && (
//                                 <a
//                                   href={getWorkLocationMapLink(
//                                     attendance
//                                   )}
//                                   target="_blank"
//                                   rel="noreferrer"
//                                   className="wfh-map-link"
//                                 >
//                                   View Map
//                                 </a>
//                               )}
//                             </div>
//                           )}
//                         </div>

//                         <span
//                           className={`attendance-health-pill ${health.className}`}
//                         >
//                           {health.label}
//                         </span>
//                       </div>

//                       <div className="attendance-detail-box employee-detail-box">
//                         <div>
//                           <span>
//                             Status
//                           </span>

//                           <strong>
//                             {attendance
//                               ?.attendanceStatus
//                               ? formatStatus(
//                                   attendance.attendanceStatus
//                                 )
//                               : leave
//                               ? formatStatus(
//                                   leave.status
//                                 )
//                               : "No Attendance"}
//                           </strong>
//                         </div>

//                         <div>
//                           <span>
//                             Check In
//                           </span>

//                           <strong>
//                             {getDisplayCheckIn(
//                               attendance
//                             )}
//                           </strong>
//                         </div>

//                         <div>
//                           <span>
//                             Check Out
//                           </span>

//                           <strong>
//                             {getDisplayCheckOut(
//                               attendance
//                             )}
//                           </strong>
//                         </div>

//                         <div>
//                           <span>
//                             Total Time
//                           </span>

//                           <strong>
//                             {formatMinutes(
//                               attendance
//                                 ?.totalWorkingMinutes
//                             )}
//                           </strong>
//                         </div>
//                       </div>

//                       {leave && (
//                         <div
//                           className={`attendance-leave-detail ${leave.status}`}
//                         >
//                           <div>
//                             <span>
//                               Leave Type
//                             </span>

//                             <strong>
//                               {getLeaveTypeLabel(
//                                 leave.leaveType
//                               )}
//                             </strong>
//                           </div>

//                           <div>
//                             <span>
//                               Duration
//                             </span>

//                             <strong>
//                               {getLeaveDurationLabel(
//                                 leave.duration
//                               )}
//                             </strong>
//                           </div>

//                           <div>
//                             <span>
//                               Status
//                             </span>

//                             <strong>
//                               {formatStatus(
//                                 leave.status
//                               )}
//                             </strong>
//                           </div>

//                           <p>
//                             <b>
//                               Reason:
//                             </b>{" "}

//                             {leave.reason || "-"}
//                           </p>

//                           {isOwnRow &&
//                             leave.status ===
//                               "pending" && (
//                               <button
//                                 type="button"
//                                 onClick={() =>
//                                   handleCancelLeave(
//                                     leave
//                                   )
//                                 }
//                               >
//                                 Cancel Leave Request
//                               </button>
//                             )}

//                           {canApproveLeaveRequest(
//                             leave
//                           ) &&
//                             leave.status ===
//                               "pending" && (
//                               <div className="regularization-request-actions inline-actions">
//                                 <button
//                                   type="button"
//                                   className="regularization-approve-btn"
//                                   onClick={() =>
//                                     handleApproveLeave(
//                                       leave
//                                     )
//                                   }
//                                 >
//                                   Approve Leave
//                                 </button>

//                                 <button
//                                   type="button"
//                                   className="regularization-reject-btn"
//                                   onClick={() =>
//                                     handleRejectLeave(
//                                       leave
//                                     )
//                                   }
//                                 >
//                                   Reject Leave
//                                 </button>
//                               </div>
//                             )}
//                         </div>
//                       )}

//                       {rowShortHours && (
//                         <div className="attendance-warning-box danger">
//                           Working time is less than
//                           nine hours.
//                         </div>
//                       )}

//                       {attendance?.regularization
//                         ?.status &&
//                         attendance.regularization
//                           .status !==
//                           "none" && (
//                           <div className="regularization-inline-box">
//                             <p>
//                               <b>
//                                 Regularization:
//                               </b>{" "}

//                               {formatStatus(
//                                 attendance
//                                   .regularization
//                                   .status
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Type:
//                               </b>{" "}

//                               {getRegularizationTypeLabel(
//                                 attendance
//                                   .regularization
//                                   .type
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Requested In:
//                               </b>{" "}

//                               {formatRegularizedTime(
//                                 attendance
//                                   .regularization
//                                   .requestedCheckIn
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Requested Out:
//                               </b>{" "}

//                               {formatRegularizedTime(
//                                 attendance
//                                   .regularization
//                                   .requestedCheckOut
//                               )}
//                             </p>

//                             <p>
//                               <b>
//                                 Reason:
//                               </b>{" "}

//                               {attendance
//                                 .regularization
//                                 .reason || "-"}
//                             </p>
//                           </div>
//                         )}

//                       {canApproveRegularization &&
//                         attendance
//                           ?.regularization
//                           ?.status ===
//                           "pending" && (
//                           <div className="regularization-request-actions inline-actions">
//                             <button
//                               type="button"
//                               className="regularization-approve-btn"
//                               disabled={
//                                 adminActionLoading ===
//                                 attendance._id
//                               }
//                               onClick={() =>
//                                 handleApproveRegularization(
//                                   attendance
//                                 )
//                               }
//                             >
//                               Approve
//                             </button>

//                             <button
//                               type="button"
//                               className="regularization-reject-btn"
//                               disabled={
//                                 adminActionLoading ===
//                                 attendance._id
//                               }
//                               onClick={() =>
//                                 handleRejectRegularization(
//                                   attendance
//                                 )
//                               }
//                             >
//                               Reject
//                             </button>
//                           </div>
//                         )}

//                       {rowCanRegularize && (
//                         <div className="calendar-regularize-panel">
//                           <p>
//                             Attendance is missing,
//                             incomplete or short for this
//                             date.
//                           </p>

//                           <button
//                             type="button"
//                             className={`calendar-regularize-btn ${
//                               rowShortHours
//                                 ? "danger"
//                                 : ""
//                             }`}
//                             onClick={() =>
//                               openRegularizeModal(
//                                 selectedDateKey,
//                                 attendance
//                               )
//                             }
//                           >
//                             Request Regularization
//                           </button>
//                         </div>
//                       )}

//                       {rowCanApplyLeave && (
//                         <div className="calendar-leave-panel">
//                           <p>
//                             No attendance or leave record
//                             exists for this date.
//                           </p>

//                           <button
//                             type="button"
//                             className="calendar-leave-btn"
//                             onClick={() =>
//                               openLeaveModal(
//                                 selectedDateKey
//                               )
//                             }
//                           >
//                             Apply Leave
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 }
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* =====================================================
//           REGULARIZATION MODAL
//       ===================================================== */}

//       {regularizeModal.open && (
//         <div className="timesheet-modal-overlay">
//           <div className="timesheet-modal regularize-modal">
//             <div className="modal-header">
//               <div>
//                 <span className="attendance-eyebrow">
//                   ATTENDANCE CORRECTION
//                 </span>

//                 <h3>
//                   Request Regularization
//                 </h3>

//                 <p>
//                   {regularizeModal.type ===
//                   "missed_check_in"
//                     ? "Missing check-in request"
//                     : "Check-out or short-hours correction"}
//                 </p>
//               </div>

//               <button
//                 onClick={
//                   closeRegularizeModal
//                 }
//                 type="button"
//               >
//                 ×
//               </button>
//             </div>

//             <form
//               className="regularize-form"
//               onSubmit={
//                 submitRegularization
//               }
//             >
//               <div className="regularize-premium-info">
//                 <div>
//                   <span>
//                     Attendance Date
//                   </span>

//                   <strong>
//                     {formatReadableDate(
//                       regularizeModal.date
//                     )}
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     Request Type
//                   </span>

//                   <strong>
//                     {getRegularizationTypeLabel(
//                       regularizeModal.type
//                     )}
//                   </strong>
//                 </div>
//               </div>

//               <div className="regularize-field">
//                 <label>
//                   Attendance Date
//                 </label>

//                 <input
//                   type="date"
//                   value={
//                     regularizeModal.date
//                   }
//                   max={indiaTodayKey}
//                   min={
//                     regularizationStartKey
//                   }
//                   onChange={(event) => {
//                     const dateKey =
//                       event.target.value;

//                     const attendance =
//                       getOwnAttendanceByDateKey(
//                         dateKey
//                       );

//                     openRegularizeModal(
//                       dateKey,
//                       attendance
//                     );
//                   }}
//                   disabled={
//                     regularizeSubmitting
//                   }
//                 />
//               </div>

//               {regularizeModal.type !==
//                 "missed_check_out" && (
//                 <div className="regularize-field">
//                   <label>
//                     Requested Check-in Time
//                   </label>

//                   <input
//                     type="time"
//                     value={
//                       regularizeForm.requestedCheckIn
//                     }
//                     onChange={(event) =>
//                       setRegularizeForm(
//                         (previous) => ({
//                           ...previous,

//                           requestedCheckIn:
//                             event.target
//                               .value,
//                         })
//                       )
//                     }
//                     disabled={
//                       regularizeSubmitting
//                     }
//                   />
//                 </div>
//               )}

//               {regularizeModal.type !==
//                 "missed_check_in" && (
//                 <div className="regularize-field">
//                   <label>
//                     Requested Check-out Time
//                   </label>

//                   <input
//                     type="time"
//                     value={
//                       regularizeForm.requestedCheckOut
//                     }
//                     onChange={(event) =>
//                       setRegularizeForm(
//                         (previous) => ({
//                           ...previous,

//                           requestedCheckOut:
//                             event.target
//                               .value,
//                         })
//                       )
//                     }
//                     disabled={
//                       regularizeSubmitting
//                     }
//                   />
//                 </div>
//               )}

//               <div className="regularize-field">
//                 <label>
//                   Reason
//                 </label>

//                 <textarea
//                   value={
//                     regularizeForm.reason
//                   }
//                   onChange={(event) =>
//                     setRegularizeForm(
//                       (previous) => ({
//                         ...previous,

//                         reason:
//                           event.target.value,
//                       })
//                     )
//                   }
//                   placeholder="Example: Client visit, network issue or forgot to mark attendance."
//                   disabled={
//                     regularizeSubmitting
//                   }
//                 />
//               </div>

//               <div className="regularize-actions">
//                 <button
//                   type="button"
//                   className="regularize-cancel-btn"
//                   onClick={
//                     closeRegularizeModal
//                   }
//                   disabled={
//                     regularizeSubmitting
//                   }
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="submit"
//                   className="regularize-submit-btn"
//                   disabled={
//                     regularizeSubmitting
//                   }
//                 >
//                   {regularizeSubmitting
//                     ? "Submitting..."
//                     : "Submit Request"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* =====================================================
//           LEAVE APPLICATION MODAL
//       ===================================================== */}

//       {leaveModal.open && (
//         <div className="timesheet-modal-overlay">
//           <div className="timesheet-modal attendance-leave-modal">
//             <div className="modal-header">
//               <div>
//                 <span className="attendance-eyebrow">
//                   LEAVE MANAGEMENT
//                 </span>

//                 <h3>
//                   Apply Leave
//                 </h3>

//                 <p>
//                   One paid leave is available
//                   each month. LOP can be
//                   selected when balance is
//                   unavailable.
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={closeLeaveModal}
//               >
//                 ×
//               </button>
//             </div>

//             <form
//               className="attendance-leave-form"
//               onSubmit={
//                 submitLeaveApplication
//               }
//             >
//               <div className="attendance-leave-balance-banner">
//                 <div>
//                   <span>
//                     Paid Leave Available
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.availablePaidLeave ||
//                         0
//                     )}
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     Pending
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.pendingPaidLeave ||
//                         0
//                     )}
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     Approved
//                   </span>

//                   <strong>
//                     {Number(
//                       leaveSummary?.balance
//                         ?.approvedPaidLeave ||
//                         0
//                     )}
//                   </strong>
//                 </div>
//               </div>

//               <div className="attendance-leave-grid">
//                 <label>
//                   Leave Type

//                   <select
//                     name="leaveType"
//                     value={
//                       leaveForm.leaveType
//                     }
//                     onChange={
//                       updateLeaveForm
//                     }
//                   >
//                     {LEAVE_TYPES.map(
//                       (leaveType) => (
//                         <option
//                           key={
//                             leaveType.value
//                           }
//                           value={
//                             leaveType.value
//                           }
//                           disabled={
//                             leaveType.value ===
//                               "paid_leave" &&
//                             Number(
//                               leaveSummary
//                                 ?.balance
//                                 ?.availablePaidLeave ||
//                                 0
//                             ) <= 0
//                           }
//                         >
//                           {leaveType.label}
//                         </option>
//                       )
//                     )}
//                   </select>
//                 </label>

//                 <label>
//                   Duration

//                   <select
//                     name="duration"
//                     value={
//                       leaveForm.duration
//                     }
//                     onChange={
//                       updateLeaveForm
//                     }
//                   >
//                     {LEAVE_DURATIONS.map(
//                       (duration) => (
//                         <option
//                           key={
//                             duration.value
//                           }
//                           value={
//                             duration.value
//                           }
//                         >
//                           {duration.label}
//                         </option>
//                       )
//                     )}
//                   </select>
//                 </label>

//                 <label>
//                   From Date

//                   <input
//                     type="date"
//                     name="fromDate"
//                     value={
//                       leaveForm.fromDate
//                     }
//                     onChange={
//                       updateLeaveForm
//                     }
//                   />
//                 </label>

//                 <label>
//                   To Date

//                   <input
//                     type="date"
//                     name="toDate"
//                     value={
//                       leaveForm.toDate
//                     }
//                     min={
//                       leaveForm.fromDate
//                     }
//                     onChange={
//                       updateLeaveForm
//                     }
//                     disabled={
//                       leaveForm.duration !==
//                       "full_day"
//                     }
//                   />
//                 </label>
//               </div>

//               {leaveForm.leaveType ===
//                 "loss_of_pay" && (
//                 <div className="attendance-warning-box danger">
//                   Loss of Pay will be reflected
//                   in attendance and payroll
//                   records after approval.
//                 </div>
//               )}

//               <label className="attendance-leave-reason">
//                 Reason

//                 <textarea
//                   name="reason"
//                   value={
//                     leaveForm.reason
//                   }
//                   onChange={
//                     updateLeaveForm
//                   }
//                   placeholder="Enter a clear leave reason."
//                   rows={5}
//                 />
//               </label>

//               <div className="regularize-actions">
//                 <button
//                   type="button"
//                   className="regularize-cancel-btn"
//                   onClick={
//                     closeLeaveModal
//                   }
//                   disabled={leaveLoading}
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="submit"
//                   className="attendance-leave-submit-btn"
//                   disabled={leaveLoading}
//                 >
//                   {leaveLoading
//                     ? "Submitting..."
//                     : "Submit Leave Request"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* =====================================================
//     WORK FROM HOME APPLICATION MODAL
// ===================================================== */}

// {workFromHomeModal.open && (
//   <div
//     className="timesheet-modal-overlay attendance-wfh-modal-overlay"
//     role="presentation"
//     onMouseDown={(event) => {
//       if (
//         event.target ===
//         event.currentTarget
//       ) {
//         closeWorkFromHomeModal();
//       }
//     }}
//   >
//     <div
//       className="timesheet-modal attendance-wfh-modal"
//       role="dialog"
//       aria-modal="true"
//       aria-labelledby="attendance-wfh-modal-title"
//     >
//       <div className="modal-header attendance-wfh-modal-header">
//         <div>
//           <span className="attendance-eyebrow">
//             FLEXIBLE WORK REQUEST
//           </span>

//           <h3 id="attendance-wfh-modal-title">
//             Apply Work From Home
//           </h3>

//           <p>
//             Your request will be sent
//             for role-based approval.
//           </p>
//         </div>

//         <button
//           type="button"
//           onClick={
//             closeWorkFromHomeModal
//           }
//           disabled={
//             workFromHomeLoading
//           }
//           aria-label="Close Work From Home form"
//         >
//           ×
//         </button>
//       </div>

//       <div className="attendance-wfh-flow">
//         <div className="attendance-wfh-flow-step active">
//           <span>1</span>

//           <div>
//             <strong>Apply</strong>
//             <small>Employee request</small>
//           </div>
//         </div>

//         <i>→</i>

//         <div className="attendance-wfh-flow-step">
//           <span>2</span>

//           <div>
//             <strong>Approval</strong>
//             <small>
//               {isAdmin
//                 ? "Super Admin"
//                 : "Admin / Super Admin"}
//             </small>
//           </div>
//         </div>

//         <i>→</i>

//         <div className="attendance-wfh-flow-step">
//           <span>3</span>

//           <div>
//             <strong>Attendance</strong>
//             <small>WFH dates created</small>
//           </div>
//         </div>
//       </div>

//       <form
//         className="attendance-wfh-form"
//         onSubmit={
//           submitWorkFromHomeRequest
//         }
//       >
//         <div className="attendance-wfh-info-banner">
//           <span>⌂</span>

//           <div>
//             <strong>
//               Role-based approval
//             </strong>

//             <p>
//               {isAdmin
//                 ? "As an Admin, your WFH request can only be approved by Super Admin."
//                 : "Your WFH request can be approved by Admin or Super Admin."}
//             </p>
//           </div>
//         </div>

//         <div className="attendance-wfh-form-grid">
//           <label>
//             <span>From Date</span>

//             <input
//               type="date"
//               name="fromDate"
//               value={
//                 workFromHomeModal.fromDate
//               }
//               min={indiaTodayKey}
//               onChange={
//                 updateWorkFromHomeForm
//               }
//               disabled={
//                 workFromHomeLoading
//               }
//               required
//             />
//           </label>

//           <label>
//             <span>To Date</span>

//             <input
//               type="date"
//               name="toDate"
//               value={
//                 workFromHomeModal.toDate
//               }
//               min={
//                 workFromHomeModal.fromDate ||
//                 indiaTodayKey
//               }
//               onChange={
//                 updateWorkFromHomeForm
//               }
//               disabled={
//                 workFromHomeLoading
//               }
//               required
//             />
//           </label>
//         </div>

//         <label className="attendance-wfh-reason-field">
//           <span>
//             Reason
//           </span>

//           <textarea
//             name="reason"
//             value={
//               workFromHomeModal.reason
//             }
//             onChange={
//               updateWorkFromHomeForm
//             }
//             placeholder="Example: Working remotely due to client coordination, travel constraint or personal requirement."
//             rows={5}
//             maxLength={500}
//             disabled={
//               workFromHomeLoading
//             }
//             required
//           />

//           <small>
//             {
//               workFromHomeModal.reason
//                 .length
//             }
//             /500 characters
//           </small>
//         </label>

//         <div className="attendance-wfh-policy">
//           <strong>
//             Approval workflow
//           </strong>

//           <ul>
//             <li>
//               Employee request is created
//               with pending status.
//             </li>

//             <li>
//               User request can be approved
//               by Admin or Super Admin.
//             </li>

//             <li>
//               Admin request can only be
//               approved by Super Admin.
//             </li>

//             <li>
//               After approval, attendance
//               is created for every approved
//               working date.
//             </li>
//           </ul>
//         </div>

//         <div className="regularize-actions attendance-wfh-actions">
//           <button
//             type="button"
//             className="regularize-cancel-btn"
//             onClick={
//               closeWorkFromHomeModal
//             }
//             disabled={
//               workFromHomeLoading
//             }
//           >
//             Cancel
//           </button>

//           <button
//             type="submit"
//             className="attendance-wfh-submit-btn"
//             disabled={
//               workFromHomeLoading
//             }
//           >
//             {workFromHomeLoading
//               ? "Submitting..."
//               : "Submit WFH Request"}
//           </button>
//         </div>
//       </form>
//     </div>
//   </div>
// )}

// </>
//   );
// };

// export default AttendancePage;