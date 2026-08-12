import React from "react";

import {
  ArrowUpRight,
  CalendarDays,
  Factory,
  PackageOpen,
  Truck,
} from "lucide-react";

import {
  formatDate,
  formatMaterial,
  formatOrderDate,
  getOrderHealth,
  getStatusMeta,
  prettyProcessType,
  prettySupplyCondition,
} from "../orderTrackingUtils";

const OrderTrackingTable = ({
  items = [],
  loading = false,
  onOpen,
}) => {
  if (loading) {
    return (
      <div className="ot-empty-state">
        <div className="ot-loader" />
        <strong>
          Loading latest tracking orders...
        </strong>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="ot-empty-state">
        <PackageOpen size={36} />
        <strong>
          No tracking orders found
        </strong>
        <span>
          Try changing your filters
          or click Refresh & Sync.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="ot-table-wrap">
        <table className="ot-orders-table">
          <thead>
            <tr>
              <th>Customer / Order</th>
              <th>Order Date</th>
              <th>Material</th>
              <th>Process</th>
              <th>Current Stage</th>
              <th>Progress</th>
              <th>Est. Ready</th>
              <th>Est. Delivery</th>
              <th>Health</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {items.map(
              (tracking) => {
                const statusMeta =
                  getStatusMeta(
                    tracking.currentStatus
                  );

                const health =
                  getOrderHealth(
                    tracking
                  );

                const progress =
                  Math.min(
                    Math.max(
                      Number(
                        tracking.progressPercentage || 0
                      ),
                      0
                    ),
                    100
                  );

                return (
                  <tr
                    key={tracking._id}
                    onClick={() =>
                      onOpen?.(
                        tracking._id
                      )
                    }
                  >
                    <td>
                      <div className="ot-order-cell">
                        <div className="ot-order-cell__icon">
                          <Factory size={16} />
                        </div>

                        <div className="ot-order-cell__content">
                          <strong>
                            {tracking.companyName ||
                              "Customer"}
                          </strong>

                          <span>
                            PO{" "}
                            {tracking.poNumber ||
                              "—"}
                            {"  •  "}
                            SO{" "}
                            {tracking.salesOrderNo ||
                              "—"}
                          </span>

                          <small>
                            {tracking.trackingNumber}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ot-order-date-cell">
                        <CalendarDays size={13} />
                        <strong>
                          {formatOrderDate(
                            tracking
                          )}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="ot-material-cell">
                        {formatMaterial(
                          tracking.material
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="ot-type-cell">
                        <div>
                          <span className="ot-order-type">
                            {tracking.orderType}
                          </span>

                          <strong>
                            {prettyProcessType(
                              tracking.processType
                            )}
                          </strong>
                        </div>

                        <small>
                          {prettySupplyCondition(
                            tracking.supplyCondition
                          )}
                        </small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`ot-status-pill ${statusMeta.className}`}
                      >
                        <i />
                        {tracking.currentStatusLabel ||
                          statusMeta.label}
                      </span>
                    </td>

                    <td>
                      <div className="ot-progress-cell">
                        <div>
                          <strong>
                            {progress}%
                          </strong>
                        </div>

                        <div className="ot-progress">
                          <span
                            style={{
                              width:
                                `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ot-date-cell">
                        <CalendarDays size={13} />
                        {formatDate(
                          tracking.estimatedReadyDate
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="ot-date-cell">
                        <Truck size={13} />
                        {formatDate(
                          tracking.estimatedDeliveryDate
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`ot-health ${health.className}`}
                      >
                        {health.label}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ot-open-row"
                        aria-label="Open tracking"
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <div className="ot-mobile-list">
        {items.map(
          (tracking) => {
            const statusMeta =
              getStatusMeta(
                tracking.currentStatus
              );

            const health =
              getOrderHealth(
                tracking
              );

            const progress =
              Math.min(
                Math.max(
                  Number(
                    tracking.progressPercentage || 0
                  ),
                  0
                ),
                100
              );

            return (
              <button
                type="button"
                className="ot-mobile-order"
                key={tracking._id}
                onClick={() =>
                  onOpen?.(
                    tracking._id
                  )
                }
              >
                <div className="ot-mobile-order__top">
                  <div>
                    <small>
                      {tracking.trackingNumber}
                    </small>

                    <strong>
                      {tracking.companyName}
                    </strong>

                    <span>
                      PO{" "}
                      {tracking.poNumber ||
                        "—"}
                    </span>
                  </div>

                  <ArrowUpRight size={18} />
                </div>

                <div className="ot-mobile-order__date">
                  Order / Approval:{" "}
                  <strong>
                    {formatOrderDate(
                      tracking
                    )}
                  </strong>
                </div>

                <div className="ot-mobile-order__material">
                  {formatMaterial(
                    tracking.material
                  )}
                </div>

                <div className="ot-mobile-order__meta">
                  <span>
                    {tracking.orderType}
                  </span>

                  <span>
                    {prettyProcessType(
                      tracking.processType
                    )}
                  </span>
                </div>

                <div className="ot-mobile-order__status">
                  <span
                    className={`ot-status-pill ${statusMeta.className}`}
                  >
                    <i />
                    {tracking.currentStatusLabel ||
                      statusMeta.label}
                  </span>

                  <span
                    className={`ot-health ${health.className}`}
                  >
                    {health.label}
                  </span>
                </div>

                <div className="ot-progress ot-progress--mobile">
                  <span
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>

                <div className="ot-mobile-order__dates">
                  <div>
                    <span>Ready</span>
                    <strong>
                      {formatDate(
                        tracking.estimatedReadyDate,
                        true
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Delivery</span>
                    <strong>
                      {formatDate(
                        tracking.estimatedDeliveryDate,
                        true
                      )}
                    </strong>
                  </div>
                </div>
              </button>
            );
          }
        )}
      </div>
    </>
  );
};

export default OrderTrackingTable;
