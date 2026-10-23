import React from "react";
import useAttendanceDialog from "../hooks/useAttendanceDialog";
import { getDateKey } from "../utils/attendanceHelpers";

const WfhModal = ({
  state,
  setState,
  onSubmit,
}) => {
  const dialog = useAttendanceDialog(state?.open, state?.submitting, () => setState(previous => ({ ...previous, open: false })));
  /* =========================================================
     CLOSED
  ========================================================= */

  if (!state?.open) {
    return null;
  }

  /* =========================================================
     SAFE VALUES
  ========================================================= */

  const fromDate =
    state?.fromDate || "";

  const toDate =
    state?.toDate || "";

  const reason =
    state?.reason || "";

  const submitting =
    Boolean(
      state?.submitting
    );

  /* =========================================================
     UPDATE FIELD
  ========================================================= */

  const updateField = (
    field,
    value
  ) => {
    if (
      typeof setState !==
      "function"
    ) {
      return;
    }

    setState(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (
      submitting ||
      typeof setState !==
        "function"
    ) {
      return;
    }

    setState(
      (previous) => ({
        ...previous,
        open: false,
      })
    );
  };

  /* =========================================================
     FROM DATE CHANGE

     If user moves From Date beyond existing To Date,
     automatically align To Date with new From Date.
  ========================================================= */

  const handleFromDateChange = (
    event
  ) => {
    const value =
      event.target.value;

    setState(
      (previous) => {
        const previousToDate =
          previous?.toDate ||
          "";

        return {
          ...previous,

          fromDate:
            value,

          toDate:
            previousToDate &&
            previousToDate <
              value
              ? value
              : previousToDate,
        };
      }
    );
  };

  /* =========================================================
     SUBMIT

     Keep submission logic in AttendancePage.
     This component only handles UI.
  ========================================================= */

  const handleSubmit = (
    event
  ) => {
    if (
      typeof onSubmit ===
      "function"
    ) {
      onSubmit(event);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="timesheet-modal-overlay attendance-wfh-modal-overlay"
      role="presentation"
      onMouseDown={
        closeModal
      }
    >
      <div
        className="timesheet-modal attendance-wfh-modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-wfh-title"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="modal-header attendance-wfh-modal-header">
          <div>
            <span className="attendance-eyebrow">
              WORK MODE REQUEST
            </span>

            <h3 id="attendance-wfh-title">
              Work From Home
            </h3>

            <p>MD Sir reviews your request. WFH applies only to the approved dates.</p>
          </div>

          <button
            type="button"
            onClick={
              closeModal
            }
            disabled={
              submitting
            }
            aria-label="Close Work From Home request"
          >
            ×
          </button>
        </div>

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          className="attendance-wfh-form"
          onSubmit={
            handleSubmit
          }
        >
          {/* =================================================
              INFORMATION
          ================================================= */}

          {state.error && <p className="att-request-error" role="alert">{state.error}</p>}
          <div className="attendance-wfh-info-banner">
            <span
              aria-hidden="true"
            >
              ⌂
            </span>

            <div>
              <strong>
                WFH Request
              </strong>

              <p>
                Continue to check in and out as usual. Your normal work mode resumes after the approved dates.
              </p>
            </div>
          </div>

          {/* =================================================
              DATE RANGE
          ================================================= */}

          <div className="attendance-wfh-form-grid">
            <label>
              <span>
                From Date
              </span>

              <input
                type="date"
                min={getDateKey(new Date())}
                required
                value={
                  fromDate
                }
                onChange={
                  handleFromDateChange
                }
                disabled={
                  submitting
                }
              />
            </label>

            <label>
              <span>
                To Date
              </span>

              <input
                type="date"
                required
                value={
                  toDate
                }
                min={
                  fromDate ||
                  undefined
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "toDate",
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  submitting
                }
              />
            </label>
          </div>

          {/* =================================================
              REASON
          ================================================= */}

          <label className="attendance-wfh-reason-field">
            <span>
              Reason
            </span>

            <textarea
              required
              rows="4"
              maxLength={
                500
              }
              value={
                reason
              }
              onChange={(
                event
              ) =>
                updateField(
                  "reason",
                  event
                    .target
                    .value
                )
              }
              disabled={
                submitting
              }
              placeholder="Enter reason for Work From Home..."
            />

            <small>
              {reason.length}
              /500
            </small>
          </label>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="regularize-actions attendance-wfh-actions">
            <button
              className="regularize-cancel-btn"
              type="button"
              onClick={
                closeModal
              }
              disabled={
                submitting
              }
            >
              Cancel
            </button>

            <button
              className="attendance-wfh-submit-btn"
              type="submit"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Submitting..."
                : "Submit WFH"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WfhModal;