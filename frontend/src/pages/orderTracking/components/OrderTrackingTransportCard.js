import React, {
  useEffect,
  useState,
} from "react";

import {
  Save,
  Truck,
} from "lucide-react";

import {
  updateOrderTrackingTransporter,
} from "../../../services/orderTrackingService";

const EMPTY_FORM = {
  transporterName: "",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  lrNumber: "",
};

const OrderTrackingTransportCard = ({
  tracking,
  onUpdated,
}) => {
  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  useEffect(() => {
    setForm({
      transporterName:
        tracking?.transporter
          ?.transporterName ||
        "",

      vehicleNumber:
        tracking?.transporter
          ?.vehicleNumber ||
        "",

      driverName:
        tracking?.transporter
          ?.driverName ||
        "",

      driverPhone:
        tracking?.transporter
          ?.driverPhone ||
        "",

      lrNumber:
        tracking?.transporter
          ?.lrNumber ||
        "",
    });
  }, [tracking]);

  const updateField = (
    key,
    value
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [key]:
          key ===
          "vehicleNumber"
            ? value.toUpperCase()
            : value,
      })
    );
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");

      await updateOrderTrackingTransporter(
        tracking._id,
        form
      );

      setEditing(false);

      await onUpdated?.();
    } catch (err) {
      setError(
        err?.message ||
        "Failed to update transporter"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ot-side-card">
      <div className="ot-side-card__head">
        <div>
          <span className="ot-eyebrow">
            DISPATCH
          </span>

          <h3>
            Transport Details
          </h3>
        </div>

        <button
          type="button"
          className="ot-text-button"
          onClick={() =>
            setEditing(
              (value) =>
                !value
            )
          }
        >
          {editing
            ? "Cancel"
            : "Update"}
        </button>
      </div>

      {error ? (
        <div className="ot-inline-error ot-inline-error--side">
          {error}
        </div>
      ) : null}

      {!editing ? (
        <div className="ot-transport-summary">
          <div className="ot-transport-hero">
            <div>
              <Truck
                size={18}
              />
            </div>

            <section>
              <span>
                TRANSPORTER
              </span>

              <strong>
                {tracking?.transporter
                  ?.transporterName ||
                  "Not assigned"}
              </strong>
            </section>
          </div>

          <div className="ot-transport-grid">
            <div>
              <span>
                Vehicle
              </span>

              <strong>
                {tracking?.transporter
                  ?.vehicleNumber ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Driver
              </span>

              <strong>
                {tracking?.transporter
                  ?.driverName ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Phone
              </span>

              <strong>
                {tracking?.transporter
                  ?.driverPhone ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                LR No.
              </span>

              <strong>
                {tracking?.transporter
                  ?.lrNumber ||
                  "—"}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="ot-transport-form">
          <label>
            <span>
              Transporter
            </span>

            <input
              value={
                form.transporterName
              }
              onChange={(event) =>
                updateField(
                  "transporterName",
                  event.target.value
                )
              }
              placeholder="Transporter name"
            />
          </label>

          <label>
            <span>
              Vehicle No.
            </span>

            <input
              value={
                form.vehicleNumber
              }
              onChange={(event) =>
                updateField(
                  "vehicleNumber",
                  event.target.value
                )
              }
              placeholder="HR38AB1234"
            />
          </label>

          <label>
            <span>
              Driver Name
            </span>

            <input
              value={
                form.driverName
              }
              onChange={(event) =>
                updateField(
                  "driverName",
                  event.target.value
                )
              }
              placeholder="Driver name"
            />
          </label>

          <label>
            <span>
              Driver Phone
            </span>

            <input
              value={
                form.driverPhone
              }
              onChange={(event) =>
                updateField(
                  "driverPhone",
                  event.target.value
                )
              }
              placeholder="9876543210"
            />
          </label>

          <label>
            <span>
              LR / Docket No.
            </span>

            <input
              value={
                form.lrNumber
              }
              onChange={(event) =>
                updateField(
                  "lrNumber",
                  event.target.value
                )
              }
              placeholder="LR-001"
            />
          </label>

          <button
            type="button"
            className="ot-save-transport"
            disabled={saving}
            onClick={save}
          >
            <Save size={15} />

            {saving
              ? "Saving..."
              : "Save Details"}
          </button>
        </div>
      )}
    </section>
  );
};

export default OrderTrackingTransportCard;
