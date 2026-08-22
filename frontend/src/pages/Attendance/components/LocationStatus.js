import React from "react";

import {
  formatTime,
  pointLabel,
  pointMap,
  pointTime,
} from "../utils/attendanceHelpers";

const LocationStatus = ({
  point,
  isSuperAdmin,
  onHistory,
  dateKey = "",
  employee = null,
}) => {
  /* =========================================================
     SUPER ADMIN ONLY
  ========================================================= */

  if (!isSuperAdmin) {
    return null;
  }

  /* =========================================================
     LATEST SAVED LOCATION

     IMPORTANT:
     `point` must be the latest checkpoint for the selected
     employee + selected date.

     Example:

     employee = Renu
     dateKey   = 2026-08-19

     point = latest saved checkpoint from 19 Aug only.

     We intentionally DO NOT use:
     attendance.checkIn.latitude
     attendance.checkIn.longitude
     attendance.checkIn.googleMapLink

     because that would show check-in location instead of the
     latest saved location.
  ========================================================= */

  const mapLink =
    pointMap(point);

  const locationLabel =
    point
      ? pointLabel(point)
      : "No saved location checkpoint";

  const updatedAt =
    point
      ? pointTime(point)
      : null;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="att-location-zone">
      {/* =====================================================
          LOCATION DETAILS
      ====================================================== */}

      <div className="att-location-current">
        <span>
          Current / Latest Location
        </span>

        <strong>
          {locationLabel}
        </strong>

        {updatedAt ? (
          <small>
            Last updated{" "}
            {formatTime(
              updatedAt
            )}
          </small>
        ) : (
          <small>
            No tracking checkpoint
            saved for this date.
          </small>
        )}

        {dateKey ? (
          <small className="att-location-date">
            Tracking date:{" "}
            {dateKey}
          </small>
        ) : null}
      </div>

      {/* =====================================================
          MAP + HISTORY

          Both are available to Super Admin.

          Map:
          latest checkpoint only.

          History:
          complete journey for the selected date.
      ====================================================== */}

      <div className="att-location-actions">
        {mapLink ? (
          <a
            className="att-location-btn"
            href={mapLink}
            target="_blank"
            rel="noreferrer"
            title="Open latest saved location in Google Maps"
          >
            <span
              aria-hidden="true"
            >
              ⌖
            </span>

            Map
          </a>
        ) : (
          <button
            type="button"
            className="att-location-btn"
            disabled
            title="No saved location available for this date"
          >
            <span
              aria-hidden="true"
            >
              ⌖
            </span>

            Map
          </button>
        )}

        <button
          className="att-location-btn history"
          type="button"
          onClick={() => {
            if (
              typeof onHistory ===
              "function"
            ) {
              onHistory();
            }
          }}
          title={
            dateKey
              ? `View location history for ${dateKey}`
              : "View location history"
          }
        >
          <span
            aria-hidden="true"
          >
            ↗
          </span>

          History
        </button>
      </div>
    </div>
  );
};

export default LocationStatus;