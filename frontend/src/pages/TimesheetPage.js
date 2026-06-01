import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getTimesheets } from "../services/timesheetService";
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
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

const TimesheetPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isUser = user?.role === "user";
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const canManageUsers = isAdmin || isSuperAdmin;
  const canFillOwnReport = isUser || isAdmin;

  const today = new Date();
  const todayKey = getDateKey(today);

  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reportDateForForm, setReportDateForForm] = useState("");
  const [weekPage, setWeekPage] = useState(0);

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

    if ((isAdmin || isSuperAdmin) && loggedInEmployee._id) {
      map.set(loggedInEmployee._id, loggedInEmployee);
    }

    timesheets.forEach((item) => {
      const id = getEmployeeId(item.employeeId);
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          _id: id,
          name: item.employeeId?.name || item.employeeName || "Employee",
          email: item.employeeId?.email || item.employeeEmail || "",
          role: item.employeeId?.role || "",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [employees, timesheets, isAdmin, isSuperAdmin, loggedInEmployee]);

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

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await getSalesPersons();
      setEmployees(data || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

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

  const getDayStatus = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (date.getDay() === 0) return "off";
    if (date > currentDate) return "future";

    const reports = getReportsByDay(day);

    if (canManageUsers) {
      if (filters.employeeId) {
        return reports.length > 0 ? "submitted" : "missing";
      }

      return reports.length > 0 ? "submitted" : "missing";
    }

    return reports.length > 0 ? "submitted" : "missing";
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
  const isSelectedSunday = selectedDateObj?.getDay() === 0;

  const currentWeekReports = useMemo(() => {
    const weekSet = new Set(currentWeekDays);

    return [...timesheets]
      .filter((item) => {
        const d = new Date(item.reportDate);
        return weekSet.has(d.getDate());
      })
      .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
  }, [timesheets, currentWeekDays]);

  const selectedDayEmployeeRows = useMemo(() => {
    if (!selectedDay) return [];

    const dateReports = getReportsByDay(selectedDay);

    if (!canManageUsers) {
      return [
        {
          employee: loggedInEmployee,
          report: dateReports[0] || null,
        },
      ];
    }

    const sourceEmployees = filters.employeeId
      ? allEmployeesForView.filter((emp) => emp._id === filters.employeeId)
      : allEmployeesForView;

    return sourceEmployees.map((emp) => {
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
        report: report || null,
      };
    });
  }, [
    selectedDay,
    filters.employeeId,
    canManageUsers,
    allEmployeesForView,
    loggedInEmployee,
    getReportsByDay,
  ]);

  const openWorkReportForm = (dateKey = todayKey) => {
    setReportDateForForm(dateKey);
    setSelectedDay(null);
    setShowForm(true);
  };

  return (
    <div className="timesheet-container">
      <div className="timesheet-header">
        <div>
          <h2>Work Reports</h2>
          <p>Daily work summary, challenges and next-day planning</p>
        </div>

        <div className="timesheet-header-actions">
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

      <div className="timesheet-filter-card">
        <div className="filter-title">
          <h3>Filters</h3>
          <p>View work reports by month, week and employee</p>
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
                      {canManageUsers && (
                        <span>
                          {item.employeeId?.name || item.employeeName || "-"}
                        </span>
                      )}
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
              <h3>Work Report Calendar</h3>
              <span>
                {months[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="calendar-legend">
              <span>
                <b className="dot green"></b>Submitted
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
                  Work Reports - {selectedDay} {months[selectedMonth]}{" "}
                  {selectedYear}
                </h3>
                <p>
                  {canManageUsers
                    ? `${selectedDayEmployeeRows.length} employee record(s)`
                    : `${selectedReports.length} work report(s)`}
                </p>
              </div>

              <button onClick={() => setSelectedDay(null)} type="button">
                ×
              </button>
            </div>

            <div className="modal-body">
              {isSelectedSunday && (
                <div className="attendance-warning-box sunday">
                  Sunday is weekly off. Work report is disabled.
                </div>
              )}

              {selectedDayEmployeeRows.map(({ employee, report }) => {
                const isOwnRow =
                  employee?._id === (user._id || user.id) ||
                  employee?.email === user.email ||
                  employee?.name === user.name;

                const rowCanFillReport =
                  isOwnRow &&
                  canFillOwnReport &&
                  selectedDay &&
                  !isSelectedSunday &&
                  !report &&
                  selectedDateKey === todayKey;

                return (
                  <div
                    key={`${employee?._id || employee?.name}-${selectedDateKey}`}
                    className="employee-attendance-day-card"
                  >
                    <div className="employee-attendance-day-top">
                      <div>
                        <h4>{employee?.name || "-"}</h4>
                        <p>{formatDate(selectedDateObj)}</p>
                      </div>

                      <span
                        className={`attendance-health-pill ${
                          report ? "complete" : "missing"
                        }`}
                      >
                        {report ? "Submitted" : "Missing"}
                      </span>
                    </div>

                    {!report && rowCanFillReport && (
                      <button
                        type="button"
                        className="calendar-regularize-btn"
                        onClick={() => openWorkReportForm(selectedDateKey)}
                      >
                        Fill Work Report
                      </button>
                    )}

                    {!report && !rowCanFillReport && (
                      <div className="empty-state">
                        No work report submitted for this date
                      </div>
                    )}

                    {report && (
                      <div className="report-item modal-report">
                        <div className="report-top">
                          <span>{employee?.name || "-"}</span>
                          <strong>{formatDate(report.reportDate)}</strong>
                        </div>

                        <p>
                          <b>Work Summary:</b> {report.workSummary}
                        </p>
                        <p>
                          <b>Challenges:</b> {report.challenges || "-"}
                        </p>
                        <p>
                          <b>Next Day Plan:</b> {report.nextDayPlan || "-"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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