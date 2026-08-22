import React from "react";

import {
  readableDate,
} from "../utils/attendanceHelpers";

const RegularizationModal = ({
  state,
  setState,
  onSubmit,
}) => {
  /* =========================================================
     MODAL CLOSED
  ========================================================= */

  if (!state?.open) {
    return null;
  }

  /* =========================================================
     SAFE VALUES
  ========================================================= */

  const attendance =
    state?.attendance ||
    null;

  const currentStatus =
    attendance
      ?.regularization
      ?.status ||
    "New request";

  const checkInValue =
    state
      ?.requestedCheckIn ||
    "";

  const checkOutValue =
    state
      ?.requestedCheckOut ||
    "";

  const reasonValue =
    state?.reason ||
    "";

  const submitting =
    Boolean(
      state?.submitting
    );

  /* =========================================================
     CLOSE MODAL

     Do not close while request
     is being submitted.
  ========================================================= */

  const closeModal = () => {
    if (submitting) {
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
     FORM CHANGE HELPERS
  ========================================================= */

  const updateField = (
    field,
    value
  ) => {
    setState(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="timesheet-modal-overlay"
      role="presentation"
      onMouseDown={
        closeModal
      }
    >
      <div
        className="timesheet-modal regularize-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Attendance regularization"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="modal-header">
          <div>
            <span className="attendance-eyebrow">
              ATTENDANCE
              CORRECTION
            </span>

            <h3>
              Attendance
              Regularization
            </h3>

            <p>
              {readableDate(
                state.date
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeModal
            }
            disabled={
              submitting
            }
            aria-label="Close regularization"
          >
            ×
          </button>
        </div>

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          className="regularize-form"
          onSubmit={
            onSubmit
          }
        >
          {/* =================================================
              PREMIUM SUMMARY
          ================================================= */}

          <div className="regularize-premium-info">
            <div>
              <span>
                CORRECTION
              </span>

              <strong>
                Check In +
                Check Out
              </strong>
            </div>

            <div>
              <span>
                STATUS
              </span>

              <strong>
                {String(
                  currentStatus
                )
                  .replaceAll(
                    "_",
                    " "
                  )
                  .replace(
                    /\b\w/g,
                    (
                      character
                    ) =>
                      character.toUpperCase()
                  )}
              </strong>
            </div>
          </div>

          {/* =================================================
              EXPLANATION

              IMPORTANT:
              User ALWAYS corrects both
              Check In and Check Out.

              This also works when both
              existing punches already exist.
          ================================================= */}

          <div className="regularize-unified-note">
            <strong>
              Complete time
              correction
            </strong>

            <p>
              Enter the correct
              Check In and Check
              Out times together.
              This can be used for
              late Check In, early
              Check Out, missing
              punch or incorrect
              attendance timing.
            </p>
          </div>

          {/* =================================================
              CHECK IN + CHECK OUT

              No separate request type.
          ================================================= */}

          <div className="regularize-time-grid">
            <label className="regularize-field">
              <span>
                Check In Time
              </span>

              <input
                type="time"
                value={
                  checkInValue
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "requestedCheckIn",
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  submitting
                }
                required
              />

              <small className="regularize-field-hint">
                Correct start
                time for this
                attendance date.
              </small>
            </label>

            <label className="regularize-field">
              <span>
                Check Out Time
              </span>

              <input
                type="time"
                value={
                  checkOutValue
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "requestedCheckOut",
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  submitting
                }
                required
              />

              <small className="regularize-field-hint">
                Correct end time
                for this
                attendance date.
              </small>
            </label>
          </div>

          {/* =================================================
              REASON
          ================================================= */}

          <label className="regularize-field">
            <span>
              Reason
            </span>

            <textarea
              rows="4"
              value={
                reasonValue
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
              placeholder="Example: I reached office late due to a customer visit, and the correct attendance timing is entered above."
              maxLength={
                500
              }
              disabled={
                submitting
              }
              required
            />

            <div className="regularize-reason-footer">
              <small>
                Explain why the
                attendance time
                needs correction.
              </small>

              <small>
                {
                  reasonValue
                    .length
                }
                /500
              </small>
            </div>
          </label>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="regularize-actions">
            <button
              className="regularize-cancel-btn"
              type="button"
              disabled={
                submitting
              }
              onClick={
                closeModal
              }
            >
              Cancel
            </button>

            <button
              className="regularize-submit-btn"
              type="submit"
              disabled={
                submitting
              }
            >
              {submitting
                ? "Submitting..."
                : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegularizationModal;