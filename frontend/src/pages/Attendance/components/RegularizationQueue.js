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
}) => {
  /* =========================================================
     EMPTY QUEUE
  ========================================================= */

  if (
    !Array.isArray(items) ||
    items.length === 0
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
            Regularization Requests
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
              attendance?._id ||
              `${attendance?.employeeName || "employee"}-${attendance?.attendanceDate || ""}`;

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
                      {formatDate(
                        attendance
                          ?.attendanceDate
                      )}
                    </p>
                  </div>

                  <span>
                    Check In +
                    Check Out
                  </span>
                </div>

                {/* ===========================================
                    REQUEST DETAILS
                =========================================== */}

                <div className="regularization-request-info">
                  <p>
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

                  <p>
                    <b>
                      Reason:
                    </b>{" "}
                    {request
                      ?.reason ||
                      "-"}
                  </p>

                  {request
                    ?.requestedAt ? (
                    <p>
                      <b>
                        Requested At:
                      </b>{" "}
                      {formatTime(
                        request
                          .requestedAt
                      )}
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