import React, { useState } from "react";
import { createTimesheet } from "../services/timesheetService";
import "./Timesheet.css";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const TimesheetForm = ({ onClose, refresh, reportDate }) => {
  const todayKey = getDateKey(new Date());

  const [form, setForm] = useState({
    workSummary: "",
    challenges: "",
    nextDayPlan: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const finalReportDate = reportDate || todayKey;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!form.workSummary.trim()) {
      alert("Work summary is required");
      return false;
    }

    if (form.workSummary.trim().length < 10) {
      alert("Work summary should be at least 10 characters");
      return false;
    }

    if (!form.nextDayPlan.trim()) {
      alert("Next day plan is required");
      return false;
    }

    if (form.nextDayPlan.trim().length < 5) {
      alert("Next day plan should be at least 5 characters");
      return false;
    }

    return true;
  };

  const submitTimesheet = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      await createTimesheet({
        ...form,
        reportDate: finalReportDate,
      });

      alert("Timesheet submitted successfully");
      refresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="timesheet-form-overlay">
      <div className="timesheet-form-card premium-timesheet-form-card">
        <div className="timesheet-form-header">
          <div>
            <span className="timesheet-form-badge">
              {finalReportDate === todayKey
                ? "Today's Work Report"
                : "Approved Previous Report"}
            </span>
            <h2>Timesheet</h2>
            <p>Submit short daily work report before checkout</p>
          </div>

          <button onClick={onClose} type="button" disabled={submitting}>
            ×
          </button>
        </div>

        <form className="timesheet-form" onSubmit={submitTimesheet}>
          <div className="today-box">
            <div>
              <span>Report Date</span>
              <strong>{formatDate(finalReportDate)}</strong>
            </div>
            <small>Fill daily work summary carefully</small>
          </div>

          <div className="timesheet-form-group">
            <label>Work Summary *</label>
            <textarea
              name="workSummary"
              value={form.workSummary}
              onChange={handleChange}
              placeholder="Example: Followed up clients, shared quotation, coordinated dispatch..."
            />
          </div>

          <div className="timesheet-form-group">
            <label>Challenges / Issues</label>
            <textarea
              name="challenges"
              value={form.challenges}
              onChange={handleChange}
              placeholder="Example: Payment delay, approval delay, material issue or N/A..."
            />
          </div>

          <div className="timesheet-form-group">
            <label>Next Day Plan *</label>
            <textarea
              name="nextDayPlan"
              value={form.nextDayPlan}
              onChange={handleChange}
              placeholder="Example: Follow up pending customers, send revised quotation..."
            />
          </div>

          <div className="timesheet-form-note">
            Work Summary minimum 10 characters. Next Day Plan minimum 5 characters.
          </div>

          <div className="timesheet-form-actions">
            <button type="button" className="ts-cancel-btn" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="ts-submit-btn" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Timesheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetForm;