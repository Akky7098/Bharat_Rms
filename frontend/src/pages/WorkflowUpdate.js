import React, { useState } from "react";
import { updateEnquiryWorkflow } from "../services/enquiryForm";
import "./WorkflowUpdate.css";

const lostRemarkOptions = [
  { value: "", label: "Select Lost Remark" },
  { value: "price", label: "Price" },
  { value: "delivery", label: "Delivery" },
  { value: "qty", label: "Qty" },
  { value: "quality", label: "Quality" },
  { value: "payment_terms", label: "Payment Terms" },
  { value: "material_not_available", label: "Material Not Available" },
  { value: "others", label: "Others" },
];

const WorkflowUpdate = ({ enquiry, onClose, refresh }) => {
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

  const isFeasibilityLocked = enquiry.feasibility?.completed === true;
  const isQuotationLocked = enquiry.quotation?.completed === true;
  const isClosureLocked = enquiry.closure?.completed === true;

  const [form, setForm] = useState({
    feasibilityStatus: enquiry.feasibility?.status || "pending",
    feasibilityCompleted: enquiry.feasibility?.completed || false,

    quotationLink: enquiry.quotation?.quotationLink || "",
    quotationCompleted: enquiry.quotation?.completed || false,

    closureStatus: enquiry.closure?.status || "pending",
    lostRemark: enquiry.closure?.lostRemark || "",
    lostRemarkOtherText: enquiry.closure?.lostRemarkOtherText || "",
    closureCompleted: enquiry.closure?.completed || false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "closureStatus" && value !== "lost") {
        updated.lostRemark = "";
        updated.lostRemarkOtherText = "";
      }

      if (name === "lostRemark" && value !== "others") {
        updated.lostRemarkOtherText = "";
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};

    if (
      !isFeasibilityLocked &&
      (form.feasibilityStatus !== (enquiry.feasibility?.status || "pending") ||
        form.feasibilityCompleted !== (enquiry.feasibility?.completed || false))
    ) {
      payload.feasibility = {
        status: form.feasibilityStatus,
        completed: form.feasibilityCompleted,
      };
    }

    if (
      !isQuotationLocked &&
      (form.quotationLink !== (enquiry.quotation?.quotationLink || "") ||
        form.quotationCompleted !== (enquiry.quotation?.completed || false))
    ) {
      payload.quotation = {
        quotationLink: form.quotationLink || undefined,
        completed: form.quotationCompleted,
      };
    }

    if (
      !isClosureLocked &&
      (form.closureStatus !== (enquiry.closure?.status || "pending") ||
        form.lostRemark !== (enquiry.closure?.lostRemark || "") ||
        form.lostRemarkOtherText !==
          (enquiry.closure?.lostRemarkOtherText || "") ||
        form.closureCompleted !== (enquiry.closure?.completed || false))
    ) {
      if (form.closureStatus === "lost" && !form.lostRemark) {
        alert("Please select lost remark");
        return;
      }

      if (
        form.closureStatus === "lost" &&
        form.lostRemark === "others" &&
        !form.lostRemarkOtherText.trim()
      ) {
        alert("Please enter other lost remark");
        return;
      }

      payload.closure = {
        status: form.closureStatus,
        lostRemark:
          form.closureStatus === "lost" ? form.lostRemark : undefined,
        lostRemarkOtherText:
          form.closureStatus === "lost" && form.lostRemark === "others"
            ? form.lostRemarkOtherText.trim()
            : undefined,
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
            <div
              className={`workflow-section ${
                isFeasibilityLocked ? "workflow-locked" : ""
              }`}
            >
              <h3>Feasibility</h3>

              {isFeasibilityLocked && (
                <div className="locked-note">
                  Completed on {formatDisplayDateTime(enquiry.feasibility?.actualDate)}
                </div>
              )}

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.feasibility?.planDate)}
                disabled
              />

              <label>Status</label>
              <select
                name="feasibilityStatus"
                value={form.feasibilityStatus}
                onChange={handleChange}
                disabled={isFeasibilityLocked}
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
                  disabled={isFeasibilityLocked}
                />
                Completed
              </label>
            </div>

            <div
              className={`workflow-section ${
                isQuotationLocked ? "workflow-locked" : ""
              }`}
            >
              <h3>Quotation</h3>

              {isQuotationLocked && (
                <div className="locked-note">
                  Completed on {formatDisplayDateTime(enquiry.quotation?.actualDate)}
                </div>
              )}

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.quotation?.planDate)}
                disabled
              />

              <label>Quotation Link</label>
              <input
                name="quotationLink"
                value={form.quotationLink}
                onChange={handleChange}
                placeholder="Paste quotation link"
                disabled={isQuotationLocked}
              />

              <label className="check-row">
                <input
                  type="checkbox"
                  name="quotationCompleted"
                  checked={form.quotationCompleted}
                  onChange={handleChange}
                  disabled={isQuotationLocked}
                />
                Completed
              </label>
            </div>

            <div
              className={`workflow-section ${
                isClosureLocked ? "workflow-locked" : ""
              }`}
            >
              <h3>Closure</h3>

              {isClosureLocked && (
                <div className="locked-note">
                  Completed on {formatDisplayDateTime(enquiry.closure?.actualDate)}
                </div>
              )}

              <label>Plan Date</label>
              <input
                value={formatDisplayDateTime(enquiry.closure?.planDate)}
                disabled
              />

              <label>Status</label>
              <select
                name="closureStatus"
                value={form.closureStatus}
                onChange={handleChange}
                disabled={isClosureLocked}
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>

              {form.closureStatus === "lost" && (
                <>
                  <label>Lost Remark</label>
                  <select
                    name="lostRemark"
                    value={form.lostRemark}
                    onChange={handleChange}
                    disabled={isClosureLocked}
                  >
                    {lostRemarkOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {form.lostRemark === "others" && (
                    <>
                      <label>Other Lost Remark</label>
                      <textarea
                        name="lostRemarkOtherText"
                        value={form.lostRemarkOtherText}
                        onChange={handleChange}
                        placeholder="Enter other reason"
                        disabled={isClosureLocked}
                      />
                    </>
                  )}
                </>
              )}

              <label className="check-row">
                <input
                  type="checkbox"
                  name="closureCompleted"
                  checked={form.closureCompleted}
                  onChange={handleChange}
                  disabled={isClosureLocked}
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