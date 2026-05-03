import React, { useCallback, useEffect, useState } from "react";
import { getTimesheets } from "../services/timesheetService";
import { getSalesPersons } from "../services/salesOrderService";
import TimesheetForm from "./TimesheetForm";
import "./Timesheet.css";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TimesheetPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const today = new Date();

  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
    employeeId: "",
  });

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
      console.log(error);
      alert(error.response?.data?.message || "Failed to load timesheets");
    }
  }, [filters, isAdmin]);

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
    if (isAdmin) fetchEmployees();
  }, [isAdmin, fetchEmployees]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const getDaysInMonth = () => {
    return new Date(filters.year, Number(filters.month) + 1, 0).getDate();
  };

  const getReportsByDay = (day) => {
    return timesheets.filter((item) => {
      const d = new Date(item.reportDate);
      return (
        d.getDate() === day &&
        d.getMonth() === Number(filters.month) &&
        d.getFullYear() === Number(filters.year)
      );
    });
  };

 const getDayStatus = (day) => {
  const date = new Date(Number(filters.year), Number(filters.month), day);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  if (date.getDay() === 0) return "off";

  const reports = getReportsByDay(day);
  if (reports.length > 0) return "submitted";

  if (date > currentDate) return "future";

  return "missing";
};

  const todaySubmitted = timesheets.some((item) => {
    const d = new Date(item.reportDate);
    return d.toDateString() === today.toDateString();
  });

  const recentReports = [...timesheets]
    .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate))
    .slice(0, 15);

  const selectedReports = selectedDay ? getReportsByDay(selectedDay) : [];

  const missingDays = Array.from({ length: getDaysInMonth() }, (_, i) => {
    const day = i + 1;
    return {
      day,
      status: getDayStatus(day),
    };
  }).filter((item) => item.status === "missing");

  return (
    <div className="timesheet-container">
      <div className="timesheet-header">
        <div>
          <h2>Timesheet</h2>
          <p>Daily work reporting and attendance overview</p>
        </div>

        {!isAdmin && (
          <button
  className={`fill-btn ${todaySubmitted ? "disabled" : ""}`}
  disabled={todaySubmitted}
  onClick={() => setShowForm(true)}
>
  {todaySubmitted ? "Today's Report Submitted" : "+ Fill Today's Report"}
</button>
        )}
      </div>

      <div className="timesheet-filter-card">
        <div className="filter-title">
          <h3>Filters</h3>
          <p>View timesheet records by month and employee</p>
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
              <h3>Monthly Reports</h3>
              <span>{timesheets.length} submitted</span>
            </div>

            <div className="report-list">
              {timesheets.length === 0 ? (
                <div className="empty-state">No timesheet records found</div>
              ) : (
                timesheets.map((item) => (
                  <div key={item._id} className="report-item">
                    <div className="report-top">
                      <strong>
                        {new Date(item.reportDate).toLocaleDateString("en-IN")}
                      </strong>

                      {isAdmin && (
                        <span>{item.employeeId?.name || "-"}</span>
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
              <h3>Calendar</h3>
              <span>
                {months[filters.month]} {filters.year}
              </span>
            </div>

            <div className="calendar-legend">
              <span><b className="dot green"></b>Submitted</span>
              <span><b className="dot red"></b>Missing</span>
              <span><b className="dot gray"></b>Sunday</span>
            </div>

            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="week-name">{day}</div>
              ))}

              {Array.from({
                length: new Date(filters.year, filters.month, 1).getDay(),
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
                  >
                    <strong>{day}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="updates-card">
            <div className="section-heading">
              <h3>Recent Updates</h3>
              <span>{recentReports.length}</span>
            </div>

            <div className="updates-list">
              {!isAdmin && !todaySubmitted && (
                <div className="update-item danger">
                  <strong>Today’s timesheet pending</strong>
                  <p>Please submit your work report for today.</p>
                </div>
              )}

              {missingDays.length > 0 && (
                <div className="update-item warning">
                  <strong>{missingDays.length} missing days</strong>
                  <p>There are missing reports in this month.</p>
                </div>
              )}

              {recentReports.length === 0 ? (
                <div className="update-item success">
                  <strong>No recent reports</strong>
                  <p>No submitted reports found for selected filters.</p>
                </div>
              ) : (
                recentReports.map((item) => (
                  <div key={item._id} className="update-item neutral">
                    <strong>
                      {isAdmin ? item.employeeId?.name || "Employee" : "You"} submitted report
                    </strong>
                    <p>{new Date(item.reportDate).toLocaleDateString("en-IN")}</p>
                  </div>
                ))
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
                  Timesheet - {selectedDay} {months[filters.month]} {filters.year}
                </h3>
                <p>{selectedReports.length} report(s)</p>
              </div>

              <button onClick={() => setSelectedDay(null)}>×</button>
            </div>

            <div className="modal-body">
              {selectedReports.length === 0 ? (
                <div className="empty-state">No timesheet submitted for this date</div>
              ) : (
                selectedReports.map((item) => (
                  <div key={item._id} className="report-item modal-report">
                    <div className="report-top">
                      {isAdmin && <span>{item.employeeId?.name || "-"}</span>}
                      <strong>
                        {new Date(item.reportDate).toLocaleDateString("en-IN")}
                      </strong>
                    </div>

                    <p><b>Work Summary:</b> {item.workSummary}</p>
                    <p><b>Challenges:</b> {item.challenges || "-"}</p>
                    <p><b>Next Day Plan:</b> {item.nextDayPlan || "-"}</p>
                  </div>
                ))
              )}
            </div>
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