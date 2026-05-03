import React, { useCallback, useEffect, useState } from "react";
import { getAllColdCalls, getSalesPersons } from "../services/coldCallService";
import "./ColdCallList.css";
import ColdCallForm from "./ColdCallForm";

const ColdCallList = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [coldCalls, setColdCalls] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
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

  const fetchColdCalls = useCallback(async () => {
    try {
      const cleanFilters = {};

      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getAllColdCalls(cleanFilters);

      setColdCalls(response.data || []);
      setPagination(response.pagination);
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
    if (isAdmin) {
      fetchSalesPersons();
    }
  }, [isAdmin, fetchSalesPersons]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      const updated = {
        ...prev,
        [name]: value,
        page: 1,
      };

      if (name === "fromDate") {
        updated.toDate = "";
      }

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
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const prevPage = () => {
    if (pagination.currentPage > 1) {
      goToPage(pagination.currentPage - 1);
    }
  };

  const nextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      goToPage(pagination.currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const total = pagination.totalPages || 1;
    const current = pagination.currentPage || 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }

    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const formatActivity = (value) => {
    if (value === "calling") return "Calling";
    if (value === "visit") return "Visit";
    if (value === "email") return "Email";
    return value || "-";
  };

  return (
    <div className="cold-container">
      <div className="cold-header">
        <div>
          <h2>Cold Call / Visit Sheet</h2>
          <p>Track calling, visits and email follow-ups</p>
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
                <option value="">All Sales Persons</option>
                {salesPersons.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.name}
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
              <option value="">All Types</option>
              <option value="calling">Calling</option>
              <option value="visit">Visit</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Start Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-field">
            <label>End Date</label>
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
                  No records found
                </td>
              </tr>
            ) : (
              coldCalls.map((item) => (
                <tr key={item._id}>
                  <td className="sticky-col col-date">{formatDate(item.date)}</td>

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

                  <td className="sticky-col col-company">{item.companyName}</td>

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

      <div className="cold-pagination">
        <button onClick={prevPage} disabled={pagination.currentPage <= 1}>
          Prev
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={index} className="dots">
                ...
              </span>
            ) : (
              <button
                key={page}
                className={pagination.currentPage === page ? "active-page" : ""}
                onClick={() => goToPage(page)}
              >
                {page}
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
      {showForm && (
  <ColdCallForm
    onClose={() => setShowForm(false)}
    refresh={fetchColdCalls}
  />
)}
    </div>
  );
};

export default ColdCallList;