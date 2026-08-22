import React from "react";

const LeaveModal = ({
  state,
  setState,
  summary,
  onSubmit,
}) => {
  /* =========================================================
     CLOSED
  ========================================================= */

  if (!state?.open) {
    return null;
  }

  /* =========================================================
     SAFE BALANCE
  ========================================================= */

  const balance =
    summary?.balance ||
    {};

  const remaining =
    balance?.paidLeaveRemaining ??
    balance?.remaining ??
    "-";

  const used =
    balance?.used ??
    balance?.paidLeaveUsed ??
    "-";

  const pending =
    balance?.pending ??
    balance?.pendingLeave ??
    "-";

  /* =========================================================
     SAFE STATE VALUES
  ========================================================= */

  const leaveType =
    state?.leaveType ||
    "paid_leave";

  const duration =
    state?.duration ||
    "full_day";

  const fromDate =
    state?.fromDate ||
    "";

  const toDate =
    state?.toDate ||
    "";

  const reason =
    state?.reason ||
    "";

  /* =========================================================
     HELPERS
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
      (
        previous
      ) => ({
        ...previous,
        [field]:
          value,
      })
    );
  };

  const closeModal = () => {
    if (
      typeof setState !==
      "function"
    ) {
      return;
    }

    setState(
      (
        previous
      ) => ({
        ...previous,
        open: false,
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
        className="timesheet-modal attendance-leave-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Apply leave"
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
              LEAVE REQUEST
            </span>

            <h3>
              Apply Leave
            </h3>

            <p>
              Submit leave request
              for approval.
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeModal
            }
            aria-label="Close leave request"
          >
            ×
          </button>
        </div>

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          className="attendance-leave-form"
          onSubmit={
            onSubmit
          }
        >
          {/* =================================================
              BALANCE
          ================================================= */}

          <div className="attendance-leave-balance-banner">
            <div>
              <span>
                Remaining
              </span>

              <strong>
                {
                  remaining
                }
              </strong>
            </div>

            <div>
              <span>
                Used
              </span>

              <strong>
                {used}
              </strong>
            </div>

            <div>
              <span>
                Pending
              </span>

              <strong>
                {pending}
              </strong>
            </div>
          </div>

          {/* =================================================
              LEAVE DETAILS
          ================================================= */}

          <div className="attendance-leave-grid">
            {/* LEAVE TYPE */}

            <label>
              <span>
                Leave Type
              </span>

              <select
                value={
                  leaveType
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "leaveType",
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="paid_leave">
                  Paid Leave
                </option>

                <option value="loss_of_pay">
                  Loss of Pay
                </option>
              </select>
            </label>

            {/* DURATION */}

            <label>
              <span>
                Duration
              </span>

              <select
                value={
                  duration
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "duration",
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="full_day">
                  Full Day
                </option>

                <option value="first_half">
                  First Half
                </option>

                <option value="second_half">
                  Second Half
                </option>
              </select>
            </label>

            {/* FROM DATE */}

            <label>
              <span>
                From
              </span>

              <input
                type="date"
                required
                value={
                  fromDate
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "fromDate",
                    event
                      .target
                      .value
                  )
                }
              />
            </label>

            {/* TO DATE */}

            <label>
              <span>
                To
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
              />
            </label>
          </div>

          {/* =================================================
              REASON
          ================================================= */}

          <label className="attendance-leave-reason">
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
              placeholder="Enter the reason for leave..."
            />

            <div className="attendance-leave-reason-footer">
              <small>
                Reason is required.
              </small>

              <small>
                {
                  reason.length
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
              onClick={
                closeModal
              }
            >
              Cancel
            </button>

            <button
              className="attendance-leave-submit-btn"
              type="submit"
            >
              Apply Leave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveModal;