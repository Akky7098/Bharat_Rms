import React, { useMemo, useState } from "react";
import { createTimesheet } from "../services/timesheetService";

const getDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TimesheetForm = ({ onClose, refresh, reportDate }) => {
  const [loading, setLoading] = useState(false);

  const finalReportDate = useMemo(() => {
    return reportDate || getDateKey(new Date());
  }, [reportDate]);

  const isToday = finalReportDate === getDateKey(new Date());

  const [form, setForm] = useState({
    reportDate: finalReportDate,
    workSummary: "",
    challenges: "",
    nextDayPlan: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    if (!form.workSummary.trim()) return "Work summary is required";

    if (form.workSummary.trim().length < 10) {
      return "Work summary should be at least 10 characters";
    }

    if (!form.nextDayPlan.trim()) {
      return "Next day plan is required";
    }

    if (form.nextDayPlan.trim().length < 5) {
      return "Next day plan should be at least 5 characters";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      setLoading(true);

      await createTimesheet({
        ...form,
        reportDate: finalReportDate,
      });

      alert("Timesheet submitted successfully");
      refresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit timesheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timesheet-form-overlay">
      <div className="timesheet-form-card premium-timesheet-form-card">
        <div className="timesheet-form-header">
          <div>
            <span className="timesheet-form-badge">
              {isToday ? "Today’s Work Report" : "Approved Previous Report"}
            </span>

            <h2>{isToday ? "Today's Timesheet" : "Previous Date Timesheet"}</h2>

            <p>
              {isToday
                ? "Submit your daily work report before checkout."
                : "This report is allowed only after attendance regularization approval."}
            </p>
          </div>

          <button type="button" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
          <div className="today-box premium-report-date-box">
            <div>
              <span>Report Date</span>
              <strong>{formatDate(finalReportDate)}</strong>
            </div>

            <small>
              {isToday
                ? "Current working day"
                : "Regularized attendance date"}
            </small>
          </div>

          <div className="timesheet-form-group">
            <label>Work Summary *</label>
            <textarea
              name="workSummary"
              value={form.workSummary}
              onChange={handleChange}
              placeholder="Example: Followed up with clients, shared quotation, updated pending orders, coordinated dispatch..."
              rows="5"
              disabled={loading}
            />
          </div>

          <div className="timesheet-form-group">
            <label>Challenges / Issues</label>
            <textarea
              name="challenges"
              value={form.challenges}
              onChange={handleChange}
              placeholder="Mention payment delay, customer hold, material availability issue, approval delay, or write N/A..."
              rows="4"
              disabled={loading}
            />
          </div>

          <div className="timesheet-form-group">
            <label>Next Day Plan *</label>
            <textarea
              name="nextDayPlan"
              value={form.nextDayPlan}
              onChange={handleChange}
              placeholder="Example: Follow up with pending customers, send revised quotation, coordinate dispatch..."
              rows="4"
              disabled={loading}
            />
          </div>

          {!isToday && (
            <div className="timesheet-form-note">
              This previous date report will be saved only for the approved
              regularized attendance date.
            </div>
          )}

          <div className="timesheet-form-actions">
            <button
              type="button"
              className="ts-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" className="ts-submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit Timesheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetForm;