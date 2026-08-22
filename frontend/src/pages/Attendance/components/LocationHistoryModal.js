import React, {
  useMemo,
} from "react";

import {
  formatTime,
  pointLabel,
  pointMap,
  pointTime,
  readableDate,
} from "../utils/attendanceHelpers";

const LocationHistoryModal = ({
  state,
  onClose,
}) => {
  /* =========================================================
     SAFE / SORTED CHECKPOINTS

     IMPORTANT:
     Hooks must always run before any conditional return.
  ========================================================= */

  const checkpoints =
    useMemo(() => {
      const list =
        Array.isArray(
          state?.checkpoints
        )
          ? state.checkpoints
          : [];

      return [...list].sort(
        (
          first,
          second
        ) => {
          const firstTime =
            new Date(
              pointTime(
                first
              ) || 0
            ).getTime();

          const secondTime =
            new Date(
              pointTime(
                second
              ) || 0
            ).getTime();

          return (
            firstTime -
            secondTime
          );
        }
      );
    }, [
      state?.checkpoints,
    ]);

  /* =========================================================
     MODAL CLOSED

     Keep this AFTER useMemo.
  ========================================================= */

  if (!state?.open) {
    return null;
  }

  /* =========================================================
     SELECTED EMPLOYEE
  ========================================================= */

  const employeeName =
    state?.employee?.name ||
    state?.employee?.employeeName ||
    state?.employee?.email ||
    "Employee";

  /* =========================================================
     SELECTED DATE

     Example:

     Click 19 August
     state.dateKey = 2026-08-19

     This modal shows only that selected date.
  ========================================================= */

  const selectedDate =
    state?.dateKey || "";

  const selectedDateLabel =
    selectedDate
      ? readableDate(
          selectedDate
        )
      : "-";

  /* =========================================================
     LATEST CHECKPOINT
  ========================================================= */

  const latestCheckpoint =
    checkpoints.length
      ? checkpoints[
          checkpoints.length -
            1
        ]
      : null;

  const latestTime =
    latestCheckpoint
      ? formatTime(
          pointTime(
            latestCheckpoint
          )
        )
      : "-";

  const latestLocation =
    latestCheckpoint
      ? pointLabel(
          latestCheckpoint
        )
      : "No checkpoint";

  const latestMapLink =
    latestCheckpoint
      ? pointMap(
          latestCheckpoint
        )
      : "";

  /* =========================================================
     CLOSE HANDLER
  ========================================================= */

  const closeModal = () => {
    if (
      typeof onClose ===
      "function"
    ) {
      onClose();
    }
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
        className="timesheet-modal att-location-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Location history for ${employeeName} on ${selectedDateLabel}`}
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="modal-header">
          <div>
            <span className="attendance-eyebrow">
              LOCATION JOURNEY
            </span>

            <h3>
              Location History
            </h3>

            <p>
              {employeeName}
              {" · "}
              {selectedDateLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeModal
            }
            aria-label="Close location history"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="modal-body">
          {/* SUMMARY */}

          <div className="att-location-history-summary">
            <div className="att-location-history-summary-main">
              <span>
                SELECTED DATE
              </span>

              <strong>
                {
                  selectedDateLabel
                }
              </strong>

              <small>
                This journey contains
                only checkpoints saved
                for this attendance
                date.
              </small>
            </div>

            <div className="att-location-history-summary-stats">
              <div>
                <span>
                  CHECKPOINTS
                </span>

                <strong>
                  {
                    checkpoints.length
                  }
                </strong>
              </div>

              <div>
                <span>
                  LATEST
                </span>

                <strong>
                  {
                    latestTime
                  }
                </strong>
              </div>
            </div>
          </div>

          {/* LATEST LOCATION CARD */}

          {!state?.loading &&
          !state?.error &&
          latestCheckpoint ? (
            <div className="att-location-latest-card">
              <div>
                <span>
                  CURRENT / LATEST
                  LOCATION
                </span>

                <strong>
                  {
                    latestLocation
                  }
                </strong>

                <small>
                  Last checkpoint at{" "}
                  {
                    latestTime
                  }
                </small>
              </div>

              {latestMapLink ? (
                <a
                  href={
                    latestMapLink
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="att-location-latest-map"
                >
                  Open Map
                </a>
              ) : null}
            </div>
          ) : null}

          {/* LOADING */}

          {state?.loading ? (
            <div className="att-location-history-empty">
              <div className="att-location-loading-dot" />

              <strong>
                Loading location
                journey...
              </strong>

              <span>
                Fetching checkpoints
                for{" "}
                {
                  selectedDateLabel
                }
              </span>
            </div>
          ) : null}

          {/* ERROR */}

          {!state?.loading &&
          state?.error ? (
            <div className="attendance-warning-box danger">
              <strong>
                Unable to load
                location history
              </strong>

              <p>
                {
                  state.error
                }
              </p>
            </div>
          ) : null}

          {/* EMPTY HISTORY */}

          {!state?.loading &&
          !state?.error &&
          checkpoints.length ===
            0 ? (
            <div className="att-location-history-empty">
              <strong>
                No saved location
                checkpoints
              </strong>

              <span>
                No location trail
                exists for{" "}
                {
                  selectedDateLabel
                }.
              </span>
            </div>
          ) : null}

          {/* CHRONOLOGICAL JOURNEY */}

          {!state?.loading &&
          !state?.error &&
          checkpoints.length >
            0 ? (
            <div className="att-location-timeline">
              {checkpoints.map(
                (
                  point,
                  index
                ) => {
                  const mapLink =
                    pointMap(
                      point
                    );

                  const capturedAt =
                    pointTime(
                      point
                    );

                  const location =
                    pointLabel(
                      point
                    );

                  const source =
                    point?.source
                      ? String(
                          point.source
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
                          )
                      : "Checkpoint";

                  const accuracy =
                    Number(
                      point?.accuracy
                    );

                  const isLatest =
                    index ===
                    checkpoints.length -
                      1;

                  return (
                    <div
                      className={`att-location-step ${
                        isLatest
                          ? "latest"
                          : ""
                      }`}
                      key={
                        point?._id ||
                        `${capturedAt}-${index}`
                      }
                    >
                      <div className="att-location-time">
                        {formatTime(
                          capturedAt
                        )}
                      </div>

                      <div className="att-location-line">
                        <i />
                      </div>

                      <div className="att-location-point">
                        <div className="att-location-point-head">
                          <strong>
                            {
                              location
                            }
                          </strong>

                          {isLatest ? (
                            <span className="att-location-latest-pill">
                              Latest
                            </span>
                          ) : null}
                        </div>

                        <div className="att-location-point-meta">
                          <span>
                            {
                              source
                            }
                          </span>

                          {Number.isFinite(
                            accuracy
                          ) ? (
                            <span>
                              Accuracy ±
                              {Math.round(
                                accuracy
                              )}
                              m
                            </span>
                          ) : null}
                        </div>

                        {mapLink ? (
                          <a
                            href={
                              mapLink
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open exact
                            map
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LocationHistoryModal;