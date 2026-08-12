import React from "react";

import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  PackageCheck,
  RefreshCw,
  Route,
  Truck,
  UserRound,
} from "lucide-react";

import OrderTrackingJourneyStrip from "./OrderTrackingJourneyStrip";
import OrderTrackingTimeline from "./OrderTrackingTimeline";
import OrderTrackingMetaCard from "./OrderTrackingMetaCard";
import OrderTrackingTransportCard from "./OrderTrackingTransportCard";

import {
  formatDate,
  formatOrderDate,
  getCurrentMilestone,
  getOrderHealth,
  getStatusMeta,
  prettyProcessType,
  prettySupplyCondition,
} from "../orderTrackingUtils";

const MetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
}) => (
  <div className="ot-metric-card">
    <div className="ot-metric-card__icon">
      <Icon size={17} />
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  </div>
);

const OrderTrackingDetail = ({
  tracking,
  loading,
  refreshing,
  onBack,
  onRefresh,
  onUpdated,
}) => {
  if (loading || !tracking) {
    return (
      <div className="ot-detail-loading">
        <div className="ot-loader ot-loader--large" />

        <strong>
          Loading order journey...
        </strong>

        <button
          type="button"
          className="ot-btn ot-btn--secondary"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>
      </div>
    );
  }

  const currentMilestone =
    getCurrentMilestone(
      tracking
    );

  const statusMeta =
    getStatusMeta(
      tracking.currentStatus
    );

  const health =
    getOrderHealth(
      tracking
    );

  return (
    <div className="ot-detail">
      <header className="ot-detail-nav">
        <button
          type="button"
          className="ot-back"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          All Orders
        </button>

        <button
          type="button"
          className="ot-btn ot-btn--secondary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "ot-spin"
                : ""
            }
          />
          Refresh
        </button>
      </header>

      <section className="ot-detail-hero">
        <div className="ot-detail-hero__main">
          <div className="ot-detail-hero__badges">
            <span className="ot-track-number">
              {tracking.trackingNumber}
            </span>

            <span
              className={`ot-status-pill ${statusMeta.className}`}
            >
              <i />
              {tracking.currentStatusLabel ||
                statusMeta.label}
            </span>

            <span className="ot-order-type ot-order-type--hero">
              {tracking.orderType}
            </span>
          </div>

          <h1>
            {tracking.companyName}
          </h1>

          <div className="ot-detail-hero__meta">
            <span>
              PO{" "}
              <strong>
                {tracking.poNumber ||
                  "—"}
              </strong>
            </span>

            <i>•</i>

            <span>
              SO{" "}
              <strong>
                {tracking.salesOrderNo ||
                  "—"}
              </strong>
            </span>

            <i>•</i>

            <span>
              <CalendarDays size={12} />
              Order / Approval{" "}
              <strong>
                {formatOrderDate(
                  tracking
                )}
              </strong>
            </span>

            <i>•</i>

            <span>
              {prettySupplyCondition(
                tracking.supplyCondition
              )}
            </span>

            <i>•</i>

            <span>
              {prettyProcessType(
                tracking.processType
              )}
            </span>
          </div>

          <div className="ot-sales-owner">
            <div className="ot-sales-owner__avatar">
              <UserRound size={15} />
            </div>

            <div>
              <span>
                SALES OWNER
              </span>

              <strong>
                {tracking.salesPersonName ||
                  "Not assigned"}
              </strong>

              {tracking.salesPersonEmail ? (
                <small>
                  {tracking.salesPersonEmail}
                </small>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`ot-health-card ${health.className}`}
        >
          <span>
            ORDER HEALTH
          </span>

          <strong>
            {health.label}
          </strong>

          <small>
            {health.description}
          </small>
        </div>

        <div className="ot-current-banner">
          <div className="ot-current-banner__icon">
            <Route size={22} />
          </div>

          <div className="ot-current-banner__content">
            <span>
              CURRENT STAGE
            </span>

            <strong>
              {currentMilestone?.label ||
                tracking.currentStatusLabel ||
                "Planning"}
            </strong>

            <small>
              {currentMilestone?.estimatedDate
                ? `Estimated ${formatDate(
                    currentMilestone.estimatedDate
                  )}`
                : "Estimated date not available"}
            </small>
          </div>

          <div className="ot-current-banner__progress">
            <strong>
              {tracking.progressPercentage ||
                0}
              %
            </strong>

            <span>
              complete
            </span>
          </div>
        </div>
      </section>

      <OrderTrackingJourneyStrip
        tracking={tracking}
      />

      <section className="ot-metrics">
        <MetricCard
          icon={PackageCheck}
          label="Ready for Dispatch"
          value={formatDate(
            tracking.actualReadyDate ||
              tracking.estimatedReadyDate
          )}
          hint={
            tracking.actualReadyDate
              ? "Actual"
              : "Estimated"
          }
        />

        <MetricCard
          icon={Truck}
          label="Loading"
          value={formatDate(
            tracking.actualLoadingDate ||
              tracking.estimatedLoadingDate
          )}
          hint={
            tracking.actualLoadingDate
              ? "Actual"
              : "Estimated"
          }
        />

        <MetricCard
          icon={Route}
          label="Shipped"
          value={formatDate(
            tracking.actualShipDate ||
              tracking.estimatedShipDate
          )}
          hint={
            tracking.actualShipDate
              ? "Actual"
              : "Estimated"
          }
        />

        <MetricCard
          icon={CalendarCheck2}
          label="Delivered"
          value={formatDate(
            tracking.actualDeliveryDate ||
              tracking.estimatedDeliveryDate
          )}
          hint={
            tracking.actualDeliveryDate
              ? "Actual"
              : "Estimated"
          }
        />
      </section>

      <section className="ot-detail-grid">
        <main>
          <OrderTrackingTimeline
            tracking={tracking}
            onUpdated={onUpdated}
          />
        </main>

        <aside className="ot-detail-side">
          <OrderTrackingMetaCard
            tracking={tracking}
          />

          <OrderTrackingTransportCard
            tracking={tracking}
            onUpdated={onUpdated}
          />
        </aside>
      </section>
    </div>
  );
};

export default OrderTrackingDetail;


