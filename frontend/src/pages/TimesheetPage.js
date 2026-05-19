import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTimesheets,
  getTodayAttendance,
  getAttendanceList,
  checkInAttendance,
  checkOutAttendance,
  requestAttendanceRegularization,
} from "../services/timesheetService";
import { getSalesPersons } from "../services/salesOrderService";
import TimesheetForm from "./TimesheetForm";
import "./Timesheet.css";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const formatMinutes = (minutes) => {
  const total = Number(minutes || 0);
  if (!total) return "-";

  const hrs = Math.floor(total / 60);
  const mins = total % 60;

  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
};

const TimesheetPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canMarkAttendance = user?.role === "user" || user?.role === "admin";

  const today = new Date();

  const [timesheets, setTimesheets] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [weekPage, setWeekPage] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

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

  const getDaysInMonth = useCallback(() => {
    return daysInSelectedMonth;
  }, [daysInSelectedMonth]);

  const fetchTimesheets = useCallback(async () => {
    try {
      const params = {
        month: filters.month,
        year: filters.year,
      };

      if (isAdmin && filters.employeeId) {
        params.employeeId = filters.employeeId;
      }

      const response = await getTimesheets(params);
      setTimesheets(response.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load timesheets");
    }
  }, [filters, isAdmin]);

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

      if (isAdmin && filters.employeeId) {
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
    isAdmin,
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
    if (isAdmin) fetchEmployees();
  }, [isAdmin, fetchEmployees]);

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

    if (currentWeek.length > 0) {
      result.push(currentWeek);
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

  const getReportsByDay = (day) => {
    return timesheets.filter((item) => {
      const d = new Date(item.reportDate);

      return (
        d.getDate() === day &&
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    });
  };

  const getAttendanceByDay = (day) => {
    return attendanceList.find((item) => {
      const d = new Date(item.attendanceDate);

      return (
        d.getDate() === day &&
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    });
  };

  const getDayStatus = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const attendance = getAttendanceByDay(day);
    const reports = getReportsByDay(day);

    if (date.getDay() === 0) return "off";
    if (date > currentDate) return "future";

    if (attendance?.attendanceStatus === "checked_out") return "submitted";
    if (attendance?.attendanceStatus === "regularized") return "submitted";
    if (attendance?.attendanceStatus === "regularization_pending") {
      return "warning";
    }
    if (attendance?.attendanceStatus === "checked_in") return "warning";

    if (reports.length > 0) return "submitted";

    return "missing";
  };

  const todaySubmitted = timesheets.some((item) => {
    const d = new Date(item.reportDate);
    return d.toDateString() === today.toDateString();
  });

  const selectedDateKey = selectedDay
    ? getDateKey(new Date(selectedYear, selectedMonth, selectedDay))
    : "";

  const selectedReports = selectedDay ? getReportsByDay(selectedDay) : [];
  const selectedAttendance = selectedDay ? getAttendanceByDay(selectedDay) : null;

  const todayCheckedIn = Boolean(todayAttendance?.checkIn?.time);
  const todayCheckedOut = Boolean(todayAttendance?.checkOut?.time);

  const canRegularizeSelectedDay =
    !isAdmin &&
    selectedDay &&
    selectedDateKey < getDateKey(new Date()) &&
    (!selectedAttendance ||
      selectedAttendance.attendanceStatus === "not_checked_in" ||
      selectedAttendance.attendanceStatus === "checked_in" ||
      selectedAttendance.attendanceStatus === "absent") &&
    selectedAttendance?.regularization?.status !== "pending";

  const missingDays = Array.from({ length: getDaysInMonth() }, (_, i) => {
    const day = i + 1;
    return {
      day,
      status: getDayStatus(day),
    };
  }).filter((item) => item.status === "missing");

  const pendingRegularizationCount = attendanceList.filter(
    (item) => item.attendanceStatus === "regularization_pending"
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

  return (
    <div className="timesheet-container">
      <div className="timesheet-header">
        <div>
          <h2>Attendance & Work Reports</h2>
          <p>Office check-in, check-out, regularization and weekly reports</p>
        </div>

        {!isAdmin && (
          <button
            className={`fill-btn ${todaySubmitted ? "disabled" : ""}`}
            disabled={todaySubmitted}
            onClick={() => setShowForm(true)}
            type="button"
          >
            {todaySubmitted ? "Today's Report Submitted" : "+ Fill Today's Report"}
          </button>
        )}
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

            {todayCheckedIn && !todayCheckedOut && (
              <button
                type="button"
                className="attendance-regularize-btn"
                onClick={() =>
                  openRegularizeModal(getDateKey(new Date()), "missed_check_out")
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
          {isAdmin && (
            <div className="filter-field">
              <label>Employee</label>
              <select
                name="employeeId"
                value={filters.employeeId}
                onChange={handleFilterChange}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
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

                      {isAdmin && <span>{item.employeeId?.name || "-"}</span>}
                    </div>

                    <p>
                      <b>Work:</b> {item.workSummary}
                    </p>

                    <p>
                      <b>Challenges:</b> {item.challenges || "-"}
                    </p>

                    <p>
                      <b>Next Plan:</b> {item.nextDayPlan || "-"}
                    </p>
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
              <span>
                {months[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="calendar-legend">
              <span>
                <b className="dot green"></b>Complete
              </span>
              <span>
                <b className="dot yellow"></b>Pending
              </span>
              <span>
                <b className="dot red"></b>Missing
              </span>
              <span>
                <b className="dot gray"></b>Sunday
              </span>
            </div>

            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="week-name">
                  {day}
                </div>
              ))}

              {Array.from({
                length: new Date(selectedYear, selectedMonth, 1).getDay(),
              }).map((_, i) => (
                <div key={`empty-${i}`} className="empty-day"></div>
              ))}

              {Array.from({ length: getDaysInMonth() }, (_, i) => {
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
              {!isAdmin && !todayCheckedIn && (
                <div className="update-item danger">
                  <strong>Today’s check-in pending</strong>
                  <p>Please check in from office location.</p>
                </div>
              )}

              {!isAdmin && todayCheckedIn && !todayCheckedOut && (
                <div className="update-item warning">
                  <strong>Checkout pending</strong>
                  <p>Please check out before leaving office.</p>
                </div>
              )}

              {!isAdmin && !todaySubmitted && (
                <div className="update-item danger">
                  <strong>Today’s work report pending</strong>
                  <p>Please submit your work report before end of day.</p>
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
          <div className="timesheet-modal">
            <div className="modal-header">
              <div>
                <h3>
                  Attendance - {selectedDay} {months[selectedMonth]}{" "}
                  {selectedYear}
                </h3>
                <p>
                  {selectedReports.length} work report(s) ·{" "}
                  {selectedAttendance?.attendanceStatus || "No attendance"}
                </p>
              </div>

              <button onClick={() => setSelectedDay(null)} type="button">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="attendance-detail-box">
                <div>
                  <span>Status</span>
                  <strong>
                    {selectedAttendance?.attendanceStatus
                      ? selectedAttendance.attendanceStatus.replaceAll("_", " ")
                      : "No Attendance"}
                  </strong>
                </div>

                <div>
                  <span>Check In</span>
                  <strong>{formatTime(selectedAttendance?.checkIn?.time)}</strong>
                </div>

                <div>
                  <span>Check Out</span>
                  <strong>{formatTime(selectedAttendance?.checkOut?.time)}</strong>
                </div>

                <div>
                  <span>Total Time</span>
                  <strong>
                    {formatMinutes(selectedAttendance?.totalWorkingMinutes)}
                  </strong>
                </div>
              </div>

              {!isAdmin &&
                selectedAttendance?.attendanceStatus ===
                  "regularization_pending" && (
                  <div className="empty-state">
                    Regularization request already submitted.
                  </div>
                )}

              {canRegularizeSelectedDay && (
                <div className="calendar-regularize-panel">
                  <p>
                    Attendance is missing or incomplete for this date. Submit a
                    regularization request for approval.
                  </p>

                  <div className="calendar-regularize-actions">
                    {!selectedAttendance?.checkIn?.time && (
                      <button
                        type="button"
                        className="calendar-regularize-btn"
                        onClick={() =>
                          openRegularizeModal(selectedDateKey, "missed_check_in")
                        }
                      >
                        Regularize Missing Check-in
                      </button>
                    )}

                    {selectedAttendance?.checkIn?.time &&
                      !selectedAttendance?.checkOut?.time && (
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

                    {!selectedAttendance && (
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
                  </div>
                </div>
              )}

              {selectedReports.length === 0 ? (
                <div className="empty-state">
                  No work report submitted for this date
                </div>
              ) : (
                selectedReports.map((item) => (
                  <div key={item._id} className="report-item modal-report">
                    <div className="report-top">
                      {isAdmin && <span>{item.employeeId?.name || "-"}</span>}
                      <strong>{formatDate(item.reportDate)}</strong>
                    </div>

                    <p>
                      <b>Work Summary:</b> {item.workSummary}
                    </p>
                    <p>
                      <b>Challenges:</b> {item.challenges || "-"}
                    </p>
                    <p>
                      <b>Next Day Plan:</b> {item.nextDayPlan || "-"}
                    </p>
                  </div>
                ))
              )}
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
          onClose={() => setShowForm(false)}
          refresh={fetchTimesheets}
        />
      )}
    </div>
  );
};

export default TimesheetPage;