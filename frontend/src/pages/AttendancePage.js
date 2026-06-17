import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTodayAttendance,
  getAttendanceList,
  checkInAttendance,
  checkOutAttendance,
  requestAttendanceRegularization,
  approveAttendanceRegularization,
  rejectAttendanceRegularization,
} from "../services/attendanceService";
import { getSalesPersons } from "../services/salesOrderService";
import "./Attendance.css";
import { getTimesheets } from "../services/timesheetService";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REQUIRED_WORK_MINUTES = 9 * 60;

const getDateKey = (date) => {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
};

const getEmployeeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const isSameEmployee = (record, user) => {
  const userId = user?._id || user?.id;
  const recordId = getEmployeeId(record?.employeeId) || record?._id || record?.id;

  return (
    String(recordId || "") === String(userId || "") ||
    String(record?.employeeEmail || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
    String(record?.employeeName || "").toLowerCase() === String(user?.name || "").toLowerCase()
  );
};

const isLeadershipUser = (item = {}) => {
  const role = String(item.role || item.employeeRole || item.employeeId?.role || "").toLowerCase();
  const name = String(item.name || item.employeeName || item.employeeId?.name || "").toLowerCase();
  const email = String(item.email || item.employeeEmail || item.employeeId?.email || "").toLowerCase();

  return role === "super_admin" || name.includes("nilesh") || email.includes("nilesh");
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

const formatRegularizedTime = (date) => {
  if (!date) return "-";

  const d = new Date(date);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
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

const formatStatus = (status) => String(status || "-").replaceAll("_", " ");

const isWorkFromHomeAttendance = (attendance) => {
  return attendance?.workMode === "work_from_home";
};

const getWorkLocationText = (attendance) => {
  if (!isWorkFromHomeAttendance(attendance)) return "";

  return (
    attendance?.checkIn?.locationAddress ||
    attendance?.checkOut?.locationAddress ||
    "Location captured"
  );
};

const getWorkLocationMapLink = (attendance) => {
  if (!isWorkFromHomeAttendance(attendance)) return "";

  return (
    attendance?.checkIn?.googleMapLink ||
    attendance?.checkOut?.googleMapLink ||
    ""
  );
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

const AttendancePage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isUser = user?.role === "user";
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const canMarkAttendance = isUser || isAdmin;
  const canManageUsers = isAdmin || isSuperAdmin;
  const canApproveRegularization = isSuperAdmin;

 const today = useMemo(() => new Date(), []);
const todayKey = useMemo(() => getDateKey(today), [today]);

  const [attendanceList, setAttendanceList] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [todayReportSubmitted, setTodayReportSubmitted] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
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
      if (isLeadershipUser(emp)) return;

      const id = emp._id || emp.id;
      if (id) map.set(String(id), emp);
    });

    if (isAdmin && loggedInEmployee._id && !isLeadershipUser(loggedInEmployee)) {
      map.set(String(loggedInEmployee._id), loggedInEmployee);
    }

    attendanceList.forEach((item) => {
      if (isLeadershipUser(item)) return;

      const id = getEmployeeId(item.employeeId);
      if (!id) return;

      if (!map.has(String(id))) {
        map.set(String(id), {
          _id: id,
          id,
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

  const effectiveTodayAttendance = useMemo(() => {
    const ownFromList = attendanceList.find(
      (item) => getDateKey(item.attendanceDate) === todayKey && isSameEmployee(item, user)
    );

    return ownFromList || todayAttendance;
  }, [attendanceList, todayAttendance, todayKey, user]);

  const todayCheckedIn = Boolean(effectiveTodayAttendance?.checkIn?.time);
  const todayCheckedOut = Boolean(effectiveTodayAttendance?.checkOut?.time);

 const regularizationStartKey = useMemo(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 9);
  return getDateKey(d);
}, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const params = {
        fromDate: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`,
        toDate: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(daysInSelectedMonth).padStart(2, "0")}`,
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
const fetchTodayReportStatus = useCallback(async () => {
  if (!canMarkAttendance) return;

  try {
    const response = await getTimesheets({
      month: today.getMonth(),
      year: today.getFullYear(),
    });

    const submitted = (response.data || []).some((item) => {
      return getDateKey(item.reportDate) === todayKey;
    });

    setTodayReportSubmitted(submitted);
  } catch (error) {
    console.log(error);
  }
}, [canMarkAttendance, today, todayKey]);
  const fetchEmployees = useCallback(async () => {
    try {
      const data = await getSalesPersons();
      setEmployees(data || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const refreshAll = useCallback(() => {
  fetchAttendance();
  fetchTodayAttendance();
  fetchTodayReportStatus();
}, [fetchAttendance, fetchTodayAttendance, fetchTodayReportStatus]);
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

  const getAttendanceRecordsByDay = useCallback(
    (day) => {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;

      return attendanceList.filter((item) => {
        if (isLeadershipUser(item)) return false;
        return getDateKey(item.attendanceDate) === dateKey;
      });
    },
    [attendanceList, selectedMonth, selectedYear]
  );

  const getAttendanceByDay = (day) => {
    const records = getAttendanceRecordsByDay(day);

    if (!canManageUsers) {
      return records.find((item) => isSameEmployee(item, user)) || null;
    }

    return records[0] || null;
  };

  const getHealth = (attendance) => {
    const minutes = Number(attendance?.totalWorkingMinutes || 0);

    if (attendance?.regularization?.status === "approved") {
      return { label: "Regularized", className: "complete" };
    }

    if (attendance?.regularization?.status === "pending") {
      return { label: "Regularization Pending", className: "pending" };
    }

    if (attendance?.regularization?.status === "rejected") {
      return { label: "Regularization Rejected", className: "missing" };
    }

    if (attendance?.attendanceStatus === "checked_out") {
      if (minutes < REQUIRED_WORK_MINUTES) {
        return { label: "Short Hours", className: "short" };
      }

      return { label: "Complete", className: "complete" };
    }

    if (attendance?.attendanceStatus === "checked_in") {
      return { label: "Checkout Pending", className: "pending" };
    }

    return { label: "Missing", className: "missing" };
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

      if (records.some((item) => item.regularization?.status === "pending")) {
        return "warning";
      }

      if (
        records.some(
          (item) =>
            item.attendanceStatus === "checked_out" &&
            Number(item.totalWorkingMinutes || 0) < REQUIRED_WORK_MINUTES
        )
      ) {
        return "short";
      }

      if (records.some((item) => item.attendanceStatus === "checked_in")) {
        return "warning";
      }

      return "submitted";
    }

    const attendance = records.find((item) => isSameEmployee(item, user));
    const minutes = Number(attendance?.totalWorkingMinutes || 0);

    if (attendance?.regularization?.status === "approved") return "submitted";
    if (attendance?.regularization?.status === "pending") return "warning";

    if (attendance?.attendanceStatus === "checked_out") {
      if (minutes < REQUIRED_WORK_MINUTES) return "short";
      return "submitted";
    }

    if (attendance?.attendanceStatus === "checked_in") return "warning";

    return "missing";
  };

  const selectedDateObj = selectedDay
    ? new Date(selectedYear, selectedMonth, selectedDay)
    : null;

  const selectedDateKey = selectedDateObj ? getDateKey(selectedDateObj) : "";
  const selectedAttendance = selectedDay ? getAttendanceByDay(selectedDay) : null;
  const isSelectedSunday = selectedDateObj?.getDay() === 0;

  const adminTodayOverview = useMemo(() => {
    return attendanceList
      .filter(
        (item) =>
          getDateKey(item.attendanceDate) === todayKey && !isLeadershipUser(item)
      )
      .sort((a, b) =>
        String(a.employeeName || "").localeCompare(String(b.employeeName || ""))
      );
  }, [attendanceList, todayKey]);

  const pendingRegularizations = useMemo(() => {
    return attendanceList
      .filter(
        (item) =>
          item.regularization?.status === "pending" && !isLeadershipUser(item)
      )
      .sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate));
  }, [attendanceList]);

  const currentWeekAttendance = useMemo(() => {
    const weekSet = new Set(currentWeekDays);

    return [...attendanceList]
      .filter((item) => {
        if (isLeadershipUser(item)) return false;
        const day = Number(getDateKey(item.attendanceDate).slice(-2));
        return weekSet.has(day);
      })
      .sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate));
  }, [attendanceList, currentWeekDays]);

  const selectedDayEmployeeRows = useMemo(() => {
    if (!selectedDay) return [];

    const dateRecords = getAttendanceRecordsByDay(selectedDay);

    if (!canManageUsers) {
      return [
        {
          employee: loggedInEmployee,
          attendance: dateRecords.find((item) => isSameEmployee(item, user)) || null,
        },
      ];
    }

    const sourceEmployees = filters.employeeId
      ? allEmployeesForView.filter(
          (emp) => String(emp._id || emp.id) === String(filters.employeeId)
        )
      : allEmployeesForView;

    return sourceEmployees.map((emp) => {
      const attendance = dateRecords.find((item) => {
        const attendanceEmployeeId = getEmployeeId(item.employeeId);

        return (
          String(attendanceEmployeeId || "") === String(emp._id || emp.id || "") ||
          String(item.employeeName || "").toLowerCase() === String(emp.name || "").toLowerCase() ||
          String(item.employeeEmail || "").toLowerCase() === String(emp.email || "").toLowerCase()
        );
      });

      return {
        employee: emp,
        attendance: attendance || null,
      };
    });
  }, [
    selectedDay,
    filters.employeeId,
    canManageUsers,
    allEmployeesForView,
    loggedInEmployee,
    getAttendanceRecordsByDay,
    user,
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
    const pwaTodayHealth = getHealth(effectiveTodayAttendance);

  const pwaRefreshAll = async () => {
    await refreshAll();
  };

  const pwaSetMonth = (monthIndex) => {
    setFilters((prev) => ({
      ...prev,
      month: monthIndex,
    }));
  };

  const pwaSetYear = (year) => {
    setFilters((prev) => ({
      ...prev,
      year,
    }));
  };

  const pwaSetEmployee = (employeeId) => {
    setFilters((prev) => ({
      ...prev,
      employeeId,
    }));
  };

  // const pwaSelectedDayRecords = selectedDayEmployeeRows.filter(
  //   (row) => row.attendance
  // );
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
      await refreshAll();
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Check-in failed");
    } finally {
      setAttendanceLoading(false);
    }
  };

 const handleCheckOut = async () => {
  if (attendanceLoading || !todayCheckedIn || todayCheckedOut) return;

  if (!todayReportSubmitted) {
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
    await refreshAll();
  } catch (error) {
    alert(error.response?.data?.message || error.message || "Check-out failed");
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
  alert("Regularization is allowed only for the last 10 days.");
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

  const downloadMonthlyAttendanceCsv = () => {
    const allDates = Array.from({ length: daysInSelectedMonth }, (_, i) => {
      return new Date(selectedYear, selectedMonth, i + 1);
    });

    const sourceEmployees = filters.employeeId
      ? allEmployeesForView.filter(
          (emp) => String(emp._id || emp.id) === String(filters.employeeId)
        )
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
        if (date.getDay() === 0) {
          return `<td style="background:#e5e7eb;color:#374151;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">SUNDAY</td>`;
        }

        const attendance = attendanceList.find((item) => {
          const attendanceEmployeeId = getEmployeeId(item.employeeId);

          return (
            getDateKey(item.attendanceDate) === getDateKey(date) &&
            !isLeadershipUser(item) &&
            (String(attendanceEmployeeId || "") === String(emp._id || emp.id || "") ||
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
          return `<td style="background:#dbeafe;color:#1e40af;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">R<br>${inTime} - ${outTime}<br>${formatMinutes(minutes)}</td>`;
        }

        if (attendance.attendanceStatus === "checked_out") {
          present += 1;

          if (minutes < REQUIRED_WORK_MINUTES) {
            shortHours += 1;
            return `<td style="background:#fef3c7;color:#92400e;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">SH<br>${inTime} - ${outTime}<br>${formatMinutes(minutes)}</td>`;
          }

          return `<td style="background:#dcfce7;color:#166534;border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">P<br>${inTime} - ${outTime}<br>${formatMinutes(minutes)}</td>`;
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
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;font-weight:700;">${formatMinutes(totalMinutes)}</td>
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
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 300);
  };

   return (
    <>
      <div className="attendance-pwa-ui">
        <div className="att-pwa-header">
          <div className="att-pwa-header-row">
            <button
              type="button"
              className="att-pwa-back"
              onClick={() => {
                if (window.__goDashboardHome) {
                  window.__goDashboardHome();
                } else {
                  window.location.href = "/dashboard#dashboard";
                }
              }}
            >
              ‹
            </button>

            <div>
              <h2>Attendance</h2>
              <p>Monthly attendance, check-in and regularization</p>
            </div>

            <button
              type="button"
              className="att-pwa-refresh"
              onClick={pwaRefreshAll}
            >
              ↻
            </button>
          </div>
        </div>

        <div className="att-pwa-scroll">
          <div className="att-pwa-filter-card">
            <h3>Month Filter</h3>

            <div className="att-pwa-month-scroll">
              {months.map((month, index) => (
                <button
                  type="button"
                  key={month}
                  className={selectedMonth === index ? "active" : ""}
                  onClick={() => pwaSetMonth(index)}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="att-pwa-year-row">
              {[2026, 2025, 2024].map((year) => (
                <button
                  type="button"
                  key={year}
                  className={selectedYear === year ? "active" : ""}
                  onClick={() => pwaSetYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>

            {canManageUsers && (
              <div className="att-pwa-employee-row">
                <button
                  type="button"
                  className={!filters.employeeId ? "active" : ""}
                  onClick={() => pwaSetEmployee("")}
                >
                  All
                </button>

                {allEmployeesForView.map((emp) => (
                  <button
                    type="button"
                    key={emp._id || emp.id}
                    className={
                      String(filters.employeeId) === String(emp._id || emp.id)
                        ? "active"
                        : ""
                    }
                    onClick={() => pwaSetEmployee(emp._id || emp.id)}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canMarkAttendance && (
            <div className="att-pwa-today-card">
              <span>Today’s Attendance</span>

              <h3>
                {todayCheckedIn
                  ? `Checked in at ${formatTime(
                      effectiveTodayAttendance?.checkIn?.time
                    )}`
                  : "Ready to check in"}
              </h3>

              <p>
                {todayCheckedOut
                  ? `Checked out at ${formatTime(
                      effectiveTodayAttendance?.checkOut?.time
                    )}`
                  : "Location will be captured securely from mobile."}
              </p>

              {isWorkFromHomeAttendance(effectiveTodayAttendance) && (
                <div className="att-pwa-location-box">
                  <b>WFH Location</b>
                  <p>{getWorkLocationText(effectiveTodayAttendance)}</p>

                  {getWorkLocationMapLink(effectiveTodayAttendance) && (
                    <a
                      href={getWorkLocationMapLink(effectiveTodayAttendance)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Exact Map
                    </a>
                  )}
                </div>
              )}

              <div className="att-pwa-action-grid">
                <button
                  type="button"
                  className="checkin"
                  disabled={attendanceLoading || todayCheckedIn}
                  onClick={handleCheckIn}
                >
                  {todayCheckedIn ? "Checked In" : "Check In"}
                </button>

                <button
                  type="button"
                  className="checkout"
                  disabled={
                    attendanceLoading || !todayCheckedIn || todayCheckedOut
                  }
                  onClick={handleCheckOut}
                >
                  {todayCheckedOut ? "Checked Out" : "Check Out"}
                </button>
              </div>

              {todayCheckedIn &&
                !todayCheckedOut &&
                effectiveTodayAttendance?.regularization?.status !==
                  "pending" && (
                  <button
                    type="button"
                    className="att-pwa-regularize-btn"
                    onClick={() =>
                      openRegularizeModal(todayKey, "missed_check_out")
                    }
                  >
                    Request Regularization
                  </button>
                )}

              <div className={`att-pwa-health ${pwaTodayHealth.className}`}>
                {pwaTodayHealth.label}
              </div>
            </div>
          )}

          {canManageUsers && pendingRegularizations.length > 0 && (
            <div className="att-pwa-section">
              <div className="att-pwa-section-head">
                <h3>Pending Regularization</h3>
                <span>{pendingRegularizations.length} pending</span>
              </div>

              {pendingRegularizations.map((item) => (
                <div key={item._id} className="att-pwa-request-card">
                  <div>
                    <h4>{item.employeeName || "-"}</h4>
                    <p>{formatDate(item.attendanceDate)}</p>
                  </div>

                  <div className="att-pwa-detail-grid">
                    <div>
                      <span>Requested In</span>
                      <b>
                        {formatRegularizedTime(
                          item.regularization?.requestedCheckIn
                        )}
                      </b>
                    </div>

                    <div>
                      <span>Requested Out</span>
                      <b>
                        {formatRegularizedTime(
                          item.regularization?.requestedCheckOut
                        )}
                      </b>
                    </div>
                  </div>

                  <p className="att-pwa-reason">
                    {item.regularization?.reason || "-"}
                  </p>

                  {canApproveRegularization && (
                    <div className="att-pwa-request-actions">
                      <button
                        type="button"
                        onClick={() => handleApproveRegularization(item)}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        className="reject"
                        onClick={() => handleRejectRegularization(item)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManageUsers && (
            <div className="att-pwa-section">
              <div className="att-pwa-section-head">
                <h3>Today’s Team Attendance</h3>
                <span>{adminTodayOverview.length} records</span>
              </div>

              {adminTodayOverview.length === 0 ? (
                <div className="att-pwa-empty">No attendance records for today</div>
              ) : (
                adminTodayOverview.map((item) => {
                  const health = getHealth(item);

                  return (
                    <div key={item._id} className="att-pwa-attendance-card">
                      <div className="att-pwa-card-top">
                        <div>
                          <h4>{item.employeeName || "Employee"}</h4>
                          <p>{formatDate(item.attendanceDate)}</p>
                        </div>

                        <span className={`att-pwa-pill ${health.className}`}>
                          {health.label}
                        </span>
                      </div>

                      {isWorkFromHomeAttendance(item) && (
                        <div className="att-pwa-location-box small">
                          <b>WFH Location</b>
                          <p>{getWorkLocationText(item)}</p>

                          {getWorkLocationMapLink(item) && (
                            <a
                              href={getWorkLocationMapLink(item)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Map
                            </a>
                          )}
                        </div>
                      )}

                      <div className="att-pwa-detail-grid">
                        <div>
                          <span>Check In</span>
                          <b>{getDisplayCheckIn(item)}</b>
                        </div>

                        <div>
                          <span>Check Out</span>
                          <b>{getDisplayCheckOut(item)}</b>
                        </div>

                        <div>
                          <span>Total</span>
                          <b>{formatMinutes(item.totalWorkingMinutes)}</b>
                        </div>

                        <div>
                          <span>Status</span>
                          <b>{formatStatus(item.attendanceStatus)}</b>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="att-pwa-calendar-card">
            <h3>
              {months[selectedMonth]} {selectedYear}
            </h3>

            <div className="att-pwa-legend-row">
              <span><b className="complete"></b>Complete</span>
              <span><b className="short"></b>Short</span>
              <span><b className="pending"></b>Pending</span>
              <span><b className="missing"></b>Missing</span>
              <span><b className="off"></b>Sunday</span>
            </div>

            <div className="att-pwa-calendar-grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div key={`${day}-${index}`} className="att-pwa-week-name">
                  {day}
                </div>
              ))}

              {Array.from({
                length: new Date(selectedYear, selectedMonth, 1).getDay(),
              }).map((_, i) => (
                <div key={`empty-${i}`} className="att-pwa-empty-day"></div>
              ))}

              {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);

                return (
                  <button
                    key={day}
                    type="button"
                    className={`att-pwa-day ${status}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
             {selectedDay && (
        <div className="att-pwa-modal-overlay">
          <div className="att-pwa-modal-card">
            <div className="att-pwa-modal-header">
              <div>
                <h3>
                  {selectedDay} {months[selectedMonth]} {selectedYear}
                </h3>
                <p>
                  {canManageUsers
                    ? `${selectedDayEmployeeRows.length} employee record(s)`
                    : selectedAttendance?.attendanceStatus || "No attendance"}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedDay(null)}>
                ×
              </button>
            </div>

            <div className="att-pwa-modal-body">
              {isSelectedSunday && (
                <div className="att-pwa-warning-box">
                  Sunday is weekly off. Regularization is disabled.
                </div>
              )}

              {selectedDayEmployeeRows.map(({ employee, attendance }) => {
                const minutes = Number(attendance?.totalWorkingMinutes || 0);

                const isOwnRow =
                  String(employee?._id || employee?.id || "") ===
                    String(user._id || user.id || "") ||
                  String(employee?.email || "").toLowerCase() ===
                    String(user.email || "").toLowerCase();

                const rowShortHours =
                  attendance?.attendanceStatus === "checked_out" &&
                  minutes > 0 &&
                  minutes < REQUIRED_WORK_MINUTES;

                const rowCanRegularize =
                  isOwnRow &&
                  canMarkAttendance &&
                  selectedDay &&
                  !isSelectedSunday &&
                  selectedDateKey >= regularizationStartKey &&
                  selectedDateKey <= todayKey &&
                  (!attendance ||
                    attendance.attendanceStatus === "not_checked_in" ||
                    attendance.attendanceStatus === "checked_in" ||
                    attendance.attendanceStatus === "absent" ||
                    rowShortHours) &&
                  !["pending", "approved"].includes(
                    attendance?.regularization?.status
                  );

                const health = getHealth(attendance);

                return (
                  <div
                    key={`pwa-${employee?._id || employee?.id || employee?.name}-${selectedDateKey}`}
                    className="att-pwa-modal-record"
                  >
                    <div className="att-pwa-modal-record-top">
                      <div>
                        <h4>{employee?.name || attendance?.employeeName || "-"}</h4>
                        <p>{formatDate(selectedDateObj)}</p>
                      </div>

                      <span className={`att-pwa-pill ${health.className}`}>
                        {health.label}
                      </span>
                    </div>

                    {isWorkFromHomeAttendance(attendance) && (
                      <div className="att-pwa-location-box small">
                        <b>WFH Location</b>
                        <p>{getWorkLocationText(attendance)}</p>

                        {getWorkLocationMapLink(attendance) && (
                          <a
                            href={getWorkLocationMapLink(attendance)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    )}

                    <div className="att-pwa-detail-grid">
                      <div>
                        <span>Status</span>
                        <b>
                          {attendance?.attendanceStatus
                            ? formatStatus(attendance.attendanceStatus)
                            : "No Attendance"}
                        </b>
                      </div>

                      <div>
                        <span>Check In</span>
                        <b>{getDisplayCheckIn(attendance)}</b>
                      </div>

                      <div>
                        <span>Check Out</span>
                        <b>{getDisplayCheckOut(attendance)}</b>
                      </div>

                      <div>
                        <span>Total Time</span>
                        <b>{formatMinutes(attendance?.totalWorkingMinutes)}</b>
                      </div>
                    </div>

                    {rowShortHours && (
                      <div className="att-pwa-warning-box danger">
                        Working time is less than 9 hours.
                      </div>
                    )}

                    {attendance?.regularization?.status && (
                      <div className="att-pwa-regularization-box">
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
                          <b>Reason:</b> {attendance.regularization.reason || "-"}
                        </p>
                      </div>
                    )}

                    {canApproveRegularization &&
                      attendance?.regularization?.status === "pending" && (
                        <div className="att-pwa-request-actions">
                          <button
                            type="button"
                            disabled={adminActionLoading === attendance._id}
                            onClick={() => handleApproveRegularization(attendance)}
                          >
                            {adminActionLoading === attendance._id
                              ? "Approving..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="reject"
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
                      attendance?.regularization?.status === "pending" &&
                      isOwnRow && (
                        <div className="att-pwa-empty">
                          Regularization request already submitted.
                        </div>
                      )}

                    {!isSuperAdmin && rowCanRegularize && (
                      <div className="att-pwa-regularize-panel">
                        <p>
                          Attendance is missing, incomplete, or short for this
                          date. Submit regularization request for approval.
                        </p>

                        <div className="att-pwa-regularize-actions">
                          {!attendance?.checkIn?.time && (
                            <button
                              type="button"
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
                              onClick={() =>
                                openRegularizeModal(
                                  selectedDateKey,
                                  "wrong_time"
                                )
                              }
                            >
                              Regularize Full Attendance
                            </button>
                          )}

                          {rowShortHours && (
                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                openRegularizeModal(
                                  selectedDateKey,
                                  "wrong_time"
                                )
                              }
                            >
                              Regularize Short Working Hours
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="attendance-desktop-ui">
        <div className="timesheet-container">
      <div className="timesheet-header">
        <div>
          <h2>Attendance</h2>
          <p>Office check-in, check-out, regularization and monthly records</p>
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
        </div>
      </div>

      {canMarkAttendance && (
        <div className="attendance-action-card">
          <div>
            <h3>Today’s Attendance</h3>
            <p>
              {todayCheckedIn
                ? `Checked in at ${formatTime(effectiveTodayAttendance?.checkIn?.time)}`
                : "Please check in from office location."}
              {todayCheckedOut
                ? ` · Checked out at ${formatTime(
                    effectiveTodayAttendance?.checkOut?.time
                  )}`
                : ""}
            </p>

            {isWorkFromHomeAttendance(effectiveTodayAttendance) && (
              <div className="wfh-location-line">
                <b>WFH Location:</b> {getWorkLocationText(effectiveTodayAttendance)}
                {getWorkLocationMapLink(effectiveTodayAttendance) && (
                  <a
                    href={getWorkLocationMapLink(effectiveTodayAttendance)}
                    target="_blank"
                    rel="noreferrer"
                    className="wfh-map-link"
                  >
                    View Exact Map
                  </a>
                )}
              </div>
            )}
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
              effectiveTodayAttendance?.regularization?.status !== "pending" && (
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
          <p>View attendance by month, week and employee</p>
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
                    const health = getHealth(item);

                    return (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.employeeName || "-"}</strong>
                          {isWorkFromHomeAttendance(item) && (
                            <div className="wfh-location-mini">
                              {getWorkLocationText(item)}
                              {getWorkLocationMapLink(item) && (
                                <a
                                  href={getWorkLocationMapLink(item)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="wfh-map-link mini"
                                >
                                  Map
                                </a>
                              )}
                            </div>
                          )}
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
                    {formatRegularizedTime(item.regularization?.requestedCheckOut)}
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
              <h3>Week {weekPage + 1} Attendance</h3>
              <span>{currentWeekAttendance.length} records</span>
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
              {currentWeekAttendance.length === 0 ? (
                <div className="empty-state">
                  No attendance record found in this week
                </div>
              ) : (
                currentWeekAttendance.map((item) => {
                  const health = getHealth(item);

                  return (
                    <div key={item._id} className="report-item">
                      <div className="report-top">
                        <strong>{formatDate(item.attendanceDate)}</strong>
                        {canManageUsers && <span>{item.employeeName || "-"}</span>}
                      </div>

                      <p><b>Check In:</b> {getDisplayCheckIn(item)}</p>
                      <p><b>Check Out:</b> {getDisplayCheckOut(item)}</p>
                      <p><b>Total Time:</b> {formatMinutes(item.totalWorkingMinutes)}</p>
                      <p>
                        <b>Status:</b>{" "}
                        <span className={`attendance-health-pill ${health.className}`}>
                          {health.label}
                        </span>
                      </p>
                    </div>
                  );
                })
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
                    : `${selectedAttendance?.attendanceStatus || "No attendance"}`}
                </p>
              </div>

              <button onClick={() => setSelectedDay(null)} type="button">
                ×
              </button>
            </div>

            <div className="modal-body">
              {isSelectedSunday && (
                <div className="attendance-warning-box sunday">
                  Sunday is weekly off. Regularization is disabled.
                </div>
              )}

              {selectedDayEmployeeRows.map(({ employee, attendance }) => {
                const minutes = Number(attendance?.totalWorkingMinutes || 0);
                const isOwnRow =
                  String(employee?._id || employee?.id || "") ===
                    String(user._id || user.id || "") ||
                  String(employee?.email || "").toLowerCase() ===
                    String(user.email || "").toLowerCase();

                const rowShortHours =
                  attendance?.attendanceStatus === "checked_out" &&
                  minutes > 0 &&
                  minutes < REQUIRED_WORK_MINUTES;

                const rowCanRegularize =
                  isOwnRow &&
                  canMarkAttendance &&
                  selectedDay &&
                  !isSelectedSunday &&
                  selectedDateKey >= regularizationStartKey &&
                  selectedDateKey <= todayKey &&
                  (!attendance ||
                    attendance.attendanceStatus === "not_checked_in" ||
                    attendance.attendanceStatus === "checked_in" ||
                    attendance.attendanceStatus === "absent" ||
                    rowShortHours) &&
                  !["pending", "approved"].includes(
                    attendance?.regularization?.status
                  );

                const health = getHealth(attendance);

                return (
                  <div
                    key={`${employee?._id || employee?.id || employee?.name}-${selectedDateKey}`}
                    className="employee-attendance-day-card"
                  >
                    <div className="employee-attendance-day-top">
                      <div>
                        <h4>{employee?.name || attendance?.employeeName || "-"}</h4>
                        <p>{formatDate(selectedDateObj)}</p>

                        {isWorkFromHomeAttendance(attendance) && (
                          <div className="wfh-location-line">
                            <b>WFH Location:</b> {getWorkLocationText(attendance)}
                            {getWorkLocationMapLink(attendance) && (
                              <a
                                href={getWorkLocationMapLink(attendance)}
                                target="_blank"
                                rel="noreferrer"
                                className="wfh-map-link"
                              >
                                View Exact Map
                              </a>
                            )}
                          </div>
                        )}
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

                    {rowShortHours && (
                      <div className="attendance-warning-box danger">
                        Working time is less than 9 hours.
                      </div>
                    )}

                    {attendance?.regularization?.status && (
                      <div className="regularization-inline-box">
                        <p><b>Regularization:</b> {formatStatus(attendance.regularization.status)}</p>
                        <p><b>Type:</b> {formatStatus(attendance.regularization.type)}</p>
                        <p><b>Requested In:</b> {formatRegularizedTime(attendance.regularization.requestedCheckIn)}</p>
                        <p><b>Requested Out:</b> {formatRegularizedTime(attendance.regularization.requestedCheckOut)}</p>
                        <p><b>Reason:</b> {attendance.regularization.reason || "-"}</p>
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
                      attendance?.regularization?.status === "pending" &&
                      isOwnRow && (
                        <div className="empty-state">
                          Regularization request already submitted.
                        </div>
                      )}

                    {!isSuperAdmin && rowCanRegularize && (
                      <div className="calendar-regularize-panel">
                        <p>
                          Attendance is missing, incomplete, or short for this
                          date. Submit regularization request for approval.
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

                          {rowShortHours && (
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
        </div>
      </div>
    </>
  );
};

export default AttendancePage;