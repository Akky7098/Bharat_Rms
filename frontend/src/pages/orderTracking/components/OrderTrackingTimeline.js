import React, {
  useState,
} from "react";

import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Pencil,
} from "lucide-react";

import {
  markMilestoneDoneNow,
} from "../../../services/orderTrackingService";

import EditEstimatedDateModal from "./EditEstimatedDateModal";

import {
  formatDate,
  formatDateTime,
  getDifferenceLabel,
  getStatusMeta,
  isDifferentCalendarDate,
} from "../orderTrackingUtils";

const OrderTrackingTimeline = ({
  tracking,
  onUpdated,
}) => {
  const [
    estimatedModal,
    setEstimatedModal,
  ] = useState(null);

  const [
    updatingId,
    setUpdatingId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const milestones = [
    ...(tracking?.milestones ||
      []),
  ].sort(
    (a, b) =>
      Number(a.sequence || 0) -
      Number(b.sequence || 0)
  );

  const markDoneNow =
    async (
      milestone
    ) => {
      if (
        !milestone?._id ||
        updatingId
      ) {
        return;
      }

      try {
        setUpdatingId(
          milestone._id
        );

        setError("");

        await markMilestoneDoneNow(
          tracking._id,
          milestone._id,
          `${milestone.label} completed`
        );

        await onUpdated?.();
      } catch (err) {
        setError(
          err?.message ||
            "Failed to complete milestone"
        );
      } finally {
        setUpdatingId("");
      }
    };

  return (
    <>
      <section className="ot-timeline-card">
        <div className="ot-section-heading">
          <div>
            <span className="ot-section-kicker">
              DETAILED JOURNEY
            </span>

            <h2>
              Production & Delivery Timeline
            </h2>

            <p>
              Every manufacturing milestone
              with estimated and actual dates.
            </p>
          </div>

          <div className="ot-progress-summary">
            <strong>
              {Math.round(
                tracking?.progressPercentage ||
                  0
              )}
              %
            </strong>

            <span>
              Completed
            </span>
          </div>
        </div>

        {error ? (
          <div className="ot-inline-error">
            {error}
          </div>
        ) : null}

        <div className="ot-timeline">
          {milestones.map(
            (
              milestone,
              index
            ) => {
              const completed =
                milestone.status ===
                  "completed" ||
                Boolean(
                  milestone.actualDate
                );

              const current =
                milestone.isCurrent ||
                String(
                  tracking.currentMilestoneId ||
                    ""
                ) ===
                  String(
                    milestone._id
                  );

              const pending =
                !completed &&
                !current;

              const difference =
                getDifferenceLabel(
                  milestone.estimatedDate,
                  milestone.actualDate
                );

              const statusMeta =
                getStatusMeta(
                  milestone.code
                );

              /*
               * NEW:
               *
               * Backend should preserve the first ETA as:
               *
               * milestone.originalEstimatedDate
               *
               * If original and current ETA differ,
               * show old date struck-through and
               * current revised ETA highlighted.
               */
              const hasRevisedEstimate =
                Boolean(
                  milestone.originalEstimatedDate
                ) &&
                isDifferentCalendarDate(
                  milestone.originalEstimatedDate,
                  milestone.estimatedDate
                );

              return (
                <div
                  key={
                    milestone._id ||
                    `${milestone.code}-${index}`
                  }
                  className={[
                    "ot-timeline-row",
                    completed
                      ? "ot-timeline-row--completed"
                      : "",
                    current
                      ? "ot-timeline-row--current"
                      : "",
                    pending
                      ? "ot-timeline-row--pending"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="ot-timeline-rail">
                    <div className="ot-timeline-dot">
                      {completed ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        <span>
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {index <
                    milestones.length -
                      1 ? (
                      <div className="ot-timeline-line" />
                    ) : null}
                  </div>

                  <div className="ot-timeline-content">
                    <div className="ot-timeline-top">
                      <div>
                        <div className="ot-milestone-title-row">
                          <h3>
                            {
                              milestone.label
                            }
                          </h3>

                          <span
                            className={`ot-status-pill ${statusMeta.className}`}
                          >
                            <i />

                            {completed
                              ? "Completed"
                              : current
                              ? "Current"
                              : "Upcoming"}
                          </span>
                        </div>

                        <span className="ot-target-day">
                          Stage{" "}
                          {milestone.sequence ||
                            index + 1}
                          {"  •  "}
                          Target Day{" "}
                          {milestone.targetDay ??
                            "—"}
                        </span>
                      </div>

                      {current &&
                      !completed ? (
                        <button
                          type="button"
                          className="ot-done-now-btn"
                          disabled={
                            Boolean(
                              updatingId
                            )
                          }
                          onClick={() =>
                            markDoneNow(
                              milestone
                            )
                          }
                        >
                          <CheckCircle2
                            size={17}
                          />

                          {updatingId ===
                          milestone._id
                            ? "Updating..."
                            : "Mark Done Now"}
                        </button>
                      ) : null}
                    </div>

                    <div className="ot-date-grid">
                      <div className="ot-date-box ot-date-box--estimated">
                        <span className="ot-date-label">
                          <CalendarClock
                            size={15}
                          />
                          Estimated
                        </span>

                        {hasRevisedEstimate ? (
  <div className="ot-estimate-revision">
    <div className="ot-estimate-original">
      <span>
        Original
      </span>

      <strong>
        {formatDate(
          milestone.originalEstimatedDate
        )}
      </strong>
    </div>

    <div className="ot-estimate-revised">
      <span>
        Revised ETA
      </span>

      <strong>
        {formatDate(
          milestone.estimatedDate
        )}
      </strong>
    </div>
  </div>
) : (
  <strong>
    {formatDate(
      milestone.estimatedDate
    )}
  </strong>
)}

{/* ================================================
    ETA REVISION REASON

    Only shown when:
    1. ETA has actually been revised
    2. User entered a reason/comment
================================================ */}
{hasRevisedEstimate &&
milestone.estimatedDateComment ? (
  <div className="ot-eta-revision-reason">
    <span className="ot-eta-revision-reason__label">
      Reason
    </span>

    <span className="ot-eta-revision-reason__text">
      {
        milestone.estimatedDateComment
      }
    </span>
  </div>
) : null}

{!completed ? (
  <button
    type="button"
    className="ot-small-edit"
    onClick={() =>
      setEstimatedModal(
        milestone
      )
    }
  >
    <Pencil
      size={13}
    />
    Revise ETA
  </button>
) : null}
                      </div>

                      <div className="ot-date-arrow">
                        →
                      </div>

                      <div
                        className={[
                          "ot-date-box",
                          completed
                            ? "ot-date-box--actual"
                            : "ot-date-box--waiting",
                        ].join(" ")}
                      >
                        <span className="ot-date-label">
                          <Clock3
                            size={15}
                          />
                          Actual
                        </span>

                        <strong>
                          {formatDateTime(
                            milestone.actualDate
                          )}
                        </strong>

                        {!completed ? (
                          <small>
                            {current
                              ? "Awaiting completion"
                              : "Upcoming stage"}
                          </small>
                        ) : null}
                      </div>
                    </div>

                    {difference ? (
                      <div
                        className={`ot-performance-badge ot-performance-badge--${difference.type}`}
                      >
                        {difference.text}
                      </div>
                    ) : null}

                    {milestone.comment ? (
                      <div className="ot-milestone-comment">
                        {
                          milestone.comment
                        }
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <EditEstimatedDateModal
        open={Boolean(
          estimatedModal
        )}
        tracking={tracking}
        milestone={
          estimatedModal
        }
        initialDate={
          estimatedModal
            ?.estimatedDate
            ? new Date(
                estimatedModal.estimatedDate
              )
                .toISOString()
                .slice(0, 10)
            : ""
        }
        onClose={() =>
          setEstimatedModal(null)
        }
        onUpdated={async () => {
          setEstimatedModal(null);
          await onUpdated?.();
        }}
      />
    </>
  );
};

export default OrderTrackingTimeline;