import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Laptop,
  MessageCircle,
  Mic,
  Paperclip,
  RefreshCcw,
  Send,
  ShieldCheck,
  UserCheck,
  UserRound,
  Video,
  X,
} from "lucide-react";

import "./ITSupportChat.css";

import {
  addITSupportMessage,
  updateITSupportStatus,
  reassignITSupportTicket,
  getITSupportAssignableUsers,
} from "../services/itSupportService";

const API_ORIGIN =
  "https://bharatspecialsteels.bharatspecialsteels.com";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",

  "video/mp4",
  "video/webm",

  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",

  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const CLOSED_STATUSES = ["closed", "rejected"];

function ITSupportChat({ ticket, onClose, onUpdated }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const fileInputRef = useRef(null);
  const desktopChatBodyRef = useRef(null);
  const pwaChatBodyRef = useRef(null);

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [filePreviews, setFilePreviews] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const [resolutionForm, setResolutionForm] = useState({
    rootCause: "",
    actionTaken: "",
    preventiveAction: "",
  });

  const isReadOnly = CLOSED_STATUSES.includes(ticket?.status);

  useEffect(() => {
    if (!isAdmin) return;

    getITSupportAssignableUsers()
      .then((data) => {
        setEmployees(data || []);
      })
      .catch(() => {
        setEmployees([]);
      });
  }, [isAdmin]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (desktopChatBodyRef.current) {
        desktopChatBodyRef.current.scrollTop =
          desktopChatBodyRef.current.scrollHeight;
      }

      if (pwaChatBodyRef.current) {
        pwaChatBodyRef.current.scrollTop =
          pwaChatBodyRef.current.scrollHeight;
      }
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [ticket?.messages]);

  useEffect(() => {
    const previews = files.map((file) => ({
      file,
      url: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "",
    }));

    setFilePreviews(previews);

    return () => {
      previews.forEach((item) => {
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [files]);

  const formatLabel = (value) => {
    return String(value || "-")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const getAttachmentUrl = (file) => {
    const value = file?.fileUrl || file?.url || "";

    if (!value) return "";

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("blob:")
    ) {
      return value;
    }

    return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
  };

  const getFileName = (file) => {
    return (
      file?.originalName ||
      file?.fileName ||
      file?.name ||
      "Attachment"
    );
  };

  const getMimeType = (file) => {
    return String(file?.mimeType || file?.type || "").toLowerCase();
  };

  const isImageFile = (file) => {
    const mimeType = getMimeType(file);
    const name = getFileName(file).toLowerCase();

    return (
      mimeType.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)
    );
  };

  const isVideoFile = (file) => {
    const mimeType = getMimeType(file);
    const name = getFileName(file).toLowerCase();

    return (
      mimeType.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v)$/i.test(name)
    );
  };

  const isAudioFile = (file) => {
    const mimeType = getMimeType(file);
    const name = getFileName(file).toLowerCase();

    return (
      mimeType.startsWith("audio/") ||
      /\.(mp3|wav|ogg|m4a|webm)$/i.test(name)
    );
  };

  const validateFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name}: unsupported file type.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: file size must be below 10 MB.`;
    }

    return "";
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const validFiles = [];
    const errors = [];

    selectedFiles.forEach((file) => {
      const validationError = validateFile(file);

      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    });

    setFiles((previousFiles) => {
      const mergedFiles = [...previousFiles];

      validFiles.forEach((newFile) => {
        const duplicate = mergedFiles.some(
          (existingFile) =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size &&
            existingFile.lastModified === newFile.lastModified
        );

        if (!duplicate && mergedFiles.length < MAX_FILES) {
          mergedFiles.push(newFile);
        }
      });

      if (previousFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files are allowed.`);
      }

      return mergedFiles.slice(0, MAX_FILES);
    });

    setFileError(errors.join(" "));
    event.target.value = "";
  };

  const removeSelectedFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );

    setFileError("");
  };

  const clearSelectedFiles = () => {
    setFiles([]);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetComposer = () => {
    setMessage("");
    clearSelectedFiles();
  };

  const sendMessage = async () => {
    const cleanMessage = message.trim();

    if (isReadOnly) {
      alert("This ticket is closed and cannot receive new replies.");
      return;
    }

    if (!cleanMessage && files.length === 0) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("message", cleanMessage);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      await addITSupportMessage(ticket._id, formData);

      resetComposer();
      await onUpdated(ticket._id);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send message"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const performStatusUpdate = async (status, extraPayload = {}) => {
    try {
      setStatusUpdating(true);

      await updateITSupportStatus(ticket._id, {
        status,
        ...extraPayload,
      });

      await onUpdated(ticket._id);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Status update failed"
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const requestStatusChange = async (status) => {
    if (!status || status === ticket.status || statusUpdating) return;

    if (status === "resolved") {
      setPendingStatus(status);

      setResolutionForm({
        rootCause: ticket?.resolution?.rootCause || "",
        actionTaken: ticket?.resolution?.actionTaken || "",
        preventiveAction:
          ticket?.resolution?.preventiveAction || "",
      });

      setShowResolutionModal(true);
      return;
    }

    const confirmed = window.confirm(
      `Change ticket status to "${formatLabel(status)}"?`
    );

    if (!confirmed) return;

    await performStatusUpdate(status);
  };

  const submitResolution = async (event) => {
    event.preventDefault();

    const rootCause = resolutionForm.rootCause.trim();
    const actionTaken = resolutionForm.actionTaken.trim();
    const preventiveAction =
      resolutionForm.preventiveAction.trim();

    if (!rootCause) {
      alert("Please enter root cause.");
      return;
    }

    if (!actionTaken) {
      alert("Please enter action taken.");
      return;
    }

    await performStatusUpdate(pendingStatus || "resolved", {
      rootCause,
      actionTaken,
      preventiveAction,
    });

    setShowResolutionModal(false);
    setPendingStatus("");
  };

  const assignTicket = async (assignedTo) => {
    if (!assignedTo || assigning) return;

    try {
      setAssigning(true);

      await reassignITSupportTicket(ticket._id, {
        assignedTo,
      });

      await onUpdated(ticket._id);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Ticket assignment failed"
      );
    } finally {
      setAssigning(false);
    }
  };

  const refreshTicket = async () => {
    try {
      setRefreshing(true);
      await onUpdated(ticket._id);
    } finally {
      setRefreshing(false);
    }
  };

  const totalAttachments = useMemo(() => {
    const ticketFiles = ticket?.attachments?.length || 0;

    const messageFiles =
      ticket?.messages?.reduce(
        (total, item) =>
          total + (item?.attachments?.length || 0),
        0
      ) || 0;

    return ticketFiles + messageFiles;
  }, [ticket]);

  const renderStoredAttachment = (file, index) => {
    const url = getAttachmentUrl(file);
    const fileName = getFileName(file);

    if (!url) {
      return (
        <div
          key={`${fileName}-${index}`}
          className="it-attachment-file unavailable"
        >
          <FileText size={17} />
          <span>{fileName}</span>
        </div>
      );
    }

    if (isImageFile(file)) {
      return (
        <a
          key={`${fileName}-${index}`}
          className="it-attachment-image"
          href={url}
          target="_blank"
          rel="noreferrer"
          title={`Open ${fileName}`}
        >
          <img src={url} alt={fileName} loading="lazy" />

          <div>
            <ImageIcon size={15} />
            <span>{fileName}</span>
          </div>
        </a>
      );
    }

    if (isVideoFile(file)) {
      return (
        <div
          key={`${fileName}-${index}`}
          className="it-attachment-media"
        >
          <video controls preload="metadata">
            <source src={url} type={file.mimeType || undefined} />
          </video>

          <a href={url} target="_blank" rel="noreferrer">
            <Download size={15} />
            {fileName}
          </a>
        </div>
      );
    }

    if (isAudioFile(file)) {
      return (
        <div
          key={`${fileName}-${index}`}
          className="it-attachment-media audio"
        >
          <audio controls preload="metadata">
            <source src={url} type={file.mimeType || undefined} />
          </audio>

          <a href={url} target="_blank" rel="noreferrer">
            <Download size={15} />
            {fileName}
          </a>
        </div>
      );
    }

    return (
      <a
        key={`${fileName}-${index}`}
        className="it-attachment-file"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        <FileText size={17} />

        <div>
          <strong>{fileName}</strong>
          <span>Open attachment</span>
        </div>

        <Download size={16} />
      </a>
    );
  };

  const renderMessages = () => {
    if (!ticket?.messages?.length) {
      return (
        <div className="it-chat-empty">
          <MessageCircle size={28} />

          <strong>No replies yet</strong>

          <p>
            Write a message or attach supporting evidence below.
          </p>
        </div>
      );
    }

    return ticket.messages.map((chatMessage) => {
      const messageRole = String(
        chatMessage?.createdByRole || ""
      ).toLowerCase();

      const isITMessage = ["admin", "super_admin"].includes(
        messageRole
      );

      return (
        <article
          key={chatMessage._id}
          className={`it-message ${
            isITMessage ? "admin" : "user"
          }`}
        >
          <div className="it-message-head">
            <div className="it-message-person">
              <span>
                {isITMessage ? (
                  <ShieldCheck size={13} />
                ) : (
                  <UserRound size={13} />
                )}
              </span>

              <div>
                <b>{chatMessage.createdByName || "User"}</b>
                <small>
                  {isITMessage ? "IT Support" : "Employee"}
                </small>
              </div>
            </div>

            <time>{formatDate(chatMessage.createdAt)}</time>
          </div>

          {chatMessage.message && <p>{chatMessage.message}</p>}

          {chatMessage.attachments?.length > 0 && (
            <div className="it-attachments">
              {chatMessage.attachments.map(renderStoredAttachment)}
            </div>
          )}
        </article>
      );
    });
  };

  const renderSelectedFiles = () => {
    if (!files.length) return null;

    return (
      <div className="it-selected-attachments">
        <div className="it-selected-attachments-head">
          <strong>
            {files.length} of {MAX_FILES} files selected
          </strong>

          <button
            type="button"
            onClick={clearSelectedFiles}
            disabled={submitting}
          >
            Clear all
          </button>
        </div>

        <div className="it-selected-attachments-list">
          {filePreviews.map(({ file, url }, index) => (
            <div
              className="it-selected-attachment"
              key={`${file.name}-${file.size}-${file.lastModified}`}
            >
              {url ? (
                <img src={url} alt={file.name} />
              ) : (
                <span className="it-selected-file-icon">
                  {file.type.startsWith("video/") ? (
                    <Video size={17} />
                  ) : file.type.startsWith("audio/") ? (
                    <Mic size={17} />
                  ) : (
                    <FileText size={17} />
                  )}
                </span>
              )}

              <div>
                <strong>{file.name}</strong>

                <span>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeSelectedFile(index)}
                disabled={submitting}
                aria-label={`Remove ${file.name}`}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComposer = () => (
    <div className="it-chat-composer">
      {renderSelectedFiles()}

      {fileError && (
        <div className="it-chat-file-error">
          <AlertCircle size={15} />
          <span>{fileError}</span>
        </div>
      )}

      {isReadOnly ? (
        <div className="it-chat-readonly">
          <CheckCircle2 size={17} />

          <div>
            <strong>This ticket is {formatLabel(ticket.status)}</strong>
            <span>
              New messages cannot be added unless the ticket is reopened.
            </span>
          </div>
        </div>
      ) : (
        <div className="it-chat-footer">
          <label
            className={submitting ? "disabled" : ""}
            title="Attach files"
          >
            <Paperclip size={18} />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={submitting}
              accept="image/*,video/mp4,video/webm,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
            />
          </label>

          <input
            value={message}
            disabled={submitting}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              files.length
                ? "Add an optional message..."
                : "Write a reply..."
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !submitting
              ) {
                event.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={
              submitting ||
              (!message.trim() && files.length === 0)
            }
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="it-chat-desktop-shell">
        <div className="it-chat-desktop-header">
          <button
            type="button"
            className="it-chat-desktop-back"
            onClick={onClose}
          >
            <ArrowLeft size={18} />
            Back to Tickets
          </button>

          <div className="it-chat-desktop-heading">
            <span>{ticket.ticketNumber}</span>
            <h2>{ticket.title}</h2>

            <p>
              Created {formatDate(ticket.createdAt)} ·{" "}
              {ticket.messages?.length || 0} messages ·{" "}
              {totalAttachments} attachments
            </p>
          </div>

          <div className="it-chat-desktop-header-actions">
            <span
              className={`it-chat-status-badge status-${ticket.status}`}
            >
              {formatLabel(ticket.status)}
            </span>

            <button
              type="button"
              onClick={refreshTicket}
              disabled={refreshing}
            >
              <RefreshCcw size={16} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="it-chat-desktop-layout">
          <aside className="it-chat-sidebar">
            <section className="it-chat-info-card">
              <div className="it-chat-info-title">
                <Info size={17} />
                <h3>Ticket Information</h3>
              </div>

              <InfoRow
                icon={<UserRound size={15} />}
                label="Raised By"
                value={ticket.raisedByName || "-"}
              />

              <InfoRow
                icon={<UserCheck size={15} />}
                label="Assigned To"
                value={ticket.assignedToName || "IT Support"}
              />

              <InfoRow
                icon={<Laptop size={15} />}
                label="Module"
                value={formatLabel(ticket.category)}
              />

              <InfoRow
                icon={<AlertCircle size={15} />}
                label="Priority"
                value={formatLabel(ticket.priority)}
                valueClass={`priority-${ticket.priority}`}
              />

              <InfoRow
                icon={<Clock3 size={15} />}
                label="Status"
                value={formatLabel(ticket.status)}
              />

              <InfoRow
                icon={<CalendarDays size={15} />}
                label="Created"
                value={formatDate(ticket.createdAt)}
              />
            </section>

            {isAdmin && (
              <section className="it-chat-info-card">
                <div className="it-chat-info-title">
                  <ShieldCheck size={17} />
                  <h3>IT Actions</h3>
                </div>

                <label className="it-chat-admin-field">
                  <span>Assign Ticket</span>

                  <select
                    value={
                      ticket.assignedTo?._id ||
                      ticket.assignedTo ||
                      ""
                    }
                    disabled={assigning}
                    onChange={(event) =>
                      assignTicket(event.target.value)
                    }
                  >
                    <option value="">
                      {assigning
                        ? "Assigning..."
                        : "Select IT person"}
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee._id}
                        value={employee._id}
                      >
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="it-chat-admin-field">
                  <span>Update Status</span>

                  <select
                    value={ticket.status || "open"}
                    disabled={statusUpdating}
                    onChange={(event) =>
                      requestStatusChange(event.target.value)
                    }
                  >
                    <option value="open">Open</option>
                    <option value="acknowledged">
                      Acknowledged
                    </option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">
                      In Progress
                    </option>
                    <option value="waiting_user">
                      Waiting User
                    </option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              </section>
            )}

            <section className="it-chat-info-card">
              <div className="it-chat-info-title">
                <Laptop size={17} />
                <h3>Technical Context</h3>
              </div>

              <InfoRow
                label="Device"
                value={
                  formatLabel(ticket.deviceInfo?.deviceType) || "-"
                }
              />

              <InfoRow
                label="Browser"
                value={ticket.deviceInfo?.browser || "-"}
              />

              <InfoRow
                label="Screen"
                value={
                  ticket.deviceInfo?.screenResolution || "-"
                }
              />

              <InfoRow
                label="Current URL"
                value={ticket.deviceInfo?.currentUrl || "-"}
                compact
              />
            </section>

            {ticket?.resolution?.resolvedAt && (
              <section className="it-chat-info-card resolution">
                <div className="it-chat-info-title">
                  <CheckCircle2 size={17} />
                  <h3>Resolution</h3>
                </div>

                <ResolutionItem
                  label="Root Cause"
                  value={ticket.resolution.rootCause}
                />

                <ResolutionItem
                  label="Action Taken"
                  value={ticket.resolution.actionTaken}
                />

                <ResolutionItem
                  label="Preventive Action"
                  value={ticket.resolution.preventiveAction}
                />

                <ResolutionItem
                  label="Resolved By"
                  value={ticket.resolution.resolvedByName}
                />

                <ResolutionItem
                  label="Resolved On"
                  value={formatDate(ticket.resolution.resolvedAt)}
                />
              </section>
            )}
          </aside>

          <main className="it-chat-conversation-panel">
            <div className="it-chat-conversation-head">
              <div>
                <span>Conversation</span>
                <h3>Ticket Activity & Messages</h3>
              </div>

              <div>
                <MessageCircle size={15} />
                {ticket.messages?.length || 0} messages
              </div>
            </div>

            <div
              className="it-chat-body"
              ref={desktopChatBodyRef}
            >
              <section className="it-ticket-summary">
                <div className="it-ticket-summary-head">
                  <div>
                    <span>Original Request</span>
                    <strong>Issue Description</strong>
                  </div>

                  <time>{formatDate(ticket.createdAt)}</time>
                </div>

                <p>
                  {ticket.description ||
                    "No description provided."}
                </p>

                {ticket.attachments?.length > 0 && (
                  <div className="it-attachments">
                    {ticket.attachments.map(
                      renderStoredAttachment
                    )}
                  </div>
                )}
              </section>

              <div className="it-chat-message-list">
                {renderMessages()}
              </div>
            </div>

            {renderComposer()}
          </main>
        </div>
      </div>

      <div className="it-chat-pwa-shell">
        <div className="it-chat-pwa-page">
          <header className="it-chat-header">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="it-chat-header-content">
              <span>{ticket.ticketNumber}</span>
              <h2>{ticket.title}</h2>

              <p>
                {formatLabel(ticket.category)} ·{" "}
                {formatLabel(ticket.priority)}
              </p>
            </div>

            <button
              type="button"
              className={`it-chat-pwa-refresh ${
                refreshing ? "refreshing" : ""
              }`}
              onClick={refreshTicket}
              disabled={refreshing}
            >
              <RefreshCcw size={16} />
            </button>
          </header>

          <section className="it-chat-pwa-ticket-bar">
            <div>
              <span>Status</span>

              <strong
                className={`status-${ticket.status}`}
              >
                {formatLabel(ticket.status)}
              </strong>
            </div>

            <div>
              <span>Raised By</span>
              <strong>{ticket.raisedByName || "-"}</strong>
            </div>

            <div>
              <span>Assigned To</span>
              <strong>
                {ticket.assignedToName || "IT Support"}
              </strong>
            </div>
          </section>

          {isAdmin && (
            <section className="it-chat-admin-bar">
              <label>
                <span>Assign</span>

                <select
                  value={
                    ticket.assignedTo?._id ||
                    ticket.assignedTo ||
                    ""
                  }
                  disabled={assigning}
                  onChange={(event) =>
                    assignTicket(event.target.value)
                  }
                >
                  <option value="">Select IT Person</option>

                  {employees.map((employee) => (
                    <option
                      key={employee._id}
                      value={employee._id}
                    >
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>

                <select
                  value={ticket.status || "open"}
                  disabled={statusUpdating}
                  onChange={(event) =>
                    requestStatusChange(event.target.value)
                  }
                >
                  <option value="open">Open</option>
                  <option value="acknowledged">
                    Acknowledged
                  </option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">
                    In Progress
                  </option>
                  <option value="waiting_user">
                    Waiting User
                  </option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </section>
          )}

          <div className="it-chat-body" ref={pwaChatBodyRef}>
            <section className="it-ticket-summary">
              <div className="it-ticket-summary-head">
                <div>
                  <span>Original Request</span>
                  <strong>Issue Description</strong>
                </div>

                <time>{formatDate(ticket.createdAt)}</time>
              </div>

              <p>
                {ticket.description ||
                  "No description provided."}
              </p>

              {ticket.attachments?.length > 0 && (
                <div className="it-attachments">
                  {ticket.attachments.map(
                    renderStoredAttachment
                  )}
                </div>
              )}
            </section>

            <div className="it-chat-message-list">
              {renderMessages()}
            </div>

            {ticket?.resolution?.resolvedAt && (
              <section className="it-pwa-resolution-card">
                <div>
                  <CheckCircle2 size={17} />
                  <strong>Resolution Details</strong>
                </div>

                <ResolutionItem
                  label="Root Cause"
                  value={ticket.resolution.rootCause}
                />

                <ResolutionItem
                  label="Action Taken"
                  value={ticket.resolution.actionTaken}
                />

                <ResolutionItem
                  label="Preventive Action"
                  value={ticket.resolution.preventiveAction}
                />
              </section>
            )}
          </div>

          {renderComposer()}
        </div>
      </div>

      {showResolutionModal && (
        <div className="it-resolution-overlay">
          <form
            className="it-resolution-modal"
            onSubmit={submitResolution}
          >
            <div className="it-resolution-header">
              <div>
                <span>Complete Resolution</span>
                <h3>Resolve IT Ticket</h3>
                <p>
                  Record the root cause and action taken before
                  resolving the ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                disabled={statusUpdating}
              >
                <X size={18} />
              </button>
            </div>

            <label>
              Root Cause *
              <textarea
                value={resolutionForm.rootCause}
                disabled={statusUpdating}
                placeholder="Explain the actual cause of the issue..."
                onChange={(event) =>
                  setResolutionForm((previous) => ({
                    ...previous,
                    rootCause: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Action Taken *
              <textarea
                value={resolutionForm.actionTaken}
                disabled={statusUpdating}
                placeholder="Explain what was done to resolve it..."
                onChange={(event) =>
                  setResolutionForm((previous) => ({
                    ...previous,
                    actionTaken: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Preventive Action
              <textarea
                value={resolutionForm.preventiveAction}
                disabled={statusUpdating}
                placeholder="Mention how the issue can be avoided in future..."
                onChange={(event) =>
                  setResolutionForm((previous) => ({
                    ...previous,
                    preventiveAction: event.target.value,
                  }))
                }
              />
            </label>

            <div className="it-resolution-actions">
              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                disabled={statusUpdating}
              >
                Cancel
              </button>

              <button type="submit" disabled={statusUpdating}>
                <CheckCircle2 size={16} />
                {statusUpdating
                  ? "Resolving..."
                  : "Resolve Ticket"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueClass = "",
  compact = false,
}) {
  return (
    <div className={`it-chat-info-row ${compact ? "compact" : ""}`}>
      {icon && <span>{icon}</span>}

      <div>
        <small>{label}</small>
        <strong className={valueClass}>{value || "-"}</strong>
      </div>
    </div>
  );
}

function ResolutionItem({ label, value }) {
  if (!value) return null;

  return (
    <div className="it-resolution-item">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

export default ITSupportChat;