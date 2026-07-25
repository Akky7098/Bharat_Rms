import React from "react";

import {
  canReopenTrackingChat,
  canUpdateTracking,
  formatDate,
  getStatusTone,
  getStoredUser,
  humanize,
} from "../orderTrackingUtils";

import OrderTrackingChat from "./OrderTrackingChat";

const OrderTrackingDetailPage = ({
  tracking,
  messages,
  messagesLoading,
  messagesSending,
  deletingMessageId,
  hasMoreMessages,
  requestingUpdate,
  opening = false,
  onBack,
  onRefresh,
  onOpenStatus,
  onRequestUpdate,
  onLoadMoreMessages,
  onSendMessage,
  onDeleteMessage,
  onCloseChat,
  onReopenChat,
}) => {
  const user = getStoredUser();

  const canUpdate =
    canUpdateTracking(user);

  const canReopen =
    canReopenTrackingChat(user);

  if (!tracking) {
    return null;
  }

  const currentStatus =
    tracking.currentStatus ||
    "order_approved";

  const chatClosed =
    tracking.chatStatus ===
    "closed";

  const transporterName =
    tracking.transporter
      ?.transporterName || "-";

  const plantName =
    tracking.sourcePlant
      ?.plantName || "-";

  const plantCode =
    tracking.sourcePlant
      ?.plantCode || "";

  return (
    <div className="ot-detail-page">
      <header className="ot-detail-page-header">
        <div className="ot-detail-page-title">
          <button
            type="button"
            className="ot-detail-back-button"
            onClick={onBack}
            aria-label="Back to order tracking"
          >
            ←
          </button>

          <div>
            <span className="ot-detail-kicker">
              {tracking.trackingNumber ||
                "ORDER TRACKING"}
            </span>

            <h1>
              {tracking.companyName ||
                "-"}
            </h1>

            <p>
              SO{" "}
              {tracking.salesOrderNo ||
                "-"}{" "}
              · PO{" "}
              {tracking.poNumber ||
                "-"}
            </p>
          </div>
        </div>

        <div className="ot-detail-page-header-actions">
          <span
            className={`ot-status-pill ${getStatusTone(
              currentStatus
            )}`}
          >
            {humanize(
              currentStatus
            )}
          </span>

          <button
            type="button"
            className="ot-detail-refresh-button"
            onClick={onRefresh}
            disabled={opening}
          >
            {opening
              ? "Loading..."
              : "Refresh"}
          </button>
        </div>
      </header>

      <main className="ot-detail-page-content">
        <aside className="ot-detail-info-column">
          <section className="ot-detail-action-card">
            <div className="ot-detail-action-heading">
              <div>
                <span>
                  CURRENT STATUS
                </span>

                <strong>
                  {humanize(
                    currentStatus
                  )}
                </strong>
              </div>

              <span
                className={`ot-status-pill ${getStatusTone(
                  currentStatus
                )}`}
              >
                {humanize(
                  currentStatus
                )}
              </span>
            </div>

            <div className="ot-detail-action-buttons">
              {canUpdate && (
                <button
                  type="button"
                  className="ot-primary-button"
                  onClick={onOpenStatus}
                >
                  Update Status
                </button>
              )}

              <button
                type="button"
                onClick={onRequestUpdate}
                disabled={
                  requestingUpdate ||
                  tracking.updateRequested ||
                  chatClosed
                }
              >
                {tracking.updateRequested
                  ? "Update Requested"
                  : requestingUpdate
                  ? "Requesting..."
                  : "Request Update"}
              </button>

              {!chatClosed &&
                canUpdate && (
                  <button
                    type="button"
                    onClick={onCloseChat}
                  >
                    Close Chat
                  </button>
                )}

              {chatClosed &&
                canReopen && (
                  <button
                    type="button"
                    onClick={onReopenChat}
                  >
                    Reopen Chat
                  </button>
                )}
            </div>

            {tracking.updateRequested && (
              <div className="ot-detail-update-request-box">
                <strong>
                  Update Requested
                </strong>

                <span>
                  Requested by{" "}
                  {tracking
                    .updateRequestedBy
                    ?.name || "User"}
                </span>

                <small>
                  {formatDate(
                    tracking
                      .updateRequestedAt,
                    true
                  )}
                </small>
              </div>
            )}
          </section>

          <section className="ot-detail-info-card">
            <header>
              <div>
                <span>
                  ORDER INFORMATION
                </span>

                <h2>
                  Order Summary
                </h2>
              </div>
            </header>

            <div className="ot-detail-info-grid">
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
                  Priority
                </span>

                <strong>
                  {humanize(
                    tracking.priority ||
                      "normal"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Source Plant
                </span>

                <strong>
                  {plantName}
                </strong>

                {plantCode && (
                  <small>
                    {plantCode}
                  </small>
                )}
              </div>

              <div>
                <span>
                  Transporter
                </span>

                <strong>
                  {transporterName}
                </strong>
              </div>

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

              <div>
                <span>
                  Expected Delivery
                </span>

                <strong>
                  {formatDate(
                    tracking.expectedDeliveryDateTime,
                    true
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Delivered At
                </span>

                <strong>
                  {formatDate(
                    tracking.deliveredAt,
                    true
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Chat Status
                </span>

                <strong>
                  {humanize(
                    tracking.chatStatus ||
                      "open"
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="ot-detail-info-card">
            <header>
              <div>
                <span>
                  CUSTOMER
                </span>

                <h2>
                  Contact & Address
                </h2>
              </div>
            </header>

            <div className="ot-detail-info-grid">
              <div>
                <span>
                  Contact Person
                </span>

                <strong>
                  {tracking.contactPersonName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Contact Number
                </span>

                <strong>
                  {tracking.contactPersonNumber ||
                    "-"}
                </strong>
              </div>

              <div className="ot-detail-info-grid-full">
                <span>
                  Contact Email
                </span>

                <strong>
                  {tracking.contactPersonEmail ||
                    "-"}
                </strong>
              </div>
            </div>

            <div className="ot-detail-address-block">
              <span>
                Shipping Address
              </span>

              <p>
                {tracking.shippingAddress ||
                  tracking.companyAddress ||
                  "-"}
              </p>
            </div>
          </section>

          <section className="ot-detail-info-card">
            <header>
              <div>
                <span>
                  MATERIAL
                </span>

                <h2>
                  Sales Order Material
                </h2>
              </div>
            </header>

            <p className="ot-detail-material-text">
              {tracking.materialSnapshot ||
                "Material information not available."}
            </p>
          </section>

          <section className="ot-detail-info-card">
            <header>
              <div>
                <span>
                  LATEST UPDATE
                </span>

                <h2>
                  Current Factory Update
                </h2>
              </div>
            </header>

            <div className="ot-detail-latest-update">
              <p>
                {tracking.latestUpdateText ||
                  "No update available."}
              </p>

              <span>
                Updated by{" "}
                {tracking.latestUpdateBy
                  ?.name || "User"}
              </span>

              <small>
                {formatDate(
                  tracking.latestUpdateAt,
                  true
                )}
              </small>
            </div>
          </section>
        </aside>

        <section className="ot-detail-chat-column">
          <OrderTrackingChat
            tracking={tracking}
            messages={messages}
            loading={messagesLoading}
            sending={messagesSending}
            deletingMessageId={
              deletingMessageId
            }
            currentUser={user}
            hasMore={
              hasMoreMessages
            }
            onLoadMore={
              onLoadMoreMessages
            }
            onSend={onSendMessage}
            onDeleteMessage={
              onDeleteMessage
            }
          />
        </section>
      </main>
    </div>
  );
};

export default OrderTrackingDetailPage;
