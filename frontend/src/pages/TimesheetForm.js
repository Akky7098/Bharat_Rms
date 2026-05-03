import React, { useState } from "react";
import { createTimesheet } from "../services/timesheetService";

const TimesheetForm = ({ onClose, refresh }) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
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

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      setLoading(true);

      await createTimesheet(form);

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
      <div className="timesheet-form-card">
        <div className="timesheet-form-header">
          <div>
            <h2>Today's Timesheet</h2>
            <p>Submit your daily work report</p>
          </div>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
          <div className="today-box">
            <span>Report Date</span>
            <strong>{new Date().toLocaleDateString("en-IN")}</strong>
          </div>

          <div className="timesheet-form-group">
            <label>Work Summary *</label>
            <textarea
              name="workSummary"
              value={form.workSummary}
              onChange={handleChange}
              placeholder="Write today's completed work..."
              rows="5"
            />
          </div>

          <div className="timesheet-form-group">
            <label>Challenges / Issues</label>
            <textarea
              name="challenges"
              value={form.challenges}
              onChange={handleChange}
              placeholder="Mention blockers, delays or issues if any..."
              rows="4"
            />
          </div>

          <div className="timesheet-form-group">
            <label>Next Day Plan *</label>
            <textarea
              name="nextDayPlan"
              value={form.nextDayPlan}
              onChange={handleChange}
              placeholder="Write tomorrow's work plan..."
              rows="4"
            />
          </div>

          <div className="timesheet-form-actions">
            <button type="button" className="ts-cancel-btn" onClick={onClose}>
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