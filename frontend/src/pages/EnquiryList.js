import React, { useCallback, useEffect, useState } from "react";
import { getAllEnquiries } from "../services/enquiryService";
import { getSalesPersons } from "../services/salesOrderService";
import "./EnquiryList.css";
import EnquiryForm from "./EnquiryForm";
import WorkflowUpdate from "./WorkflowUpdate";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";


const EnquiryList = ({ dashboardFilters }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [enquiries, setEnquiries] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedEnquiryDetail, setSelectedEnquiryDetail] = useState(null);
  const [iosRefreshing, setIosRefreshing] = useState(false);
  const [showIosFilters, setShowIosFilters] = useState(false);
 const [summary, setSummary] = useState({
  totalEnquiries: 0,
  feasibleEnquiries: 0,
  notFeasibleEnquiries: 0,
  quotationDoneEnquiries: 0,
  wonEnquiries: 0,
  lostEnquiries: 0,
  pendingEnquiries: 0,
});

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 30,
  });

const [filters, setFilters] = useState(() => ({
  page: 1,
  limit: 30,
  salesPersonId: dashboardFilters?.salesPersonId || "",
  fromDate: dashboardFilters?.fromDate || "",
  toDate: dashboardFilters?.toDate || "",
  companyName: dashboardFilters?.companyName || "",
  enquiryNumber: dashboardFilters?.enquiryNumber || "",
  status: dashboardFilters?.status || "all",
  grade: dashboardFilters?.grade || "",
  leadType: dashboardFilters?.leadType || "",
  lostReason: dashboardFilters?.lostReason || "",
  reason: dashboardFilters?.reason || "",
  view: dashboardFilters?.view || "",
  weekNo: dashboardFilters?.weekNo || "",
}));

  const fetchEnquiries = useCallback(async () => {
    try {
      const cleanFilters = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getAllEnquiries(cleanFilters);
      setEnquiries(response.data || []);
setSummary(response.summary || {});
      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          limit: 30,
        }
      );
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

  const iosRefreshAll = async () => {
    try {
      setIosRefreshing(true);
      await fetchEnquiries();
    } finally {
      setIosRefreshing(false);
    }
  };

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
    limit: 30,
    salesPersonId: "",
    fromDate: "",
    toDate: "",
    companyName: "",
    enquiryNumber: "",
    status: "all",
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
    const total = pagination.totalPages || 1;
    const current = pagination.currentPage || 1;

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
            type="button"
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

  const openEnquiryDetail = (enquiry) => {
  if (!enquiry) return;
  setSelectedEnquiryDetail(enquiry);
};

const closeEnquiryDetail = () => {
  setSelectedEnquiryDetail(null);
};

const stopRowClick = (e) => {
  e.stopPropagation();
};

const openWorkflowModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowWorkflow(true);
  };

  const openNewEnquiry = () => {
    setShowForm(true);
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
    } else {
      window.location.href = "/dashboard#dashboard";
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatEnumLabel = (value) => {
    if (!value) return "-";

    return String(value)
      .replaceAll("_or_", " / ")
      .replaceAll("_", " ")
      .split(" ")
      .map((word) =>
        word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
      )
      .join(" ");
  };

  const formatSupplyCondition = (enquiry) => {
    if (enquiry.supplyCondition === "other") {
      return enquiry.otherSupplyConditions || "Other";
    }

    return formatEnumLabel(enquiry.supplyCondition);
  };

  const formatSizeText = (value) => {
    if (!value) return "-";

    const parts = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return parts.map((item, index) => (
      <React.Fragment key={index}>
        {item}
        {index !== parts.length - 1 && (
          <>
            ,
            <br />
          </>
        )}
      </React.Fragment>
    ));
  };

  const isOverdue = (planDate, completed) => {
    if (!planDate) return false;
    return !completed && new Date() > new Date(planDate);
  };

  const getSizePdfUrl = (enquiry) => {
    const fileUrl = enquiry?.sizePdf?.fileUrl;
    if (!fileUrl) return "";

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }

    return `${API_BASE_URL}${fileUrl}`;
  };

  const getRowClass = (enquiry) => {
    const meta = getStatusMeta(enquiry);

    if (meta.key === "lost") return "row-lost";
    if (meta.key === "won") return "row-won";
    if (meta.key === "not_feasible") return "row-not-feasible";
    if (meta.key === "delayed") return "row-overdue";
    if (meta.key === "quotation") return "row-quotation";
    if (meta.key === "feasible") return "row-feasible";
    if (meta.key === "closure") return "row-closure";

    return "";
  };

  const getStatusMeta = (enquiry) => {
    const closureStatus = enquiry.closure?.status;
    const feasibilityStatus = enquiry.feasibility?.status;

    const feasibilityCompleted = enquiry.feasibility?.completed === true;
    const quotationCompleted = enquiry.quotation?.completed === true;
    const closureCompleted = enquiry.closure?.completed === true;

    const feasibilityOverdue = isOverdue(
      enquiry.feasibility?.planDate,
      feasibilityCompleted
    );

    const quotationOverdue = isOverdue(
      enquiry.quotation?.planDate,
      quotationCompleted
    );

    const closureOverdue = isOverdue(
      enquiry.closure?.planDate,
      closureCompleted
    );

    if (closureStatus === "lost") {
      return { label: "Lost", color: "#dc2626", bg: "#fee2e2", key: "lost" };
    }

    if (closureStatus === "won") {
      return { label: "Won", color: "#15803d", bg: "#dcfce7", key: "won" };
    }

    if (feasibilityStatus === "not_feasible") {
      return {
        label: "Not Feasible",
        color: "#b91c1c",
        bg: "#fee2e2",
        key: "not_feasible",
      };
    }

    if (feasibilityOverdue || quotationOverdue || closureOverdue) {
      return {
        label: "Delayed",
        color: "#ea580c",
        bg: "#ffedd5",
        key: "delayed",
      };
    }

    if (quotationCompleted) {
      return {
        label: "Quotation Done",
        color: "#166534",
        bg: "#dcfce7",
        key: "quotation",
      };
    }

    if (feasibilityCompleted) {
      return {
        label: "Feasible",
        color: "#2563eb",
        bg: "#dbeafe",
        key: "feasible",
      };
    }

    if (closureCompleted) {
      return {
        label: "Closure Done",
        color: "#7c3aed",
        bg: "#ede9fe",
        key: "closure",
      };
    }

    return {
      label: "Active",
      color: "#0f766e",
      bg: "#ccfbf1",
      key: "active",
    };
  };


  const stickyColSpan = isAdmin ? 4 : 3;
  const totalColSpan = isAdmin ? 25 : 24;
  const enquirySummaryCards = [
  {
    label: "Total Enquiries",
    value: summary.totalEnquiries || 0,
    status: "all",
    className: "total",
  },
  {
    label: "Feasible Enquiries",
    value: summary.feasibleEnquiries || 0,
    status: "feasible",
    className: "feasible",
  },
  {
    label: "Quotation Done",
    value: summary.quotationDoneEnquiries || 0,
    status: "quotation_done",
    className: "quotation",
  },
  {
    label: "Won Enquiries",
    value: summary.wonEnquiries || 0,
    status: "won",
    className: "won",
  },
  {
    label: "Lost Enquiries",
    value: summary.lostEnquiries || 0,
    status: "lost",
    className: "lost",
  },
  {
    label: "Pending",
    value: summary.pendingEnquiries || 0,
    status: "pending",
    className: "pending",
  },
];

const handleStatusCardClick = (status) => {
  setFilters((prev) => ({
    ...prev,
    page: 1,
    status: prev.status === status && status !== "all" ? "all" : status,
  }));
};
  return (
    <div className={`enquiry-page-root ${isAdmin ? "admin-view" : "user-view"}`}>
      <div className="enquiry-pwa-shell">
        <div className="ios-enquiry-page">
          <div className="ios-enquiry-header">
            <div className="ios-enquiry-header-row">
              <button
                type="button"
                className="ios-enquiry-back"
                onClick={goDashboardModules}
              >
                ‹
              </button>

              <div className="ios-enquiry-title-box">
                <h2>Enquiry Sheet</h2>
                <p>{pagination.totalRecords || 0} enquiry record(s)</p>
              </div>

              <button
                type="button"
                className={`ios-enquiry-refresh ${
                  iosRefreshing ? "spinning" : ""
                }`}
                onClick={iosRefreshAll}
              >
                ↻
              </button>
            </div>

            <div className="ios-enquiry-action-row">
              <button
                type="button"
                className="ios-enquiry-filter-btn"
                onClick={() => setShowIosFilters((prev) => !prev)}
              >
                Filter
              </button>

              <button
                type="button"
                className="ios-enquiry-new-btn"
                onClick={openNewEnquiry}
              >
                + New
              </button>
            </div>

            <div className="ios-enquiry-legend-row">
              <IosLegend label="Delayed" color="#ea580c" />
              <IosLegend label="Feasible" color="#2563eb" />
              <IosLegend label="Won" color="#15803d" />
              <IosLegend label="Lost" color="#dc2626" />
            </div>
          </div>

          <div className="ios-enquiry-content">
  {showIosFilters && (
    <div className="ios-enquiry-filter-overlay">
      <div className="ios-enquiry-filter-card">
        <div className="ios-enquiry-filter-head">
          <div>
            <h3>Filters</h3>
            <p>Filter enquiry records</p>
          </div>

          <button
            type="button"
            onClick={() => setShowIosFilters(false)}
          >
            ×
          </button>
        </div>

        {isAdmin && (
          <div className="ios-enquiry-field">
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

        <div className="ios-enquiry-date-grid">
          <div className="ios-enquiry-field">
            <label>Start Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="ios-enquiry-field">
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
        </div>

        <div className="ios-enquiry-filter-actions">
          <button
            type="button"
            onClick={() => {
              applyFilters();
              setShowIosFilters(false);
            }}
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() => {
              clearFilters();
              setShowIosFilters(false);
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )}

  {enquiries.length === 0 ? (
    <div className="ios-enquiry-empty">
      <strong>No enquiries found</strong>
      <p>Use filters or refresh to check latest records.</p>
    </div>
  ) : (
    enquiries.map((enquiry) => {
      const meta = getStatusMeta(enquiry);
      const sizePdfUrl = getSizePdfUrl(enquiry);

      return (
       <div
  key={enquiry._id}
  className="ios-enquiry-card enquiry-click-row"
  onClick={() => openEnquiryDetail(enquiry)}
>
          <div className="ios-enquiry-card-top">
            <div>
              <h4>{enquiry.companyName || "-"}</h4>
              <p>
                {enquiry.enquiryNumber || "-"} ·{" "}
                {formatDate(enquiry.createdAt)}
              </p>
            </div>

            <span
              className="ios-enquiry-status-pill"
              style={{
                background: meta.bg,
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
          </div>

          <div className="ios-enquiry-tags">
            <span>{formatEnumLabel(enquiry.productCategory)}</span>
            <span>{enquiry.grade || "-"}</span>
            <span>{enquiry.quantityInKg || 0} Kg</span>
          </div>

          <div className="ios-enquiry-detail-box">
            {isAdmin && (
              <IosInfo
                label="Sales Person"
                value={enquiry.salesPersonId?.name || "-"}
              />
            )}

            <IosInfo label="Customer" value={enquiry.customerName || "-"} />
            <IosInfo label="Contact" value={enquiry.customerContactNo || "-"} />
            <IosInfo label="Email" value={enquiry.customerEmailId || "-"} />
            <IosInfo
              label="Shape / Size"
              value={`${formatEnumLabel(enquiry.shape)} / ${
                enquiry.size || "-"
              }`}
            />
            <IosInfo label="Supply" value={formatSupplyCondition(enquiry)} />
            <IosInfo label="Mode" value={formatEnumLabel(enquiry.modeOfEnquiry)} />
          </div>

          <div className="ios-enquiry-workflow-box">
            <IosStep
              title="Feasibility"
              plan={formatDateTime(enquiry.feasibility?.planDate)}
              actual={formatDateTime(enquiry.feasibility?.actualDate)}
              status={formatEnumLabel(enquiry.feasibility?.status)}
            />

            <IosStep
              title="Quotation"
              plan={formatDateTime(enquiry.quotation?.planDate)}
              actual={formatDateTime(enquiry.quotation?.actualDate)}
              status={enquiry.quotation?.completed ? "Done" : "Pending"}
            />

            <IosStep
              title="Closure"
              plan={formatDateTime(enquiry.closure?.planDate)}
              actual={formatDateTime(enquiry.closure?.actualDate)}
              status={formatEnumLabel(enquiry.closure?.status)}
            />
          </div>

          {enquiry.closure?.status === "lost" &&
            enquiry.closure?.lostRemark && (
              <div className="ios-enquiry-lost-box">
                Lost Reason:{" "}
                {enquiry.closure.lostRemark === "others"
                  ? enquiry.closure.lostRemarkOtherText || "-"
                  : formatEnumLabel(enquiry.closure.lostRemark)}
              </div>
            )}

          <div className="ios-enquiry-action-bottom" onClick={stopRowClick}>
            {sizePdfUrl && (
              <a
                href={sizePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="ios-enquiry-secondary-btn"
              >
                Size PDF
              </a>
            )}

            {enquiry.quotation?.quotationLink && (
              <a
                href={enquiry.quotation.quotationLink}
                target="_blank"
                rel="noreferrer"
                className="ios-enquiry-secondary-btn"
              >
                View Quote
              </a>
            )}

            <button
              type="button"
              className="ios-enquiry-primary-btn"
              onClick={() => openWorkflowModal(enquiry)}
            >
              Update
            </button>
          </div>
        </div>
      );
    })
  )}

  <div className="ios-enquiry-pagination">
    <button
      type="button"
      onClick={prevPage}
      disabled={pagination.currentPage <= 1}
    >
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

      <div
        className={`enquiry-container desktop-enquiry-page ${
          isAdmin ? "admin-view" : "user-view"
        }`}
      >
   <div className="enquiry-header">
  <div>
    <h2>Enquiry Sheet</h2>
    <p>Latest enquiries appear first · {pagination.totalRecords || 0} total records</p>
  </div>

  <button className="new-btn" onClick={openNewEnquiry} type="button">
    + New Enquiry
  </button>
</div>
<div className="enquiry-summary-grid">
  {enquirySummaryCards.map((card) => (
    <button
      key={card.status}
      type="button"
      className={`enquiry-summary-card ${card.className} ${
        filters.status === card.status ? "active" : ""
      }`}
      onClick={() => handleStatusCardClick(card.status)}
    >
      <span>{card.label}</span>
      <strong>{card.value}</strong>
    </button>
  ))}
</div>
<div className="enquiry-filter-card">
  <div className="enquiry-filter-grid">
    <div className="filter-field">
      <label>Company</label>
      <input
        type="text"
        name="companyName"
        value={filters.companyName}
        onChange={handleFilterChange}
        placeholder="Search company..."
      />
    </div>
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
  <label>Status</label>
  <select
    name="status"
    value={filters.status}
    onChange={handleFilterChange}
  >
    <option value="all">All Enquiries</option>
    <option value="pending">Pending</option>
    <option value="feasible">Feasible</option>
    <option value="not_feasible">Not Feasible</option>
    <option value="quotation_done">Quotation Done</option>
    <option value="won">Won</option>
    <option value="lost">Lost</option>
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

            <div className="enquiry-color-remarks">
              <div><span className="remark-dot delayed"></span> Delayed</div>
              <div><span className="remark-dot feasible"></span> Feasible</div>
              <div><span className="remark-dot not-feasible"></span> Not Feasible</div>
              <div><span className="remark-dot won"></span> Won</div>
              <div><span className="remark-dot lost"></span> Lost</div>
            </div>

            <div className="filter-buttons">
              <button className="filter-btn" onClick={applyFilters} type="button">
                Apply
              </button>

              <button className="clear-btn" onClick={clearFilters} type="button">
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="enquiry-table-wrapper">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th
                  className="sticky-col sticky-head workflow-empty-head"
                  colSpan={stickyColSpan}
                ></th>

                <th colSpan={11} className="workflow-empty-head"></th>

                <th colSpan={3} className="workflow-step-head">
                  Step 1 - Feasibile
                </th>

                <th colSpan={3} className="workflow-step-head">
                  Step 2 - Quotation
                </th>

                <th colSpan={3} className="workflow-step-head">
                  Step 3 - Closure
                </th>

                <th className="workflow-empty-head"></th>
              </tr>

              <tr>
                <th className="sticky-col sticky-head col-enquiry-no">
                  Enquiry No
                </th>

                <th className="sticky-col sticky-head col-date">
                  Enquiry Date
                </th>

                {isAdmin && (
                  <th className="sticky-col sticky-head col-sales">
                    Sales<br />Person
                  </th>
                )}

                <th className="sticky-col sticky-head col-company">
                  Company
                </th>

                <th>Customer</th>
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

                <th>Plan</th>
                <th>Actual</th>
                <th>Status</th>

                <th>Plan</th>
                <th>Actual</th>
                <th>Link</th>

                <th>Plan</th>
                <th>Actual</th>
                <th>Status</th>

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="no-data">
                    No enquiries found
                  </td>
                </tr>
              ) : (
                enquiries.map((enquiry) => {
                  const sizePdfUrl = getSizePdfUrl(enquiry);

                  return (
                    <tr
  key={enquiry._id}
  className={`${getRowClass(enquiry)} enquiry-click-row`}
  onClick={() => openEnquiryDetail(enquiry)}
>
                      <td className="sticky-col col-enquiry-no">
                        {enquiry.enquiryNumber || "-"}
                      </td>

                      <td className="sticky-col col-date">
                        {formatDateTime(enquiry.createdAt)}
                      </td>

                      {isAdmin && (
                        <td className="sticky-col col-sales">
                          {enquiry.salesPersonId?.name || "-"}
                        </td>
                      )}

                      <td className="sticky-col col-company">
                        {enquiry.companyName || "-"}
                      </td>

                      <td>{enquiry.customerName || "-"}</td>

                      <td className="nowrap-cell">
                        {enquiry.customerContactNo || "-"}
                      </td>

                      <td className="nowrap-cell">
                        {enquiry.customerEmailId || "-"}
                      </td>

                      <td>{enquiry.customerAddress || "-"}</td>
                      <td>{formatEnumLabel(enquiry.productCategory)}</td>
                      <td>{enquiry.grade || "-"}</td>
                      <td>{formatEnumLabel(enquiry.shape)}</td>

                      <td className="size-cell" onClick={stopRowClick}>
                        <div className="size-cell-content">
                          <div className="size-lines">
                            {formatSizeText(enquiry.size)}
                          </div>

                          {sizePdfUrl && (
                            <a
                              href={sizePdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="size-pdf-link"
                            >
                              Size PDF
                            </a>
                          )}
                        </div>
                      </td>

                      <td>{enquiry.quantityInKg || "-"}</td>
                      <td>{formatSupplyCondition(enquiry)}</td>
                      <td>{formatEnumLabel(enquiry.modeOfEnquiry)}</td>

                      <td>{formatDateTime(enquiry.feasibility?.planDate)}</td>
                      <td>{formatDateTime(enquiry.feasibility?.actualDate)}</td>
                      <td>{formatEnumLabel(enquiry.feasibility?.status)}</td>

                      <td>{formatDateTime(enquiry.quotation?.planDate)}</td>
                      <td>{formatDateTime(enquiry.quotation?.actualDate)}</td>
                      <td onClick={stopRowClick}>
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

                      <td>{formatDateTime(enquiry.closure?.planDate)}</td>
                      <td>{formatDateTime(enquiry.closure?.actualDate)}</td>
                      <td>
                        {formatEnumLabel(enquiry.closure?.status)}
                        {enquiry.closure?.status === "lost" &&
                          enquiry.closure?.lostRemark && (
                            <div className="lost-remark-inline">
                              {enquiry.closure.lostRemark === "others"
                                ? enquiry.closure.lostRemarkOtherText || "-"
                                : formatEnumLabel(enquiry.closure.lostRemark)}
                            </div>
                          )}
                      </td>

                     <td onClick={stopRowClick}>
  <button
    className="edit-btn"
    onClick={() => openWorkflowModal(enquiry)}
    type="button"
  >
    Edit
  </button>
</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="enquiry-pagination">
          <button
            onClick={prevPage}
            disabled={pagination.currentPage <= 1}
            type="button"
          >
            Prev
          </button>

          {renderPages()}

          <button
            onClick={nextPage}
            disabled={pagination.currentPage >= pagination.totalPages}
            type="button"
          >
            Next
          </button>

          <span>Total: {pagination.totalRecords}</span>
        </div>
      </div>

            {selectedEnquiryDetail && (
        <EnquiryDetailModal
          enquiry={selectedEnquiryDetail}
          onClose={closeEnquiryDetail}
          isAdmin={isAdmin}
          formatDateTime={formatDateTime}
          formatDate={formatDate}
          formatEnumLabel={formatEnumLabel}
          formatSupplyCondition={formatSupplyCondition}
          getStatusMeta={getStatusMeta}
          getSizePdfUrl={getSizePdfUrl}
        />
      )}

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

function EnquiryDetailModal({
  enquiry,
  onClose,
  isAdmin,
  formatDateTime,
  formatDate,
  formatEnumLabel,
  formatSupplyCondition,
  getStatusMeta,
  getSizePdfUrl,
}) {
  const meta = getStatusMeta(enquiry);
  const sizePdfUrl = getSizePdfUrl(enquiry);

  const enquiryRows = [
    ["Enquiry No", enquiry.enquiryNumber],
    ["Enquiry Date", formatDateTime(enquiry.createdAt)],
    ["Status", meta.label],
    ["Company", enquiry.companyName],
    ["Customer", enquiry.customerName],
    ["Contact", enquiry.customerContactNo],
    ["Email", enquiry.customerEmailId],
    ["Address", enquiry.customerAddress],
    ["Sales Person", enquiry.salesPersonId?.name],
    ["Mode", formatEnumLabel(enquiry.modeOfEnquiry)],
  ];

  const materialRows = [
    ["Product", formatEnumLabel(enquiry.productCategory)],
    ["Grade", enquiry.grade],
    ["Shape", formatEnumLabel(enquiry.shape)],
    ["Size", enquiry.size],
    ["Quantity", enquiry.quantityInKg ? `${enquiry.quantityInKg} Kg` : "-"],
    ["Supply", formatSupplyCondition(enquiry)],
  ];

  const workflowRows = [
    ["Feasibility Plan", formatDateTime(enquiry.feasibility?.planDate)],
    ["Feasibility Actual", formatDateTime(enquiry.feasibility?.actualDate)],
    ["Feasibility Status", formatEnumLabel(enquiry.feasibility?.status)],

    ["Quotation Plan", formatDateTime(enquiry.quotation?.planDate)],
    ["Quotation Actual", formatDateTime(enquiry.quotation?.actualDate)],
    ["Quotation Done", enquiry.quotation?.completed ? "Yes" : "No"],

    ["Closure Plan", formatDateTime(enquiry.closure?.planDate)],
    ["Closure Actual", formatDateTime(enquiry.closure?.actualDate)],
    ["Closure Status", formatEnumLabel(enquiry.closure?.status)],
  ];

  const lostReason =
    enquiry.closure?.status === "lost"
      ? enquiry.closure?.lostRemark === "others"
        ? enquiry.closure?.lostRemarkOtherText
        : formatEnumLabel(enquiry.closure?.lostRemark)
      : "";

  const renderSection = (title, rows, wideLabels = []) => (
    <div className="enquiry-detail-section">
      <h4>{title}</h4>

      <div className="enquiry-detail-grid">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className={`enquiry-detail-item ${
              wideLabels.includes(label) ? "enquiry-detail-wide" : ""
            }`}
          >
            <span>{label}</span>
            <strong>{value || "-"}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="enquiry-detail-overlay" onClick={onClose}>
      <div className="enquiry-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="enquiry-detail-head">
          <div>
            <span>Enquiry Detail</span>
            <h3>{enquiry.companyName || "-"}</h3>
            <p>
              {enquiry.enquiryNumber || "-"} · {formatDate(enquiry.createdAt)}
            </p>
          </div>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="enquiry-detail-hero-grid">
          <div className="enquiry-detail-status-card">
            <span>Status</span>
            <strong style={{ color: meta.color }}>{meta.label}</strong>
          </div>

          <div className="enquiry-detail-status-card">
            <span>Quantity</span>
            <strong>{enquiry.quantityInKg || 0} Kg</strong>
          </div>
        </div>

        {renderSection("Customer / Enquiry Info", enquiryRows, ["Address"])}
        {renderSection("Material Requirement", materialRows, ["Size"])}
        {renderSection("Workflow Monitoring", workflowRows)}

        {lostReason && (
          <div className="enquiry-detail-lost-box">
            <span>Lost Reason</span>
            <strong>{lostReason}</strong>
          </div>
        )}

        <div className="enquiry-detail-actions">
          {sizePdfUrl && (
            <a href={sizePdfUrl} target="_blank" rel="noreferrer">
              Open Size PDF
            </a>
          )}

          {enquiry.quotation?.quotationLink && (
            <a
              href={enquiry.quotation.quotationLink}
              target="_blank"
              rel="noreferrer"
            >
              Open Quotation
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function IosLegend({ label, color }) {
  return (
    <span className="ios-enquiry-legend-item">
      <b style={{ backgroundColor: color }}></b>
      {label}
    </span>
  );
}

function IosInfo({ label, value }) {
  return (
    <div className="ios-enquiry-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IosStep({ title, plan, actual, status }) {
  return (
    <div className="ios-enquiry-step-card">
      <strong>{title}</strong>
      <p>Plan: {plan}</p>
      <p>Actual: {actual}</p>
      <span>{status}</span>
    </div>
  );
}

export default EnquiryList;