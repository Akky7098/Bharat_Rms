import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTimesheets,
  getTodayAttendance,
  getAttendanceList,
  checkInAttendance,
  checkOutAttendance,
  requestAttendanceRegularization,
  approveAttendanceRegularization,
  rejectAttendanceRegularization,
} from "../services/timesheetService";
import { getSalesPersons } from "../services/salesOrderService";
import TimesheetForm from "./TimesheetForm";
import "./Timesheet.css";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REQUIRED_WORK_MINUTES = 9 * 60;

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const getEmployeeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN");
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* IMPORTANT:
   Regularization requestedCheckIn/requestedCheckOut is entered by user as local wall time.
   If backend stores it as UTC date, normal formatTime adds +5:30.
   This formatter reads UTC hour/minute to show same time entered by user.
*/
const formatRegularizedTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )} ${suffix}`;
};

const getDisplayCheckIn = (attendance) => {
  if (attendance?.regularization?.status === "approved") {
    return (
      formatRegularizedTime(attendance.regularization?.requestedCheckIn) ||
      formatTime(attendance?.checkIn?.time)
    );
  }

  return formatTime(attendance?.checkIn?.time);
};

const getDisplayCheckOut = (attendance) => {
  if (attendance?.regularization?.status === "approved") {
    return (
      formatRegularizedTime(attendance.regularization?.requestedCheckOut) ||
      formatTime(attendance?.checkOut?.time)
    );
  }

  return formatTime(attendance?.checkOut?.time);
};

const formatMinutes = (minutes) => {
  const total = Number(minutes || 0);
  if (!total) return "-";

  const hrs = Math.floor(total / 60);
  const mins = total % 60;

  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
};

const formatStatus = (status) => {
  return String(status || "-").replaceAll("_", " ");
};

const TimesheetPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isUser = user?.role === "user";
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const canMarkAttendance = isUser || isAdmin;
  const canManageUsers = isAdmin || isSuperAdmin;
  const canApproveRegularization = isSuperAdmin;
  const canFillOwnReport = isUser || isAdmin;

  const today = new Date();
  const todayKey = getDateKey(today);

  const [timesheets, setTimesheets] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reportDateForForm, setReportDateForForm] = useState("");

  const [weekPage, setWeekPage] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState("");

  const [regularizeModal, setRegularizeModal] = useState({
    open: false,
    date: "",
    type: "missed_check_out",
  });

  const [regularizeForm, setRegularizeForm] = useState({
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
  });

  const [regularizeSubmitting, setRegularizeSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
    employeeId: "",
  });

  const selectedMonth = Number(filters.month);
  const selectedYear = Number(filters.year);

  const daysInSelectedMonth = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate();

  const loggedInEmployee = useMemo(() => {
    return {
      _id: user._id || user.id,
      id: user._id || user.id,
      name: user.name || "Me",
      email: user.email || "",
      role: user.role,
    };
  }, [user]);

  const allEmployeesForView = useMemo(() => {
    const map = new Map();

    employees.forEach((emp) => {
      const id = emp._id || emp.id;
      if (id) map.set(id, emp);
    });

    if (isAdmin && loggedInEmployee._id) {
      map.set(loggedInEmployee._id, loggedInEmployee);
    }

    attendanceList.forEach((item) => {
      const id = getEmployeeId(item.employeeId) || item.employeeId || item._id;
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          _id: id,
          name: item.employeeName || "Employee",
          email: item.employeeEmail || "",
          role: item.employeeRole || "",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [employees, attendanceList, isAdmin, loggedInEmployee]);

  const regularizationStartKey = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return getDateKey(d);
  }, []);

  const fetchTimesheets = useCallback(async () => {
    try {
      const params = {
        month: filters.month,
        year: filters.year,
      };

      if (canManageUsers && filters.employeeId) {
        params.employeeId = filters.employeeId;
      }

      const response = await getTimesheets(params);
      setTimesheets(response.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load timesheets");
    }
  }, [filters, canManageUsers]);

  const fetchAttendance = useCallback(async () => {
    try {
      const params = {
        fromDate: `${selectedYear}-${String(selectedMonth + 1).padStart(
          2,
          "0"
        )}-01`,
        toDate: `${selectedYear}-${String(selectedMonth + 1).padStart(
          2,
          "0"
        )}-${String(daysInSelectedMonth).padStart(2, "0")}`,
      };

      if (canManageUsers && filters.employeeId) {
        params.employeeId = filters.employeeId;
      }

      const response = await getAttendanceList(params);
      setAttendanceList(response.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load attendance");
    }
  }, [
    selectedYear,
    selectedMonth,
    daysInSelectedMonth,
    filters.employeeId,
    canManageUsers,
  ]);

  const fetchTodayAttendance = useCallback(async () => {
    if (!canMarkAttendance) return;

    try {
      const response = await getTodayAttendance();
      setTodayAttendance(response.data || null);
    } catch (error) {
      console.log(error);
    }
  }, [canMarkAttendance]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await getSalesPersons();
      setEmployees(data || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchTimesheets();
    fetchAttendance();
    fetchTodayAttendance();
  }, [fetchTimesheets, fetchAttendance, fetchTodayAttendance]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (canManageUsers) fetchEmployees();
  }, [canManageUsers, fetchEmployees]);

  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];

    for (let day = 1; day <= daysInSelectedMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0) {
        if (currentWeek.length > 0) {
          result.push(currentWeek);
          currentWeek = [];
        }
        continue;
      }

      currentWeek.push(day);

      if (dayOfWeek === 6 || day === daysInSelectedMonth) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    return result;
  }, [daysInSelectedMonth, selectedMonth, selectedYear]);

  useEffect(() => {
    const now = new Date();

    const isCurrentMonth =
      now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;

    if (!isCurrentMonth) {
      setWeekPage(0);
      return;
    }

    const todayDay = now.getDate();
    const currentWeekIndex = weeks.findIndex((week) => week.includes(todayDay));
    setWeekPage(currentWeekIndex >= 0 ? currentWeekIndex : 0);
  }, [selectedMonth, selectedYear, filters.employeeId, weeks]);

  const currentWeekDays = useMemo(() => {
    return weeks[weekPage] || [];
  }, [weeks, weekPage]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

 const getReportsByDay = useCallback(
  (day) => {
    return timesheets.filter((item) => {
      const d = new Date(item.reportDate);
      return (
        d.getDate() === day &&
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    });
  },
  [timesheets, selectedMonth, selectedYear]
);

const getAttendanceRecordsByDay = useCallback(
  (day) => {
    return attendanceList.filter((item) => {
      const d = new Date(item.attendanceDate);
      return (
        d.getDate() === day &&
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    });
  },
  [attendanceList, selectedMonth, selectedYear]
);

  const getAttendanceByDay = (day) => {
    return getAttendanceRecordsByDay(day)[0] || null;
  };

  const getReportForAttendance = (attendance) => {
    if (!attendance?.attendanceDate) return null;

    const attendanceKey = getDateKey(attendance.attendanceDate);
    const attendanceEmployeeId = getEmployeeId(attendance.employeeId);

    return timesheets.find((item) => {
      const reportEmployeeId = getEmployeeId(item.employeeId);
      const sameDate = getDateKey(item.reportDate) === attendanceKey;

      if (!canManageUsers) return sameDate;

      return (
        sameDate &&
        (reportEmployeeId === attendanceEmployeeId ||
          item.employeeId?.name === attendance.employeeName ||
          item.employeeName === attendance.employeeName)
      );
    });
  };

  const getHealth = (attendance, report) => {
    const minutes = Number(attendance?.totalWorkingMinutes || 0);

    if (attendance?.regularization?.status === "approved") {
      return {
        label: "Regularized",
        className: "complete",
        lessHours: false,
        reportMissing: !report,
      };
    }

    if (attendance?.regularization?.status === "pending") {
      return {
        label: "Regularization Pending",
        className: "pending",
        lessHours: false,
        reportMissing: !report,
      };
    }

    if (attendance?.regularization?.status === "rejected") {
      return {
        label: "Regularization Rejected",
        className: "missing",
        lessHours: false,
        reportMissing: !report,
      };
    }

    if (attendance?.attendanceStatus === "checked_out") {
      if (minutes < REQUIRED_WORK_MINUTES) {
        return {
          label: "Short Hours",
          className: "short",
          lessHours: true,
          reportMissing: !report,
        };
      }

      if (!report) {
        return {
          label: "Report Missing",
          className: "pending",
          lessHours: false,
          reportMissing: true,
        };
      }

      return {
        label: "Complete",
        className: "complete",
        lessHours: false,
        reportMissing: false,
      };
    }

    if (attendance?.attendanceStatus === "checked_in") {
      return {
        label: "Checkout Pending",
        className: "pending",
        lessHours: false,
        reportMissing: !report,
      };
    }

    return {
      label: "Missing",
      className: "missing",
      lessHours: false,
      reportMissing: true,
    };
  };

  const getAttendanceHealth = (attendance) => {
    const report = getReportForAttendance(attendance);
    return getHealth(attendance, report);
  };

  const getDayStatus = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (date.getDay() === 0) return "off";
    if (date > currentDate) return "future";

    const records = getAttendanceRecordsByDay(day);

    if (canManageUsers) {
      if (records.length === 0) return "missing";

      const hasPending = records.some(
        (item) => item.regularization?.status === "pending"
      );
      if (hasPending) return "warning";

      const hasShort = records.some(
        (item) =>
          item.attendanceStatus === "checked_out" &&
          Number(item.totalWorkingMinutes || 0) < REQUIRED_WORK_MINUTES
      );
      if (hasShort) return "short";

      const hasOpen = records.some(
        (item) => item.attendanceStatus === "checked_in"
      );
      if (hasOpen) return "warning";

      return "submitted";
    }

    const attendance = records[0];
    const reports = getReportsByDay(day);
    const hasReport = reports.length > 0;
    const minutes = Number(attendance?.totalWorkingMinutes || 0);

    if (attendance?.regularization?.status === "approved") {
      return hasReport ? "submitted" : "warning";
    }

    if (attendance?.regularization?.status === "pending") return "warning";

    if (attendance?.attendanceStatus === "checked_out") {
      if (minutes < REQUIRED_WORK_MINUTES) return "short";
      if (!hasReport) return "warning";
      return "submitted";
    }

    if (attendance?.attendanceStatus === "checked_in") return "warning";

    return "missing";
  };

  const todaySubmitted = timesheets.some((item) => {
    const d = new Date(item.reportDate);
    const reportEmployeeId = getEmployeeId(item.employeeId);
    const selfId = user._id || user.id;

    if (canManageUsers) {
      return (
        d.toDateString() === today.toDateString() &&
        (reportEmployeeId === selfId ||
          item.employeeId?.name === user.name ||
          item.employeeName === user.name)
      );
    }

    return d.toDateString() === today.toDateString();
  });

  const selectedDateObj = selectedDay
    ? new Date(selectedYear, selectedMonth, selectedDay)
    : null;

  const selectedDateKey = selectedDateObj ? getDateKey(selectedDateObj) : "";
  const selectedReports = selectedDay ? getReportsByDay(selectedDay) : [];
  const selectedAttendance = selectedDay ? getAttendanceByDay(selectedDay) : null;

  const todayCheckedIn = Boolean(todayAttendance?.checkIn?.time);
  const todayCheckedOut = Boolean(todayAttendance?.checkOut?.time);

  const selectedDayMinutes = Number(
    selectedAttendance?.totalWorkingMinutes || 0
  );

  const selectedDayShortHours =
    selectedAttendance?.attendanceStatus === "checked_out" &&
    selectedDayMinutes > 0 &&
    selectedDayMinutes < REQUIRED_WORK_MINUTES;

  const isSelectedSunday = selectedDateObj?.getDay() === 0;

  const canRegularizeSelectedDay =
    !isSuperAdmin &&
    selectedDay &&
    !isSelectedSunday &&
    selectedDateKey >= regularizationStartKey &&
    selectedDateKey <= todayKey &&
    (!selectedAttendance ||
      selectedAttendance.attendanceStatus === "not_checked_in" ||
      selectedAttendance.attendanceStatus === "checked_in" ||
      selectedAttendance.attendanceStatus === "absent" ||
      selectedDayShortHours) &&
    !["pending", "approved"].includes(
      selectedAttendance?.regularization?.status
    );

  const canFillReportForSelectedDay =
    canFillOwnReport &&
    selectedDay &&
    !isSelectedSunday &&
    selectedReports.length === 0 &&
    (selectedDateKey === todayKey ||
      selectedAttendance?.regularization?.status === "approved");

  const missingDays = Array.from({ length: daysInSelectedMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      status: getDayStatus(day),
    };
  }).filter((item) => item.status === "missing");

  const pendingRegularizationCount = attendanceList.filter(
    (item) => item.regularization?.status === "pending"
  ).length;

  const currentWeekReports = useMemo(() => {
    const weekSet = new Set(currentWeekDays);

    return [...timesheets]
      .filter((item) => {
        const d = new Date(item.reportDate);
        return weekSet.has(d.getDate());
      })
      .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
  }, [timesheets, currentWeekDays]);

  const adminTodayOverview = useMemo(() => {
    const todayDateKey = getDateKey(new Date());

    return attendanceList
      .filter((item) => getDateKey(item.attendanceDate) === todayDateKey)
      .sort((a, b) =>
        String(a.employeeName || "").localeCompare(String(b.employeeName || ""))
      );
  }, [attendanceList]);

  const pendingRegularizations = useMemo(() => {
    return attendanceList
      .filter((item) => item.regularization?.status === "pending")
      .sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate));
  }, [attendanceList]);

  const selectedDayEmployeeRows = useMemo(() => {
    if (!selectedDay) return [];

    const dateRecords = getAttendanceRecordsByDay(selectedDay);
    const dateReports = getReportsByDay(selectedDay);

    if (!canManageUsers) {
      return [
        {
          employee: loggedInEmployee,
          attendance: dateRecords[0] || null,
          report: dateReports[0] || null,
        },
      ];
    }

    const sourceEmployees = filters.employeeId
      ? allEmployeesForView.filter((emp) => emp._id === filters.employeeId)
      : allEmployeesForView;

    return sourceEmployees.map((emp) => {
      const attendance = dateRecords.find((item) => {
        const attendanceEmployeeId = getEmployeeId(item.employeeId);
        return (
          attendanceEmployeeId === emp._id ||
          item.employeeName === emp.name ||
          item.employeeEmail === emp.email
        );
      });

      const report = dateReports.find((item) => {
        const reportEmployeeId = getEmployeeId(item.employeeId);
        return (
          reportEmployeeId === emp._id ||
          item.employeeId?.name === emp.name ||
          item.employeeName === emp.name
        );
      });

      return {
        employee: emp,
        attendance: attendance || null,
        report: report || null,
      };
    });
}, [
  selectedDay,
  filters.employeeId,
  canManageUsers,
  allEmployeesForView,
  loggedInEmployee,
  getAttendanceRecordsByDay,
  getReportsByDay,
]);

  const getBrowserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported in this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          reject(
            new Error(
              "Location permission denied. Please allow location to mark attendance."
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    if (attendanceLoading || todayCheckedIn) return;

    try {
      setAttendanceLoading(true);

      const location = await getBrowserLocation();

      await checkInAttendance({
        ...location,
        remark: "Checked in from RMS",
      });

      alert("Checked in successfully.");
      refreshAll();
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Check-in failed");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (attendanceLoading || !todayCheckedIn || todayCheckedOut) return;

    if (!todaySubmitted) {
      alert("Please fill today's work report before checkout.");
      return;
    }

    try {
      setAttendanceLoading(true);

      const location = await getBrowserLocation();

      await checkOutAttendance({
        ...location,
        remark: "Checked out from RMS",
      });

      alert("Checked out successfully.");
      refreshAll();
    } catch (error) {
      alert(
        error.response?.data?.message || error.message || "Check-out failed"
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openRegularizeModal = (date, type = "missed_check_out") => {
    const d = new Date(date);

    if (d.getDay() === 0) {
      alert("Sunday regularization is not allowed.");
      return;
    }

    if (date < regularizationStartKey || date > todayKey) {
      alert("Regularization is allowed only for the last 7 days.");
      return;
    }

    setRegularizeModal({
      open: true,
      date,
      type,
    });

    setRegularizeForm({
      requestedCheckIn: "",
      requestedCheckOut: "",
      reason: "",
    });
  };

  const closeRegularizeModal = () => {
    if (regularizeSubmitting) return;

    setRegularizeModal({
      open: false,
      date: "",
      type: "missed_check_out",
    });

    setRegularizeForm({
      requestedCheckIn: "",
      requestedCheckOut: "",
      reason: "",
    });
  };

  const submitRegularization = async (e) => {
    e.preventDefault();

    if (regularizeSubmitting) return;

    if (!regularizeForm.reason.trim()) {
      alert("Please enter reason.");
      return;
    }

    if (
      regularizeModal.type === "missed_check_out" &&
      !regularizeForm.requestedCheckOut
    ) {
      alert("Please enter requested check-out time.");
      return;
    }

    if (
      regularizeModal.type === "missed_check_in" &&
      !regularizeForm.requestedCheckIn
    ) {
      alert("Please enter requested check-in time.");
      return;
    }

    if (
      regularizeModal.type === "wrong_time" &&
      (!regularizeForm.requestedCheckIn || !regularizeForm.requestedCheckOut)
    ) {
      alert("Please enter requested check-in and check-out time.");
      return;
    }

    try {
      setRegularizeSubmitting(true);

      await requestAttendanceRegularization({
        attendanceDate: regularizeModal.date,
        type: regularizeModal.type,
        requestedCheckIn: regularizeForm.requestedCheckIn
          ? `${regularizeModal.date}T${regularizeForm.requestedCheckIn}:00`
          : undefined,
        requestedCheckOut: regularizeForm.requestedCheckOut
          ? `${regularizeModal.date}T${regularizeForm.requestedCheckOut}:00`
          : undefined,
        reason: regularizeForm.reason.trim(),
      });

      alert("Regularization request submitted.");
      closeRegularizeModal();
      refreshAll();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to submit regularization request"
      );
    } finally {
      setRegularizeSubmitting(false);
    }
  };

  const handleApproveRegularization = async (attendance) => {
    if (!attendance?._id || adminActionLoading) return;

    if (!canApproveRegularization) {
      alert("Only super admin can approve regularization.");
      return;
    }

    if (attendance.regularization?.status !== "pending") {
      alert("This request is already processed.");
      return;
    }

    if (!window.confirm(`Approve regularization for ${attendance.employeeName}?`)) {
      return;
    }

    try {
      setAdminActionLoading(attendance._id);

      await approveAttendanceRegularization(attendance._id, {});

      alert("Regularization approved.");
      refreshAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to approve request");
    } finally {
      setAdminActionLoading("");
    }
  };

  const handleRejectRegularization = async (attendance) => {
    if (!attendance?._id || adminActionLoading) return;

    if (!canApproveRegularization) {
      alert("Only super admin can reject regularization.");
      return;
    }

    if (attendance.regularization?.status !== "pending") {
      alert("This request is already processed.");
      return;
    }

    const rejectionReason = window.prompt(
      `Enter rejection reason for ${attendance.employeeName}`
    );

    if (!rejectionReason || !rejectionReason.trim()) {
      alert("Rejection reason is required.");
      return;
    }

    try {
      setAdminActionLoading(attendance._id);

      await rejectAttendanceRegularization(attendance._id, {
        rejectionReason: rejectionReason.trim(),
      });

      alert("Regularization rejected.");
      refreshAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to reject request");
    } finally {
      setAdminActionLoading("");
    }
  };

  const openWorkReportForm = (dateKey = todayKey) => {
    setReportDateForForm(dateKey);
    setSelectedDay(null);
    setShowForm(true);
  };

  const downloadMonthlyAttendanceCsv = () => {
    const allDates = Array.from({ length: daysInSelectedMonth }, (_, i) => {
      return new Date(selectedYear, selectedMonth, i + 1);
    });

    const sourceEmployees = filters.employeeId
      ? allEmployeesForView.filter((emp) => emp._id === filters.employeeId)
      : allEmployeesForView;

    const headerCells = [
      "Employee Name",
      ...allDates.map((date) => {
        const label = `${String(date.getDate()).padStart(2, "0")}-${months[
          selectedMonth
        ].slice(0, 3)}`;
        return date.getDay() === 0 ? `${label} Sunday` : label;
      }),
      "Present",
      "Short Hours",
      "Absent",
      "Regularized",
      "Total Time",
    ];

    const htmlRows = [];

    htmlRows.push(
      `<tr>${headerCells
        .map(
          (cell) =>
            `<th style="background:#111827;color:#fff;border:1px solid #d1d5db;padding:8px;text-align:center;">${cell}</th>`
        )
        .join("")}</tr>`
    );

    sourceEmployees.forEach((emp) => {
      let present = 0;
      let shortHours = 0;
      let absent = 0;
      let regularized = 0;
      let totalMinutes = 0;

      const dateCells = allDates.map((date) => {
        const isSunday = date.getDay() === 0;

        if (isSunday) {
          return `<td style="background:#e5e7eb;color:#374151;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">SUNDAY</td>`;
        }

        const attendance = attendanceList.find((item) => {
          const attendanceEmployeeId = getEmployeeId(item.employeeId);
          return (
            getDateKey(item.attendanceDate) === getDateKey(date) &&
            (attendanceEmployeeId === emp._id ||
              item.employeeName === emp.name ||
              item.employeeEmail === emp.email)
          );
        });

        if (!attendance) {
          absent += 1;
          return `<td style="background:#fee2e2;color:#991b1b;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">A</td>`;
        }

        const minutes = Number(attendance.totalWorkingMinutes || 0);
        totalMinutes += minutes;

        const inTime = getDisplayCheckIn(attendance);
        const outTime = getDisplayCheckOut(attendance);

        if (attendance.regularization?.status === "approved") {
          regularized += 1;
          present += 1;
          return `<td style="background:#dbeafe;color:#1e40af;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">R<br>${inTime} - ${outTime}<br>${formatMinutes(
            minutes
          )}</td>`;
        }

        if (attendance.attendanceStatus === "checked_out") {
          present += 1;

          if (minutes < REQUIRED_WORK_MINUTES) {
            shortHours += 1;
            return `<td style="background:#fef3c7;color:#92400e;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">SH<br>${inTime} - ${outTime}<br>${formatMinutes(
              minutes
            )}</td>`;
          }

          return `<td style="background:#dcfce7;color:#166534;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">P<br>${inTime} - ${outTime}<br>${formatMinutes(
            minutes
          )}</td>`;
        }

        if (attendance.attendanceStatus === "checked_in") {
          return `<td style="background:#fef3c7;color:#92400e;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">CHECKED IN<br>${inTime}</td>`;
        }

        absent += 1;
        return `<td style="background:#fee2e2;color:#991b1b;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">A</td>`;
      });

      htmlRows.push(`
        <tr>
          <td style="background:#f8fafc;color:#111827;border:1px solid #d1d5db;padding:8px;font-weight:700;">${
            emp.name || "-"
          }</td>
          ${dateCells.join("")}
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${present}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${shortHours}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${absent}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${regularized}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${formatMinutes(
            totalMinutes
          )}</td>
        </tr>
      `);
    });

    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table>
            <tr>
              <td colspan="${headerCells.length}" style="background:#1e3a8a;color:white;font-size:18px;font-weight:700;padding:12px;text-align:center;">
                Bharat Special Steels - Monthly Attendance Sheet - ${months[selectedMonth]} ${selectedYear}
              </td>
            </tr>
            ${htmlRows.join("")}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-payroll-${months[selectedMonth]}-${selectedYear}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="timesheet-container">
      <div className="timesheet-header">
        <div>
          <h2>Attendance & Work Reports</h2>
          <p>Office check-in, check-out, regularization and weekly reports</p>
        </div>

        <div className="timesheet-header-actions">
          {canManageUsers && (
            <button
              type="button"
              className="attendance-download-btn"
              onClick={downloadMonthlyAttendanceCsv}
            >
              Download Monthly Sheet
            </button>
          )}

          {canFillOwnReport && (
            <button
              className={`fill-btn ${todaySubmitted ? "disabled" : ""}`}
              disabled={todaySubmitted}
              onClick={() => openWorkReportForm(todayKey)}
              type="button"
            >
              {todaySubmitted
                ? "Today's Report Submitted"
                : "+ Fill Today's Report"}
            </button>
          )}
        </div>
      </div>

      {canMarkAttendance && (
        <div className="attendance-action-card">
          <div>
            <h3>Today’s Attendance</h3>
            <p>
              {todayCheckedIn
                ? `Checked in at ${formatTime(todayAttendance?.checkIn?.time)}`
                : "Please check in from office location."}
              {todayCheckedOut
                ? ` · Checked out at ${formatTime(
                    todayAttendance?.checkOut?.time
                  )}`
                : ""}
            </p>
          </div>

          <div className="attendance-action-buttons">
            <button
              type="button"
              className="attendance-checkin-btn"
              onClick={handleCheckIn}
              disabled={attendanceLoading || todayCheckedIn}
            >
              {attendanceLoading && !todayCheckedIn
                ? "Checking In..."
                : todayCheckedIn
                ? "Checked In"
                : "Check In"}
            </button>

            <button
              type="button"
              className="attendance-checkout-btn"
              onClick={handleCheckOut}
              disabled={attendanceLoading || !todayCheckedIn || todayCheckedOut}
            >
              {attendanceLoading && todayCheckedIn && !todayCheckedOut
                ? "Checking Out..."
                : todayCheckedOut
                ? "Checked Out"
                : "Check Out"}
            </button>

            {todayCheckedIn &&
              !todayCheckedOut &&
              todayAttendance?.regularization?.status !== "pending" && (
                <button
                  type="button"
                  className="attendance-regularize-btn"
                  onClick={() =>
                    openRegularizeModal(todayKey, "missed_check_out")
                  }
                >
                  Regularize
                </button>
              )}
          </div>
        </div>
      )}

      <div className="timesheet-filter-card">
        <div className="filter-title">
          <h3>Filters</h3>
          <p>View attendance and reports by month, week and employee</p>
        </div>

        <div className="timesheet-filter-grid">
          {canManageUsers && (
            <div className="filter-field">
              <label>Employee</label>
              <select
                name="employeeId"
                value={filters.employeeId}
                onChange={handleFilterChange}
              >
                <option value="">All Employees</option>
                {allEmployeesForView.map((emp) => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-field">
            <label>Month</label>
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
            >
              {months.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Year</label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {canManageUsers && (
        <div className="attendance-admin-card">
          <div className="section-heading">
            <h3>Today Attendance Overview</h3>
            <span>{adminTodayOverview.length} records</span>
          </div>

          {adminTodayOverview.length === 0 ? (
            <div className="empty-state">No attendance records for today</div>
          ) : (
            <div className="attendance-admin-table-wrap">
              <table className="attendance-admin-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Total Time</th>
                    <th>Status</th>
                    <th>Health</th>
                  </tr>
                </thead>

                <tbody>
                  {adminTodayOverview.map((item) => {
                    const health = getAttendanceHealth(item);

                    return (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.employeeName || "-"}</strong>
                        </td>
                        <td>{getDisplayCheckIn(item)}</td>
                        <td>{getDisplayCheckOut(item)}</td>
                        <td>{formatMinutes(item.totalWorkingMinutes)}</td>
                        <td>
                          <span className="attendance-admin-pill">
                            {formatStatus(item.attendanceStatus)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`attendance-health-pill ${health.className}`}
                          >
                            {health.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canManageUsers && pendingRegularizations.length > 0 && (
        <div className="attendance-admin-card">
          <div className="section-heading">
            <h3>Regularization Requests</h3>
            <span>{pendingRegularizations.length} pending</span>
          </div>

          <div className="regularization-request-grid">
            {pendingRegularizations.map((item) => (
              <div key={item._id} className="regularization-request-card">
                <div className="regularization-request-top">
                  <div>
                    <h4>{item.employeeName || "-"}</h4>
                    <p>{formatDate(item.attendanceDate)}</p>
                  </div>
                  <span>{formatStatus(item.regularization?.type)}</span>
                </div>

                <div className="regularization-request-info">
                  <p>
                    <b>Requested In:</b>{" "}
                    {formatRegularizedTime(item.regularization?.requestedCheckIn)}
                  </p>
                  <p>
                    <b>Requested Out:</b>{" "}
                    {formatRegularizedTime(
                      item.regularization?.requestedCheckOut
                    )}
                  </p>
                  <p>
                    <b>Reason:</b> {item.regularization?.reason || "-"}
                  </p>
                </div>

                {canApproveRegularization && (
                  <div className="regularization-request-actions">
                    <button
                      type="button"
                      className="regularization-approve-btn"
                      disabled={
                        adminActionLoading === item._id ||
                        item.regularization?.status !== "pending"
                      }
                      onClick={() => handleApproveRegularization(item)}
                    >
                      {adminActionLoading === item._id
                        ? "Approving..."
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      className="regularization-reject-btn"
                      disabled={
                        adminActionLoading === item._id ||
                        item.regularization?.status !== "pending"
                      }
                      onClick={() => handleRejectRegularization(item)}
                    >
                      {adminActionLoading === item._id
                        ? "Rejecting..."
                        : "Reject"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="timesheet-main-grid">
        <div className="timesheet-left">
          <div className="reports-card">
            <div className="section-heading">
              <h3>Week {weekPage + 1} Reports</h3>
              <span>{currentWeekReports.length} submitted</span>
            </div>

            <div className="week-pagination">
              <button
                type="button"
                disabled={weekPage <= 0}
                onClick={() => setWeekPage((prev) => prev - 1)}
              >
                Previous Week
              </button>

              <strong>
                {currentWeekDays.length > 0
                  ? `${months[selectedMonth]} ${currentWeekDays[0]} - ${
                      currentWeekDays[currentWeekDays.length - 1]
                    }, ${selectedYear}`
                  : "-"}
              </strong>

              <button
                type="button"
                disabled={weekPage >= weeks.length - 1}
                onClick={() => setWeekPage((prev) => prev + 1)}
              >
                Next Week
              </button>
            </div>

            <div className="report-list">
              {currentWeekReports.length === 0 ? (
                <div className="empty-state">
                  No work report submitted in this week
                </div>
              ) : (
                currentWeekReports.map((item) => (
                  <div key={item._id} className="report-item">
                    <div className="report-top">
                      <strong>{formatDate(item.reportDate)}</strong>
                      {canManageUsers && <span>{item.employeeId?.name || "-"}</span>}
                    </div>

                    <p><b>Work:</b> {item.workSummary}</p>
                    <p><b>Challenges:</b> {item.challenges || "-"}</p>
                    <p><b>Next Plan:</b> {item.nextDayPlan || "-"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="timesheet-right">
          <div className="calendar-card">
            <div className="section-heading">
              <h3>Attendance Calendar</h3>
              <span>{months[selectedMonth]} {selectedYear}</span>
            </div>

            <div className="calendar-legend">
              <span><b className="dot green"></b>Complete</span>
              <span><b className="dot red-light"></b>Short Hours</span>
              <span><b className="dot yellow"></b>Pending</span>
              <span><b className="dot red"></b>Missing</span>
              <span><b className="dot gray"></b>Sunday</span>
            </div>

            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="week-name">{day}</div>
              ))}

              {Array.from({
                length: new Date(selectedYear, selectedMonth, 1).getDay(),
              }).map((_, i) => (
                <div key={`empty-${i}`} className="empty-day"></div>
              ))}

              {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);

                return (
                  <button
                    key={day}
                    className={`calendar-day ${status}`}
                    onClick={() => setSelectedDay(day)}
                    type="button"
                  >
                    <strong>{day}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="updates-card">
            <div className="section-heading">
              <h3>Notifications</h3>
              <span>{missingDays.length + pendingRegularizationCount}</span>
            </div>

            <div className="updates-list">
              {!isSuperAdmin && !todayCheckedIn && (
                <div className="update-item danger">
                  <strong>Today’s check-in pending</strong>
                  <p>Please check in from office location.</p>
                </div>
              )}

              {!isSuperAdmin && todayCheckedIn && !todayCheckedOut && (
                <div className="update-item warning">
                  <strong>Checkout pending</strong>
                  <p>Please check out before leaving office.</p>
                </div>
              )}

              {!isSuperAdmin && !todaySubmitted && (
                <div className="update-item danger">
                  <strong>Today’s work report pending</strong>
                  <p>Please submit your work report before checkout.</p>
                </div>
              )}

              {pendingRegularizationCount > 0 && (
                <div className="update-item warning">
                  <strong>{pendingRegularizationCount} regularization pending</strong>
                  <p>Attendance request is waiting for approval.</p>
                </div>
              )}

              {missingDays.length > 0 ? (
                <div className="update-item warning">
                  <strong>{missingDays.length} missing attendance/report day(s)</strong>
                  <p>Open calendar to review missing days.</p>
                </div>
              ) : (
                <div className="update-item success">
                  <strong>No missing days</strong>
                  <p>Attendance and reports are updated for selected month.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="timesheet-modal-overlay">
          <div className="timesheet-modal attendance-day-modal">
            <div className="modal-header">
              <div>
                <h3>
                  Attendance - {selectedDay} {months[selectedMonth]} {selectedYear}
                </h3>
                <p>
                  {canManageUsers
                    ? `${selectedDayEmployeeRows.length} employee record(s)`
                    : `${selectedReports.length} work report(s) · ${
                        selectedAttendance?.attendanceStatus || "No attendance"
                      }`}
                </p>
              </div>

              <button onClick={() => setSelectedDay(null)} type="button">
                ×
              </button>
            </div>

            <div className="modal-body">
              {isSelectedSunday && (
                <div className="attendance-warning-box sunday">
                  Sunday is weekly off. Regularization and work report are disabled.
                </div>
              )}

              {selectedDayEmployeeRows.map(({ employee, attendance, report }) => {
                const minutes = Number(attendance?.totalWorkingMinutes || 0);
                const health = getHealth(attendance, report);
                const isShort =
                  attendance?.attendanceStatus === "checked_out" &&
                  minutes > 0 &&
                  minutes < REQUIRED_WORK_MINUTES;

                return (
                  <div
                    key={`${employee?._id || employee?.name}-${selectedDateKey}`}
                    className="employee-attendance-day-card"
                  >
                    <div className="employee-attendance-day-top">
                      <div>
                        <h4>{employee?.name || attendance?.employeeName || "-"}</h4>
                        <p>{formatDate(selectedDateObj)}</p>
                      </div>

                      <span className={`attendance-health-pill ${health.className}`}>
                        {health.label}
                      </span>
                    </div>

                    <div className="attendance-detail-box employee-detail-box">
                      <div>
                        <span>Status</span>
                        <strong>
                          {attendance?.attendanceStatus
                            ? formatStatus(attendance.attendanceStatus)
                            : "No Attendance"}
                        </strong>
                      </div>

                      <div>
                        <span>Check In</span>
                        <strong>{getDisplayCheckIn(attendance)}</strong>
                      </div>

                      <div>
                        <span>Check Out</span>
                        <strong>{getDisplayCheckOut(attendance)}</strong>
                      </div>

                      <div>
                        <span>Total Time</span>
                        <strong>{formatMinutes(attendance?.totalWorkingMinutes)}</strong>
                      </div>
                    </div>

                    {isShort && (
                      <div className="attendance-warning-box danger">
                        Working time is less than 9 hours.
                      </div>
                    )}

                    {attendance?.regularization?.status && (
                      <div className="regularization-inline-box">
                        <p>
                          <b>Regularization:</b>{" "}
                          {formatStatus(attendance.regularization.status)}
                        </p>
                        <p>
                          <b>Type:</b>{" "}
                          {formatStatus(attendance.regularization.type)}
                        </p>
                        <p>
                          <b>Requested In:</b>{" "}
                          {formatRegularizedTime(
                            attendance.regularization.requestedCheckIn
                          )}
                        </p>
                        <p>
                          <b>Requested Out:</b>{" "}
                          {formatRegularizedTime(
                            attendance.regularization.requestedCheckOut
                          )}
                        </p>
                        <p>
                          <b>Reason:</b>{" "}
                          {attendance.regularization.reason || "-"}
                        </p>
                      </div>
                    )}

                    {canApproveRegularization &&
                      attendance?.regularization?.status === "pending" && (
                        <div className="regularization-request-actions inline-actions">
                          <button
                            type="button"
                            className="regularization-approve-btn"
                            disabled={adminActionLoading === attendance._id}
                            onClick={() => handleApproveRegularization(attendance)}
                          >
                            {adminActionLoading === attendance._id
                              ? "Approving..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="regularization-reject-btn"
                            disabled={adminActionLoading === attendance._id}
                            onClick={() => handleRejectRegularization(attendance)}
                          >
                            {adminActionLoading === attendance._id
                              ? "Rejecting..."
                              : "Reject"}
                          </button>
                        </div>
                      )}

                    {!isSuperAdmin &&
                      attendance?.regularization?.status === "pending" && (
                        <div className="empty-state">
                          Regularization request already submitted.
                        </div>
                      )}

                    {!isSuperAdmin && canRegularizeSelectedDay && (
                      <div className="calendar-regularize-panel">
                        <p>
                          Attendance is missing, incomplete, or short for this date.
                          Submit regularization request for approval.
                        </p>

                        <div className="calendar-regularize-actions">
                          {!attendance?.checkIn?.time && (
                            <button
                              type="button"
                              className="calendar-regularize-btn"
                              onClick={() =>
                                openRegularizeModal(
                                  selectedDateKey,
                                  "missed_check_in"
                                )
                              }
                            >
                              Regularize Missing Check-in
                            </button>
                          )}

                          {attendance?.checkIn?.time &&
                            !attendance?.checkOut?.time && (
                              <button
                                type="button"
                                className="calendar-regularize-btn"
                                onClick={() =>
                                  openRegularizeModal(
                                    selectedDateKey,
                                    "missed_check_out"
                                  )
                                }
                              >
                                Regularize Missing Checkout
                              </button>
                            )}

                          {!attendance && (
                            <button
                              type="button"
                              className="calendar-regularize-btn"
                              onClick={() =>
                                openRegularizeModal(selectedDateKey, "wrong_time")
                              }
                            >
                              Regularize Full Attendance
                            </button>
                          )}

                          {isShort && (
                            <button
                              type="button"
                              className="calendar-regularize-btn danger"
                              onClick={() =>
                                openRegularizeModal(selectedDateKey, "wrong_time")
                              }
                            >
                              Regularize Short Working Hours
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {!isSuperAdmin &&
                      !report &&
                      !canFillReportForSelectedDay &&
                      selectedDateKey !== todayKey &&
                      !isSelectedSunday && (
                        <div className="attendance-warning-box">
                          Previous date work report can be filled only after
                          regularization is approved.
                        </div>
                      )}

                    {!isSuperAdmin && canFillReportForSelectedDay && (
                      <button
                        type="button"
                        className="calendar-regularize-btn"
                        onClick={() => openWorkReportForm(selectedDateKey)}
                      >
                        Fill Work Report
                      </button>
                    )}

                    {report ? (
                      <div className="report-item modal-report">
                        <div className="report-top">
                          <span>{employee?.name || "-"}</span>
                          <strong>{formatDate(report.reportDate)}</strong>
                        </div>

                        <p><b>Work Summary:</b> {report.workSummary}</p>
                        <p><b>Challenges:</b> {report.challenges || "-"}</p>
                        <p><b>Next Day Plan:</b> {report.nextDayPlan || "-"}</p>
                      </div>
                    ) : (
                      <div className="empty-state">
                        No work report submitted for this date
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {regularizeModal.open && (
        <div className="timesheet-modal-overlay">
          <div className="timesheet-modal regularize-modal">
            <div className="modal-header">
              <div>
                <h3>Attendance Regularization</h3>
                <p>{regularizeModal.date}</p>
              </div>

              <button onClick={closeRegularizeModal} type="button">
                ×
              </button>
            </div>

            <form className="regularize-form" onSubmit={submitRegularization}>
              {regularizeModal.type !== "missed_check_out" && (
                <div className="regularize-field">
                  <label>Requested Check-in Time</label>
                  <input
                    type="time"
                    value={regularizeForm.requestedCheckIn}
                    onChange={(e) =>
                      setRegularizeForm((prev) => ({
                        ...prev,
                        requestedCheckIn: e.target.value,
                      }))
                    }
                    disabled={regularizeSubmitting}
                  />
                </div>
              )}

              {regularizeModal.type !== "missed_check_in" && (
                <div className="regularize-field">
                  <label>Requested Check-out Time</label>
                  <input
                    type="time"
                    value={regularizeForm.requestedCheckOut}
                    onChange={(e) =>
                      setRegularizeForm((prev) => ({
                        ...prev,
                        requestedCheckOut: e.target.value,
                      }))
                    }
                    disabled={regularizeSubmitting}
                  />
                </div>
              )}

              <div className="regularize-field">
                <label>Reason</label>
                <textarea
                  value={regularizeForm.reason}
                  onChange={(e) =>
                    setRegularizeForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Example: I was on a client visit and forgot to check out."
                  disabled={regularizeSubmitting}
                />
              </div>

              <div className="regularize-actions">
                <button
                  type="button"
                  className="regularize-cancel-btn"
                  onClick={closeRegularizeModal}
                  disabled={regularizeSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="regularize-submit-btn"
                  disabled={regularizeSubmitting}
                >
                  {regularizeSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <TimesheetForm
          onClose={() => {
            setShowForm(false);
            setReportDateForForm("");
          }}
          refresh={fetchTimesheets}
          reportDate={reportDateForForm}
        />
      )}
    </div>
  );
};

export default TimesheetPage;