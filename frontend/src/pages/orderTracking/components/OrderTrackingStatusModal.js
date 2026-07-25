
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  STATUS_OPTIONS,
  getStatusTone,
  humanize,
} from "../orderTrackingUtils";

import OrderTrackingAudioRecorder from "./OrderTrackingAudioRecorder";

const MAX_FILES = 10;

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    description: "No immediate urgency",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Standard production priority",
  },
  {
    value: "high",
    label: "High",
    description: "Requires faster attention",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Immediate management attention",
  },
];

const QUICK_STATUS_OPTIONS = [
  "planning",
  "material_pending",
  "cutting_started",
  "cutting_partial",
  "cutting_completed",
  "machining_started",
  "machining_partial",
  "machining_completed",
  "ready_for_dispatch",
  "loading_started",
  "dispatched",
  "in_transit",
  "reached_destination",
  "delivered",
  "on_hold",
];

const emptyForm = {
  status: "planning",
  priority: "normal",

  plantName: "",
  plantCode: "",

  expectedReadyDate: "",
  expectedDispatchDate: "",

  transporterName: "",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",

  dispatchDateTime: "",
  expectedDeliveryDateTime: "",

  receiverName: "",
  comment: "",
};

const toInputDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toInputDateTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatFileSize = (
  bytes = 0
) => {
  const size = Number(bytes || 0);

  if (!size) {
    return "0 KB";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const getFileIcon = (
  file = {}
) => {
  const type = String(
    file.type || ""
  );

  if (
    type.startsWith("image/")
  ) {
    return "🖼";
  }

  if (
    type.startsWith("audio/")
  ) {
    return "🎤";
  }

  if (
    type.startsWith("video/")
  ) {
    return "🎬";
  }

  if (
    type.includes("pdf")
  ) {
    return "📕";
  }

  if (
    type.includes("sheet") ||
    type.includes("excel")
  ) {
    return "📊";
  }

  return "📄";
};

const requiresDispatchDetails = (
  status
) =>
  [
    "dispatched",
    "in_transit",
    "reached_destination",
    "delivered",
  ].includes(status);

const requiresDeliveryDetails = (
  status
) =>
  status === "delivered";

const requiresHoldComment = (
  status
) =>
  [
    "material_pending",
    "cutting_partial",
    "machining_partial",
    "on_hold",
    "cancelled",
  ].includes(status);

const OrderTrackingStatusModal = ({
  open,
  tracking,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const formRef = useRef(null);
  const fileInputRef =
    useRef(null);

  const [form, setForm] =
    useState(emptyForm);

  const [files, setFiles] =
    useState([]);

  const [audio, setAudio] =
    useState(null);

  const [
    resetAudioKey,
    setResetAudioKey,
  ] = useState(0);

  const [
    validationError,
    setValidationError,
  ] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...emptyForm,

      status:
        tracking?.currentStatus ||
        "planning",

      priority:
        tracking?.priority ||
        "normal",

      plantName:
        tracking?.sourcePlant
          ?.plantName || "",

      plantCode:
        tracking?.sourcePlant
          ?.plantCode || "",

      expectedReadyDate:
        toInputDate(
          tracking
            ?.expectedReadyDate
        ),

      expectedDispatchDate:
        toInputDate(
          tracking
            ?.expectedDispatchDate
        ),

      transporterName:
        tracking?.transporter
          ?.transporterName || "",

      vehicleNumber:
        tracking?.transporter
          ?.vehicleNumber || "",

      driverName:
        tracking?.transporter
          ?.driverName || "",

      driverPhone:
        tracking?.transporter
          ?.driverPhone || "",

      dispatchDateTime:
        toInputDateTime(
          tracking
            ?.dispatchDateTime
        ),

      expectedDeliveryDateTime:
        toInputDateTime(
          tracking
            ?.expectedDeliveryDateTime
        ),

      receiverName:
        tracking?.receiverName ||
        "",

      comment: "",
    });

    setFiles([]);
    setAudio(null);
    setValidationError("");

    setResetAudioKey(
      (previous) =>
        previous + 1
    );
  }, [open, tracking]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        "";
    };
  }, [
    open,
    saving,
    onClose,
  ]);

  const selectedStatus =
    form.status;

  const showDispatchFields =
    useMemo(
      () =>
        requiresDispatchDetails(
          selectedStatus
        ),
      [selectedStatus]
    );

  const showDeliveryFields =
    useMemo(
      () =>
        requiresDeliveryDetails(
          selectedStatus
        ),
      [selectedStatus]
    );

  const commentImportant =
    useMemo(
      () =>
        requiresHoldComment(
          selectedStatus
        ),
      [selectedStatus]
    );

  const selectedStatusOption =
    STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        selectedStatus
    );

  const selectedPriority =
    PRIORITY_OPTIONS.find(
      (option) =>
        option.value ===
        form.priority
    );

  if (!open) {
    return null;
  }

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (validationError) {
      setValidationError("");
    }
  };

  const handleStatusSelect = (
    status
  ) => {
    setForm((previous) => ({
      ...previous,
      status,
    }));

    setValidationError("");
  };

  const handleFileSelection = (
    event
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    setFiles((previous) => {
      const combined = [
        ...previous,
        ...selectedFiles,
      ];

      if (
        combined.length >
        MAX_FILES
      ) {
        setValidationError(
          `Maximum ${MAX_FILES} files are allowed per update.`
        );
      }

      return combined.slice(
        0,
        MAX_FILES
      );
    });

    event.target.value = "";
  };

  const removeFile = (
    indexToRemove
  ) => {
    setFiles((previous) =>
      previous.filter(
        (_, index) =>
          index !==
          indexToRemove
      )
    );
  };

  const validateForm = () => {
    if (!form.status) {
      return "Please select the new order status.";
    }

    if (
      commentImportant &&
      !form.comment.trim() &&
      !audio?.file
    ) {
      return (
        "Please add a short comment or audio update explaining this status."
      );
    }

    if (
      showDispatchFields &&
      !form.transporterName.trim()
    ) {
      return (
        "Please enter the transporter name for a dispatched or in-transit order."
      );
    }

    if (
      showDeliveryFields &&
      !form.receiverName.trim() &&
      !form.comment.trim()
    ) {
      return (
        "Please enter the receiver name or mention delivery confirmation in the comment."
      );
    }

    return "";
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    const error =
      validateForm();

    if (error) {
      setValidationError(error);

      formRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const allFiles = [
      ...files,
    ];

    const durations = [];

    if (audio?.file) {
      allFiles.push(audio.file);

      durations.push(
        audio.durationSeconds ||
          0
      );
    }

    const payload = {
      status:
        form.status,

      priority:
        form.priority,

      plantName:
        form.plantName.trim(),

      plantCode:
        form.plantCode.trim(),

      expectedReadyDate:
        form.expectedReadyDate,

      expectedDispatchDate:
        form.expectedDispatchDate,

      transporterName:
        form.transporterName.trim(),

      vehicleNumber:
        form.vehicleNumber.trim(),

      driverName:
        form.driverName.trim(),

      driverPhone:
        form.driverPhone.trim(),

      dispatchDateTime:
        form.dispatchDateTime,

      expectedDeliveryDateTime:
        form.expectedDeliveryDateTime,

      receiverName:
        form.receiverName.trim(),

      comment:
        form.comment.trim(),

      durationSeconds:
        durations,
    };

    await onSubmit?.(
      payload,
      allFiles
    );
  };

  return (
    <div
      className="ot-modal-overlay ot-status-update-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose?.();
        }
      }}
    >
      <form
        className="ot-status-update-modal ot-status-update-modal-fixed"
        onSubmit={handleSubmit}
      >
        <header className="ot-status-update-header">
          <div className="ot-status-update-title">
            <button
              type="button"
              className="ot-status-update-back"
              onClick={onClose}
              disabled={saving}
              aria-label="Close status update"
            >
              ←
            </button>

            <div>
              <span>
                UPDATE FACTORY STATUS
              </span>

              <h2>
                {tracking?.companyName ||
                  "Order Tracking"}
              </h2>

              <p>
                {tracking?.trackingNumber ||
                  "-"}{" "}
                · SO{" "}
                {tracking?.salesOrderNo ||
                  "-"}
              </p>
            </div>
          </div>

          <div className="ot-status-update-current">
            <span>
              Current Status
            </span>

            <strong
              className={`ot-status-pill ${getStatusTone(
                tracking
                  ?.currentStatus
              )}`}
            >
              {humanize(
                tracking
                  ?.currentStatus ||
                  "order_approved"
              )}
            </strong>
          </div>

          <button
            type="button"
            className="ot-status-update-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div
          ref={formRef}
          className="ot-status-update-body ot-status-update-scroll-area"
        >
          {validationError && (
            <div className="ot-status-validation-error" role="alert" aria-live="polite">
              <span>!</span>

              <p>
                {validationError}
              </p>

              <button
                type="button"
                onClick={() =>
                  setValidationError(
                    ""
                  )
                }
              >
                ×
              </button>
            </div>
          )}

          <section className="ot-status-form-card ot-status-selection-card">
            <header className="ot-status-card-heading">
              <div>
                <span>
                  STEP 1
                </span>

                <h3>
                  Select New Status
                </h3>

                <p>
                  Choose the current
                  factory or dispatch
                  stage.
                </p>
              </div>

              <div className="ot-selected-status-preview">
                <small>
                  Selected
                </small>

                <strong
                  className={`ot-status-pill ${getStatusTone(
                    selectedStatus
                  )}`}
                >
                  {selectedStatusOption
                    ?.label ||
                    humanize(
                      selectedStatus
                    )}
                </strong>
              </div>
            </header>

            <div className="ot-status-option-grid">
              {QUICK_STATUS_OPTIONS.map(
                (status) => {
                  const option =
                    STATUS_OPTIONS.find(
                      (item) =>
                        item.value ===
                        status
                    );

                  const selected =
                    form.status ===
                    status;

                  return (
                    <button
                      type="button"
                      key={status}
                      className={`ot-status-option ${
                        selected
                          ? "selected"
                          : ""
                      } ${getStatusTone(
                        status
                      )}`}
                      onClick={() =>
                        handleStatusSelect(
                          status
                        )
                      }
                      disabled={saving}
                    >
                      <span className="ot-status-option-marker">
                        {selected
                          ? "✓"
                          : ""}
                      </span>

                      <strong>
                        {option?.label ||
                          humanize(
                            status
                          )}
                      </strong>
                    </button>
                  );
                }
              )}
            </div>

            <label className="ot-status-full-select">
              <span>
                All Status Options
              </span>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                disabled={saving}
                required
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>
          </section>

          <section className="ot-status-form-card">
            <header className="ot-status-card-heading">
              <div>
                <span>
                  STEP 2
                </span>

                <h3>
                  Production Information
                </h3>

                <p>
                  Add only the information
                  currently available.
                </p>
              </div>
            </header>

            <div className="ot-status-form-grid">
              <label className="ot-status-field">
                <span>
                  Priority
                </span>

                <select
                  name="priority"
                  value={
                    form.priority
                  }
                  onChange={
                    handleChange
                  }
                  disabled={saving}
                >
                  {PRIORITY_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <small>
                  {selectedPriority
                    ?.description ||
                    ""}
                </small>
              </label>

              <label className="ot-status-field">
                <span>
                  Source Plant
                </span>

                <input
                  name="plantName"
                  value={
                    form.plantName
                  }
                  onChange={
                    handleChange
                  }
                  disabled={saving}
                  placeholder="Factory or warehouse name"
                  autoComplete="off"
                />
              </label>

              <label className="ot-status-field">
                <span>
                  Expected Ready Date
                </span>

                <input
                  type="date"
                  name="expectedReadyDate"
                  value={
                    form.expectedReadyDate
                  }
                  onChange={
                    handleChange
                  }
                  disabled={saving}
                />
              </label>

              <label className="ot-status-field">
                <span>
                  Expected Dispatch Date
                </span>

                <input
                  type="date"
                  name="expectedDispatchDate"
                  value={
                    form.expectedDispatchDate
                  }
                  onChange={
                    handleChange
                  }
                  disabled={saving}
                />
              </label>
            </div>
          </section>

          {showDispatchFields && (
            <section className="ot-status-form-card ot-dispatch-status-card">
              <header className="ot-status-card-heading">
                <div>
                  <span>
                    DISPATCH
                  </span>

                  <h3>
                    Transport Information
                  </h3>

                  <p>
                    Transporter name is
                    required. Remaining
                    fields are optional.
                  </p>
                </div>

                <div className="ot-dispatch-status-icon">
                  🚚
                </div>
              </header>

              <div className="ot-status-form-grid">
                <label className="ot-status-field">
                  <span>
                    Transporter Name *
                  </span>

                  <input
                    name="transporterName"
                    value={
                      form.transporterName
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    placeholder="Transporter or logistics company"
                    autoComplete="off"
                  />
                </label>

                <label className="ot-status-field">
                  <span>
                    Dispatch Date & Time
                  </span>

                  <input
                    type="datetime-local"
                    name="dispatchDateTime"
                    value={
                      form.dispatchDateTime
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                  />
                </label>

                <label className="ot-status-field">
                  <span>
                    Expected Delivery
                  </span>

                  <input
                    type="datetime-local"
                    name="expectedDeliveryDateTime"
                    value={
                      form.expectedDeliveryDateTime
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                  />
                </label>

                <label className="ot-status-field">
                  <span>
                    Vehicle Number
                    <em>
                      Optional
                    </em>
                  </span>

                  <input
                    name="vehicleNumber"
                    value={
                      form.vehicleNumber
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    placeholder="Vehicle registration"
                    autoComplete="off"
                  />
                </label>

                <label className="ot-status-field">
                  <span>
                    Driver Name
                    <em>
                      Optional
                    </em>
                  </span>

                  <input
                    name="driverName"
                    value={
                      form.driverName
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    placeholder="Driver name"
                    autoComplete="off"
                  />
                </label>

                <label className="ot-status-field">
                  <span>
                    Driver Phone
                    <em>
                      Optional
                    </em>
                  </span>

                  <input
                    type="tel"
                    name="driverPhone"
                    value={
                      form.driverPhone
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    placeholder="Driver contact number"
                    autoComplete="off"
                  />
                </label>

                {showDeliveryFields && (
                  <label className="ot-status-field">
                    <span>
                      Receiver Name
                    </span>

                    <input
                      name="receiverName"
                      value={
                        form.receiverName
                      }
                      onChange={
                        handleChange
                      }
                      disabled={saving}
                      placeholder="Customer receiver name"
                      autoComplete="off"
                    />
                  </label>
                )}
              </div>
            </section>
          )}

          <section className="ot-status-form-card">
            <header className="ot-status-card-heading">
              <div>
                <span>
                  STEP 3
                </span>

                <h3>
                  Add Update
                </h3>

                <p>
                  Type a comment or record
                  an audio message.
                </p>
              </div>

              {commentImportant && (
                <span className="ot-status-comment-required">
                  Explanation recommended
                </span>
              )}
            </header>

            <label className="ot-status-comment-field">
              <span>
                Update Comment
              </span>

              <textarea
                name="comment"
                value={
                  form.comment
                }
                onChange={
                  handleChange
                }
                disabled={saving}
                rows={5}
                maxLength={2000}
                placeholder="Example: Cutting partially completed. Remaining 30 x 200 x 275 material is not available and will be moved to the next lot."
              />

              <small>
                {
                  form.comment.length
                }
                /2000
              </small>
            </label>

            <div className="ot-status-audio-section">
              <div className="ot-status-media-heading">
                <div className="ot-status-media-icon">
                  🎤
                </div>

                <div>
                  <strong>
                    Voice Update
                  </strong>

                  <span>
                    Record, listen and
                    attach the audio with
                    this status.
                  </span>
                </div>
              </div>

              <OrderTrackingAudioRecorder
                disabled={saving}
                resetKey={
                  resetAudioKey
                }
                onChange={
                  setAudio
                }
              />
            </div>
          </section>

          <section className="ot-status-form-card">
            <header className="ot-status-card-heading">
              <div>
                <span>
                  STEP 4
                </span>

                <h3>
                  Photos & Documents
                </h3>

                <p>
                  Upload production
                  photos, LR, documents
                  or videos.
                </p>
              </div>

              <span className="ot-status-file-count">
                {files.length}/
                {MAX_FILES}
              </span>
            </header>

            <button
              type="button"
              className="ot-status-file-dropzone"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                saving ||
                files.length >=
                  MAX_FILES
              }
            >
              <span className="ot-status-upload-icon">
                ⇧
              </span>

              <strong>
                Choose Files
              </strong>

              <small>
                Images, audio, video,
                PDF, Word and Excel
              </small>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept="image/*,audio/*,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={
                handleFileSelection
              }
              disabled={saving}
            />

            {files.length > 0 && (
              <div className="ot-status-selected-files">
                {files.map(
                  (file, index) => (
                    <article
                      key={`${file.name}-${file.size}-${index}`}
                    >
                      <span className="ot-status-file-icon">
                        {getFileIcon(
                          file
                        )}
                      </span>

                      <div>
                        <strong>
                          {file.name}
                        </strong>

                        <small>
                          {formatFileSize(
                            file.size
                          )}
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFile(
                            index
                          )
                        }
                        disabled={saving}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section className="ot-status-submit-summary">
            <div>
              <span>
                New Status
              </span>

              <strong
                className={`ot-status-pill ${getStatusTone(
                  selectedStatus
                )}`}
              >
                {selectedStatusOption
                  ?.label ||
                  humanize(
                    selectedStatus
                  )}
              </strong>
            </div>

            <div>
              <span>
                Update Includes
              </span>

              <strong>
                {form.comment.trim()
                  ? "Comment"
                  : "No comment"}
                {audio?.file
                  ? " + Audio"
                  : ""}
                {files.length
                  ? ` + ${files.length} file(s)`
                  : ""}
              </strong>
            </div>
          </section>
        </div>

        <footer className="ot-status-update-footer ot-status-update-footer-sticky">
          <button
            type="button"
            className="ot-status-cancel-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="ot-status-submit-button"
            disabled={saving}
            title="Save this factory status update"
          >
            {saving ? (
              <>
                <span className="ot-status-submit-spinner" />

                Updating Status...
              </>
            ) : (
              <>
                <span>✓</span>

                Save Status Update
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default OrderTrackingStatusModal;