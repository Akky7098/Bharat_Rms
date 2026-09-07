import React from "react";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  MessageSquareText,
  UserRound,
  X,
} from "lucide-react";

import {
  formatDate,
  formatDateTime,
  getBaselineDate,
  getDifferenceLabel,
  isDifferentCalendarDate,
} from "../orderTrackingUtils";

const OrderJourneyStageModal = ({
  stage,
  onClose,
}) => {
  if (
    !stage?.milestone
  ) {
    return null;
  }

  const milestone =
    stage.milestone;

  const originalPlan =
    getBaselineDate(
      milestone
    );

  const currentPlan =
    milestone
      .estimatedDate;

  const completed =
    Boolean(
      milestone.actualDate
    ) ||
    milestone.status ===
      "completed";

  const revised =
    Boolean(
      milestone
        .originalEstimatedDate
    ) &&
    isDifferentCalendarDate(
      milestone
        .originalEstimatedDate,
      milestone
        .estimatedDate
    );

  const difference =
    completed
      ? getDifferenceLabel(
          originalPlan,
          milestone.actualDate
        )
      : null;

  const completedByName =
    milestone
      ?.completedBy
      ?.name ||
    "";

  const completionSentence =
    completed
      ? `${
          completedByName ||
          "User"
        } marked ${
          milestone.label
        } completed at ${formatDateTime(
          milestone.actualDate
        )}.`
      : "";

  return (
    <div
      className="ot-journey-modal-backdrop"
      role="presentation"
      onMouseDown={
        onClose
      }
    >
      <section
        className="ot-journey-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${milestone.label} details`}
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <header className="ot-journey-modal__head">
          <div>
            <span className="ot-eyebrow">
              JOURNEY STAGE
            </span>

            <h2>
              {milestone.label}
            </h2>

            <p>
              Stage{" "}
              {milestone.sequence ||
                "—"}
              {" · "}
              Target Day{" "}
              {milestone.targetDay ??
                "—"}
            </p>
          </div>

          <button
            type="button"
            className="ot-journey-modal__close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ot-journey-modal__body">

          <div
            className={[
              "ot-journey-modal-status",
              completed
                ? "is-completed"
                : stage.state ===
                    "current"
                ? "is-current"
                : "is-upcoming",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div>
              {completed ? (
                <CheckCircle2
                  size={21}
                />
              ) : (
                <Clock3
                  size={21}
                />
              )}
            </div>

            <section>
              <span>
                STATUS
              </span>

              <strong>
                {completed
                  ? "Completed"
                  : stage.state ===
                      "current"
                  ? "Current Stage"
                  : "Upcoming"}
              </strong>
            </section>
          </div>

          <div className="ot-journey-modal-dates">

            <div>
              <CalendarClock
                size={18}
              />

              <section>
                <span>
                  ORIGINAL PLAN
                </span>

                <strong>
                  {formatDate(
                    originalPlan
                  )}
                </strong>
              </section>
            </div>

            <div
              className={
                revised
                  ? "is-revised"
                  : ""
              }
            >
              <History
                size={18}
              />

              <section>
                <span>
                  {revised
                    ? "REVISED PLAN"
                    : "CURRENT PLAN"}
                </span>

                <strong>
                  {formatDate(
                    currentPlan
                  )}
                </strong>
              </section>
            </div>

            <div
              className={
                completed
                  ? "is-actual"
                  : ""
              }
            >
              <CheckCircle2
                size={18}
              />

              <section>
                <span>
                  COMPLETION DATE
                </span>

                <strong>
                  {completed
                    ? formatDateTime(
                        milestone.actualDate
                      )
                    : "Not completed"}
                </strong>
              </section>
            </div>

          </div>

          {difference ? (
            <div
              className={`ot-journey-modal-performance ot-journey-modal-performance--${difference.type}`}
            >
              {difference.text}
            </div>
          ) : null}

          {completionSentence ? (
            <div className="ot-journey-completion-note">
              <UserRound
                size={16}
              />

              <span>
                {completionSentence}
              </span>
            </div>
          ) : null}

          {revised &&
          milestone
            .estimatedDateComment ? (
            <div className="ot-journey-info-block">
              <div>
                <History
                  size={16}
                />
              </div>

              <section>
                <span>
                  PLAN REVISION REASON
                </span>

                <strong>
                  {
                    milestone
                      .estimatedDateComment
                  }
                </strong>
              </section>
            </div>
          ) : null}

          {milestone.comment ? (
            <div className="ot-journey-info-block">
              <div>
                <MessageSquareText
                  size={16}
                />
              </div>

              <section>
                <span>
                  COMPLETION COMMENT
                </span>

                <strong>
                  {
                    milestone.comment
                  }
                </strong>
              </section>
            </div>
          ) : null}

        </div>

        <footer className="ot-journey-modal__footer">
          <button
            type="button"
            onClick={
              onClose
            }
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

export default OrderJourneyStageModal;