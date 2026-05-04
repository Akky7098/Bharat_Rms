import React, { useState } from "react";
import { updateEnquiryWorkflow } from "../services/enquiryForm";
import "./WorkflowUpdate.css";

const WorkflowUpdate = ({ enquiry, onClose, refresh }) => {
  const formatForDateTimeInput = (date) => {
    if (!date) return "";

    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toISOStringOrUndefined = (value) => {
    if (!value) return undefined;
    return new Date(value).toISOString();
  };

  const formatDisplayDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [form, setForm] = useState({
    feasibilityActualDate: formatForDateTimeInput(
      enquiry.feasibility?.actualDate
    ),
    feasibilityStatus: enquiry.feasibility?.status || "pending",
    feasibilityCompleted: enquiry.feasibility?.completed || false,

    quotationActualDate: formatForDateTimeInput(enquiry.quotation?.actualDate),
    quotationLink: enquiry.quotation?.quotationLink || "",
    quotationCompleted: enquiry.quotation?.completed || false,

    closureActualDate: formatForDateTimeInput(enquiry.closure?.actualDate),
    closureStatus: enquiry.closure?.status || "pending",
    lostRemark: enquiry.closure?.lostRemark || "",
    closureCompleted: enquiry.closure?.completed || false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};

    if (
      form.feasibilityActualDate ||
      form.feasibilityStatus !== (enquiry.feasibility?.status || "pending") ||
      form.feasibilityCompleted !== (enquiry.feasibility?.completed || false)
    ) {
      payload.feasibility = {
        actualDate: toISOStringOrUndefined(form.feasibilityActualDate),
        status: form.feasibilityStatus,
        completed: form.feasibilityCompleted,
      };
    }

    if (
      form.quotationActualDate ||
      form.quotationLink ||
      form.quotationCompleted !== (enquiry.quotation?.completed || false)
    ) {
      payload.quotation = {
        actualDate: toISOStringOrUndefined(form.quotationActualDate),
        quotationLink: form.quotationLink || undefined,
        completed: form.quotationCompleted,
      };
    }

    if (
      form.closureActualDate ||
      form.closureStatus !== (enquiry.closure?.status || "pending") ||
      form.lostRemark ||
      form.closureCompleted !== (enquiry.closure?.completed || false)
    ) {
      payload.closure = {
        actualDate: toISOStringOrUndefined(form.closureActualDate),
        status: form.closureStatus,
        lostRemark: form.lostRemark || undefined,
        completed: form.closureCompleted,
      };
    }

    if (Object.keys(payload).length === 0) {
      alert("No update added");
      return;
    }

    try {
      await updateEnquiryWorkflow(enquiry._id, payload);
      alert("Workflow updated successfully");
      refresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update workflow");
    }
  };

  return (
    <div className="workflow-overlay">
      <div className="workflow-card">
        <div className="workflow-header">
          <div>
            <h2>Update Enquiry Workflow</h2>
            <p>
              {enquiry.companyName} - {enquiry.customerName}
            </p>
          </div>

          <button className="workflow-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="workflow-grid">
            <div className="workflow-section">
              <h3>Feasibility</h3>

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.feasibility?.planDate)}
                disabled
              />

              <label>Actual Date</label>
              <input
                type="datetime-local"
                name="feasibilityActualDate"
                value={form.feasibilityActualDate}
                onChange={handleChange}
              />

              <label>Status</label>
              <select
                name="feasibilityStatus"
                value={form.feasibilityStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="feasible">Feasible</option>
                <option value="not_feasible">Not Feasible</option>
              </select>

              <label className="check-row">
                <input
                  type="checkbox"
                  name="feasibilityCompleted"
                  checked={form.feasibilityCompleted}
                  onChange={handleChange}
                />
                Completed
              </label>
            </div>

            <div className="workflow-section">
              <h3>Quotation</h3>

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.quotation?.planDate)}
                disabled
              />

              <label>Actual Date</label>
              <input
                type="datetime-local"
                name="quotationActualDate"
                value={form.quotationActualDate}
                onChange={handleChange}
              />

              <label>Quotation Link</label>
              <input
                name="quotationLink"
                value={form.quotationLink}
                onChange={handleChange}
                placeholder="Paste quotation link"
              />

              <label className="check-row">
                <input
                  type="checkbox"
                  name="quotationCompleted"
                  checked={form.quotationCompleted}
                  onChange={handleChange}
                />
                Completed
              </label>
            </div>

            <div className="workflow-section">
              <h3>Closure</h3>

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.closure?.planDate)}
                disabled
              />

              <label>Actual Date</label>
              <input
                type="datetime-local"
                name="closureActualDate"
                value={form.closureActualDate}
                onChange={handleChange}
              />

              <label>Status</label>
              <select
                name="closureStatus"
                value={form.closureStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>

              {form.closureStatus === "lost" && (
                <>
                  <label>Lost Remark</label>
                  <textarea
                    name="lostRemark"
                    value={form.lostRemark}
                    onChange={handleChange}
                    placeholder="Reason for lost enquiry"
                  />
                </>
              )}

              <label className="check-row">
                <input
                  type="checkbox"
                  name="closureCompleted"
                  checked={form.closureCompleted}
                  onChange={handleChange}
                />
                Completed
              </label>
            </div>
          </div>

          <div className="workflow-actions">
            <button type="button" className="cancel-workflow" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="save-workflow">
              Save Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowUpdate;