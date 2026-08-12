import React, {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import {
  updateMilestoneEstimatedDate,
} from "../../../services/orderTrackingService";

const EditEstimatedDateModal = ({
  open,
  tracking,
  milestone,
  initialDate,
  onClose,
  onUpdated,
}) => {
  const [
    estimatedDate,
    setEstimatedDate,
  ] = useState("");

  const [comment, setComment] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (open) {
      setEstimatedDate(
        initialDate || ""
      );

      setComment("");
      setError("");
    }
  }, [
    open,
    initialDate,
  ]);

  if (!open) {
    return null;
  }

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (!estimatedDate) {
      setError(
        "Please select an estimated date."
      );
      return;
    }

    if (
      !tracking?._id ||
      !milestone?._id
    ) {
      setError(
        "Tracking milestone is not available."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await updateMilestoneEstimatedDate(
        tracking._id,
        milestone._id,
        {
          estimatedDate,
          comment,
        }
      );

      await onUpdated?.();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to update estimated date"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="ot-modal-backdrop"
      role="presentation"
      onMouseDown={
        saving ? undefined : onClose
      }
    >
      <form
        className="ot-modal"
        onSubmit={submit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="ot-modal__head">
          <div>
            <span className="ot-eyebrow">
              REVISE PLAN
            </span>

            <h3>
              Change Estimated Date
            </h3>

            <p>
              {milestone?.label}
            </p>
          </div>

          <button
            type="button"
            className="ot-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="ot-modal__body">
          <label>
            <span>
              New Estimated Date
            </span>

            <div className="ot-date-input">
              <CalendarDays
                size={15}
              />

              <input
                type="date"
                value={
                  estimatedDate
                }
                onChange={(event) =>
                  setEstimatedDate(
                    event.target.value
                  )
                }
                required
              />
            </div>
          </label>

          <label>
            <span>
              Reason / Comment
            </span>

            <textarea
              rows="3"
              value={comment}
              onChange={(event) =>
                setComment(
                  event.target.value
                )
              }
              placeholder="Example: Mill revised forging plan"
            />
          </label>

          <div className="ot-modal-note">
            This will update the
            selected milestone and your
            backend will shift later
            pending milestones by the
            same date difference.
          </div>

          {error ? (
            <div className="ot-inline-error ot-inline-error--modal">
              {error}
            </div>
          ) : null}
        </div>

        <div className="ot-modal__footer">
          <button
            type="button"
            className="ot-btn ot-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="ot-btn ot-btn--primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="ot-spin"
                />
                Saving
              </>
            ) : (
              "Update ETA"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEstimatedDateModal;
