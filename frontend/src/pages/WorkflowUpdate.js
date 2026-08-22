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
  {
    value: "material_not_available",
    label: "Material Not Available",
  },
  { value: "others", label: "Others" },
];

const getLostRemarkPlaceholder = (lostRemark) => {
  switch (lostRemark) {
    case "price":
      return "Example: We quoted ₹116/kg, customer expected ₹108/kg.";

    case "delivery":
      return "Example: Customer required delivery in 7 days, while offered delivery was 15 days.";

    case "qty":
      return "Example: Customer required 2 MT, while minimum available quantity was 5 MT.";

    case "quality":
      return "Example: Customer required a different quality/specification than offered.";

    case "payment_terms":
      return "Example: Customer required 60 days credit, while offered terms were 30 days.";

    case "material_not_available":
      return "Example: Required grade/size was not available within the requested delivery period.";

    default:
      return "Enter detailed reason for losing this enquiry.";
  }
};

const WorkflowUpdate = ({
  enquiry,
  onClose,
  refresh,
}) => {
  /* =========================================================
     DATE FORMAT
  ========================================================= */

  const formatDisplayDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  /* =========================================================
     LOCK STATES
  ========================================================= */

  const isFeasibilityLocked =
    enquiry.feasibility?.completed === true;

  const isQuotationLocked =
    enquiry.quotation?.completed === true;

  const isClosureLocked =
    enquiry.closure?.completed === true;

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [form, setForm] = useState({
    feasibilityStatus:
      enquiry.feasibility?.status || "",

    quotationLink:
      enquiry.quotation?.quotationLink || "",

    closureStatus:
      enquiry.closure?.status || "",

    lostRemark:
      enquiry.closure?.lostRemark || "",

    /*
     * Used for predefined Lost reasons:
     *
     * price
     * delivery
     * qty
     * quality
     * payment_terms
     * material_not_available
     */
    lostRemarkText:
      enquiry.closure?.lostRemarkText || "",

    /*
     * Existing field.
     * Used only when Lost Remark = Others.
     */
    lostRemarkOtherText:
      enquiry.closure?.lostRemarkOtherText ||
      "",
  });

  /* =========================================================
     HANDLE CHANGE
  ========================================================= */

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      /* =====================================================
         IF CLOSURE IS NOT LOST

         Clear every Lost-specific field.
      ===================================================== */

      if (
        name === "closureStatus" &&
        value !== "lost"
      ) {
        updated.lostRemark = "";
        updated.lostRemarkText = "";
        updated.lostRemarkOtherText = "";
      }

      /* =====================================================
         LOST REASON CHANGED

         Others:
         → uses lostRemarkOtherText

         Every predefined reason:
         → uses lostRemarkText
      ===================================================== */

      if (name === "lostRemark") {
        if (value === "others") {
          updated.lostRemarkText = "";
        } else {
          updated.lostRemarkOtherText = "";
        }

        /*
         * When changing the reason,
         * clear previous predefined remark also
         * so Price remark does not accidentally
         * remain when Delivery is selected.
         */
        if (
          value !== "others" &&
          value !== prev.lostRemark
        ) {
          updated.lostRemarkText = "";
        }
      }

      return updated;
    });
  };

  /* =========================================================
     PWA HELPER
  ========================================================= */

  const updateField = (
    name,
    value
  ) => {
    handleChange({
      target: {
        name,
        value,
      },
    });
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};

    /* =====================================================
       FEASIBILITY
    ===================================================== */

    if (!isFeasibilityLocked) {
      if (
        form.feasibilityStatus &&
        form.feasibilityStatus !==
          enquiry.feasibility?.status
      ) {
        payload.feasibility = {
          status:
            form.feasibilityStatus,

          completed: true,
        };
      }
    }

    /* =====================================================
       QUOTATION
    ===================================================== */

    if (!isQuotationLocked) {
      if (
        form.quotationLink.trim() &&
        form.quotationLink !==
          (
            enquiry.quotation
              ?.quotationLink ||
            ""
          )
      ) {
        payload.quotation = {
          quotationLink:
            form.quotationLink.trim(),

          completed: true,
        };
      }
    }

    /* =====================================================
       CLOSURE
    ===================================================== */

    if (!isClosureLocked) {
      if (
        form.closureStatus &&
        form.closureStatus !==
          enquiry.closure?.status
      ) {
        /* ===================================================
           LOST REASON REQUIRED
        =================================================== */

        if (
          form.closureStatus ===
            "lost" &&
          !form.lostRemark
        ) {
          alert(
            "Please select lost remark"
          );

          return;
        }

        /* ===================================================
           PREDEFINED LOST REASON DETAIL REQUIRED
        =================================================== */

        if (
          form.closureStatus ===
            "lost" &&
          form.lostRemark &&
          form.lostRemark !==
            "others" &&
          !form.lostRemarkText.trim()
        ) {
          alert(
            "Please enter remark details for the selected lost reason"
          );

          return;
        }

        /* ===================================================
           OTHERS DETAIL REQUIRED
        =================================================== */

        if (
          form.closureStatus ===
            "lost" &&
          form.lostRemark ===
            "others" &&
          !form.lostRemarkOtherText.trim()
        ) {
          alert(
            "Please enter other lost remark"
          );

          return;
        }

        /* ===================================================
           BUILD CLOSURE PAYLOAD
        =================================================== */

        payload.closure = {
          status:
            form.closureStatus,

          lostRemark:
            form.closureStatus ===
            "lost"
              ? form.lostRemark
              : undefined,

          /*
           * Predefined reason detail.
           */
          lostRemarkText:
            form.closureStatus ===
              "lost" &&
            form.lostRemark &&
            form.lostRemark !==
              "others"
              ? form.lostRemarkText.trim()
              : undefined,

          /*
           * Existing Others detail.
           */
          lostRemarkOtherText:
            form.closureStatus ===
              "lost" &&
            form.lostRemark ===
              "others"
              ? form.lostRemarkOtherText.trim()
              : undefined,

          completed: true,
        };
      }
    }

    /* =====================================================
       NOTHING TO SAVE
    ===================================================== */

    if (
      Object.keys(payload).length ===
      0
    ) {
      alert(
        "Please complete at least one workflow step before saving."
      );

      return;
    }

    /* =====================================================
       API
    ===================================================== */

    try {
      await updateEnquiryWorkflow(
        enquiry._id,
        payload
      );

      alert(
        "Workflow updated successfully"
      );

      refresh();
      onClose();
    } catch (error) {
      alert(
        error.response?.data
          ?.message ||
          "Failed to update workflow"
      );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="workflow-overlay">
      {/* =====================================================
          DESKTOP WEBSITE
      ====================================================== */}

      <div className="workflow-card workflow-desktop-card">
        <WorkflowHeader
          enquiry={enquiry}
          onClose={onClose}
        />

        <form
          onSubmit={handleSubmit}
        >
          <div className="workflow-grid">
            {/* =================================================
                STEP 1
            ================================================= */}

            <DesktopWorkflowSection
              stepTitle="Step 1 – Feasible Review"
              title="Feasible"
              locked={
                isFeasibilityLocked
              }
              completedDate={
                enquiry.feasibility
                  ?.actualDate
              }
              planDate={
                enquiry.feasibility
                  ?.planDate
              }
              formatDisplayDateTime={
                formatDisplayDateTime
              }
            >
              <label>
                Status
              </label>

              <select
                name="feasibilityStatus"
                value={
                  form.feasibilityStatus
                }
                onChange={
                  handleChange
                }
                disabled={
                  isFeasibilityLocked
                }
              >
                <option value="">
                  Select Status
                </option>

                <option value="feasible">
                  Feasible
                </option>

                <option value="not_feasible">
                  Not Feasible
                </option>
              </select>
            </DesktopWorkflowSection>

            {/* =================================================
                STEP 2
            ================================================= */}

            <DesktopWorkflowSection
              stepTitle="Step 2 – Quotation Follow-up"
              title="Quotation"
              locked={
                isQuotationLocked
              }
              completedDate={
                enquiry.quotation
                  ?.actualDate
              }
              planDate={
                enquiry.quotation
                  ?.planDate
              }
              formatDisplayDateTime={
                formatDisplayDateTime
              }
            >
              <label>
                Quotation Link
              </label>

              <input
                name="quotationLink"
                value={
                  form.quotationLink
                }
                onChange={
                  handleChange
                }
                placeholder="Paste quotation link"
                disabled={
                  isQuotationLocked
                }
              />
            </DesktopWorkflowSection>

            {/* =================================================
                STEP 3
            ================================================= */}

            <DesktopWorkflowSection
              stepTitle="Step 3 – Closure Decision"
              title="Closure"
              locked={
                isClosureLocked
              }
              completedDate={
                enquiry.closure
                  ?.actualDate
              }
              planDate={
                enquiry.closure
                  ?.planDate
              }
              formatDisplayDateTime={
                formatDisplayDateTime
              }
            >
              <label>
                Status
              </label>

              <select
                name="closureStatus"
                value={
                  form.closureStatus
                }
                onChange={
                  handleChange
                }
                disabled={
                  isClosureLocked
                }
              >
                <option value="">
                  Select Status
                </option>

                <option value="won">
                  Won
                </option>

                <option value="lost">
                  Lost
                </option>
              </select>

              {/* ===============================================
                  LOST FLOW
              =============================================== */}

              {form.closureStatus ===
                "lost" && (
                <>
                  <label>
                    Lost Remark
                  </label>

                  <select
                    name="lostRemark"
                    value={
                      form.lostRemark
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      isClosureLocked
                    }
                    required
                  >
                    {lostRemarkOptions.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  {/* ===========================================
                      PREDEFINED LOST REASON DETAIL
                  =========================================== */}

                  {form.lostRemark &&
                    form.lostRemark !==
                      "others" && (
                      <div className="workflow-lost-detail-field">
                        <label>
                          Remark Details
                          <span className="workflow-required">
                            *
                          </span>
                        </label>

                        <textarea
                          name="lostRemarkText"
                          value={
                            form.lostRemarkText
                          }
                          onChange={
                            handleChange
                          }
                          placeholder={getLostRemarkPlaceholder(
                            form.lostRemark
                          )}
                          disabled={
                            isClosureLocked
                          }
                          required
                          maxLength={
                            2000
                          }
                        />

                        <small className="workflow-lost-detail-count">
                          {
                            form
                              .lostRemarkText
                              .length
                          }
                          /2000
                        </small>
                      </div>
                    )}

                  {/* ===========================================
                      OTHERS
                  =========================================== */}

                  {form.lostRemark ===
                    "others" && (
                    <div className="workflow-lost-detail-field">
                      <label>
                        Other Reason
                        <span className="workflow-required">
                          *
                        </span>
                      </label>

                      <textarea
                        name="lostRemarkOtherText"
                        value={
                          form.lostRemarkOtherText
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Enter other reason"
                        disabled={
                          isClosureLocked
                        }
                        required
                        maxLength={
                          2000
                        }
                      />

                      <small className="workflow-lost-detail-count">
                        {
                          form
                            .lostRemarkOtherText
                            .length
                        }
                        /2000
                      </small>
                    </div>
                  )}
                </>
              )}
            </DesktopWorkflowSection>
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="workflow-actions">
            <button
              type="button"
              className="cancel-workflow"
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-workflow"
            >
              Save Update
            </button>
          </div>
        </form>
      </div>

      {/* =====================================================
          iOS / PWA UI
      ====================================================== */}

      <div className="ios-workflow-card">
        <div className="ios-workflow-header">
          <div>
            <h2>
              Update Workflow
            </h2>

            <p>
              {
                enquiry.companyName
              }{" "}
              ·{" "}
              {
                enquiry.customerName
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            ×
          </button>
        </div>

        <form
          className="ios-workflow-body"
          onSubmit={
            handleSubmit
          }
        >
          {/* =================================================
              STEP 1
          ================================================= */}

          <IosStepSection
            number="1"
            title="Feasible Review"
            locked={
              isFeasibilityLocked
            }
            completedDate={
              enquiry.feasibility
                ?.actualDate
            }
            planDate={
              enquiry.feasibility
                ?.planDate
            }
            formatDisplayDateTime={
              formatDisplayDateTime
            }
          >
            <IosOptionGroup
              label="Status"
              value={
                form.feasibilityStatus
              }
              disabled={
                isFeasibilityLocked
              }
              options={[
                {
                  value:
                    "feasible",

                  label:
                    "Feasible",
                },

                {
                  value:
                    "not_feasible",

                  label:
                    "Not Feasible",
                },
              ]}
              onSelect={(v) =>
                updateField(
                  "feasibilityStatus",
                  v
                )
              }
            />
          </IosStepSection>

          {/* =================================================
              STEP 2
          ================================================= */}

          <IosStepSection
            number="2"
            title="Quotation Follow-up"
            locked={
              isQuotationLocked
            }
            completedDate={
              enquiry.quotation
                ?.actualDate
            }
            planDate={
              enquiry.quotation
                ?.planDate
            }
            formatDisplayDateTime={
              formatDisplayDateTime
            }
          >
            <div className="ios-workflow-field">
              <label>
                Quotation Link
              </label>

              <input
                value={
                  form.quotationLink
                }
                onChange={(e) =>
                  updateField(
                    "quotationLink",
                    e.target.value
                  )
                }
                placeholder="Paste quotation link"
                disabled={
                  isQuotationLocked
                }
              />
            </div>
          </IosStepSection>

          {/* =================================================
              STEP 3
          ================================================= */}

          <IosStepSection
            number="3"
            title="Closure Decision"
            locked={
              isClosureLocked
            }
            completedDate={
              enquiry.closure
                ?.actualDate
            }
            planDate={
              enquiry.closure
                ?.planDate
            }
            formatDisplayDateTime={
              formatDisplayDateTime
            }
          >
            <IosOptionGroup
              label="Status"
              value={
                form.closureStatus
              }
              disabled={
                isClosureLocked
              }
              options={[
                {
                  value: "won",
                  label: "Won",
                },

                {
                  value: "lost",
                  label: "Lost",
                },
              ]}
              onSelect={(v) =>
                updateField(
                  "closureStatus",
                  v
                )
              }
            />

            {/* ===============================================
                LOST
            =============================================== */}

            {form.closureStatus ===
              "lost" && (
              <>
                <IosOptionGroup
                  label="Lost Remark"
                  value={
                    form.lostRemark
                  }
                  disabled={
                    isClosureLocked
                  }
                  options={lostRemarkOptions.filter(
                    (item) =>
                      item.value
                  )}
                  onSelect={(v) =>
                    updateField(
                      "lostRemark",
                      v
                    )
                  }
                />

                {/* ===========================================
                    PREDEFINED LOST REMARK DETAILS
                =========================================== */}

                {form.lostRemark &&
                  form.lostRemark !==
                    "others" && (
                    <div className="ios-workflow-field ios-workflow-lost-detail">
                      <label>
                        Remark Details
                        <span className="workflow-required">
                          *
                        </span>
                      </label>

                      <textarea
                        value={
                          form.lostRemarkText
                        }
                        onChange={(e) =>
                          updateField(
                            "lostRemarkText",
                            e.target.value
                          )
                        }
                        placeholder={getLostRemarkPlaceholder(
                          form.lostRemark
                        )}
                        disabled={
                          isClosureLocked
                        }
                        required
                        maxLength={
                          2000
                        }
                      />

                      <small className="workflow-lost-detail-count">
                        {
                          form
                            .lostRemarkText
                            .length
                        }
                        /2000
                      </small>
                    </div>
                  )}

                {/* ===========================================
                    OTHERS
                =========================================== */}

                {form.lostRemark ===
                  "others" && (
                  <div className="ios-workflow-field ios-workflow-lost-detail">
                    <label>
                      Other Reason
                      <span className="workflow-required">
                        *
                      </span>
                    </label>

                    <textarea
                      value={
                        form.lostRemarkOtherText
                      }
                      onChange={(e) =>
                        updateField(
                          "lostRemarkOtherText",
                          e.target.value
                        )
                      }
                      placeholder="Enter other reason"
                      disabled={
                        isClosureLocked
                      }
                      required
                      maxLength={
                        2000
                      }
                    />

                    <small className="workflow-lost-detail-count">
                      {
                        form
                          .lostRemarkOtherText
                          .length
                      }
                      /2000
                    </small>
                  </div>
                )}
              </>
            )}
          </IosStepSection>

          {/* =================================================
              PWA ACTIONS
          ================================================= */}

          <div className="ios-workflow-actions">
            <button
              type="button"
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="submit"
            >
              Save Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   DESKTOP HEADER
========================================================= */

function WorkflowHeader({
  enquiry,
  onClose,
}) {
  return (
    <div className="workflow-header">
      <div>
        <h2>
          Update Enquiry Workflow
        </h2>

        <p>
          {
            enquiry.companyName
          }{" "}
          -{" "}
          {
            enquiry.customerName
          }
        </p>
      </div>

      <button
        className="workflow-close"
        onClick={
          onClose
        }
        type="button"
      >
        ×
      </button>
    </div>
  );
}

/* =========================================================
   DESKTOP SECTION
========================================================= */

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
    <div
      className={`workflow-section ${
        locked
          ? "workflow-locked"
          : ""
      }`}
    >
      <div className="workflow-step-title">
        {stepTitle}
      </div>

      <h3>
        {title}
      </h3>

      {locked && (
        <div className="locked-note">
          Completed on{" "}
          {formatDisplayDateTime(
            completedDate
          )}
        </div>
      )}

      <label>
        Plan Date
      </label>

      <input
        value={formatDisplayDateTime(
          planDate
        )}
        disabled
        readOnly
      />

      {children}
    </div>
  );
}

/* =========================================================
   IOS / PWA SECTION
========================================================= */

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
    <div
      className={`ios-workflow-section ${
        locked
          ? "locked"
          : ""
      }`}
    >
      <div className="ios-workflow-step-top">
        <span>
          {number}
        </span>

        <div>
          <strong>
            {title}
          </strong>

          <p>
            Plan:{" "}
            {formatDisplayDateTime(
              planDate
            )}
          </p>
        </div>
      </div>

      {locked && (
        <div className="ios-workflow-locked-note">
          Completed on{" "}
          {formatDisplayDateTime(
            completedDate
          )}
        </div>
      )}

      {children}
    </div>
  );
}

/* =========================================================
   IOS OPTION GROUP
========================================================= */

function IosOptionGroup({
  label,
  options,
  value,
  onSelect,
  disabled,
}) {
  return (
    <div className="ios-workflow-field">
      <label>
        {label}
      </label>

      <div className="ios-workflow-chip-wrap">
        {options.map(
          (item) => {
            const active =
              value ===
              item.value;

            return (
              <button
                key={
                  item.value
                }
                type="button"
                disabled={
                  disabled
                }
                className={`ios-workflow-chip ${
                  active
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  onSelect(
                    item.value
                  )
                }
              >
                {
                  item.label
                }
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

export default WorkflowUpdate;