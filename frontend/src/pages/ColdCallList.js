import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllColdCalls, getSalesPersons } from "../services/coldCallService";
import "./ColdCallList.css";
import ColdCallForm from "./ColdCallForm";

const activityOptions = [
  { value: "", label: "All", icon: "✨" },
  { value: "calling", label: "Calling", icon: "📞" },
  { value: "visit", label: "Visit", icon: "🏢" },
  { value: "email", label: "Email", icon: "✉️" },
];

const ColdCallList = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [coldCalls, setColdCalls] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [iosRefreshing, setIosRefreshing] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  });

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    salesPersonId: "",
    fromDate: "",
    toDate: "",
    activityType: "",
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchColdCalls = useCallback(async () => {
    try {
      const cleanFilters = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getAllColdCalls(cleanFilters);

      setColdCalls(response.data || []);
      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          limit: 10,
        }
      );
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to load cold call data");
    }
  }, [filters]);

  const fetchSalesPersons = useCallback(async () => {
    try {
      const data = await getSalesPersons();
      setSalesPersons(data || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    fetchColdCalls();
  }, [fetchColdCalls]);

  useEffect(() => {
    if (isAdmin) fetchSalesPersons();
  }, [isAdmin, fetchSalesPersons]);

  const stats = useMemo(() => {
    return {
      total: pagination.totalRecords || coldCalls.length,
      calling: coldCalls.filter((x) => x.activityType === "calling").length,
      visit: coldCalls.filter((x) => x.activityType === "visit").length,
      email: coldCalls.filter((x) => x.activityType === "email").length,
    };
  }, [coldCalls, pagination.totalRecords]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      const updated = { ...prev, [name]: value, page: 1 };
      if (name === "fromDate") updated.toDate = "";
      return updated;
    });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      salesPersonId: "",
      fromDate: "",
      toDate: "",
      activityType: "",
    });
  };

  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const prevPage = () => {
    if (pagination.currentPage > 1) goToPage(pagination.currentPage - 1);
  };

  const nextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      goToPage(pagination.currentPage + 1);
    }
  };

  const iosRefresh = async () => {
    try {
      setIosRefreshing(true);
      await fetchColdCalls();
    } finally {
      setIosRefreshing(false);
    }
  };

  const setActivityFilter = (activityType) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      activityType,
    }));
  };

  const setSalesPersonFilter = (salesPersonId) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      salesPersonId,
    }));
  };

  const getPageNumbers = () => {
    const total = Number(pagination.totalPages) || 1;
    const current = Number(pagination.currentPage) || 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];
    pages.push(1);

    if (current > 4) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    if (current < total - 3) pages.push("...");

    pages.push(total);
    return pages;
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "-";

  const formatActivity = (value) => {
    if (value === "calling") return "Calling";
    if (value === "visit") return "Visit";
    if (value === "email") return "Email";
    return value || "-";
  };

  const getActivityMeta = (type) => {
    if (type === "visit") {
      return {
        icon: "🏢",
        bg: "#dcfce7",
        color: "#166534",
        border: "#16a34a",
      };
    }

    if (type === "email") {
      return {
        icon: "✉️",
        bg: "#fef3c7",
        color: "#92400e",
        border: "#f59e0b",
      };
    }

    return {
      icon: "📞",
      bg: "#dbeafe",
      color: "#1d4ed8",
      border: "#2563eb",
    };
  };

  return (
    <div className="cold-container cold-pwa-shell">
      {/* ================= iOS PWA MOBILE UI ================= */}
      <div className="ios-cold-page ios-cold-scroll-frame">
        <div className="ios-cold-header">
          <div className="ios-cold-header-row">
            <button
              type="button"
              className="ios-cold-back"
              onClick={() => {
  if (window.__goDashboardHome) {
    window.__goDashboardHome();
  } else {
    window.location.href = "/dashboard#dashboard";
  }
}}
            >
              ‹
            </button>

            <div>
              <h2>Cold Call CRM</h2>
              <p>Track calls, visits and email activities</p>
            </div>

            <button
              type="button"
              className={`ios-cold-refresh ${iosRefreshing ? "spinning" : ""}`}
              onClick={iosRefresh}
            >
              ↻
            </button>
          </div>

          <div className="ios-cold-stats-card">
            <div>
              <span>Total Activities</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="ios-cold-mini-grid">
              <MiniStat label="Calls" value={stats.calling} />
              <MiniStat label="Visits" value={stats.visit} />
              <MiniStat label="Emails" value={stats.email} />
            </div>
          </div>
        </div>

        <div className="ios-cold-content">
          <div className="ios-cold-filter-card">
            <h3>Activity Filter</h3>

            <div className="ios-cold-chip-row">
              {activityOptions.map((item) => {
                const active = filters.activityType === item.value;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={active ? "active" : ""}
                    onClick={() => setActivityFilter(item.value)}
                  >
                    {item.icon} {item.label}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <>
                <h3 className="ios-cold-subtitle">Sales Person</h3>

                <div className="ios-cold-sales-row">
                  <button
                    type="button"
                    className={!filters.salesPersonId ? "active" : ""}
                    onClick={() => setSalesPersonFilter("")}
                  >
                    All
                  </button>

                  {salesPersons.map((person) => (
                    <button
                      key={person._id}
                      type="button"
                      className={
                        filters.salesPersonId === person._id ? "active" : ""
                      }
                      onClick={() => setSalesPersonFilter(person._id)}
                    >
                      {person.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(filters.activityType || filters.salesPersonId) && (
              <button
                type="button"
                className="ios-cold-clear-btn"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>

          {coldCalls.length === 0 ? (
            <div className="ios-cold-empty">
              <strong>No activity found</strong>
              <p>Tap + to add your first activity.</p>
            </div>
          ) : (
            coldCalls.map((item) => {
              const meta = getActivityMeta(item.activityType);

              return (
                <div
                  key={item._id}
                  className="ios-activity-card"
                  style={{ borderLeftColor: meta.border }}
                >
                  <div className="ios-activity-top">
                    <div>
                      <h4>{item.companyName || "-"}</h4>
                      <p>{formatDate(item.date)}</p>
                    </div>

                    <span
                      className="ios-activity-badge"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon} {formatActivity(item.activityType)}
                    </span>
                  </div>

                  <div className="ios-info-box">
                    {isAdmin && (
                      <Info
                        label="Sales Person"
                        value={item.salesPersonId?.name || "-"}
                      />
                    )}

                    <Info
                      label="Contact Person"
                      value={item.contactPersonName || "-"}
                    />
                    <Info
                      label="Mobile Number"
                      value={item.contactPersonNumber || "-"}
                    />
                  </div>
                </div>
              );
            })
          )}

          <div className="ios-cold-pagination">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={prevPage}
            >
              Prev
            </button>

            <span>
              Page {pagination.currentPage || 1} / {pagination.totalPages || 1}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={nextPage}
            >
              Next
            </button>
          </div>
        </div>

        <button
          type="button"
          className="ios-cold-fab"
          onClick={() => setShowForm(true)}
        >
          +
        </button>
      </div>

      {/* ================= DESKTOP ORIGINAL UI ================= */}
      <div className="desktop-cold-page">
        <div className="cold-header">
          <div>
            <h2>Cold Call / Visit Sheet</h2>
            <p>Track calling, visits and follow-ups</p>
          </div>

          <button className="cold-new-btn" onClick={() => setShowForm(true)}>
            + New Entry
          </button>
        </div>

        <div className="cold-filter-card">
          <div className="cold-filter-grid">
            {isAdmin && (
              <div className="filter-field">
                <label>Sales Person</label>
                <select
                  name="salesPersonId"
                  value={filters.salesPersonId}
                  onChange={handleFilterChange}
                >
                  <option value="">All</option>
                  {salesPersons.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-field">
              <label>Type</label>
              <select
                name="activityType"
                value={filters.activityType}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="calling">Calling</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Start</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label>End</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                min={filters.fromDate || ""}
                disabled={!filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-buttons">
              <button className="cold-clear-btn" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {!isMobile ? (
          <div className="cold-table-wrapper">
            <table className="cold-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head col-date">Date</th>

                  {isAdmin && (
                    <th className="sticky-col sticky-head col-sales">
                      Sales Person
                    </th>
                  )}

                  <th>Type</th>
                  <th className="sticky-col sticky-head col-company">Company</th>
                  <th className="sticky-col sticky-head col-contact">
                    Contact Person
                  </th>
                  <th>Contact Number</th>
                </tr>
              </thead>

              <tbody>
                {coldCalls.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="no-data">
                      No activity found
                    </td>
                  </tr>
                ) : (
                  coldCalls.map((item) => (
                    <tr key={item._id}>
                      <td className="sticky-col col-date">
                        {formatDate(item.date)}
                      </td>

                      {isAdmin && (
                        <td className="sticky-col col-sales">
                          {item.salesPersonId?.name || "-"}
                        </td>
                      )}

                      <td>
                        <span className={`type-badge ${item.activityType}`}>
                          {formatActivity(item.activityType)}
                        </span>
                      </td>

                      <td className="sticky-col col-company">
                        {item.companyName}
                      </td>

                      <td className="sticky-col col-contact">
                        {item.contactPersonName}
                      </td>

                      <td>{item.contactPersonNumber}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cold-mobile-list">
            {coldCalls.map((item) => (
              <div key={item._id} className="cold-card">
                <div className="cold-card-top">
                  <strong>{item.companyName}</strong>
                  <small>{formatDate(item.date)}</small>
                </div>

                <div className="cold-card-tags">
                  <span className={`type-badge ${item.activityType}`}>
                    {formatActivity(item.activityType)}
                  </span>
                </div>

                <div className="cold-card-body">
                  {isAdmin && (
                    <p>
                      <b>Sales:</b> {item.salesPersonId?.name || "-"}
                    </p>
                  )}
                  <p>
                    <b>Contact:</b> {item.contactPersonName}
                  </p>
                  <p>
                    <b>Phone:</b> {item.contactPersonNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cold-pagination">
          <button onClick={prevPage} disabled={pagination.currentPage <= 1}>
            Prev
          </button>

          <div className="page-numbers">
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={i}>...</span>
              ) : (
                <button
                  key={`${p}-${i}`}
                  className={
                    Number(pagination.currentPage) === p ? "active-page" : ""
                  }
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={nextPage}
            disabled={pagination.currentPage >= pagination.totalPages}
          >
            Next
          </button>

          <span className="total-records">
            Total: {pagination.totalRecords}
          </span>
        </div>
      </div>

      {showForm && (
        <ColdCallForm
          onClose={() => setShowForm(false)}
          refresh={fetchColdCalls}
        />
      )}
    </div>
  );
};

function MiniStat({ label, value }) {
  return (
    <div className="ios-cold-mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="ios-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ColdCallList;