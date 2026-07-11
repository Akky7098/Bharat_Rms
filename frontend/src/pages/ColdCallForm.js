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

const activityOptions = [
  { value: "calling", label: "Calling", icon: "📞" },
  { value: "visit", label: "Visit", icon: "🏢" },
  { value: "email", label: "Email", icon: "✉️" },
];

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

  const updateField = (name, value) => {
  let finalValue = value;

  if (name === "contactPersonNumber") {
    finalValue = value
      .replace(/\D/g, "")
      .slice(0, 10);
  }

  setForm((prev) => {
    /*
     * Back-date entry is allowed only for Visit.
     * Calling and Email always use today's date.
     */
    if (name === "activityType") {
      return {
        ...prev,
        activityType: finalValue,
        date:
          finalValue === "visit"
            ? prev.date || todayDate
            : todayDate,
      };
    }

    return {
      ...prev,
      [name]: finalValue,
    };
  });

  if (name === "contactPersonNumber") {
    if (finalValue.length === 0) {
      setError("");
    } else if (!/^[6-9]/.test(finalValue)) {
      setError(
        "Number must start from 6-9"
      );
    } else if (finalValue.length < 10) {
      setError(
        "Enter exactly 10 digits"
      );
    } else {
      setError("");
    }
  }
};

  const handleChange = (e) => {
    updateField(e.target.name, e.target.value);
  };

  const validate = () => {
  if (!form.activityType) {
    return "Select activity type";
  }

  if (
    form.activityType === "visit" &&
    !form.date
  ) {
    return "Select visit date";
  }

  if (
    form.activityType === "visit" &&
    form.date > todayDate
  ) {
    return "Future visit date is not allowed";
  }

  if (!form.companyName.trim()) {
    return "Enter company name";
  }

  if (!form.contactPersonName.trim()) {
    return "Enter contact person";
  }

  if (
    !/^[6-9]\d{9}$/.test(
      form.contactPersonNumber
    )
  ) {
    setError(
      "Enter valid 10 digit mobile number"
    );

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

  /*
   * Visit may use a previous date.
   * Calling and email always use today.
   */
  date:
    form.activityType === "visit"
      ? form.date
      : todayDate,
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
    <div className="cold-modal-overlay cold-form-pwa-shell">
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
          <div className="ios-cold-form-note">
            Activity date is auto-filled with today’s date.
          </div>

          {/* MOBILE ONLY */}
          <div className="ios-activity-option-section mobile-activity-options">
            <label>Activity Type *</label>

            <div className="ios-activity-option-grid">
              {activityOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={form.activityType === item.value ? "active" : ""}
                  onClick={() => updateField("activityType", item.value)}
                  disabled={loading}
                >
                  <span>{item.icon}</span>
                  <b>{item.label}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="cold-form-grid">
            {/* DESKTOP ONLY */}
            <div className="form-group desktop-activity-select">
              <label>Activity *</label>
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

            <div
  className={`form-group ${
    form.activityType === "visit"
      ? "cold-date-editable-group"
      : "cold-date-disabled-group"
  }`}
>
  <label>
    Date
    {form.activityType === "visit"
      ? " *"
      : ""}
  </label>

  <input
    type="date"
    name="date"
    value={form.date}
    onChange={handleChange}
    max={todayDate}
    disabled={
      loading ||
      form.activityType !== "visit"
    }
    readOnly={
      form.activityType !== "visit"
    }
    className={
      form.activityType === "visit"
        ? "cold-editable-date"
        : "cold-disabled-date"
    }
  />

  <small>
    {form.activityType === "visit"
      ? "You can select today or a previous date for visit activity."
      : "Calling and email use today’s date automatically."}
  </small>
</div>

            <div className="form-group full-width">
              <label>Company Name *</label>
              <input
                name="companyName"
                placeholder="Enter company name"
                value={form.companyName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Contact Person *</label>
              <input
                name="contactPersonName"
                placeholder="Enter person name"
                value={form.contactPersonName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                name="contactPersonNumber"
                placeholder="10 digit mobile"
                value={form.contactPersonNumber}
                onChange={handleChange}
                maxLength={10}
                disabled={loading}
                inputMode="numeric"
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
              {loading ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColdCallForm;