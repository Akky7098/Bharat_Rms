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
    feasibilityStatus: enquiry.feasibility?.status || "",
    quotationLink: enquiry.quotation?.quotationLink || "",
    closureStatus: enquiry.closure?.status || "",
    lostRemark: enquiry.closure?.lostRemark || "",
    lostRemarkOtherText: enquiry.closure?.lostRemarkOtherText || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
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

    // FEASIBILITY
    if (!isFeasibilityLocked) {
      if (
        form.feasibilityStatus &&
        form.feasibilityStatus !== enquiry.feasibility?.status
      ) {
        payload.feasibility = {
          status: form.feasibilityStatus,
          completed: true,
        };
      }
    }

    // QUOTATION
    if (!isQuotationLocked) {
      if (
        form.quotationLink.trim() &&
        form.quotationLink !== (enquiry.quotation?.quotationLink || "")
      ) {
        payload.quotation = {
          quotationLink: form.quotationLink.trim(),
          completed: true,
        };
      }
    }

    // CLOSURE
    if (!isClosureLocked) {
      if (
        form.closureStatus &&
        form.closureStatus !== enquiry.closure?.status
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
            form.closureStatus === "lost"
              ? form.lostRemark
              : undefined,
          lostRemarkOtherText:
            form.closureStatus === "lost" &&
            form.lostRemark === "others"
              ? form.lostRemarkOtherText.trim()
              : undefined,
          completed: true,
        };
      }
    }

    if (Object.keys(payload).length === 0) {
      alert("Please complete at least one workflow step before saving.");
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

            {/* STEP 1 */}
            <div
              className={`workflow-section ${
                isFeasibilityLocked ? "workflow-locked" : ""
              }`}
            >
              <div className="workflow-step-title">
                Step 1 – Feasible Review
              </div>

              <h3>Feasible</h3>

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
                <option value="">Select Status</option>
                <option value="feasible">Feasible</option>
                <option value="not_feasible">Not Feasible</option>
              </select>
            </div>

            {/* STEP 2 */}
            <div
              className={`workflow-section ${
                isQuotationLocked ? "workflow-locked" : ""
              }`}
            >
              <div className="workflow-step-title">
                Step 2 – Quotation Follow-up
              </div>

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
            </div>

            {/* STEP 3 */}
            <div
              className={`workflow-section ${
                isClosureLocked ? "workflow-locked" : ""
              }`}
            >
              <div className="workflow-step-title">
                Step 3 – Closure Decision
              </div>

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
                <option value="">Select Status</option>
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
                    <textarea
                      name="lostRemarkOtherText"
                      value={form.lostRemarkOtherText}
                      onChange={handleChange}
                      placeholder="Enter other reason"
                      disabled={isClosureLocked}
                    />
                  )}
                </>
              )}
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