import React from "react";

import {
  formatDate,
  getStatusTone,
  humanize,
} from "../orderTrackingUtils";

const getMaterialPreview = (
  value = ""
) => {
  const normalized = String(
    value || ""
  )
    .replace(/\r/g, "")
    .replace(/\n+/g, " · ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Material details not available.";
  }

  if (normalized.length <= 155) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    152
  )}...`;
};

const getLatestUpdate = (
  tracking = {}
) => {
  if (tracking.latestUpdateText) {
    return tracking.latestUpdateText;
  }

  if (tracking.currentStatus) {
    return `Order is currently ${humanize(
      tracking.currentStatus
    ).toLowerCase()}.`;
  }

  return "No update available.";
};

const getStatusLabel = (
  tracking = {}
) =>
  humanize(
    tracking.currentStatus ||
      "order_approved"
  );

const OrderTrackingTable = ({
  records = [],
  requestingId = "",
  openingId = "",
  onOpen,
  onRequestUpdate,
}) => {
  const handleRowOpen = (
    event,
    tracking
  ) => {
    const interactiveElement =
      event.target.closest(
        "button, a, input, select, textarea"
      );

    if (interactiveElement) {
      return;
    }

    onOpen?.(tracking);
  };

  const handleRowKeyDown = (
    event,
    tracking
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onOpen?.(tracking);
    }
  };

  return (
    <div className="ot-table-wrap">
      <table className="ot-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Tracking No.</th>
            <th>Sales Person</th>
            <th>Company / Sales Order</th>
            <th>PO Number</th>
            <th>Material</th>
            <th>Current Status</th>
            <th>Latest Factory Update</th>
            <th>Expected Dispatch</th>
            <th>Transporter</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {records.map((tracking) => {
            const requesting =
              requestingId ===
              tracking._id;

            const opening =
              openingId ===
              tracking._id;

            const chatClosed =
              tracking.chatStatus ===
              "closed";

            return (
              <tr
                key={tracking._id}
                className={`ot-table-row ${
                  tracking.updateRequested
                    ? "has-update-request"
                    : ""
                } ${
                  opening
                    ? "is-opening"
                    : ""
                }`}
                tabIndex={0}
                role="button"
                onClick={(event) =>
                  handleRowOpen(
                    event,
                    tracking
                  )
                }
                onKeyDown={(event) =>
                  handleRowKeyDown(
                    event,
                    tracking
                  )
                }
                aria-label={`Open tracking details for ${
                  tracking.companyName ||
                  "order"
                }`}
              >
                <td className="ot-date-cell">
                  <strong>
                    {formatDate(
                      tracking.createdAt
                    )}
                  </strong>

                  <span>
                    {formatDate(
                      tracking.createdAt,
                      true
                    )
                      .split(",")
                      .slice(-1)
                      .join("")
                      .trim()}
                  </span>
                </td>

                <td className="ot-tracking-cell">
                  <button
                    type="button"
                    className="ot-table-link"
                    onClick={() =>
                      onOpen?.(tracking)
                    }
                    disabled={opening}
                  >
                    {opening
                      ? "Opening..."
                      : tracking.trackingNumber ||
                        "-"}
                  </button>

                  {tracking.updateRequested && (
                    <span className="ot-requested-badge">
                      Update Requested
                    </span>
                  )}
                </td>

                <td>
                  <strong>
                    {tracking.salesPersonName ||
                      "-"}
                  </strong>

                  <span>
                    {tracking.salesPersonEmail ||
                      ""}
                  </span>
                </td>

                <td className="ot-company-cell">
                  <strong>
                    {tracking.companyName ||
                      "-"}
                  </strong>

                  <span>
                    SO:{" "}
                    {tracking.salesOrderNo ||
                      "-"}
                  </span>

                  {tracking.shippingAddress && (
                    <small>
                      {tracking.shippingAddress}
                    </small>
                  )}
                </td>

                <td>
                  <strong>
                    {tracking.poNumber ||
                      "-"}
                  </strong>
                </td>

                <td className="ot-material-cell">
                  <span>
                    {getMaterialPreview(
                      tracking.materialSnapshot
                    )}
                  </span>
                </td>

                <td className="ot-status-cell">
                  <span
                    className={`ot-status-pill ${getStatusTone(
                      tracking.currentStatus
                    )}`}
                  >
                    {getStatusLabel(
                      tracking
                    )}
                  </span>

                  <small>
                    Chat:{" "}
                    {humanize(
                      tracking.chatStatus ||
                        "open"
                    )}
                  </small>
                </td>

                <td className="ot-latest-cell">
                  <strong>
                    {getLatestUpdate(
                      tracking
                    )}
                  </strong>

                  <span>
                    {formatDate(
                      tracking.latestUpdateAt,
                      true
                    )}
                  </span>

                  {tracking.latestUpdateBy
                    ?.name && (
                    <small>
                      By{" "}
                      {
                        tracking
                          .latestUpdateBy
                          .name
                      }
                    </small>
                  )}
                </td>

                <td>
                  <strong>
                    {formatDate(
                      tracking.expectedDispatchDate
                    )}
                  </strong>

                  {tracking.expectedReadyDate && (
                    <span>
                      Ready:{" "}
                      {formatDate(
                        tracking.expectedReadyDate
                      )}
                    </span>
                  )}
                </td>

                <td>
                  <strong>
                    {tracking.transporter
                      ?.transporterName ||
                      "-"}
                  </strong>

                  {tracking.dispatchDateTime && (
                    <span>
                      {formatDate(
                        tracking.dispatchDateTime,
                        true
                      )}
                    </span>
                  )}
                </td>

                <td>
                  <div className="ot-table-actions">
                    <button
                      type="button"
                      className="ot-view-action"
                      onClick={() =>
                        onOpen?.(tracking)
                      }
                      disabled={opening}
                    >
                      {opening
                        ? "Opening..."
                        : "Open"}
                    </button>

                    <button
                      type="button"
                      className="ot-request-action"
                      onClick={() =>
                        onRequestUpdate?.(
                          tracking
                        )
                      }
                      disabled={
                        requesting ||
                        tracking.updateRequested ||
                        chatClosed
                      }
                    >
                      {tracking.updateRequested
                        ? "Requested"
                        : requesting
                        ? "Requesting..."
                        : "Request Update"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTrackingTable;