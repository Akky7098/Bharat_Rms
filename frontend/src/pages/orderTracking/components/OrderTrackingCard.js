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

  if (normalized.length <= 125) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    122
  )}...`;
};

const getLatestUpdateText = (
  tracking = {}
) => {
  if (tracking.latestUpdateText) {
    return tracking.latestUpdateText;
  }

  return `Order is currently ${humanize(
    tracking.currentStatus ||
      "order_approved"
  ).toLowerCase()}.`;
};

const OrderTrackingCard = ({
  tracking,
  requesting = false,
  opening = false,
  onOpen,
  onRequestUpdate,
}) => {
  const chatClosed =
    tracking.chatStatus ===
    "closed";

  const status =
    tracking.currentStatus ||
    "order_approved";

  const handleOpen = () => {
    if (opening) return;

    onOpen?.(tracking);
  };

  const handleRequestUpdate = (
    event
  ) => {
    event.stopPropagation();

    if (
      requesting ||
      tracking.updateRequested ||
      chatClosed
    ) {
      return;
    }

    onRequestUpdate?.(tracking);
  };

  return (
    <article
      className={`ot-mobile-card ${
        tracking.updateRequested
          ? "has-update-request"
          : ""
      } ${
        opening
          ? "is-opening"
          : ""
      }`}
    >
      <button
        type="button"
        className="ot-mobile-card-main"
        onClick={handleOpen}
        disabled={opening}
      >
        <div className="ot-mobile-card-accent" />

        <header className="ot-mobile-card-header">
          <div className="ot-mobile-card-heading">
            <div className="ot-mobile-card-code-row">
              <span className="ot-mobile-tracking-number">
                {tracking.trackingNumber ||
                  "ORDER TRACKING"}
              </span>

              <span
                className={`ot-chat-mini-state ${
                  chatClosed
                    ? "closed"
                    : "open"
                }`}
              >
                {chatClosed
                  ? "Chat Closed"
                  : "Chat Open"}
              </span>
            </div>

            <h3>
              {tracking.companyName ||
                "-"}
            </h3>

            <p>
              SO{" "}
              {tracking.salesOrderNo ||
                "-"}
            </p>

            <small>
              PO{" "}
              {tracking.poNumber ||
                "-"}
            </small>
          </div>

          <span
            className={`ot-status-pill ${getStatusTone(
              status
            )}`}
          >
            {humanize(status)}
          </span>
        </header>

        <section className="ot-mobile-card-primary-meta">
          <div>
            <span>
              Sales Person
            </span>

            <strong>
              {tracking.salesPersonName ||
                "-"}
            </strong>
          </div>

          <div>
            <span>
              Source Plant
            </span>

            <strong>
              {tracking.sourcePlant
                ?.plantName || "-"}
            </strong>
          </div>

          <div>
            <span>
              Priority
            </span>

            <strong
              className={`ot-mobile-priority priority-${String(
                tracking.priority ||
                  "normal"
              ).toLowerCase()}`}
            >
              {humanize(
                tracking.priority ||
                  "normal"
              )}
            </strong>
          </div>
        </section>

        <section className="ot-mobile-date-strip">
          <div>
            <span>
              Expected Ready
            </span>

            <strong>
              {formatDate(
                tracking.expectedReadyDate
              )}
            </strong>
          </div>

          <div>
            <span>
              Expected Dispatch
            </span>

            <strong>
              {formatDate(
                tracking.expectedDispatchDate
              )}
            </strong>
          </div>
        </section>

        <section className="ot-mobile-material-box">
          <div className="ot-mobile-section-heading">
            <span>
              Material
            </span>

            <small>
              Sales Order Snapshot
            </small>
          </div>

          <p>
            {getMaterialPreview(
              tracking.materialSnapshot
            )}
          </p>
        </section>

        <section className="ot-mobile-latest-box">
          <div className="ot-mobile-latest-heading">
            <div>
              <span>
                Latest Factory Update
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
            </div>

            <time>
              {formatDate(
                tracking.latestUpdateAt,
                true
              )}
            </time>
          </div>

          <p>
            {getLatestUpdateText(
              tracking
            )}
          </p>
        </section>

        <section className="ot-mobile-dispatch-strip">
          <div>
            <span>
              Transporter
            </span>

            <strong>
              {tracking.transporter
                ?.transporterName || "-"}
            </strong>
          </div>

          <div>
            <span>
              Dispatch Date
            </span>

            <strong>
              {formatDate(
                tracking.dispatchDateTime,
                true
              )}
            </strong>
          </div>
        </section>

        {tracking.updateRequested && (
          <div className="ot-mobile-request-banner">
            <div>
              <strong>
                Update Requested
              </strong>

              <span>
                Factory response pending
              </span>
            </div>

            <small>
              {formatDate(
                tracking.updateRequestedAt,
                true
              )}
            </small>
          </div>
        )}

        <div className="ot-mobile-open-hint">
          <span>
            {opening
              ? "Opening tracking..."
              : "Tap to open full tracking and chat"}
          </span>

          <strong>→</strong>
        </div>
      </button>

      <footer className="ot-mobile-card-footer">
        <button
          type="button"
          className="ot-mobile-open-button"
          onClick={handleOpen}
          disabled={opening}
        >
          {opening
            ? "Opening..."
            : "Open Tracking"}
        </button>

        <button
          type="button"
          className="ot-mobile-request-button"
          onClick={
            handleRequestUpdate
          }
          disabled={
            requesting ||
            tracking.updateRequested ||
            chatClosed
          }
        >
          {tracking.updateRequested
            ? "Update Requested"
            : requesting
            ? "Requesting..."
            : "Request Update"}
        </button>
      </footer>
    </article>
  );
};

export default OrderTrackingCard;