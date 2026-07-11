import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCcw,
  MessageCircle,
  HelpCircle,
  BookOpen,
  Megaphone,
  ExternalLink,
  Paperclip,
  UserRound,
  UserCheck,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  CircleDot,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./ITSupportPage.css";

import {
  getITSupportTickets,
  getITSupportStats,
  getITSupportTicketById,
  getITSupportContent,
} from "../services/itSupportService";

import ITSupportForm from "./ITSupportForm";
import ITSupportChat from "./ITSupportChat";
import ITSupportContentManager from "./ITSupportContentManager";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  priority: "",
  category: "",
  page: 1,
  limit: 30,
};

const INSIGHT_FILTERS = {
  total: {
    status: "",
    priority: "",
  },

  open: {
    status: "open",
    priority: "",
  },

  in_progress: {
    status: "in_progress",
    priority: "",
  },

  resolved: {
    status: "resolved",
    priority: "",
  },

  critical: {
    status: "",
    priority: "critical",
  },
};

function ITSupportPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const [activeTab, setActiveTab] = useState("tickets");
  const [activeInsight, setActiveInsight] = useState("total");

  const [tickets, setTickets] = useState([]);
  const [content, setContent] = useState([]);
  const [stats, setStats] = useState({});

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openingTicketId, setOpeningTicketId] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 30,
    pages: 1,
  });

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
      return;
    }

    window.location.href = "/dashboard#dashboard";
  };

  const getCreatorName = (ticket) => {
    return (
      ticket?.raisedByName ||
      ticket?.createdByName ||
      ticket?.raisedBy?.name ||
      ticket?.createdBy?.name ||
      "-"
    );
  };

  const getAssignedName = (ticket) => {
    return (
      ticket?.assignedToName ||
      ticket?.assignedTo?.name ||
      "Ankit Singh"
    );
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      const cleanFilters = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (
          value !== "" &&
          value !== null &&
          value !== undefined
        ) {
          cleanFilters[key] = value;
        }
      });

      const response = await getITSupportTickets(cleanFilters);

      const responseData = response?.data || {};
      const ticketList = Array.isArray(responseData?.tickets)
        ? responseData.tickets
        : [];

      /*
       * Backend should already sort latest first.
       * This frontend sort is an additional safety check.
       */
      const latestFirstTickets = [...ticketList].sort(
        (firstTicket, secondTicket) =>
          new Date(secondTicket?.createdAt || 0).getTime() -
          new Date(firstTicket?.createdAt || 0).getTime()
      );

      const paginationData = responseData?.pagination || {};

      setTickets(latestFirstTickets);

      setPagination({
        total:
          Number(
            paginationData.total ??
              paginationData.totalRecords ??
              latestFirstTickets.length
          ) || 0,

        page:
          Number(
            paginationData.page ??
              paginationData.currentPage ??
              filters.page
          ) || 1,

        limit:
          Number(
            paginationData.limit ??
              filters.limit ??
              30
          ) || 30,

        pages:
          Number(
            paginationData.pages ??
              paginationData.totalPages ??
              1
          ) || 1,
      });
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to load IT support tickets"
      );

      setTickets([]);

      setPagination({
        total: 0,
        page: 1,
        limit: 30,
        pages: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getITSupportStats();
      setStats(response?.data || {});
    } catch (error) {
      console.log("IT SUPPORT STATS ERROR =>", error);
      setStats({});
    }
  }, []);

  const fetchContent = useCallback(async () => {
    try {
      const response = await getITSupportContent({});
      setContent(response?.data || []);
    } catch (error) {
      console.log("IT SUPPORT CONTENT ERROR =>", error);
      setContent([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchTickets(),
        fetchStats(),
        fetchContent(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTickets, fetchStats, fetchContent]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openTicket = async (ticket) => {
    if (!ticket?._id || openingTicketId) return;

    try {
      setOpeningTicketId(ticket._id);

      const response = await getITSupportTicketById(ticket._id);

      setSelectedTicket(response?.data || ticket);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to open ticket details"
      );
    } finally {
      setOpeningTicketId("");
    }
  };

  const closeTicket = async () => {
    setSelectedTicket(null);
    await refreshAll();
  };

  const handleTicketUpdated = async (ticketId) => {
    try {
      const response = await getITSupportTicketById(ticketId);

      setSelectedTicket(response?.data || null);

      await Promise.all([
        fetchTickets(),
        fetchStats(),
      ]);
    } catch (error) {
      console.log("IT SUPPORT REFRESH ERROR =>", error);
      await refreshAll();
    }
  };

  const handleInsightClick = (insightKey) => {
    const selectedInsight = INSIGHT_FILTERS[insightKey];

    if (!selectedInsight) return;

    /*
     * Click active insight again to clear it.
     */
    if (
      activeInsight === insightKey &&
      insightKey !== "total"
    ) {
      setActiveInsight("total");

      setFilters((previous) => ({
        ...previous,
        status: "",
        priority: "",
        page: 1,
      }));

      setActiveTab("tickets");
      return;
    }

    setActiveInsight(insightKey);

    setFilters((previous) => ({
      ...previous,
      status: selectedInsight.status,
      priority: selectedInsight.priority,
      page: 1,
    }));

    setActiveTab("tickets");
  };

  const handleFilterChange = (field, value) => {
    setActiveInsight("");

    setFilters((previous) => ({
      ...previous,
      [field]: value,
      page: 1,
    }));
  };

  const clearTicketFilters = () => {
    setActiveInsight("total");
    setFilters(DEFAULT_FILTERS);
  };

  const changePage = (newPage) => {
    if (
      newPage < 1 ||
      newPage > pagination.pages ||
      newPage === pagination.page
    ) {
      return;
    }

    setFilters((previous) => ({
      ...previous,
      page: newPage,
    }));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const formatStatus = (status) => {
    return String(status || "-")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  };

  const formatCategory = (category) => {
    return String(category || "-")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
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

  const getAttachmentCount = (ticket) => {
    const originalAttachments =
      ticket?.attachments?.length || 0;

    const messageAttachments =
      ticket?.messages?.reduce(
        (total, messageItem) =>
          total +
          (messageItem?.attachments?.length || 0),
        0
      ) || 0;

    return originalAttachments + messageAttachments;
  };

  const displayedContent = useMemo(() => {
    return content.filter((item) => {
      if (activeTab === "faq") {
        return item.recordType === "faq";
      }

      if (activeTab === "guides") {
        return item.recordType === "guide";
      }

      if (activeTab === "announcements") {
        return item.recordType === "announcement";
      }

      return false;
    });
  }, [content, activeTab]);

  const activeFilterLabel = useMemo(() => {
    if (activeInsight === "open") {
      return "Open tickets";
    }

    if (activeInsight === "in_progress") {
      return "In-progress tickets";
    }

    if (activeInsight === "resolved") {
      return "Resolved tickets";
    }

    if (activeInsight === "critical") {
      return "Critical-priority tickets";
    }

    if (filters.status) {
      return `${formatStatus(filters.status)} tickets`;
    }

    if (filters.priority) {
      return `${formatStatus(
        filters.priority
      )} priority tickets`;
    }

    return "All tickets";
  }, [activeInsight, filters.status, filters.priority]);

  if (selectedTicket) {
    return (
      <ITSupportChat
        ticket={selectedTicket}
        onClose={closeTicket}
        onUpdated={handleTicketUpdated}
      />
    );
  }

  return (
    <div className="it-support-page">
      <header className="it-support-header">
        <button
          className="it-support-back"
          type="button"
          onClick={goDashboardModules}
          aria-label="Back to dashboard"
        >
          ‹
        </button>

        <div className="it-support-header-content">
          <span>BHARAT DASHBOARD</span>

          <h1>IT Support Center</h1>

          <p>
            Raise issues, access guidance, and track every
            resolution with complete visibility.
          </p>
        </div>

        <button
          className={`it-support-refresh ${
            refreshing ? "refreshing" : ""
          }`}
          type="button"
          onClick={refreshAll}
          disabled={refreshing}
          aria-label="Refresh IT support"
        >
          <RefreshCcw size={17} />
        </button>
      </header>

      <section className="it-support-stats">
        <InsightCard
          insightKey="total"
          label="Total"
          value={stats.total || 0}
          active={activeInsight === "total"}
          icon={<CircleDot size={21} />}
          onClick={handleInsightClick}
        />

        <InsightCard
          insightKey="open"
          label="Open"
          value={stats.open || 0}
          active={activeInsight === "open"}
          icon={<AlertTriangle size={21} />}
          onClick={handleInsightClick}
        />

        <InsightCard
          insightKey="in_progress"
          label="In Progress"
          value={stats.inProgress || 0}
          active={activeInsight === "in_progress"}
          icon={<Clock3 size={21} />}
          onClick={handleInsightClick}
        />

        <InsightCard
          insightKey="resolved"
          label="Resolved"
          value={stats.resolved || 0}
          active={activeInsight === "resolved"}
          icon={<CheckCircle2 size={21} />}
          onClick={handleInsightClick}
        />

        <InsightCard
          insightKey="critical"
          label="Critical"
          value={stats.critical || 0}
          active={activeInsight === "critical"}
          icon={<AlertTriangle size={21} />}
          onClick={handleInsightClick}
        />
      </section>

      <nav className="it-support-tabs">
        <button
          type="button"
          className={
            activeTab === "tickets" ? "active" : ""
          }
          onClick={() => setActiveTab("tickets")}
        >
          <MessageCircle size={16} />
          Tickets
        </button>

        <button
          type="button"
          className={activeTab === "faq" ? "active" : ""}
          onClick={() => setActiveTab("faq")}
        >
          <HelpCircle size={16} />
          FAQ
        </button>

        <button
          type="button"
          className={
            activeTab === "guides" ? "active" : ""
          }
          onClick={() => setActiveTab("guides")}
        >
          <BookOpen size={16} />
          Guides
        </button>

        <button
          type="button"
          className={
            activeTab === "announcements" ? "active" : ""
          }
          onClick={() => setActiveTab("announcements")}
        >
          <Megaphone size={16} />
          Updates
        </button>

        {isAdmin && (
          <button
            type="button"
            className={
              activeTab === "manage" ? "active" : ""
            }
            onClick={() => setActiveTab("manage")}
          >
            Manage
          </button>
        )}
      </nav>

      {activeTab === "tickets" && (
        <>
          <section className="it-support-actions">
            <div className="it-support-search">
              <Search size={16} />

              <input
                value={filters.search}
                placeholder="Search ticket number, title or employee..."
                onChange={(event) =>
                  handleFilterChange(
                    "search",
                    event.target.value
                  )
                }
              />
            </div>

            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange(
                  "status",
                  event.target.value
                )
              }
            >
              <option value="">All Status</option>
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

            <select
              value={filters.priority}
              onChange={(event) =>
                handleFilterChange(
                  "priority",
                  event.target.value
                )
              }
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filters.category}
              onChange={(event) =>
                handleFilterChange(
                  "category",
                  event.target.value
                )
              }
            >
              <option value="">All Modules</option>
              <option value="attendance">
                Attendance
              </option>
              <option value="sales_order">
                Sales Order
              </option>
              <option value="dispatch">Dispatch</option>
              <option value="enquiry">Enquiry</option>
              <option value="document">Documents</option>
              <option value="receivable">
                Receivables
              </option>
              <option value="payment">Payment</option>
              <option value="dashboard">Dashboard</option>
              <option value="login">Login</option>
              <option value="mobile_app">
                Mobile App
              </option>
              <option value="performance">
                Performance
              </option>
              <option value="bug">Bug</option>
              <option value="feature_request">
                Feature Request
              </option>
              <option value="other">Other</option>
            </select>

            <button
              type="button"
              className="it-support-new"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} />
              Raise Ticket
            </button>
          </section>

          <section className="it-support-result-bar">
            <div>
              <strong>{activeFilterLabel}</strong>

              <span>
                {pagination.total} record
                {pagination.total === 1 ? "" : "s"} found ·
                Latest first · {pagination.limit} per page
              </span>
            </div>

            {(filters.search ||
              filters.status ||
              filters.priority ||
              filters.category) && (
              <button
                type="button"
                onClick={clearTicketFilters}
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </section>

          {loading ? (
            <div className="it-support-empty">
              Loading IT support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="it-support-empty">
              <strong>No tickets found</strong>

              <p>
                Change the selected insight or clear the
                current filters.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <section className="it-support-desktop-list">
                <div className="it-support-table-card">
                  <table className="it-support-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Issue Detail</th>
                        <th>Created By</th>
                        <th>Assigned To</th>
                        <th>Module</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Files</th>
                        <th>Messages</th>
                        <th>Created Date</th>
                        <th>Open</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket._id}
                          className="it-support-table-row"
                          onClick={() => openTicket(ticket)}
                        >
                          <td>
                            <div className="it-table-ticket-cell">
                              <button
                                type="button"
                                className="it-table-ticket-number"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openTicket(ticket);
                                }}
                              >
                                {ticket.ticketNumber || "-"}
                              </button>

                              <span>
                                {formatDate(ticket.createdAt)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="it-table-issue-cell">
                              <strong>
                                {ticket.title || "-"}
                              </strong>

                              <span>
                                {ticket.description ||
                                  "No description provided."}
                              </span>
                            </div>
                          </td>

                          <td>
                            <PersonCell
                              name={getCreatorName(ticket)}
                              icon={
                                <UserRound size={14} />
                              }
                            />
                          </td>

                          <td>
                            <PersonCell
                              name={getAssignedName(ticket)}
                              icon={
                                <UserCheck size={14} />
                              }
                              assigned
                            />
                          </td>

                          <td>
                            <span className="it-table-category">
                              {formatCategory(
                                ticket.category
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`it-table-priority priority-${ticket.priority}`}
                            >
                              {formatStatus(
                                ticket.priority
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`it-table-status status-${ticket.status}`}
                            >
                              {formatStatus(ticket.status)}
                            </span>
                          </td>

                          <td>
                            <span className="it-table-count-pill">
                              <Paperclip size={13} />
                              {getAttachmentCount(ticket)}
                            </span>
                          </td>

                          <td>
                            <span className="it-table-count-pill">
                              <MessageCircle size={13} />
                              {ticket.messages?.length || 0}
                            </span>
                          </td>

                          <td>
                            <span className="it-table-date">
                              {formatDate(ticket.createdAt)}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="it-table-open-btn"
                              disabled={
                                openingTicketId === ticket._id
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                openTicket(ticket);
                              }}
                            >
                              <ExternalLink size={15} />

                              {openingTicketId === ticket._id
                                ? "Opening..."
                                : "Open"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* PWA / MOBILE CARDS */}

              <section className="it-support-pwa-list">
                <div className="it-support-ticket-grid">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket._id}
                      type="button"
                      className={`it-support-ticket priority-${ticket.priority}`}
                      disabled={
                        openingTicketId === ticket._id
                      }
                      onClick={() => openTicket(ticket)}
                    >
                      <div className="it-ticket-top">
                        <span>
                          {ticket.ticketNumber || "-"}
                        </span>

                        <b
                          className={`status-${ticket.status}`}
                        >
                          {formatStatus(ticket.status)}
                        </b>
                      </div>

                      <h3>{ticket.title || "-"}</h3>

                      <p>
                        {ticket.description ||
                          "No description provided."}
                      </p>

                      <div className="it-pwa-person-row">
                        <div>
                          <UserRound size={14} />

                          <span>
                            Created By
                            <strong>
                              {getCreatorName(ticket)}
                            </strong>
                          </span>
                        </div>

                        <div>
                          <UserCheck size={14} />

                          <span>
                            Assigned To
                            <strong>
                              {getAssignedName(ticket)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="it-ticket-meta">
                        <span>
                          {formatCategory(
                            ticket.category
                          )}
                        </span>

                        <span>
                          {formatStatus(
                            ticket.priority
                          )}
                        </span>

                        <span>
                          <MessageCircle size={12} />
                          {ticket.messages?.length || 0}
                        </span>

                        <span>
                          <Paperclip size={12} />
                          {getAttachmentCount(ticket)}
                        </span>
                      </div>

                      <div className="it-ticket-footer">
                        <span>
                          {formatDate(ticket.createdAt)}
                        </span>

                        <b>
                          {openingTicketId === ticket._id
                            ? "Opening..."
                            : "View Conversation →"}
                        </b>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <Pagination
                pagination={pagination}
                onChange={changePage}
              />
            </>
          )}
        </>
      )}

      {activeTab !== "tickets" &&
        activeTab !== "manage" && (
          <section className="it-support-content-list">
            {displayedContent.length === 0 ? (
              <div className="it-support-empty">
                <strong>No content available</strong>

                <p>
                  No published content is currently
                  available in this section.
                </p>
              </div>
            ) : (
              displayedContent.map((item) => (
                <article
                  key={item._id}
                  className="it-support-content-card"
                >
                  <span>{item.recordType}</span>

                  <h3>{item.title}</h3>

                  <p>{item.description}</p>

                  {item.attachments?.length > 0 && (
                    <div className="it-content-attachment-count">
                      <Paperclip size={14} />

                      {item.attachments.length} attachment
                      {item.attachments.length === 1
                        ? ""
                        : "s"}
                    </div>
                  )}
                </article>
              ))
            )}
          </section>
        )}

      {activeTab === "manage" && isAdmin && (
        <ITSupportContentManager onUpdated={refreshAll} />
      )}

      {showForm && (
        <ITSupportForm
          onClose={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            setActiveInsight("total");

            setFilters({
              ...DEFAULT_FILTERS,
              page: 1,
              limit: 30,
            });

            await refreshAll();
          }}
        />
      )}
    </div>
  );
}

function InsightCard({
  insightKey,
  label,
  value,
  active,
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`it-support-stat ${
        active ? "active" : ""
      } insight-${insightKey}`}
      onClick={() => onClick(insightKey)}
    >
      <div className="it-support-stat-icon">
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>

      <small>Click to filter</small>
    </button>
  );
}

function PersonCell({
  name,
  icon,
  assigned = false,
}) {
  const firstLetter = String(name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className={`it-table-person ${
        assigned ? "assigned" : ""
      }`}
    >
      <span className="it-table-person-avatar">
        {firstLetter}
      </span>

      <div>
        <strong>{name || "-"}</strong>

        <small>
          {assigned ? "IT Support" : "Ticket Creator"}
        </small>
      </div>

      <span className="it-table-person-icon">
        {icon}
      </span>
    </div>
  );
}

function Pagination({ pagination, onChange }) {
  const currentPage = pagination.page || 1;
  const totalPages = pagination.pages || 1;
  const limit = pagination.limit || 30;
  const total = pagination.total || 0;

  if (totalPages <= 1) {
    return (
      <div className="it-support-pagination single-page">
        <span>
          Showing <strong>{total}</strong> of{" "}
          <strong>{total}</strong> tickets ·{" "}
          <strong>{limit}</strong> per page
        </span>
      </div>
    );
  }

  const firstRecord =
    (currentPage - 1) * limit + 1;

  const lastRecord = Math.min(
    currentPage * limit,
    total
  );

  return (
    <div className="it-support-pagination">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <span>
        Showing <strong>{firstRecord}</strong>–
        <strong>{lastRecord}</strong> of{" "}
        <strong>{total}</strong> · Page{" "}
        <strong>{currentPage}</strong> of{" "}
        <strong>{totalPages}</strong> ·{" "}
        <strong>{limit}</strong> per page
      </span>

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onChange(currentPage + 1)}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default ITSupportPage;