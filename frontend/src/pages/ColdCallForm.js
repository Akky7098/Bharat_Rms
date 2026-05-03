import React, { useState } from "react";
import { createColdCall } from "../services/coldCallService";
import "./ColdCallForm.css";

const ColdCallForm = ({ onClose, refresh }) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    activityType: "",
    date: "",
    companyName: "",
    contactPersonName: "",
    contactPersonNumber: "",
  });

  const [error, setError] = useState("");

  // ✅ HANDLE CHANGE (number restriction added)
  const handleChange = (e) => {
    const { name, value } = e.target;

    // allow only numbers
    if (name === "contactPersonNumber") {
      if (!/^\d*$/.test(value)) return;
    }

    setForm({
      ...form,
      [name]: value,
    });

    // live validation
    if (name === "contactPersonNumber") {
      if (value.length === 0) {
        setError("");
      } else if (!/^[6-9]\d{0,9}$/.test(value)) {
        setError("Number must start from 6-9");
      } else if (value.length !== 10) {
        setError("Enter exactly 10 digits");
      } else {
        setError("");
      }
    }
  };

  // ✅ VALIDATE BEFORE SUBMIT
  const validate = () => {
    if (!form.activityType) return "Select activity type";
    if (!form.date) return "Select date";
    if (!form.companyName) return "Enter company name";
    if (!form.contactPersonName) return "Enter contact person";

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

      await createColdCall(form);

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

          <button onClick={onClose} className="close-btn">
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
              >
                <option value="">Select</option>
                <option value="calling">Calling</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Company Name</label>
              <input
                name="companyName"
                placeholder="Enter company name"
                value={form.companyName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Contact Person</label>
              <input
                name="contactPersonName"
                placeholder="Enter person name"
                value={form.contactPersonName}
                onChange={handleChange}
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
              />

              {/* ✅ ERROR BELOW FIELD */}
              {error && (
                <span style={{
                  color: "#dc2626",
                  fontSize: "12px",
                  marginTop: "4px",
                  display: "block"
                }}>
                  {error}
                </span>
              )}
            </div>

          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColdCallForm;