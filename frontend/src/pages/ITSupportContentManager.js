import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  HelpCircle,
  Info,
  Megaphone,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import "./ITSupportContentManager.css";

import {
  createITSupportContent,
} from "../services/itSupportService";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_JSON_SIZE = 2 * 1024 * 1024;
const MAX_BULK_RECORDS = 200;

const VALID_RECORD_TYPES = ["faq", "guide", "announcement"];

const VALID_CATEGORIES = [
  "general",
  "attendance",
  "sales_order",
  "dispatch",
  "enquiry",
  "document",
  "receivable",
  "payment",
  "dashboard",
  "login",
  "mobile_app",
  "performance",
  "bug",
  "feature_request",
  "other",
];

const VALID_STATUSES = ["published", "draft"];

const VALID_VISIBILITIES = ["all", "admin_only", "it_only"];

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
];

const EMPTY_FORM = {
  recordType: "faq",
  title: "",
  category: "general",
  description: "",
  status: "published",
  visibility: "all",
};

const SAMPLE_JSON_DATA = [
  {
    recordType: "faq",
    category: "attendance",
    title: "Why is my check-out button disabled?",
    description:
      "Check-out is enabled only after successful check-in and submission of today's work report.",
    status: "published",
    visibility: "all",
  },
  {
    recordType: "faq",
    category: "attendance",
    title: "What are short hours?",
    description:
      "Attendance is marked as Short Hours when total working time is below 9 hours.",
    status: "published",
    visibility: "all",
  },
  {
    recordType: "guide",
    category: "attendance",
    title: "How to request attendance regularization",
    description:
      "Open Attendance, select the required date, click Request Regularization, enter the requested time and a clear reason, then submit.",
    status: "published",
    visibility: "all",
  },
  {
    recordType: "announcement",
    category: "general",
    title: "Attendance module updated",
    description:
      "The attendance module now provides improved regularization tracking and monthly attendance visibility.",
    status: "published",
    visibility: "all",
  },
];

function ITSupportContentManager({ onUpdated }) {
  const attachmentInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [mode, setMode] = useState("single");

  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");

  const [jsonFile, setJsonFile] = useState(null);
  const [jsonRecords, setJsonRecords] = useState([]);
  const [jsonErrors, setJsonErrors] = useState([]);
  const [jsonGeneralError, setJsonGeneralError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    successful: 0,
    failed: 0,
  });

  const validJsonRecords = useMemo(() => {
    return jsonRecords.filter((record) => record.isValid);
  }, [jsonRecords]);

  const invalidJsonRecords = useMemo(() => {
    return jsonRecords.filter((record) => !record.isValid);
  }, [jsonRecords]);

  const update = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const getAttachmentIdentity = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  const resetSingleForm = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setFileError("");

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const resetJsonImport = () => {
    setJsonFile(null);
    setJsonRecords([]);
    setJsonErrors([]);
    setJsonGeneralError("");

    setImportProgress({
      current: 0,
      total: 0,
      successful: 0,
      failed: 0,
    });

    if (jsonInputRef.current) {
      jsonInputRef.current.value = "";
    }
  };

  const changeMode = (newMode) => {
    if (submitting || importing) return;

    setMode(newMode);

    if (newMode === "single") {
      resetJsonImport();
    } else {
      resetSingleForm();
    }
  };

  const validateAttachment = (file) => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return `${file.name}: unsupported file type.`;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return `${file.name}: maximum file size is 10 MB.`;
    }

    return "";
  };

  const handleAttachmentSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setFileError("");

    if (!selectedFiles.length) return;

    const validFiles = [];
    const errors = [];

    selectedFiles.forEach((file) => {
      const validationError = validateAttachment(file);

      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    });

    setFiles((previousFiles) => {
      const mergedFiles = [...previousFiles];

      validFiles.forEach((newFile) => {
        const alreadyExists = mergedFiles.some(
          (existingFile) =>
            getAttachmentIdentity(existingFile) ===
            getAttachmentIdentity(newFile)
        );

        if (!alreadyExists && mergedFiles.length < MAX_ATTACHMENTS) {
          mergedFiles.push(newFile);
        }
      });

      if (previousFiles.length + validFiles.length > MAX_ATTACHMENTS) {
        errors.push(
          `Only ${MAX_ATTACHMENTS} attachments are allowed per content item.`
        );
      }

      return mergedFiles.slice(0, MAX_ATTACHMENTS);
    });

    if (errors.length) {
      setFileError(errors.join(" "));
    }

    event.target.value = "";
  };

  const removeAttachment = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );

    setFileError("");
  };

  const clearAttachments = () => {
    setFiles([]);
    setFileError("");

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const validateJsonRecord = (item, index, duplicateKeys) => {
    const errors = [];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        index,
        source: item,
        isValid: false,
        errors: ["Record must be a JSON object."],
      };
    }

    const recordType = String(item.recordType || "faq")
      .trim()
      .toLowerCase();

    const category = String(item.category || "general")
      .trim()
      .toLowerCase();

    const title = String(item.title || "").trim();
    const description = String(item.description || "").trim();

    const status = String(item.status || "published")
      .trim()
      .toLowerCase();

    const visibility = String(item.visibility || "all")
      .trim()
      .toLowerCase();

    if (!VALID_RECORD_TYPES.includes(recordType)) {
      errors.push(
        `recordType must be one of: ${VALID_RECORD_TYPES.join(", ")}.`
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(
        `category must be one of: ${VALID_CATEGORIES.join(", ")}.`
      );
    }

    if (!title) {
      errors.push("title is required.");
    } else if (title.length < 3) {
      errors.push("title must contain at least 3 characters.");
    } else if (title.length > 180) {
      errors.push("title cannot exceed 180 characters.");
    }

    if (!description) {
      errors.push("description is required.");
    } else if (description.length > 10000) {
      errors.push("description cannot exceed 10,000 characters.");
    }

    if (!VALID_STATUSES.includes(status)) {
      errors.push(
        `status must be one of: ${VALID_STATUSES.join(", ")}.`
      );
    }

    if (!VALID_VISIBILITIES.includes(visibility)) {
      errors.push(
        `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}.`
      );
    }

    const duplicateKey = `${recordType}|${category}|${title.toLowerCase()}`;

    if (duplicateKeys.has(duplicateKey)) {
      errors.push("Duplicate record exists inside this JSON file.");
    } else {
      duplicateKeys.add(duplicateKey);
    }

    return {
      index,
      source: item,
      normalized: {
        recordType,
        category,
        title,
        description,
        status,
        visibility,
      },
      isValid: errors.length === 0,
      errors,
    };
  };

  const parseJsonFile = async (file) => {
    setJsonGeneralError("");
    setJsonRecords([]);
    setJsonErrors([]);

    if (!file) return;

    if (
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      setJsonGeneralError("Please upload a valid .json file.");
      return;
    }

    if (file.size > MAX_JSON_SIZE) {
      setJsonGeneralError("JSON file size cannot exceed 2 MB.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const records = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.records)
        ? parsed.records
        : null;

      if (!records) {
        setJsonGeneralError(
          'JSON must be an array or an object containing a "records" array.'
        );
        return;
      }

      if (!records.length) {
        setJsonGeneralError("The JSON file does not contain any records.");
        return;
      }

      if (records.length > MAX_BULK_RECORDS) {
        setJsonGeneralError(
          `A maximum of ${MAX_BULK_RECORDS} records can be imported at one time.`
        );
        return;
      }

      const duplicateKeys = new Set();

      const validatedRecords = records.map((item, index) =>
        validateJsonRecord(item, index, duplicateKeys)
      );

      const flattenedErrors = validatedRecords
        .filter((record) => !record.isValid)
        .map((record) => ({
          row: record.index + 1,
          errors: record.errors,
        }));

      setJsonFile(file);
      setJsonRecords(validatedRecords);
      setJsonErrors(flattenedErrors);
    } catch (error) {
      setJsonGeneralError(
        `Unable to read JSON: ${error?.message || "Invalid JSON format."}`
      );
    }
  };

  const handleJsonSelection = async (event) => {
    const file = event.target.files?.[0] || null;

    await parseJsonFile(file);

    event.target.value = "";
  };

  const downloadSampleJson = () => {
    const jsonContent = JSON.stringify(SAMPLE_JSON_DATA, null, 2);

    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bharat-it-support-content-sample.json";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  };

  const submitSingleContent = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      alert("Please enter a title.");
      return;
    }

    if (title.length < 3) {
      alert("Title must contain at least 3 characters.");
      return;
    }

    if (!description) {
      alert("Please enter description or answer.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("recordType", form.recordType);
      formData.append("title", title);
      formData.append("category", form.category);
      formData.append("description", description);
      formData.append("status", form.status);
      formData.append("visibility", form.visibility);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await createITSupportContent(formData);

      const notificationMessage =
        form.recordType === "announcement" &&
        form.status === "published"
          ? "Announcement published successfully. Users will be notified by the backend notification service."
          : "Content created successfully.";

      alert(response?.message || notificationMessage);

      resetSingleForm();

      if (onUpdated) {
        await onUpdated();
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Content creation failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const importJsonRecords = async () => {
    if (importing) return;

    if (!validJsonRecords.length) {
      alert("No valid JSON records are available for import.");
      return;
    }

    if (invalidJsonRecords.length > 0) {
      const continueImport = window.confirm(
        `${invalidJsonRecords.length} invalid record(s) will be skipped. Import ${validJsonRecords.length} valid record(s)?`
      );

      if (!continueImport) return;
    }

    try {
      setImporting(true);

      setImportProgress({
        current: 0,
        total: validJsonRecords.length,
        successful: 0,
        failed: 0,
      });

      let successful = 0;
      let failed = 0;

      /*
       * Sequential import is intentionally used.
       * It avoids sending hundreds of simultaneous requests to production.
       */
      for (let index = 0; index < validJsonRecords.length; index += 1) {
        const record = validJsonRecords[index];

        try {
          await createITSupportContent(record.normalized);
          successful += 1;
        } catch (error) {
          console.error(
            `IT support content import failed at row ${record.index + 1}:`,
            error
          );

          failed += 1;
        }

        setImportProgress({
          current: index + 1,
          total: validJsonRecords.length,
          successful,
          failed,
        });
      }

      alert(
        `Import completed.\nSuccessful: ${successful}\nFailed: ${failed}`
      );

      if (failed === 0) {
        resetJsonImport();
      }

      if (onUpdated) {
        await onUpdated();
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "JSON import failed"
      );
    } finally {
      setImporting(false);
    }
  };

  const getTypeIcon = (recordType) => {
    if (recordType === "announcement") {
      return <Megaphone size={16} />;
    }

    if (recordType === "guide") {
      return <BookOpen size={16} />;
    }

    return <HelpCircle size={16} />;
  };

  const progressPercentage =
    importProgress.total > 0
      ? Math.round(
          (importProgress.current / importProgress.total) * 100
        )
      : 0;

  return (
    <section className="it-content-manager">
      <header className="it-content-manager-header">
        <div className="it-content-manager-heading">
          <span className="it-content-manager-kicker">
            Knowledge Base Administration
          </span>

          <h2>IT Content Manager</h2>

          <p>
            Create FAQs, guides, and announcements or import multiple
            records through a validated JSON file.
          </p>
        </div>

        <div className="it-content-manager-admin">
          <div className="it-content-admin-avatar">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>

          <div>
            <span>Content administrator</span>
            <strong>{user?.name || "Administrator"}</strong>
          </div>

          <ShieldCheck size={18} />
        </div>
      </header>

      <div className="it-content-mode-tabs">
        <button
          type="button"
          className={mode === "single" ? "active" : ""}
          onClick={() => changeMode("single")}
          disabled={submitting || importing}
        >
          <Plus size={16} />
          Create Single Content
        </button>

        <button
          type="button"
          className={mode === "bulk" ? "active" : ""}
          onClick={() => changeMode("bulk")}
          disabled={submitting || importing}
        >
          <FileJson size={16} />
          Import JSON
        </button>
      </div>

      {mode === "single" && (
        <form
          className="it-content-single-form"
          onSubmit={submitSingleContent}
        >
          <div className="it-content-section-heading">
            <span>01</span>

            <div>
              <h3>Content configuration</h3>
              <p>
                Select the content type, category, publishing status, and
                audience.
              </p>
            </div>
          </div>

          <div className="it-content-grid">
            <label className="it-content-field">
              <span>Content Type *</span>

              <select
                name="recordType"
                value={form.recordType}
                onChange={update}
                disabled={submitting}
              >
                <option value="faq">FAQ</option>
                <option value="guide">Guide</option>
                <option value="announcement">Announcement</option>
              </select>
            </label>

            <label className="it-content-field">
              <span>Category *</span>

              <select
                name="category"
                value={form.category}
                onChange={update}
                disabled={submitting}
              >
                <option value="general">General</option>
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
                <option value="performance">Performance</option>
                <option value="bug">Application Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="it-content-field">
              <span>Status *</span>

              <select
                name="status"
                value={form.status}
                onChange={update}
                disabled={submitting}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>

            <label className="it-content-field">
              <span>Visibility *</span>

              <select
                name="visibility"
                value={form.visibility}
                onChange={update}
                disabled={submitting}
              >
                <option value="all">All Users</option>
                <option value="admin_only">Admin Only</option>
                <option value="it_only">IT Only</option>
              </select>
            </label>
          </div>

          {form.recordType === "announcement" &&
            form.status === "published" && (
              <div className="it-content-announcement-notice">
                <Megaphone size={18} />

                <div>
                  <strong>Published announcement</strong>
                  <p>
                    Once saved, the backend should notify all eligible
                    users about this announcement.
                  </p>
                </div>
              </div>
            )}

          <div className="it-content-section-heading second">
            <span>02</span>

            <div>
              <h3>Content information</h3>
              <p>
                Write a clear title and complete answer or announcement
                message.
              </p>
            </div>
          </div>

          <label className="it-content-field">
            <span>Title *</span>

            <input
              name="title"
              value={form.title}
              onChange={update}
              disabled={submitting}
              maxLength={180}
              placeholder={
                form.recordType === "faq"
                  ? "Example: Why is check-out disabled?"
                  : form.recordType === "announcement"
                  ? "Example: Scheduled dashboard maintenance"
                  : "Example: Attendance regularization guide"
              }
            />

            <small>{form.title.length}/180</small>
          </label>

          <label className="it-content-field">
            <span>
              {form.recordType === "faq"
                ? "Answer *"
                : form.recordType === "announcement"
                ? "Announcement Message *"
                : "Guide Description *"}
            </span>

            <textarea
              name="description"
              value={form.description}
              onChange={update}
              disabled={submitting}
              rows={8}
              maxLength={10000}
              placeholder={
                form.recordType === "faq"
                  ? "Write a clear and direct answer..."
                  : form.recordType === "announcement"
                  ? "Write the announcement, impact, date, time, and user action required..."
                  : "Write step-by-step guidance..."
              }
            />

            <small>{form.description.length}/10000</small>
          </label>

          <div className="it-content-section-heading second">
            <span>03</span>

            <div>
              <h3>Supporting attachments</h3>
              <p>
                Add screenshots, PDF guides, Word files, videos, or other
                supporting material.
              </p>
            </div>
          </div>

          <label className="it-content-upload-box">
            <div className="it-content-upload-icon">
              <Paperclip size={20} />
            </div>

            <div>
              <strong>Select attachments</strong>
              <span>
                Maximum {MAX_ATTACHMENTS} files · 10 MB each
              </span>
            </div>

            <b>Browse</b>

            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              disabled={submitting}
              accept="image/*,video/mp4,video/webm,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleAttachmentSelection}
            />
          </label>

          {fileError && (
            <div className="it-content-error-box">
              <AlertCircle size={16} />
              <span>{fileError}</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="it-content-selected-wrapper">
              <div className="it-content-selected-head">
                <strong>
                  {files.length} of {MAX_ATTACHMENTS} attachments selected
                </strong>

                <button
                  type="button"
                  onClick={clearAttachments}
                  disabled={submitting}
                >
                  <Trash2 size={13} />
                  Remove all
                </button>
              </div>

              <div className="it-content-selected-files">
                {files.map((file, index) => (
                  <div
                    className="it-content-selected-file"
                    key={getAttachmentIdentity(file)}
                  >
                    <div className="it-content-selected-icon">
                      <FileText size={17} />
                    </div>

                    <div>
                      <strong>{file.name}</strong>
                      <span>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => removeAttachment(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="it-content-form-actions">
            <button
              type="button"
              className="secondary"
              onClick={resetSingleForm}
              disabled={submitting}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="submit"
              className="primary"
              disabled={submitting}
            >
              <Save size={16} />

              {submitting
                ? "Saving Content..."
                : form.recordType === "announcement"
                ? "Publish Announcement"
                : "Save Content"}
            </button>
          </div>
        </form>
      )}

      {mode === "bulk" && (
        <div className="it-content-bulk-panel">
          <div className="it-content-json-guide">
            <div className="it-content-json-guide-icon">
              <Info size={20} />
            </div>

            <div>
              <h3>Bulk JSON Import</h3>

              <p>
                Upload one JSON file containing FAQs, guides, or
                announcements. Each valid object will be created as a
                separate knowledge-base record.
              </p>
            </div>

            <button type="button" onClick={downloadSampleJson}>
              <Download size={15} />
              Download Sample JSON
            </button>
          </div>

          <div className="it-content-json-format">
            <strong>Supported JSON structure</strong>

            <pre>
{`[
  {
    "recordType": "faq",
    "category": "attendance",
    "title": "Why is check-out disabled?",
    "description": "Submit today's work report before check-out.",
    "status": "published",
    "visibility": "all"
  }
]`}
            </pre>
          </div>

          <label className="it-content-json-upload">
            <div className="it-content-json-upload-icon">
              <FileJson size={25} />
            </div>

            <div>
              <strong>
                {jsonFile ? jsonFile.name : "Choose JSON file"}
              </strong>

              <span>
                Maximum {MAX_BULK_RECORDS} records · Maximum file size 2 MB
              </span>
            </div>

            <b>
              <Upload size={15} />
              Select JSON
            </b>

            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              disabled={importing}
              onChange={handleJsonSelection}
            />
          </label>

          {jsonGeneralError && (
            <div className="it-content-error-box">
              <AlertCircle size={17} />
              <span>{jsonGeneralError}</span>
            </div>
          )}

          {jsonRecords.length > 0 && (
            <>
              <div className="it-content-json-summary">
                <SummaryCard
                  label="Total Records"
                  value={jsonRecords.length}
                  className="total"
                />

                <SummaryCard
                  label="Valid"
                  value={validJsonRecords.length}
                  className="valid"
                />

                <SummaryCard
                  label="Invalid"
                  value={invalidJsonRecords.length}
                  className="invalid"
                />

                <SummaryCard
                  label="Announcements"
                  value={
                    validJsonRecords.filter(
                      (item) =>
                        item.normalized?.recordType === "announcement"
                    ).length
                  }
                  className="announcement"
                />
              </div>

              <div className="it-content-json-table-card">
                <table className="it-content-json-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Visibility</th>
                      <th>Validation</th>
                    </tr>
                  </thead>

                  <tbody>
                    {jsonRecords.map((record) => {
                      const item =
                        record.normalized || record.source || {};

                      return (
                        <tr
                          key={`json-record-${record.index}`}
                          className={
                            record.isValid ? "valid" : "invalid"
                          }
                        >
                          <td>{record.index + 1}</td>

                          <td>
                            <span className="it-json-type">
                              {getTypeIcon(item.recordType)}
                              {item.recordType || "-"}
                            </span>
                          </td>

                          <td>{item.category || "-"}</td>

                          <td>
                            <strong>{item.title || "-"}</strong>
                          </td>

                          <td>{item.status || "-"}</td>

                          <td>{item.visibility || "-"}</td>

                          <td>
                            {record.isValid ? (
                              <span className="it-json-valid-pill">
                                <CheckCircle2 size={13} />
                                Ready
                              </span>
                            ) : (
                              <div className="it-json-error-list">
                                {record.errors.map((error, index) => (
                                  <span key={`${record.index}-${index}`}>
                                    {error}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {jsonErrors.length > 0 && (
                <div className="it-content-json-warning">
                  <AlertCircle size={17} />

                  <p>
                    Invalid rows will not be imported. Correct the JSON
                    file and upload it again, or continue with only the
                    valid records.
                  </p>
                </div>
              )}

              {importing && (
                <div className="it-content-import-progress">
                  <div className="it-content-progress-head">
                    <div>
                      <strong>Importing content...</strong>

                      <span>
                        {importProgress.current} of{" "}
                        {importProgress.total} processed
                      </span>
                    </div>

                    <b>{progressPercentage}%</b>
                  </div>

                  <div className="it-content-progress-track">
                    <span
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />
                  </div>

                  <div className="it-content-progress-stats">
                    <span>
                      Successful: {importProgress.successful}
                    </span>

                    <span>Failed: {importProgress.failed}</span>
                  </div>
                </div>
              )}

              <div className="it-content-form-actions">
                <button
                  type="button"
                  className="secondary danger"
                  onClick={resetJsonImport}
                  disabled={importing}
                >
                  <Trash2 size={15} />
                  Clear JSON
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={importJsonRecords}
                  disabled={
                    importing || validJsonRecords.length === 0
                  }
                >
                  <Upload size={16} />

                  {importing
                    ? `Importing ${importProgress.current}/${importProgress.total}`
                    : `Import ${validJsonRecords.length} Valid Record${
                        validJsonRecords.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, className }) {
  return (
    <div className={`it-content-summary-card ${className}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default ITSupportContentManager;