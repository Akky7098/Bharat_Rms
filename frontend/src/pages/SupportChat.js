import { useEffect, useRef, useState } from "react";
import {
  Send,
  Clock,
  UserRound,
  Flag,
  ArrowLeft,
  Paperclip,
  CalendarDays,
  FileText,
  History,
  X,
} from "lucide-react";
import "./SupportChat.css";

import {
  addSupportTicketMessage,
  updateSupportTicketStatus,
} from "../services/supportTicketService";

const API_ORIGIN = "http://localhost:5000";

function SupportChat({ ticket, onClose, onUpdated }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [messageText, setMessageText] = useState("");
  const [messageFiles, setMessageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const listRef = useRef(null);

  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  useEffect(() => {
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 80);
  }, [currentTicket?.messages?.length]);

  if (!currentTicket) return null;

  const formatDateTime = (date) => {
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

  const formatStatus = (status) => {
    const map = {
      open: "Open",
      in_progress: "In Progress",
      on_hold: "On Hold",
      completed: "Completed",
      closed: "Closed",
    };

    return map[status] || "-";
  };

  const formatPriority = (priority) => {
    const map = {
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",
    };

    return map[priority] || "-";
  };

  const getFileUrl = (file) => {
    if (!file?.fileUrl) return "";
    if (file.fileUrl.startsWith("http")) return file.fileUrl;
    return `${API_ORIGIN}${file.fileUrl}`;
  };

  const isOverdue = () => {
    if (!currentTicket?.dueDate) return false;
    if (["completed", "closed"].includes(currentTicket.status)) return false;
    return new Date(currentTicket.dueDate) < new Date();
  };

  const handleMessageFiles = (e) => {
    setMessageFiles(Array.from(e.target.files || []));
  };

  const removeMessageFile = (indexToRemove) => {
    setMessageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const sendMessage = async () => {
    try {
      if (!messageText.trim() && messageFiles.length === 0) return;

      setSubmitting(true);

      const formData = new FormData();
      formData.append("message", messageText.trim());

      messageFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await addSupportTicketMessage(currentTicket._id, formData);

      setMessageText("");
      setMessageFiles([]);
      setCurrentTicket(response?.data || currentTicket);

      if (onUpdated) onUpdated(response?.data);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      setSubmitting(true);

      const response = await updateSupportTicketStatus(currentTicket._id, {
        status,
        remark: `Status updated to ${formatStatus(status)}.`,
      });

      setCurrentTicket(response?.data || currentTicket);

      if (onUpdated) onUpdated(response?.data);

      alert(response?.message || "Ticket status updated successfully.");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnterSend = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="support-detail-page">
      <div className="support-detail-topbar">
        <button type="button" className="support-detail-back" onClick={onClose}>
          <ArrowLeft size={19} />
          Back
        </button>

        <div>
          <span>{currentTicket.ticketNumber}</span>
          <h2>{currentTicket.title}</h2>
        </div>

        <div className={`support-detail-status status-${currentTicket.status}`}>
          {formatStatus(currentTicket.status)}
        </div>
      </div>

      <div className="support-detail-layout">
        <section className="support-chat-panel">
          <div className="support-chat-panel-head">
            <div>
              <h3>Conversation</h3>
              <p>Messages, progress updates and shared files</p>
            </div>
          </div>

          <div className="support-chat-body" ref={listRef}>
            {(currentTicket.messages || []).length === 0 ? (
              <div className="support-chat-empty">
                <strong>No conversation yet</strong>
                <p>Start with a task update, clarification or file.</p>
              </div>
            ) : (
              currentTicket.messages.map((msg) => {
                const isMine = String(msg.senderId) === String(user._id);

                return (
                  <div
                    key={msg._id || msg.createdAt}
                    className={`support-chat-message ${isMine ? "mine" : ""}`}
                  >
                    <div className="support-chat-bubble">
                      <div className="support-chat-message-top">
                        <strong>{msg.senderName || "User"}</strong>
                        <span>{msg.senderRole || ""}</span>
                      </div>

                      {msg.message && <p>{msg.message}</p>}

                      {(msg.attachments || []).length > 0 && (
                        <div className="support-chat-files">
                          {msg.attachments.map((file, index) => (
                            <a
                              key={`${file.fileName}-${index}`}
                              href={getFileUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText size={14} />
                              {file.originalName || file.fileName}
                            </a>
                          ))}
                        </div>
                      )}

                      <small>{formatDateTime(msg.createdAt)}</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {messageFiles.length > 0 && (
            <div className="support-compose-file-preview">
              {messageFiles.map((file, index) => (
                <span key={`${file.name}-${index}`}>
                  {file.name}
                  <button type="button" onClick={() => removeMessageFile(index)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="support-chat-compose">
            <label className="support-chat-file-btn">
              <Paperclip size={18} />
              <input
                type="file"
                multiple
                onChange={handleMessageFiles}
                disabled={submitting}
              />
            </label>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleEnterSend}
              placeholder="Write comment, task update or attach file..."
              disabled={submitting}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={submitting || (!messageText.trim() && messageFiles.length === 0)}
            >
              <Send size={18} />
            </button>
          </div>
        </section>

        <aside className="support-ticket-side">
          <div className="support-side-card support-side-highlight">
            <span>Task Description</span>
            <p>{currentTicket.description}</p>
          </div>

          <div className="support-side-grid">
            <SideInfo icon={<UserRound size={16} />} label="Assigned To" value={currentTicket.assignedToName} />
            <SideInfo icon={<Flag size={16} />} label="Priority" value={formatPriority(currentTicket.priority)} />
            <SideInfo icon={<CalendarDays size={16} />} label="Created At" value={formatDateTime(currentTicket.createdAt)} />
            <SideInfo icon={<Clock size={16} />} label="Due Time" value={formatDateTime(currentTicket.dueDate)} danger={isOverdue()} />
            <SideInfo icon={<UserRound size={16} />} label="Created By" value={currentTicket.createdByName} />
          </div>

          {isOverdue() && (
            <div className="support-overdue-side">
              This task is overdue. Please update status or comment progress.
            </div>
          )}

          <div className="support-status-box">
            <h3>Update Status</h3>

            <div className="support-status-actions">
              {["open", "in_progress", "on_hold", "completed", "closed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`${currentTicket.status === status ? "active" : ""} ${
                    status === "on_hold" ? "hold" : ""
                  } ${status === "completed" ? "done" : ""} ${
                    status === "closed" ? "closed" : ""
                  }`}
                  onClick={() => changeStatus(status)}
                  disabled={submitting}
                >
                  {formatStatus(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="support-side-card">
            <div className="support-side-title">
              <Paperclip size={16} />
              <h3>Uploaded Files</h3>
            </div>

            {(currentTicket.attachments || []).length === 0 ? (
              <div className="support-side-empty">No files uploaded</div>
            ) : (
              <div className="support-file-list">
                {currentTicket.attachments.map((file, index) => (
                  <a
                    key={`${file.fileName}-${index}`}
                    href={getFileUrl(file)}
                    target="_blank"
                    rel="noreferrer"
                    className="support-file-item"
                  >
                    <FileText size={17} />
                    <div>
                      <strong>{file.originalName || file.fileName}</strong>
                      <span>{file.mimeType || "File"}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="support-side-card">
            <div className="support-side-title">
              <History size={16} />
              <h3>Timeline</h3>
            </div>

            {(currentTicket.timeline || []).length === 0 ? (
              <div className="support-side-empty">No timeline found</div>
            ) : (
              <div className="support-timeline">
                {currentTicket.timeline.map((item, index) => (
                  <div key={item._id || index} className="support-timeline-item">
                    <b>{item.message || item.action}</b>
                    <span>
                      {item.performedByName || "-"} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SideInfo({ icon, label, value, danger }) {
  return (
    <div className={`support-side-info ${danger ? "danger" : ""}`}>
      {icon}
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default SupportChat;