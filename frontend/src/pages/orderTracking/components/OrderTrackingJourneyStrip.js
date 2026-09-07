import React, {
  useMemo,
  useState,
} from "react";

import {
  Check,
  Circle,
} from "lucide-react";

import {
  getCustomerJourneyStages,
} from "../orderTrackingUtils";

import OrderJourneyStageModal from "./OrderJourneyStageModal";

const OrderTrackingJourneyStrip = ({
  tracking,
}) => {
  const [
    selectedStage,
    setSelectedStage,
  ] = useState(null);

  const stages =
    useMemo(
      () =>
        getCustomerJourneyStages(
          tracking
        ),
      [tracking]
    );

  return (
    <>
      <section className="ot-journey-strip-card">

        <div className="ot-journey-strip__head">

          <div>
            <span className="ot-eyebrow">
              LIVE JOURNEY
            </span>

            <h2>
              Order Progress
            </h2>

            <p className="ot-journey-strip__helper">
              Select any stage to view
              its plan, revision and
              completion details.
            </p>
          </div>

          <span className="ot-journey-progress-pill">
            {Math.round(
              Number(
                tracking
                  ?.progressPercentage ||
                0
              )
            )}
            % complete
          </span>

        </div>

        <div className="ot-journey-scroll-shell">

          <div className="ot-journey-strip">

            {stages.map(
              (
                stage,
                index
              ) => (
                <React.Fragment
                  key={
                    stage.key
                  }
                >

                  <button
                    type="button"
                    className={[
                      "ot-journey-node",
                      "ot-journey-node--clickable",

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
                    onClick={() =>
                      setSelectedStage(
                        stage
                      )
                    }
                  >

                    <div className="ot-journey-node__dot">

                      {stage.state ===
                      "completed" ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        <Circle
                          size={13}
                        />
                      )}

                    </div>

                    <div className="ot-journey-node__text">

                      <strong>
                        {
                          stage.label
                        }
                      </strong>

                      <span>
                        {
                          stage.dateLabel
                        }
                      </span>

                      {stage.hasRevision ? (
                        <small className="ot-journey-node__revision">
                          Plan revised
                        </small>
                      ) : null}

                      <small className="ot-journey-node__view">
                        View details
                      </small>

                    </div>

                  </button>

                  {index <
                  stages.length -
                    1 ? (
                    <div
                      className={[
                        "ot-journey-link",

                        stage.state ===
                        "completed"
                          ? "is-completed"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                    >
                      <span />
                    </div>
                  ) : null}

                </React.Fragment>
              )
            )}

          </div>

        </div>

      </section>

      <OrderJourneyStageModal
        stage={
          selectedStage
        }
        onClose={() =>
          setSelectedStage(
            null
          )
        }
      />
    </>
  );
};

export default OrderTrackingJourneyStrip;