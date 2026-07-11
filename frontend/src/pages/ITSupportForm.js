import { useRef, useState } from "react";
import {
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import "./ITSupportForm.css";
import { createITSupportTicket } from "../services/itSupportService";

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

function ITSupportForm({ onClose, onCreated }) {
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm] = useState({
    title: "",
    category: "other",
    priority: "medium",
    description: "",
  });

  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const getFileIdentity = (file) =>
    `${file.name}-${file.size}-${file.lastModified}`;

  const validateFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name}: unsupported file type.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: file size must be below 10 MB.`;
    }

    return "";
  };

  const handleFileSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setFileError("");

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
        const alreadySelected = mergedFiles.some(
          (existingFile) =>
            getFileIdentity(existingFile) === getFileIdentity(newFile)
        );

        if (!alreadySelected && mergedFiles.length < MAX_FILES) {
          mergedFiles.push(newFile);
        }
      });

      if (previousFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} attachments are allowed.`);
      }

      return mergedFiles.slice(0, MAX_FILES);
    });

    if (errors.length) {
      setFileError(errors.join(" "));
    }

    // Allows user to select the same file again after deleting it.
    event.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );

    setFileError("");
  };

  const clearFiles = () => {
    setFiles([]);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon size={18} />;
    }

    if (file.type.startsWith("video/")) {
      return <Video size={18} />;
    }

    if (file.type.startsWith("audio/")) {
      return <Mic size={18} />;
    }

    return <FileText size={18} />;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const cleanTitle = form.title.trim();
    const cleanDescription = form.description.trim();

    if (!cleanTitle) {
      alert("Please enter issue title.");
      return;
    }

    if (cleanTitle.length < 5) {
      alert("Issue title should contain at least 5 characters.");
      return;
    }

    if (!cleanDescription && files.length === 0) {
      alert("Please provide issue description or upload a screenshot.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("title", cleanTitle);
      formData.append("category", form.category);
      formData.append("priority", form.priority);
      formData.append("description", cleanDescription);

      formData.append("currentUrl", window.location.href);
      formData.append(
        "screenResolution",
        `${window.screen.width}x${window.screen.height}`
      );

      formData.append(
        "deviceType",
        window.innerWidth <= 900 ? "mobile_pwa" : "desktop_web"
      );

      formData.append(
        "browser",
        navigator.userAgent || "Unknown browser"
      );

      formData.append(
        "os",
        navigator.platform || "Unknown operating system"
      );

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await createITSupportTicket(formData);

      alert(
        response?.message ||
          "IT support ticket created and assigned successfully."
      );

      await onCreated(response?.data);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create IT support ticket"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="it-form-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <form className="it-form-card" onSubmit={submit}>
        <div className="it-form-head">
          <div className="it-form-title-group">
            <span className="it-form-kicker">Bharat IT Helpdesk</span>

            <h2>Raise IT Issue</h2>

            <p>
              Provide clear information so the issue can be reproduced,
              investigated, and resolved quickly.
            </p>
          </div>

          <button
            type="button"
            className="it-form-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </div>

        <div className="it-form-assignment-card">
          <div className="it-form-user-avatar">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>

          <div>
            <span>Raised by</span>
            <strong>{user?.name || "Logged-in user"}</strong>
            <small>{user?.email || ""}</small>
          </div>

          <div className="it-form-assignee">
            <ShieldCheck size={18} />

            <div>
              <span>Automatically assigned to</span>
              <strong>Ankit Singh · IT Support</strong>
            </div>
          </div>
        </div>

        <div className="it-form-section">
          <div className="it-form-section-title">
            <span>01</span>

            <div>
              <h3>Issue details</h3>
              <p>Tell us where the issue occurred and how serious it is.</p>
            </div>
          </div>

          <label className="it-form-field">
            <span>Issue Title *</span>

            <input
              name="title"
              value={form.title}
              onChange={update}
              maxLength={180}
              disabled={submitting}
              placeholder="Example: Attendance check-in is not working"
              autoFocus
            />

            <small>{form.title.length}/180</small>
          </label>

          <div className="it-form-row">
            <label className="it-form-field">
              <span>Module *</span>

              <select
                name="category"
                value={form.category}
                onChange={update}
                disabled={submitting}
              >
                <option value="attendance">Attendance</option>
                <option value="sales_order">Sales Order</option>
                <option value="dispatch">Dispatch</option>
                <option value="enquiry">Enquiry</option>
                <option value="document">Documents</option>
                <option value="receivable">Receivables</option>
                <option value="payment">Payment</option>
                <option value="dashboard">Dashboard</option>
                <option value="login">Login</option>
                <option value="mobile_app">Mobile App / PWA</option>
                <option value="performance">Slow Performance</option>
                <option value="bug">Application Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="it-form-field">
              <span>Priority *</span>

              <select
                name="priority"
                value={form.priority}
                onChange={update}
                disabled={submitting}
              >
                <option value="low">Low — General assistance</option>
                <option value="medium">Medium — Work affected</option>
                <option value="high">High — Work blocked</option>
                <option value="critical">
                  Critical — Business operation stopped
                </option>
              </select>
            </label>
          </div>

          <label className="it-form-field">
            <span>Description</span>

            <textarea
              name="description"
              value={form.description}
              onChange={update}
              rows={6}
              maxLength={5000}
              disabled={submitting}
              placeholder={`Please explain:
1. What were you trying to do?
2. What happened?
3. What did you expect?
4. Is any error message visible?`}
            />

            <small>{form.description.length}/5000</small>
          </label>
        </div>

        <div className="it-form-section">
          <div className="it-form-section-title">
            <span>02</span>

            <div>
              <h3>Evidence and attachments</h3>
              <p>
                Add screenshots, videos, documents, or voice recordings.
              </p>
            </div>
          </div>

          <label className="it-file-box">
            <div className="it-file-icon">
              <Paperclip size={21} />
            </div>

            <div>
              <strong>Select evidence</strong>
              <span>
                Image, video, audio, PDF, Word, or Excel · Maximum 5 files ·
                10 MB each
              </span>
            </div>

            <b>Browse</b>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={submitting}
              accept="image/*,video/mp4,video/webm,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelection}
            />
          </label>

          {fileError && (
            <div className="it-file-error">
              <AlertCircle size={16} />
              <span>{fileError}</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="it-selected-files-wrapper">
              <div className="it-selected-files-head">
                <strong>
                  {files.length} of {MAX_FILES} file
                  {files.length > 1 ? "s" : ""} selected
                </strong>

                <button
                  type="button"
                  onClick={clearFiles}
                  disabled={submitting}
                >
                  Remove all
                </button>
              </div>

              <div className="it-selected-files">
                {files.map((file, index) => (
                  <div
                    className="it-selected-file"
                    key={getFileIdentity(file)}
                  >
                    <div className="it-selected-file-icon">
                      {getFileIcon(file)}
                    </div>

                    <div className="it-selected-file-info">
                      <strong>{file.name}</strong>

                      <span>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={submitting}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="it-form-guideline">
          <AlertCircle size={18} />

          <p>
            This request will be recorded with your name, date, time, device
            information, and issue history. You and management will be able to
            track its progress.
          </p>
        </div>

        <div className="it-form-actions">
          <button
            type="button"
            className="it-form-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="it-form-submit"
            disabled={submitting}
          >
            {submitting ? "Creating and Assigning..." : "Create IT Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ITSupportForm;