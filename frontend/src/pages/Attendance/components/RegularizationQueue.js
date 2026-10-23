import React from "react";

import {
  formatDate,
  formatTime,
} from "../utils/attendanceHelpers";

const RegularizationQueue = ({
  items = [],
  actionLoading,
  onApprove,
  onReject,
  requestError = "",
  requestNotice = "",
}) => {
  /* =========================================================
     EMPTY QUEUE
  ========================================================= */

  if (
    !Array.isArray(items) ||
    (items.length === 0 && !requestError && !requestNotice)
  ) {
    return null;
  }

  /* =========================================================
     SAFE HANDLERS
  ========================================================= */

  const handleApprove = (
    attendance
  ) => {
    if (
      typeof onApprove ===
      "function"
    ) {
      onApprove(
        attendance
      );
    }
  };

  const handleReject = (
    attendance
  ) => {
    if (
      typeof onReject ===
      "function"
    ) {
      onReject(
        attendance
      );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="attendance-admin-card">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-heading">
        <div>
          <span className="attendance-eyebrow">
            APPROVAL QUEUE
          </span>

          <h3>
            Attendance Requests
          </h3>
        </div>

        <span>
          {items.length}{" "}
          {items.length === 1
            ? "pending"
            : "pending"}
        </span>
      </div>

      {/* =====================================================
          REQUESTS
      ====================================================== */}

      {requestError && <p className="att-request-error" role="alert">{requestError}</p>}
      {requestNotice && <p className="att-request-notice" role="status">{requestNotice}</p>}
      <div className="regularization-request-grid">
        {items.map(
          (
            attendance
          ) => {
            const request =
              attendance
                ?.regularization ||
              {};

            const requestId =
              `${attendance.requestKind || "regularization"}:${attendance?._id || `${attendance?.employeeName || "employee"}-${attendance?.attendanceDate || ""}`}`;

            const isLoading =
              actionLoading ===
              attendance?._id;

            return (
              <article
                className="regularization-request-card"
                key={
                  requestId
                }
              >
                {/* ===========================================
                    TOP
                =========================================== */}

                <div className="regularization-request-top">
                  <div>
                    <h4>
                      {attendance
                        ?.employeeName ||
                        attendance
                          ?.employeeId
                          ?.name ||
                        "-"}
                    </h4>

                    <p>
                      {formatDate(attendance.requestKind ? attendance.fromDate : attendance.attendanceDate)}
                      {attendance.requestKind && attendance.toDate !== attendance.fromDate ? ` – ${formatDate(attendance.toDate)}` : ""}
                    </p>
                  </div>

                  <span>
                    {attendance.requestKind === "work-from-home" ? "Work From Home" : attendance.requestKind === "short-leave" ? "Short Leave" : attendance.requestKind === "leave" ? (attendance.leaveType === "loss_of_pay" ? "Loss of Pay" : "Paid Leave") : "Check In + Check Out"}
                  </span>
                </div>

                {/* ===========================================
                    REQUEST DETAILS
                =========================================== */}

                <div className="regularization-request-info">
                  {!attendance.requestKind && <><p>
                    <b>
                      Requested In:
                    </b>{" "}
                    {formatTime(
                      request
                        ?.requestedCheckIn
                    )}
                  </p>

                  <p>
                    <b>
                      Requested Out:
                    </b>{" "}
                    {formatTime(
                      request
                        ?.requestedCheckOut
                    )}
                  </p>

                  </>}
                  <p>
                    <b>
                      Reason:
                    </b>{" "}
                    {(attendance.requestKind ? attendance.reason : request?.reason) ||
                      "-"}
                  </p>

                  {attendance.requestKind && attendance.duration && <p><b>Duration:</b> {attendance.duration.replaceAll("_", " ")}</p>}
                  {(attendance.requestKind ? attendance.appliedAt || attendance.createdAt : request?.requestedAt) ? (
                    <p>
                      <b>
                        Requested At:
                      </b>{" "}
                      {formatTime(attendance.requestKind ? attendance.appliedAt || attendance.createdAt : request.requestedAt)}
                    </p>
                  ) : null}
                </div>

                {/* ===========================================
                    ACTIONS
                =========================================== */}

                <div className="regularization-request-actions">
                  <button
                    className="regularization-approve-btn"
                    type="button"
                    disabled={
                      isLoading
                    }
                    onClick={() =>
                      handleApprove(
                        attendance
                      )
                    }
                  >
                    {isLoading
                      ? "Processing..."
                      : "Approve"}
                  </button>

                  <button
                    className="regularization-reject-btn"
                    type="button"
                    disabled={
                      isLoading
                    }
                    onClick={() =>
                      handleReject(
                        attendance
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          }
        )}
      </div>
    </section>
  );
};

export default RegularizationQueue;