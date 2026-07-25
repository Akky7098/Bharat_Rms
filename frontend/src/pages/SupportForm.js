import { useEffect, useState } from "react";
import { X, Send, Clock, UserRound, Flag, Paperclip } from "lucide-react";
import "./SupportForm.css";

import {
  createSupportTicket,
  getSupportEmployees,
} from "../services/supportTicketService";

function SupportForm({ onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    priority: "medium",
    dueDate: "",
  });

  const fetchEmployees = async () => {
    try {
      const list = await getSupportEmployees();
      setEmployees(list || []);
    } catch (error) {
      console.log("EMPLOYEE FETCH ERROR =>", error);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAttachmentChange = (e) => {
    setAttachments(Array.from(e.target.files || []));
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const submitTicket = async () => {
    try {
      if (!form.title.trim()) {
        alert("Please enter ticket title.");
        return;
      }

      if (!form.description.trim()) {
        alert("Please enter ticket description.");
        return;
      }

      if (!form.assignedToId) {
        alert("Please select employee.");
        return;
      }

      if (!form.dueDate) {
        alert("Please select due date and time.");
        return;
      }

      setSubmitting(true);

      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("assignedToId", form.assignedToId);
      formData.append("priority", form.priority);
      formData.append("dueDate", form.dueDate);
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await createSupportTicket(formData);

      alert(response?.message || "Support ticket created successfully.");

      if (onCreated) onCreated(response?.data);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-form-overlay">
      <div className="support-form-modal">
        <div className="support-form-head">
          <div>
            <span>New Delegation Task</span>
            <h2>Create Support Ticket</h2>
            <p>Assign task, set deadline and send email notification.</p>
          </div>

          <button type="button" onClick={onClose} disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        <div className="support-form-body">
          <div className="support-form-section support-form-section-full">
            <label>Ticket Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: Follow up pending customer document"
              disabled={submitting}
            />
          </div>

          <div className="support-form-section support-form-section-full">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Write clear task details, expected output, and any important instruction..."
              rows={5}
              disabled={submitting}
            />
          </div>

          <div className="support-form-section">
            <label>
              <UserRound size={15} />
              Assign Employee
            </label>

            <select
              name="assignedToId"
              value={form.assignedToId}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} {emp.email ? `- ${emp.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="support-form-section">
            <label>
              <Flag size={15} />
              Priority
            </label>

            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="support-form-section">
            <label>
              <Clock size={15} />
              Final Due Date / Time
            </label>

            <input
              type="datetime-local"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          
          <div className="support-form-section support-form-section-full">
            <label>
              <Paperclip size={15} />
              Attachments
            </label>

            <input
              type="file"
              multiple
              onChange={handleAttachmentChange}
              disabled={submitting}
            />

            {attachments.length > 0 && (
              <div className="support-form-attachment-list">
                {attachments.map((file, index) => (
                  <span key={`${file.name}-${index}`}>
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="support-form-preview support-form-section-full">
            <strong>Email Notification</strong>
            <p>
              Employee will receive ticket number, priority, due time, description
              and dashboard link by email.
            </p>
          </div>
        </div>

        <div className="support-form-actions">
          <button
            type="button"
            className="support-form-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="support-form-submit"
            onClick={submitTicket}
            disabled={submitting}
          >
            <Send size={17} />
            {submitting ? "Creating..." : "Create & Send Mail"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportForm;