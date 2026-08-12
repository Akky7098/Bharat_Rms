import React, {
  useMemo,
} from "react";

import {
  Check,
  Circle,
} from "lucide-react";

import {
  getCustomerJourneyStages,
} from "../orderTrackingUtils";

const OrderTrackingJourneyStrip = ({
  tracking,
}) => {
  const stages = useMemo(
    () =>
      getCustomerJourneyStages(
        tracking
      ),
    [tracking]
  );

  return (
    <section className="ot-journey-strip-card">
      <div className="ot-journey-strip__head">
        <div>
          <span className="ot-eyebrow">
            LIVE JOURNEY
          </span>

          <h2>
            Order Progress
          </h2>
        </div>

        <span>
          {tracking.progressPercentage ||
            0}
          % complete
        </span>
      </div>

      <div className="ot-journey-strip">
        {stages.map(
          (
            stage,
            index
          ) => (
            <React.Fragment
              key={stage.key}
            >
              <div
                className={[
                  "ot-journey-node",
                  stage.state ===
                  "completed"
                    ? "is-completed"
                    : "",
                  stage.state ===
                  "current"
                    ? "is-current"
                    : "",
                  stage.state ===
                  "upcoming"
                    ? "is-upcoming"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="ot-journey-node__dot">
                  {stage.state ===
                  "completed" ? (
                    <Check size={14} />
                  ) : (
                    <Circle size={12} />
                  )}
                </div>

                <div className="ot-journey-node__text">
                  <strong>
                    {stage.label}
                  </strong>

                  <span>
                    {stage.dateLabel}
                  </span>
                </div>
              </div>

              {index <
              stages.length - 1 ? (
                <div
                  className={[
                    "ot-journey-link",
                    stage.state ===
                    "completed"
                      ? "is-completed"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span />
                </div>
              ) : null}
            </React.Fragment>
          )
        )}
      </div>
    </section>
  );
};

export default OrderTrackingJourneyStrip;
