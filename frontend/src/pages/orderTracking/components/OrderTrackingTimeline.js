import React, {
  useMemo,
  useState,
} from "react";

import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Pencil,
  UserRound,
} from "lucide-react";

import {
  markMilestoneDoneNow,
} from "../../../services/orderTrackingService";

import EditEstimatedDateModal from "./EditEstimatedDateModal";

import {
  formatDate,
  formatDateTime,
  getBaselineDate,
  getDifferenceLabel,
  getStatusMeta,
  isDifferentCalendarDate,
} from "../orderTrackingUtils";

/* =========================================================
   HELPERS
========================================================= */

const isMilestoneCompleted = (
  milestone
) => {
  return (
    milestone?.status ===
      "completed" ||
    milestone?.status ===
      "skipped" ||
    Boolean(
      milestone?.actualDate
    )
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

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

  /* =======================================================
     SORT MILESTONES
  ======================================================= */

  const milestones =
    useMemo(() => {
      return [
        ...(
          tracking
            ?.milestones ||
          []
        ),
      ].sort(
        (
          a,
          b
        ) =>
          Number(
            a.sequence ||
            0
          ) -
          Number(
            b.sequence ||
            0
          )
      );
    }, [
      tracking?.milestones,
    ]);

  /* =======================================================
     PLANNING

     Planning should already be completed by backend when
     Sales Order receives final approval.
  ======================================================= */

  const planningMilestone =
    useMemo(() => {
      return milestones.find(
        (
          milestone
        ) =>
          milestone.code ===
          "planning"
      );
    }, [
      milestones,
    ]);

  const planningCompleted =
    Boolean(
      planningMilestone
    ) &&
    isMilestoneCompleted(
      planningMilestone
    );

  /* =======================================================
     RESOLVE EFFECTIVE CURRENT MILESTONE

     Production-safe resolution order:

     1. milestone.isCurrent
     2. tracking.currentMilestoneId
     3. tracking.currentStatus
     4. first incomplete stage AFTER Planning

     The fallback is used ONLY if Planning is already
     completed.

     This protects old records where currentMilestoneId
     may be stale after Planning auto-completion.
  ======================================================= */

  const effectiveCurrentMilestone =
    useMemo(() => {
      /* -----------------------------------------------
         1. Explicit isCurrent from milestone
      ----------------------------------------------- */

      const explicitCurrent =
        milestones.find(
          (
            milestone
          ) =>
            milestone
              .isCurrent ===
              true &&
            !isMilestoneCompleted(
              milestone
            ) &&
            milestone.code !==
              "planning"
        );

      if (
        explicitCurrent
      ) {
        return explicitCurrent;
      }

      /* -----------------------------------------------
         2. Current milestone ID
      ----------------------------------------------- */

      const currentById =
        milestones.find(
          (
            milestone
          ) =>
            String(
              milestone._id ||
              ""
            ) ===
              String(
                tracking
                  ?.currentMilestoneId ||
                ""
              ) &&
            !isMilestoneCompleted(
              milestone
            ) &&
            milestone.code !==
              "planning"
        );

      if (
        currentById
      ) {
        return currentById;
      }

      /* -----------------------------------------------
         3. Current status code

         This is important because backend may correctly
         update currentStatus even when an older document
         still contains a stale currentMilestoneId.
      ----------------------------------------------- */

      const currentByStatus =
        milestones.find(
          (
            milestone
          ) =>
            milestone.code ===
              tracking
                ?.currentStatus &&
            !isMilestoneCompleted(
              milestone
            ) &&
            milestone.code !==
              "planning"
        );

      if (
        currentByStatus
      ) {
        return currentByStatus;
      }

      /* -----------------------------------------------
         4. Defensive fallback

         ONLY after Planning has already been completed.

         Never allow frontend to pretend Planning is done
         when backend still says it is incomplete.
      ----------------------------------------------- */

      if (
        planningCompleted
      ) {
        return (
          milestones.find(
            (
              milestone
            ) =>
              milestone.code !==
                "planning" &&
              !isMilestoneCompleted(
                milestone
              )
          ) ||
          null
        );
      }

      return null;
    }, [
      milestones,
      planningCompleted,
      tracking
        ?.currentMilestoneId,
      tracking
        ?.currentStatus,
    ]);

  const effectiveCurrentId =
    String(
      effectiveCurrentMilestone
        ?._id ||
      ""
    );

  /* =======================================================
     MARK DONE
  ======================================================= */

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

      /*
       * Frontend safety:
       * Planning can never be manually completed.
       */
      if (
        milestone.code ===
        "planning"
      ) {
        setError(
          "Planning is completed automatically when the Sales Order is approved."
        );

        return;
      }

      /*
       * Only effective current stage may be completed.
       */
      if (
        String(
          milestone._id
        ) !==
        effectiveCurrentId
      ) {
        setError(
          "Only the current stage can be completed."
        );

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

      } catch (
        err
      ) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Failed to complete milestone"
        );

      } finally {
        setUpdatingId("");
      }
    };

  /* =======================================================
     EMPTY TIMELINE
  ======================================================= */

  if (
    milestones.length ===
    0
  ) {
    return (
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
              No production milestones
              are available for this order.
            </p>
          </div>

        </div>
      </section>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <section className="ot-timeline-card">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="ot-section-heading">

          <div>
            <span className="ot-section-kicker">
              DETAILED JOURNEY
            </span>

            <h2>
              Production & Delivery Timeline
            </h2>

            <p>
              Full operational timeline
              with original plan, revised
              plan and completion details.
            </p>
          </div>

          <div className="ot-progress-summary">
            <strong>
              {Math.round(
                Number(
                  tracking
                    ?.progressPercentage ||
                  0
                )
              )}
              %
            </strong>

            <span>
              Completed
            </span>
          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error ? (
          <div className="ot-inline-error">
            {error}
          </div>
        ) : null}

        {/* =================================================
            TIMELINE
        ================================================= */}

        <div className="ot-timeline">

          {milestones.map(
            (
              milestone,
              index
            ) => {
              /* ===========================================
                 BASIC STATE
              =========================================== */

              const completed =
                isMilestoneCompleted(
                  milestone
                );

              const isPlanning =
                milestone.code ===
                "planning";

              /*
               * IMPORTANT:
               *
               * Use resolved current milestone instead of
               * relying only on milestone.isCurrent.
               */
              const current =
                !completed &&
                !isPlanning &&
                String(
                  milestone._id ||
                  ""
                ) ===
                  effectiveCurrentId;

              const pending =
                !completed &&
                !current;

              /*
               * Mark Done is available ONLY for:
               *
               * - current stage
               * - non-Planning stage
               * - incomplete stage
               */
              const canMarkDone =
                current &&
                !completed &&
                !isPlanning;

              /* ===========================================
                 PERFORMANCE

                 Original baseline remains the management
                 performance baseline.
              =========================================== */

              const baselineDate =
                getBaselineDate(
                  milestone
                );

              const difference =
                getDifferenceLabel(
                  baselineDate,
                  milestone
                    .actualDate
                );

              /* ===========================================
                 STATUS META
              =========================================== */

              const statusMeta =
                getStatusMeta(
                  milestone.code
                );

              /* ===========================================
                 REVISED PLAN
              =========================================== */

              const hasRevisedEstimate =
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

              /* ===========================================
                 COMPLETED BY
              =========================================== */

              const completedByName =
                milestone
                  ?.completedBy
                  ?.name ||
                "";

              /* ===========================================
                 RENDER ROW
              =========================================== */

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
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                >

                  {/* =======================================
                      LEFT RAIL
                  ======================================= */}

                  <div className="ot-timeline-rail">

                    <div className="ot-timeline-dot">

                      {completed ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        <span>
                          {index +
                            1}
                        </span>
                      )}

                    </div>

                    {index <
                    milestones.length -
                      1 ? (
                      <div className="ot-timeline-line" />
                    ) : null}

                  </div>

                  {/* =======================================
                      CONTENT
                  ======================================= */}

                  <div className="ot-timeline-content">

                    {/* =====================================
                        TOP
                    ===================================== */}

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
                            index +
                              1}

                          {"  •  "}

                          Target Day{" "}

                          {milestone
                            .targetDay ??
                            "—"}
                        </span>

                      </div>

                      {/* ===================================
                          COMPLETE CURRENT STAGE

                          Planning NEVER gets this button.
                      =================================== */}

                      {canMarkDone ? (
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
                            : `Complete ${milestone.label}`}
                        </button>
                      ) : null}

                    </div>

                    {/* =====================================
                        DATES
                    ===================================== */}

                    <div className="ot-date-grid">

                      {/* ===================================
                          PLAN DATE
                      =================================== */}

                      <div className="ot-date-box ot-date-box--estimated">

                        <span className="ot-date-label">
                          <CalendarClock
                            size={15}
                          />

                          Plan Date
                        </span>

                        {hasRevisedEstimate ? (
                          <div className="ot-estimate-revision">

                            {/* =============================
                                ORIGINAL PLAN
                            ============================= */}

                            <div className="ot-estimate-original">

                              <span>
                                Original Plan
                              </span>

                              <strong>
                                {formatDate(
                                  milestone
                                    .originalEstimatedDate
                                )}
                              </strong>

                            </div>

                            {/* =============================
                                REVISED PLAN
                            ============================= */}

                            <div className="ot-estimate-revised">

                              <span>
                                Revised Plan
                              </span>

                              <strong>
                                {formatDate(
                                  milestone
                                    .estimatedDate
                                )}
                              </strong>

                            </div>

                          </div>
                        ) : (
                          <strong>
                            {formatDate(
                              milestone
                                .estimatedDate
                            )}
                          </strong>
                        )}

                        {/* ===============================
                            REVISION REASON
                        =============================== */}

                        {hasRevisedEstimate &&
                        milestone
                          .estimatedDateComment ? (
                          <div className="ot-eta-revision-reason">

                            <span className="ot-eta-revision-reason__label">
                              Revision Reason
                            </span>

                            <span className="ot-eta-revision-reason__text">
                              {
                                milestone
                                  .estimatedDateComment
                              }
                            </span>

                          </div>
                        ) : null}

                        {/* ===============================
                            REVISE PLAN

                            Planning cannot be revised
                            after approval because it is
                            automatically completed.
                        =============================== */}

                        {!completed &&
                        !isPlanning ? (
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

                            Revise Plan Date
                          </button>
                        ) : null}

                      </div>

                      {/* ===================================
                          ARROW
                      =================================== */}

                      <div className="ot-date-arrow">
                        →
                      </div>

                      {/* ===================================
                          COMPLETION DATE
                      =================================== */}

                      <div
                        className={[
                          "ot-date-box",

                          completed
                            ? "ot-date-box--actual"
                            : "ot-date-box--waiting",
                        ].join(
                          " "
                        )}
                      >

                        <span className="ot-date-label">
                          <Clock3
                            size={15}
                          />

                          Completion Date
                        </span>

                        <strong>
                          {completed
                            ? formatDateTime(
                                milestone
                                  .actualDate
                              )
                            : "Not completed"}
                        </strong>

                        {!completed ? (
                          <small>
                            {current
                              ? `${milestone.label} is currently in progress`
                              : isPlanning
                              ? "Planning is completed automatically on Sales Order approval"
                              : "This stage has not started yet"}
                          </small>
                        ) : null}

                      </div>

                    </div>

                    {/* =====================================
                        PERFORMANCE
                    ===================================== */}

                    {difference ? (
                      <div
                        className={`ot-performance-badge ot-performance-badge--${difference.type}`}
                      >
                        {
                          difference.text
                        }
                      </div>
                    ) : null}

                    {/* =====================================
                        COMPLETED BY
                    ===================================== */}

                    {completed ? (
                      <div className="ot-completion-byline">

                        <UserRound
                          size={15}
                        />

                        <span>

                          <strong>
                            {completedByName ||
                              (
                                isPlanning
                                  ? "Sales Order Approver"
                                  : "User"
                              )}
                          </strong>

                          {" marked "}

                          <strong>
                            {
                              milestone.label
                            }
                          </strong>

                          {isPlanning
                            ? " completed through Sales Order approval at "
                            : " completed at "}

                          <strong>
                            {formatDateTime(
                              milestone
                                .actualDate
                            )}
                          </strong>

                          .

                        </span>

                      </div>
                    ) : null}

                    {/* =====================================
                        COMMENT
                    ===================================== */}

                    {milestone.comment &&
                    milestone.comment !==
                      `${milestone.label} completed` ? (
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

      {/* ===================================================
          REVISE DATE MODAL
      =================================================== */}

      <EditEstimatedDateModal
        open={
          Boolean(
            estimatedModal
          )
        }

        tracking={
          tracking
        }

        milestone={
          estimatedModal
        }

        initialDate={
          estimatedModal
            ?.estimatedDate
            ? new Date(
                estimatedModal
                  .estimatedDate
              )
                .toISOString()
                .slice(
                  0,
                  10
                )
            : ""
        }

        onClose={() =>
          setEstimatedModal(
            null
          )
        }

        onUpdated={async () => {
          setEstimatedModal(
            null
          );

          await onUpdated?.();
        }}
      />

    </>
  );
};

export default OrderTrackingTimeline;