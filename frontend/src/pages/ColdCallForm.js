import React, { useState } from "react";
import { createColdCall } from "../services/coldCallService";
import "./ColdCallForm.css";

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ColdCallForm = ({ onClose, refresh }) => {
  const [loading, setLoading] = useState(false);
  const todayDate = getTodayDate();

  const [form, setForm] = useState({
    activityType: "",
    date: todayDate,
    companyName: "",
    contactPersonName: "",
    contactPersonNumber: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    let finalValue = value;

    if (name === "contactPersonNumber") {
      finalValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    if (name === "contactPersonNumber") {
      if (finalValue.length === 0) {
        setError("");
      } else if (!/^[6-9]/.test(finalValue)) {
        setError("Number must start from 6-9");
      } else if (finalValue.length < 10) {
        setError("Enter exactly 10 digits");
      } else {
        setError("");
      }
    }
  };

  const validate = () => {
    if (!form.activityType) return "Select activity type";
    if (!form.companyName.trim()) return "Enter company name";
    if (!form.contactPersonName.trim()) return "Enter contact person";

    if (!/^[6-9]\d{9}$/.test(form.contactPersonNumber)) {
      setError("Enter valid 10 digit mobile number");
      return "Invalid phone";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    if (err) return;

    try {
      setLoading(true);

      await createColdCall({
        ...form,
        date: todayDate,
      });

      alert("Saved successfully");
      refresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cold-modal-overlay">
      <div className="cold-form-card">
        <div className="cold-form-header">
          <div>
            <h2>New Entry</h2>
            <p>Log call / visit / email activity</p>
          </div>

          <button type="button" onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cold-form-grid">
            <div className="form-group">
              <label>Activity</label>
              <select
                name="activityType"
                value={form.activityType}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select</option>
                <option value="calling">Calling</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="form-group cold-date-disabled-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={todayDate}
                disabled
                readOnly
                className="cold-disabled-date"
              />
              <small>Auto-filled with today’s date</small>
            </div>

            <div className="form-group full-width">
              <label>Company Name</label>
              <input
                name="companyName"
                placeholder="Enter company name"
                value={form.companyName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Contact Person</label>
              <input
                name="contactPersonName"
                placeholder="Enter person name"
                value={form.contactPersonName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Contact Number</label>
              <input
                name="contactPersonNumber"
                placeholder="10 digit mobile"
                value={form.contactPersonNumber}
                onChange={handleChange}
                maxLength={10}
                disabled={loading}
              />

              {error && <span className="cold-field-error">{error}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColdCallForm;