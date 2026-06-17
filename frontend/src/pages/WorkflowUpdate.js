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
      const updated = { ...prev, [name]: value };

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

  const updateField = (name, value) => {
    handleChange({ target: { name, value } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};

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

    if (!isClosureLocked) {
      if (form.closureStatus && form.closureStatus !== enquiry.closure?.status) {
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
          lostRemark: form.closureStatus === "lost" ? form.lostRemark : undefined,
          lostRemarkOtherText:
            form.closureStatus === "lost" && form.lostRemark === "others"
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
      {/* DESKTOP WEBSITE OLD UI */}
      <div className="workflow-card workflow-desktop-card">
        <WorkflowHeader enquiry={enquiry} onClose={onClose} />

        <form onSubmit={handleSubmit}>
          <div className="workflow-grid">
            <DesktopWorkflowSection
              stepTitle="Step 1 – Feasible Review"
              title="Feasible"
              locked={isFeasibilityLocked}
              completedDate={enquiry.feasibility?.actualDate}
              planDate={enquiry.feasibility?.planDate}
              formatDisplayDateTime={formatDisplayDateTime}
            >
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
            </DesktopWorkflowSection>

            <DesktopWorkflowSection
              stepTitle="Step 2 – Quotation Follow-up"
              title="Quotation"
              locked={isQuotationLocked}
              completedDate={enquiry.quotation?.actualDate}
              planDate={enquiry.quotation?.planDate}
              formatDisplayDateTime={formatDisplayDateTime}
            >
              <label>Quotation Link</label>
              <input
                name="quotationLink"
                value={form.quotationLink}
                onChange={handleChange}
                placeholder="Paste quotation link"
                disabled={isQuotationLocked}
              />
            </DesktopWorkflowSection>

            <DesktopWorkflowSection
              stepTitle="Step 3 – Closure Decision"
              title="Closure"
              locked={isClosureLocked}
              completedDate={enquiry.closure?.actualDate}
              planDate={enquiry.closure?.planDate}
              formatDisplayDateTime={formatDisplayDateTime}
            >
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
            </DesktopWorkflowSection>
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

      {/* iOS PWA UI ONLY */}
      <div className="ios-workflow-card">
        <div className="ios-workflow-header">
          <div>
            <h2>Update Workflow</h2>
            <p>{enquiry.companyName} · {enquiry.customerName}</p>
          </div>

          <button type="button" onClick={onClose}>×</button>
        </div>

        <form className="ios-workflow-body" onSubmit={handleSubmit}>
          <IosStepSection
            number="1"
            title="Feasible Review"
            locked={isFeasibilityLocked}
            completedDate={enquiry.feasibility?.actualDate}
            planDate={enquiry.feasibility?.planDate}
            formatDisplayDateTime={formatDisplayDateTime}
          >
            <IosOptionGroup
              label="Status"
              value={form.feasibilityStatus}
              disabled={isFeasibilityLocked}
              options={[
                { value: "feasible", label: "Feasible" },
                { value: "not_feasible", label: "Not Feasible" },
              ]}
              onSelect={(v) => updateField("feasibilityStatus", v)}
            />
          </IosStepSection>

          <IosStepSection
            number="2"
            title="Quotation Follow-up"
            locked={isQuotationLocked}
            completedDate={enquiry.quotation?.actualDate}
            planDate={enquiry.quotation?.planDate}
            formatDisplayDateTime={formatDisplayDateTime}
          >
            <div className="ios-workflow-field">
              <label>Quotation Link</label>
              <input
                value={form.quotationLink}
                onChange={(e) => updateField("quotationLink", e.target.value)}
                placeholder="Paste quotation link"
                disabled={isQuotationLocked}
              />
            </div>
          </IosStepSection>

          <IosStepSection
            number="3"
            title="Closure Decision"
            locked={isClosureLocked}
            completedDate={enquiry.closure?.actualDate}
            planDate={enquiry.closure?.planDate}
            formatDisplayDateTime={formatDisplayDateTime}
          >
            <IosOptionGroup
              label="Status"
              value={form.closureStatus}
              disabled={isClosureLocked}
              options={[
                { value: "won", label: "Won" },
                { value: "lost", label: "Lost" },
              ]}
              onSelect={(v) => updateField("closureStatus", v)}
            />

            {form.closureStatus === "lost" && (
              <>
                <IosOptionGroup
                  label="Lost Remark"
                  value={form.lostRemark}
                  disabled={isClosureLocked}
                  options={lostRemarkOptions.filter((item) => item.value)}
                  onSelect={(v) => updateField("lostRemark", v)}
                />

                {form.lostRemark === "others" && (
                  <div className="ios-workflow-field">
                    <label>Other Reason</label>
                    <textarea
                      value={form.lostRemarkOtherText}
                      onChange={(e) =>
                        updateField("lostRemarkOtherText", e.target.value)
                      }
                      placeholder="Enter other reason"
                      disabled={isClosureLocked}
                    />
                  </div>
                )}
              </>
            )}
          </IosStepSection>

          <div className="ios-workflow-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button type="submit">
              Save Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function WorkflowHeader({ enquiry, onClose }) {
  return (
    <div className="workflow-header">
      <div>
        <h2>Update Enquiry Workflow</h2>
        <p>
          {enquiry.companyName} - {enquiry.customerName}
        </p>
      </div>

      <button className="workflow-close" onClick={onClose} type="button">
        ×
      </button>
    </div>
  );
}

function DesktopWorkflowSection({
  stepTitle,
  title,
  locked,
  completedDate,
  planDate,
  formatDisplayDateTime,
  children,
}) {
  return (
    <div className={`workflow-section ${locked ? "workflow-locked" : ""}`}>
      <div className="workflow-step-title">{stepTitle}</div>

      <h3>{title}</h3>

      {locked && (
        <div className="locked-note">
          Completed on {formatDisplayDateTime(completedDate)}
        </div>
      )}

      <label>Plan Date</label>
      <input value={formatDisplayDateTime(planDate)} disabled />

      {children}
    </div>
  );
}

function IosStepSection({
  number,
  title,
  locked,
  completedDate,
  planDate,
  formatDisplayDateTime,
  children,
}) {
  return (
    <div className={`ios-workflow-section ${locked ? "locked" : ""}`}>
      <div className="ios-workflow-step-top">
        <span>{number}</span>
        <div>
          <strong>{title}</strong>
          <p>Plan: {formatDisplayDateTime(planDate)}</p>
        </div>
      </div>

      {locked && (
        <div className="ios-workflow-locked-note">
          Completed on {formatDisplayDateTime(completedDate)}
        </div>
      )}

      {children}
    </div>
  );
}

function IosOptionGroup({ label, options, value, onSelect, disabled }) {
  return (
    <div className="ios-workflow-field">
      <label>{label}</label>

      <div className="ios-workflow-chip-wrap">
        {options.map((item) => {
          const active = value === item.value;

          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              className={`ios-workflow-chip ${active ? "active" : ""}`}
              onClick={() => onSelect(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowUpdate;