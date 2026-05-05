import React, { useCallback, useEffect, useState } from "react";
import { getAllEnquiries } from "../services/enquiryService";
import { getSalesPersons } from "../services/salesOrderService";
import "./EnquiryList.css";
import EnquiryForm from "./EnquiryForm";
import WorkflowUpdate from "./WorkflowUpdate";

const EnquiryList = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [enquiries, setEnquiries] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

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
  });

  const fetchEnquiries = useCallback(async () => {
    try {
      const cleanFilters = {};

      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getAllEnquiries(cleanFilters);

      setEnquiries(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to load enquiries");
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
    fetchEnquiries();
  }, [fetchEnquiries]);

  useEffect(() => {
    if (isAdmin) fetchSalesPersons();
  }, [isAdmin, fetchSalesPersons]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "fromDate") {
        updated.toDate = "";
      }

      return updated;
    });
  };

  const applyFilters = () => {
    if (
      filters.fromDate &&
      filters.toDate &&
      new Date(filters.toDate) < new Date(filters.fromDate)
    ) {
      alert("End date cannot be before start date");
      return;
    }

    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      salesPersonId: "",
      fromDate: "",
      toDate: "",
    });
  };

  const nextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setFilters((prev) => ({
        ...prev,
        page: Number(prev.page) + 1,
      }));
    }
  };

  const prevPage = () => {
    if (pagination.currentPage > 1) {
      setFilters((prev) => ({
        ...prev,
        page: Number(prev.page) - 1,
      }));
    }
  };

  const renderPages = () => {
    const pages = [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - 1 && i <= current + 1)
      ) {
        pages.push(
          <button
            key={i}
            className={i === current ? "active" : ""}
            onClick={() => setFilters((prev) => ({ ...prev, page: i }))}
          >
            {i}
          </button>
        );
      } else if (i === current - 2 || i === current + 2) {
        pages.push(<span key={i}>...</span>);
      }
    }

    return pages;
  };

  const openWorkflowModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowWorkflow(true);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  /* =========================
     ✅ NEW SMART STATUS LOGIC
  ========================== */

 const isOverdue = (planDate, completed) => {
  if (!planDate) return false;

  const now = new Date();
  const plan = new Date(planDate);

  return !completed && now > plan;
};

const getRowClass = (enquiry) => {
  const closureStatus = enquiry.closure?.status;
  const feasibilityStatus = enquiry.feasibility?.status;

  const feasibilityCompleted = enquiry.feasibility?.completed === true;
  const quotationCompleted = enquiry.quotation?.completed === true;

  const feasibilityOverdue = isOverdue(
    enquiry.feasibility?.planDate,
    feasibilityCompleted
  );

  const quotationOverdue = isOverdue(
    enquiry.quotation?.planDate,
    quotationCompleted
  );

  if (closureStatus === "lost") return "row-lost";
  if (closureStatus === "won") return "row-won";
  if (feasibilityStatus === "not_feasible") return "row-not-feasible";

  if (feasibilityOverdue || quotationOverdue) return "row-overdue";

  if (quotationCompleted) return "row-quotation";
  if (feasibilityCompleted) return "row-feasible";

  return "";
};
  return (
    <div className={`enquiry-container ${isAdmin ? "admin-view" : "user-view"}`}>
      <div className="enquiry-header">
        <div>
          <h2>Enquiry Sheet</h2>
          <p>Latest enquiries appear first</p>
        </div>

        <button className="new-btn" onClick={() => setShowForm(true)}>
          + New Enquiry
        </button>
      </div>

      {/* FILTER */}
      <div className="enquiry-filter-card">
        <div className="enquiry-filter-grid">
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
            <button className="filter-btn" onClick={applyFilters}>
              Apply
            </button>

            <button className="clear-btn" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="enquiry-table-wrapper">
        <table className="enquiry-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-head col-date">Enquiry Date</th>

              {isAdmin && (
                <th className="sticky-col sticky-head col-sales">
                  Sales Person
                </th>
              )}

              <th className="sticky-col sticky-head col-company">Company</th>

              <th>Customer Name</th>

              <th>Contact</th>
              <th>Email</th>
              <th>Address</th>
              <th>Product</th>
              <th>Grade</th>
              <th>Shape</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Supply</th>
              <th>Mode</th>

              <th>Feasibility Plan</th>
              <th>Feasibility Actual</th>
              <th>Feasibility Status</th>
              <th>Done</th>

              <th>Quotation Plan</th>
              <th>Quotation Actual</th>
              <th>Quotation Link</th>
              <th>Done</th>

              <th>Closure Plan</th>
              <th>Closure Actual</th>
              <th>Status</th>
              <th>Lost Remark</th>
              <th>Done</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {enquiries.length === 0 ? (
              <tr>
                <td colSpan={28} className="no-data">
                  No enquiries found
                </td>
              </tr>
            ) : (
              enquiries.map((enquiry) => (
                <tr key={enquiry._id} className={getRowClass(enquiry)}>
                  <td className="sticky-col col-date">
                    {formatDate(enquiry.enquiryDate)}
                  </td>

                  {isAdmin && (
                    <td className="sticky-col col-sales">
                      {enquiry.salesPersonId?.name || "-"}
                    </td>
                  )}

                  <td className="sticky-col col-company">
                    {enquiry.companyName}
                  </td>

                  <td>{enquiry.customerName}</td>

                  <td>{enquiry.customerContactNo}</td>
                  <td>{enquiry.customerEmailId || "-"}</td>
                  <td>{enquiry.customerAddress || "-"}</td>
                  <td>{enquiry.productCategory}</td>
                  <td>{enquiry.grade}</td>
                  <td>{enquiry.shape}</td>
                  <td className="size-cell">{enquiry.size}</td>
                  <td>{enquiry.quantityInKg}</td>
                  <td>{enquiry.supplyCondition || "-"}</td>
                  <td>{enquiry.modeOfEnquiry}</td>

                  <td>{formatDateTime(enquiry.feasibility?.planDate)}</td>
                  <td>{formatDateTime(enquiry.feasibility?.actualDate)}</td>
                  <td>{enquiry.feasibility?.status || "-"}</td>
                  <td>{enquiry.feasibility?.completed ? "Yes" : "No"}</td>

                  <td>{formatDateTime(enquiry.quotation?.planDate)}</td>
                  <td>{formatDateTime(enquiry.quotation?.actualDate)}</td>
                  <td>
                    {enquiry.quotation?.quotationLink ? (
                      <a
                        href={enquiry.quotation.quotationLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{enquiry.quotation?.completed ? "Yes" : "No"}</td>

                  <td>{formatDateTime(enquiry.closure?.planDate)}</td>
                  <td>{formatDateTime(enquiry.closure?.actualDate)}</td>
                  <td>{enquiry.closure?.status || "-"}</td>
                  <td>{enquiry.closure?.lostRemark || "-"}</td>
                  <td>{enquiry.closure?.completed ? "Yes" : "No"}</td>

                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => openWorkflowModal(enquiry)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="enquiry-pagination">
        <button onClick={prevPage} disabled={pagination.currentPage <= 1}>
          Prev
        </button>

        {renderPages()}

        <button
          onClick={nextPage}
          disabled={pagination.currentPage >= pagination.totalPages}
        >
          Next
        </button>

        <span>Total: {pagination.totalRecords}</span>
      </div>

      {showForm && (
        <EnquiryForm
          onClose={() => setShowForm(false)}
          refresh={fetchEnquiries}
        />
      )}

      {showWorkflow && selectedEnquiry && (
        <WorkflowUpdate
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowWorkflow(false);
            setSelectedEnquiry(null);
          }}
          refresh={fetchEnquiries}
        />
      )}
    </div>
  );
};

export default EnquiryList;