import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCcw,
  SlidersHorizontal,
  MessageCircle,
  X,
  Paperclip,
  CalendarDays,
} from "lucide-react";
import "./SupportPage.css";

import {
  getSupportTickets,
  getSupportTicketStats,
  updateSupportTicketStatus,
  getSupportEmployees,
  getSupportTicketById,
} from "../services/supportTicketService";

import SupportForm from "./SupportForm";
import SupportChat from "./SupportChat";

function SupportPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showPwaFilters, setShowPwaFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignedToId: "",
    overdue: "",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 20,
  });

  useLayoutEffect(() => {
    document.body.classList.add("support-pwa-page");

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const main = document.querySelector(".main");
    if (main) main.scrollTop = 0;

    return () => {
      document.body.classList.remove("support-pwa-page");
    };
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const list = await getSupportEmployees();
      setEmployees(list || []);
    } catch (error) {
      console.log("EMPLOYEE FETCH ERROR =>", error);
      setEmployees([]);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      const cleanFilters = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getSupportTickets(cleanFilters);

      setTickets(response?.data || []);
      setPagination(
        response?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          limit: 20,
        }
      );
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to load support tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getSupportTicketStats();
      setStats(response?.data || {});
    } catch (error) {
      console.log("SUPPORT STATS ERROR =>", error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchTickets();
      await fetchStats();
    } finally {
      setRefreshing(false);
    }
  };

  const openTicketDetails = async (ticket) => {
    try {
      setLoading(true);
      const response = await getSupportTicketById(ticket._id);
      setSelectedTicket(response?.data || ticket);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to open ticket details");
    } finally {
      setLoading(false);
    }
  };

  const closeTicketDetails = async () => {
    setSelectedTicket(null);
    await refreshAll();
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
    } else {
      window.location.href = "/dashboard#dashboard";
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
      ...(name === "fromDate" ? { toDate: "" } : {}),
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      priority: "",
      assignedToId: "",
      overdue: "",
      fromDate: "",
      toDate: "",
      page: 1,
      limit: 20,
    });
  };

  const changeStatus = async (ticketId, status) => {
    try {
      setSubmitting(true);

      const response = await updateSupportTicketStatus(ticketId, {
        status,
        remark: `Status updated to ${formatStatus(status)}.`,
      });

      alert(response?.message || "Ticket status updated successfully.");
      await refreshAll();

      if (selectedTicket?._id === ticketId) {
        setSelectedTicket(response?.data || null);
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Status update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const goToPage = (page) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const prevPage = () => {
    if ((pagination.currentPage || 1) > 1) {
      goToPage((pagination.currentPage || 1) - 1);
    }
  };

  const nextPage = () => {
    if ((pagination.currentPage || 1) < (pagination.totalPages || 1)) {
      goToPage((pagination.currentPage || 1) + 1);
    }
  };

  const getPageNumbers = () => {
    const total = pagination.totalPages || 1;
    const current = pagination.currentPage || 1;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const filteredTickets = useMemo(() => tickets || [], [tickets]);

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

  const isOverdue = (ticket) => {
    if (!ticket?.dueDate) return false;
    if (["completed", "closed"].includes(ticket.status)) return false;
    return new Date(ticket.dueDate) < new Date();
  };

  const renderFilters = (mode = "desktop") => (
    <div className={mode === "ios" ? "ios-support-filter-grid" : "support-filter-grid"}>
      <div className="support-field support-search-field">
        <label>Search</label>
        <div className="support-input-icon">
          <Search size={16} />
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Ticket no, title, employee..."
          />
        </div>
      </div>

      <div className="support-field">
        <label>Status</label>
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="support-field">
        <label>Priority</label>
        <select name="priority" value={filters.priority} onChange={handleFilterChange}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="support-field">
        <label>From Date</label>
        <input
          type="date"
          name="fromDate"
          value={filters.fromDate}
          onChange={handleFilterChange}
        />
      </div>

      <div className="support-field">
        <label>To Date</label>
        <input
          type="date"
          name="toDate"
          value={filters.toDate}
          min={filters.fromDate || ""}
          disabled={!filters.fromDate}
          onChange={handleFilterChange}
        />
      </div>

      {isAdmin && (
        <div className="support-field">
          <label>Employee</label>
          <select
            name="assignedToId"
            value={filters.assignedToId}
            onChange={handleFilterChange}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="support-filter-actions">
        <button type="button" onClick={refreshAll}>
          Filter
        </button>
        <button type="button" className="secondary" onClick={clearFilters}>
          Clear
        </button>
      </div>
    </div>
  );

  if (selectedTicket) {
    return (
      <SupportChat
        ticket={selectedTicket}
        onClose={closeTicketDetails}
        onUpdated={async (updatedTicket) => {
          if (updatedTicket?._id) {
            const response = await getSupportTicketById(updatedTicket._id);
            setSelectedTicket(response?.data || updatedTicket);
          }
          await refreshAll();
        }}
      />
    );
  }

  return (
    <div className="support-page">
      <div className="support-pwa-shell">
        <div className="ios-support-page">
          <div className="ios-support-header">
            <div className="ios-support-header-row">
              <button type="button" className="ios-support-back" onClick={goDashboardModules}>
                ‹
              </button>

              <div className="ios-support-title">
                <h2>Support</h2>
                <p>Tasks, tickets and delegation</p>
              </div>

              <button
                type="button"
                className={`ios-support-refresh ${refreshing ? "spinning" : ""}`}
                onClick={refreshAll}
                disabled={refreshing}
              >
                <RefreshCcw size={17} />
              </button>
            </div>

            <div className="ios-support-stats-card">
              <SupportStat label="Total" value={stats.total || 0} />
              <SupportStat label="Open" value={stats.open || 0} />
              <SupportStat label="High" value={stats.highPriority || 0} />
              <SupportStat label="Overdue" value={stats.overdue || 0} />
            </div>

            <button
              type="button"
              className="ios-support-new-btn"
              onClick={() => setShowCreate(true)}
            >
              + New Ticket
            </button>
          </div>

          <div className="ios-support-content">
            <button
              type="button"
              className="ios-support-filter-open"
              onClick={() => setShowPwaFilters(true)}
            >
              <SlidersHorizontal size={15} />
              Filters / Date Range
            </button>

            {showPwaFilters && (
              <div className="ios-support-filter-overlay">
                <div className="ios-support-filter-card">
                  <div className="ios-support-filter-head">
                    <div>
                      <h3>Filters</h3>
                      <p>Search old tickets by date, status and employee</p>
                    </div>

                    <button type="button" onClick={() => setShowPwaFilters(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  {renderFilters("ios")}

                  <div className="ios-support-filter-actions">
                    <button
                      type="button"
                      onClick={() => {
                        clearFilters();
                        setShowPwaFilters(false);
                      }}
                    >
                      Clear
                    </button>

                    <button type="button" onClick={() => setShowPwaFilters(false)}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="ios-support-empty">Loading support tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="ios-support-empty">
                <strong>No tickets found</strong>
                <p>Create a new ticket or adjust filters.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className={`ios-support-card priority-${ticket.priority}`}
                  onClick={() => openTicketDetails(ticket)}
                >
                  <div className="ios-support-card-top">
                    <div>
                      <span>{ticket.ticketNumber}</span>
                      <h4>{ticket.title}</h4>
                    </div>

                    <b className={`ios-support-status status-${ticket.status}`}>
                      {formatStatus(ticket.status)}
                    </b>
                  </div>

                  <p className="ios-support-desc">{ticket.description}</p>

                  <div className="ios-support-meta-grid">
                    <InfoBox label="Assigned" value={ticket.assignedToName} />
                    <InfoBox label="Priority" value={formatPriority(ticket.priority)} />
                    <InfoBox label="Due" value={formatDateTime(ticket.dueDate)} full />
                    <InfoBox
                      label="Files / Messages"
                      value={`${ticket.attachments?.length || 0} files · ${
                        ticket.messages?.length || 0
                      } messages`}
                      full
                    />
                  </div>

                  {isOverdue(ticket) && <div className="ios-support-overdue">Overdue task</div>}

                  <div className="ios-support-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => openTicketDetails(ticket)}>
                      <MessageCircle size={15} />
                      Open
                    </button>

                    {!["completed", "closed"].includes(ticket.status) && (
                      <button
                        type="button"
                        className="complete"
                        disabled={submitting}
                        onClick={() => changeStatus(ticket._id, "completed")}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="ios-support-pagination">
              <button type="button" onClick={prevPage} disabled={pagination.currentPage <= 1}>
                Prev
              </button>

              <span>
                Page {pagination.currentPage || 1} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                onClick={nextPage}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="support-desktop-page">
        <div className="support-hero">
          <div>
            <span className="support-kicker">Support Desk</span>
            <h1>Tasks & Delegation</h1>
            <p>Premium ticket tracking, comments, attachments and SLA visibility.</p>
          </div>

          <button
            type="button"
            className="support-create-btn"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>

        <div className="support-insight-grid">
          <InsightCard label="Total Tickets" value={stats.total || 0} icon="🎫" />
          <InsightCard label="Open Tasks" value={stats.open || 0} icon="📌" />
          <InsightCard label="In Progress" value={stats.inProgress || 0} icon="⚙️" />
          <InsightCard label="High Priority" value={stats.highPriority || 0} icon="🔥" />
          <InsightCard label="Overdue" value={stats.overdue || 0} icon="⏰" />
        </div>

        <div className="support-filter-card">{renderFilters("desktop")}</div>

        <div className="support-table-card">
          <table className="support-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Task Detail</th>
                <th>Assigned</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Files</th>
                <th>Messages</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="support-table-empty">
                    Loading support tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="support-table-empty">
                    No support tickets found.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="support-table-row"
                    onClick={() => openTicketDetails(ticket)}
                  >
                    <td>
                      <strong>{ticket.ticketNumber}</strong>
                      <small>{formatDateTime(ticket.createdAt)}</small>
                    </td>

                    <td>
                      <b>{ticket.title}</b>
                      <small>{ticket.description}</small>
                    </td>

                    <td>
                      <div className="support-user-cell">
                        <span>
                          {(ticket.assignedToName || "U").charAt(0).toUpperCase()}
                        </span>
                        <b>{ticket.assignedToName || "-"}</b>
                      </div>
                    </td>

                    <td>
                      <span className={`support-priority ${ticket.priority}`}>
                        {formatPriority(ticket.priority)}
                      </span>
                    </td>

                    <td>
                      <span className={`support-status status-${ticket.status}`}>
                        {formatStatus(ticket.status)}
                      </span>
                    </td>

                    <td>
                      <div className="support-date-cell">
                        <CalendarDays size={14} />
                        <span>{formatDateTime(ticket.dueDate)}</span>
                      </div>
                      {isOverdue(ticket) && <em>Overdue</em>}
                    </td>

                    <td>
                      <div className="support-count-cell">
                        <Paperclip size={14} />
                        {ticket.attachments?.length || 0}
                      </div>
                    </td>

                    <td>
                      <div className="support-count-cell">
                        <MessageCircle size={14} />
                        {ticket.messages?.length || 0}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="support-pagination">
          <button type="button" onClick={prevPage} disabled={pagination.currentPage <= 1}>
            Prev
          </button>

          <div className="support-page-numbers">
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={index}>...</span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={pagination.currentPage === page ? "active" : ""}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={nextPage}
            disabled={pagination.currentPage >= pagination.totalPages}
          >
            Next
          </button>

          <span>Total: {pagination.totalRecords || 0}</span>
        </div>
      </div>

      {showCreate && (
        <SupportForm
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await refreshAll();
          }}
        />
      )}
    </div>
  );
}

function SupportStat({ label, value }) {
  return (
    <div className="ios-support-stat-box">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InsightCard({ label, value, icon }) {
  return (
    <div className="support-insight-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <b>{icon}</b>
    </div>
  );
}

function InfoBox({ label, value, full }) {
  return (
    <div className={`ios-support-info-box ${full ? "full" : ""}`}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default SupportPage;