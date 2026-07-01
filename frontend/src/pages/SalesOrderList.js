import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  getAllSalesOrders,
  getSalesPersons,
  approveSalesOrderByAdmin,
  rejectSalesOrderByAdmin,
  approveSalesOrderByManager,
  rejectSalesOrderByManager,
   deleteSalesOrder,
} from "../services/salesOrderService";
import "./SalesOrderList.css";
import SalesOrderForm from "./SalesOrderForm";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

const SalesOrderList = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

 const userRole = String(user?.role || "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_");

const isAdmin = userRole === "admin";
const isManager = userRole === "super_admin";
const isSalesPerson = userRole === "user";
  const canViewSalesPersonFilter = isAdmin || isManager;

  const [salesOrders, setSalesOrders] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("approved");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [iosRefreshing, setIosRefreshing] = useState(false);
  const [showIosFilters, setShowIosFilters] = useState(false);
  useLayoutEffect(() => {
  document.body.classList.add("sales-order-browser-scroll-page");

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector(".main");
  if (main) {
    main.scrollTop = 0;
  }

  const dashboardMain = document.querySelector(".dashboard-main");
  if (dashboardMain) {
    dashboardMain.scrollTop = 0;
  }

  return () => {
    document.body.classList.remove("sales-order-browser-scroll-page");
  };
}, []);
  const [approvalModal, setApprovalModal] = useState({
    open: false,
    type: "",
    orderId: null,
  });

  const [rejectionComment, setRejectionComment] = useState("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit:30,
  });
  const [salesSummary, setSalesSummary] = useState({
  todayApproved: {
    totalApprovedOrders: 0,
    totalApprovedValue: 0,
  },
  filteredApproved: {
    totalApprovedOrders: 0,
    totalApprovedValue: 0,
  },
});
  const [filters, setFilters] = useState({
  page: 1,
  limit: 30,
  fromDate: "",
  toDate: "",
  salesPersonId: "",
  approvalTab: "approved",
});

  

 const isDeleteAction = approvalModal.type === "delete_order";
const isRejectAction = approvalModal.type.includes("reject");
const isApproveAction = approvalModal.type.includes("approve");

const getActionButtonText = () => {
  if (actionSubmitting) {
    if (isDeleteAction) return "Deleting...";
    return isApproveAction ? "Approving..." : "Holding...";
  }

  if (isDeleteAction) return "Yes, Delete";
  return isApproveAction ? "Yes, Approve" : "Hold";
};

  const fetchSalesOrders = useCallback(async () => {
  try {
    const cleanFilters = {};

    Object.keys(filters).forEach((key) => {
      if (filters[key]) cleanFilters[key] = filters[key];
    });

    const response = await getAllSalesOrders(cleanFilters);

    const payload = response?.salesOrders
      ? response
      : response?.data?.salesOrders
      ? response.data
      : response;

    setSalesOrders(payload?.salesOrders || payload?.data || []);

    setSalesSummary({
  todayApproved: payload?.summary?.todayApproved || {
    totalApprovedOrders: 0,
    totalApprovedValue: 0,
  },
  filteredApproved: payload?.summary?.filteredApproved || {
    totalApprovedOrders: 0,
    totalApprovedValue: 0,
  },
});

    setPagination(
      payload?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        limit: 30,
      }
    );
  } catch (error) {
    console.log(error);
    alert(error.response?.data?.message || "Failed to load sales orders");
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
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  useEffect(() => {
    if (canViewSalesPersonFilter) {
      fetchSalesPersons();
    }
  }, [canViewSalesPersonFilter, fetchSalesPersons]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "approved") {
      return salesOrders.filter((order) => order.approvalStatus === "approved");
    }

    return salesOrders.filter((order) => order.approvalStatus !== "approved");
  }, [salesOrders, activeTab]);

  // const stats = useMemo(() => {
  //   return {
  //     total: pagination.totalRecords || salesOrders.length,
  //     approved: salesOrders.filter((x) => x.approvalStatus === "approved")
  //       .length,
  //     pending: salesOrders.filter((x) => x.approvalStatus !== "approved")
  //       .length,
  //   };
  // }, [salesOrders, pagination]);

  const iosRefreshAll = async () => {
    try {
      setIosRefreshing(true);
      await fetchSalesOrders();
    } finally {
      setIosRefreshing(false);
    }
  };

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
    limit: 30,
    fromDate: "",
    toDate: "",
    salesPersonId: "",
    approvalTab: activeTab,
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

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

 const formatDateTimeParts = (date) => {
  if (!date) {
    return {
      date: "-",
      time: "-",
    };
  }

  const d = new Date(date);

  return {
    date: d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }),

    time: d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
};
  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return Number(amount).toLocaleString("en-IN");
  };
   const formatSummaryCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};
  const formatPaymentTerms = (value) => {
    if (!value) return "-";
    return String(value).replaceAll("_", " ").toUpperCase();
  };

  const formatStatus = (status) => {
    const map = {
      approved: "APPROVED",
      pending_admin_review: "PENDING SONIA REVIEW",
      pending_manager_approval: "PENDING MD SIR APPROVAL",
      rejected_by_admin: "HOLD BY SONIA",
      rejected_by_manager: "HOLD BY MD SIR",
    };

    return map[status] || String(status || "-").replaceAll("_", " ").toUpperCase();
  };

  const getStatusMeta = (status) => {
    if (status === "approved") {
      return { bg: "#dcfce7", color: "#166534", border: "#16a34a" };
    }

    if (status === "rejected_by_admin" || status === "rejected_by_manager") {
      return { bg: "#fee2e2", color: "#991b1b", border: "#dc2626" };
    }

    return { bg: "#fef3c7", color: "#92400e", border: "#facc15" };
  };

  const getHoldComment = (order) => {
    if (!order) return "";

    if (order.approvalStatus === "rejected_by_manager") {
      return (
        order.managerApproval?.rejectionComment ||
        order.managerRejectionComment ||
        order.rejectionComment ||
        ""
      );
    }

    if (order.approvalStatus === "rejected_by_admin") {
      return (
        order.adminApproval?.rejectionComment ||
        order.adminRejectionComment ||
        order.rejectionComment ||
        ""
      );
    }

    return "";
  };

  const getPdfUrl = (order) => {
    const fileUrl =
      order.pdf?.fileUrl ||
      order.finalSalesOrderPackage?.fileUrl ||
      order.preShipmentInspectionPdf?.fileUrl;

    if (!fileUrl) return "";

    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `${BACKEND_URL.replace(/\/$/, "")}${
          fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`
        }`;

    return `${fullUrl}?t=${order.updatedAt || Date.now()}`;
  };

  const canEditOrder = (order) => {
    return (
      isSalesPerson &&
      (order.approvalStatus === "rejected_by_admin" ||
        order.approvalStatus === "rejected_by_manager" ||
        order.isEditableBySalesPerson === true)
    );
  };

  const canAdminApproveReject = (order) => {
    return isAdmin && order.approvalStatus === "pending_admin_review";
  };

 const canManagerApproveReject = (order) => {
  const status = String(order?.approvalStatus || "").trim();

  return (
    isManager &&
    ["pending_admin_review", "pending_manager_approval"].includes(status)
  );
};

const canDeleteOrder = (order) => {
  const status = String(order?.approvalStatus || "").trim();

  return (
    isManager &&
    ["rejected_by_admin", "rejected_by_manager"].includes(status)
  );
};
 
  const handleAdminApprove = (orderId) => {
    if (actionSubmitting) return;

    setApprovalModal({
      open: true,
      type: "admin_approve",
      orderId,
    });
  };

  const handleAdminReject = (orderId) => {
    if (actionSubmitting) return;

    setApprovalModal({
      open: true,
      type: "admin_reject",
      orderId,
    });
    setRejectionComment("");
  };

  const handleManagerApprove = (orderId) => {
    if (actionSubmitting) return;

    setApprovalModal({
      open: true,
      type: "manager_approve",
      orderId,
    });
  };

  const handleManagerReject = (orderId) => {
    if (actionSubmitting) return;

    setApprovalModal({
      open: true,
      type: "manager_reject",
      orderId,
    });
    setRejectionComment("");
  };

  const closeApprovalModal = () => {
    if (actionSubmitting) return;

    setApprovalModal({
      open: false,
      type: "",
      orderId: null,
    });
    setRejectionComment("");
  };

  const submitApprovalAction = async () => {
    if (actionSubmitting) return;

    try {
      if (approvalModal.type.includes("reject") && !rejectionComment.trim()) {
        alert("Please enter hold reason");
        return;
      }

      setActionSubmitting(true);

      if (approvalModal.type === "admin_approve") {
        await approveSalesOrderByAdmin(approvalModal.orderId);
        alert("Sales order approved and sent to md sir.");
      }

      if (approvalModal.type === "admin_reject") {
        await rejectSalesOrderByAdmin(approvalModal.orderId, {
          rejectionComment: rejectionComment.trim(),
        });
        alert("Sales order put on hold by sonia.");
      }

      if (approvalModal.type === "manager_approve") {
        await approveSalesOrderByManager(approvalModal.orderId);
        alert("Sales order finally approved.");
      }

      if (approvalModal.type === "manager_reject") {
        await rejectSalesOrderByManager(approvalModal.orderId, {
          rejectionComment: rejectionComment.trim(),
        });
        alert("Sales order put on hold by md sir.");
      }
      if (approvalModal.type === "delete_order") {
  await deleteSalesOrder(approvalModal.orderId);
  alert("Sales order deleted successfully.");
}
      closeApprovalModal();
      fetchSalesOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    } finally {
      setActionSubmitting(false);
    }
  };

  const openEditForm = (order) => {
    setEditOrder(order);
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditOrder(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditOrder(null);
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
    } else {
      window.location.href = "/dashboard#dashboard";
    }
  };

  const renderStatusBlock = (order) => {
    const holdComment = getHoldComment(order);

    return (
      <>
        <span className={`status-pill ${order.approvalStatus}`}>
          {formatStatus(order.approvalStatus)}
        </span>

        {holdComment && (
          <div className="hold-comment-text">
            <strong>Comment:</strong> {holdComment}
          </div>
        )}
      </>
    );
  };
 const handleDeleteSalesOrder = (order) => {
  if (!canDeleteOrder(order)) {
    alert("Only super admin can delete hold sales orders.");
    return;
  }

  setApprovalModal({
    open: true,
    type: "delete_order",
    orderId: order._id,
    companyName: order.companyName || "this company",
  });
};
const renderOrderActions = (order, mode = "desktop") => {
  const pdfUrl = getPdfUrl(order);

  return (
    <>
      {mode === "ios" && pdfUrl && (
        <a
          className="ios-sales-pdf-btn"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open PDF
        </a>
      )}

      {canEditOrder(order) && (
        <button
          className={mode === "ios" ? "ios-sales-edit-btn" : "edit-btn"}
          onClick={() => openEditForm(order)}
          disabled={actionSubmitting}
          type="button"
        >
          Edit
        </button>
      )}

      {canAdminApproveReject(order) && (
        <>
          <button
            className={mode === "ios" ? "ios-sales-approve-btn" : "approve-btn"}
            onClick={() => handleAdminApprove(order._id)}
            disabled={actionSubmitting}
            type="button"
          >
            Approve
          </button>

          <button
            className={mode === "ios" ? "ios-sales-hold-btn" : "reject-btn"}
            onClick={() => handleAdminReject(order._id)}
            disabled={actionSubmitting}
            type="button"
          >
            Hold
          </button>
        </>
      )}

      {canManagerApproveReject(order) && (
        <>
          <button
            className={mode === "ios" ? "ios-sales-approve-btn" : "approve-btn"}
            onClick={() => handleManagerApprove(order._id)}
            disabled={actionSubmitting}
            type="button"
          >
            Approve
          </button>

          <button
            className={mode === "ios" ? "ios-sales-hold-btn" : "reject-btn"}
            onClick={() => handleManagerReject(order._id)}
            disabled={actionSubmitting}
            type="button"
          >
            Hold
          </button>
        </>
      )}

      {canDeleteOrder(order) && (
        <button
          className={mode === "ios" ? "ios-sales-delete-btn" : "delete-btn"}
          onClick={() => handleDeleteSalesOrder(order)}
          disabled={actionSubmitting}
          type="button"
        >
          Delete
        </button>
      )}
    </>
  );
};

  return (
    <div className={`sales-order-page-root ${canViewSalesPersonFilter ? "admin-view" : "user-view"}`}>
      <div className="sales-order-pwa-shell">
        <div className="ios-sales-page">
          <div className="ios-sales-header">
            <div className="ios-sales-header-row">
              <button type="button" className="ios-sales-back" onClick={goDashboardModules}>
                ‹
              </button>

              <div>
                <h2>Sales Orders</h2>
                <p>Approved, pending and hold sales orders</p>
              </div>

              <button
                type="button"
                className={`ios-sales-refresh ${iosRefreshing ? "spinning" : ""}`}
                onClick={iosRefreshAll}
              >
                ↻
              </button>
            </div>

            <div className="ios-sales-stats-card ios-sales-stats-card-four">
  <IosStat
    label="Today Orders"
    value={salesSummary.todayApproved.totalApprovedOrders || 0}
  />

  <IosStat
    label="Today Revenue"
    value={formatSummaryCurrency(
      salesSummary.todayApproved.totalApprovedValue
    )}
  />

  <IosStat
    label="Monthly Orders"
    value={salesSummary.filteredApproved.totalApprovedOrders || 0}
  />

  <IosStat
    label="Monthly Revenue"
    value={formatSummaryCurrency(
      salesSummary.filteredApproved.totalApprovedValue
    )}
  />
</div>

            <button type="button" className="ios-sales-new-btn" onClick={openNewForm}>
              + New Sales Order
            </button>
          </div>

          <div className="ios-sales-content">
            <div className="ios-sales-tab-card">
              <button
                type="button"
                className={activeTab === "approved" ? "active" : ""}
                onClick={() => {
  setActiveTab("approved");

  setFilters((prev) => ({
    ...prev,
    page: 1,
    approvalTab: "approved",
  }));
}}
              >
                Approved
              </button>

              <button
                type="button"
                className={activeTab === "pending_rejected" ? "active" : ""}
                onClick={() => {
  setActiveTab("pending_rejected");

  setFilters((prev) => ({
    ...prev,
    page: 1,
    approvalTab: "pending_rejected",
  }));
}}
              >
                Pending / Hold
              </button>
            </div>

            <button
              type="button"
              className="ios-sales-filter-open"
              onClick={() => setShowIosFilters(true)}
            >
              Filters
            </button>

            {showIosFilters && (
              <div className="ios-sales-filter-overlay">
                <div className="ios-sales-filter-card">
                  <div className="ios-sales-filter-head">
                    <div>
                      <h3>Filters</h3>
                      <p>Filter sales order records</p>
                    </div>

                    <button type="button" onClick={() => setShowIosFilters(false)}>
                      ×
                    </button>
                  </div>

                  {canViewSalesPersonFilter && (
                    <>
                      <label className="ios-sales-filter-label">Sales Person</label>

                      <div className="ios-sales-chip-wrap">
                        <button
                          type="button"
                          className={!filters.salesPersonId ? "active" : ""}
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              salesPersonId: "",
                              page: 1,
                            }))
                          }
                        >
                          All
                        </button>

                        {salesPersons.map((person) => (
                          <button
                            type="button"
                            key={person._id}
                            className={filters.salesPersonId === person._id ? "active" : ""}
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                salesPersonId: person._id,
                                page: 1,
                              }))
                            }
                          >
                            {person.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="ios-sales-date-grid">
                    <div className="ios-sales-field">
                      <label>Start Date</label>
                      <input
                        type="date"
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={handleFilterChange}
                        disabled={actionSubmitting}
                      />
                    </div>

                    <div className="ios-sales-field">
                      <label>End Date</label>
                      <input
                        type="date"
                        name="toDate"
                        value={filters.toDate}
                        min={filters.fromDate || ""}
                        disabled={!filters.fromDate || actionSubmitting}
                        onChange={handleFilterChange}
                      />
                    </div>
                  </div>

                  <div className="ios-sales-filter-actions">
                    <button
                      type="button"
                      onClick={() => {
                        clearFilters();
                        setShowIosFilters(false);
                      }}
                    >
                      Clear
                    </button>

                    <button type="button" onClick={() => setShowIosFilters(false)}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {visibleOrders.length === 0 ? (
              <div className="ios-sales-empty">
                <strong>No sales orders found</strong>
                <p>Use filters or refresh to check latest records.</p>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const meta = getStatusMeta(order.approvalStatus);
                const holdComment = getHoldComment(order);

                return (
                  <div
                    key={order._id}
                    className="ios-sales-card"
                    style={{ borderLeftColor: meta.border }}
                  >
                    <div className="ios-sales-card-top">
                      <div>
                        <h4>{order.companyName || "-"}</h4>
                        <p>PO: {order.poNumber || "-"}</p>
                      </div>

                      <div className="sales-order-datetime">
  <span className="sales-order-date">
    {formatDateTimeParts(order.orderDate || order.createdAt).date}
  </span>

  <span className="sales-order-time">
    {formatDateTimeParts(order.orderDate || order.createdAt).time}
  </span>
</div>
                    </div>

                    <div
                      className="ios-sales-status-pill"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {formatStatus(order.approvalStatus)}
                    </div>

                    {holdComment && (
                      <div className="ios-sales-hold-box">
                        Hold Reason: {holdComment}
                      </div>
                    )}

                    <div className="ios-sales-money-card">
                      <span>Order Value</span>
                      <strong>₹{formatCurrency(order.orderValue)}</strong>
                    </div>

                    <div className="ios-sales-info-grid">
                      {canViewSalesPersonFilter && (
                        <IosInfo
                          label="Sales Person"
                          value={order.salesPersonName || order.salesPersonId?.name || "-"}
                        />
                      )}

                      <IosInfo label="Contact" value={order.contactPersonName || "-"} />
                      <IosInfo label="Mobile" value={order.contactPersonNumber || "-"} />
                      <IosInfo label="Payment" value={formatPaymentTerms(order.paymentTerms)} />
                      <IosInfo label="Address" value={order.companyAddress || "-"} full />
                    </div>

                    <div className="ios-sales-action-row">
                      {renderOrderActions(order, "ios")}
                    </div>
                  </div>
                );
              })
            )}

            <div className="ios-sales-pagination">
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
        className={`sales-order-container sales-order-desktop-page ${
          canViewSalesPersonFilter ? "admin-view" : "user-view"
        }`}
      >
        <div className="sales-order-header">
          <div>
            <h2>Sales Order Sheet</h2>
            <p>Approved, pending and hold sales orders</p>
          </div>

          <button
            type="button"
            className="new-sales-btn"
            onClick={openNewForm}
            disabled={actionSubmitting}
          >
            + New Sales Order
          </button>
        </div>

        <div className="sales-status-tabs">
  <button
    className={activeTab === "approved" ? "active-tab" : ""}
    onClick={() => {
      setActiveTab("approved");
      setFilters((prev) => ({
        ...prev,
        page: 1,
        approvalTab: "approved",
      }));
    }}
    disabled={actionSubmitting}
    type="button"
  >
    Approved
  </button>

  <button
    className={activeTab === "pending_rejected" ? "active-tab" : ""}
    onClick={() => {
      setActiveTab("pending_rejected");
      setFilters((prev) => ({
        ...prev,
        page: 1,
        approvalTab: "pending_rejected",
      }));
    }}
    disabled={actionSubmitting}
    type="button"
  >
    Pending / Hold
  </button>
</div>
          <div className="sales-insight-strip">
  <div className="sales-insight-card today-order">
    <span>Today Orders</span>
    <strong>
      {salesSummary.todayApproved.totalApprovedOrders || 0}
    </strong>
  </div>

  <div className="sales-insight-card today-revenue">
    <span>Today Revenue</span>
    <strong>
      {formatSummaryCurrency(
        salesSummary.todayApproved.totalApprovedValue
      )}
    </strong>
  </div>

  <div className="sales-insight-card month-order">
    <span>
      {filters.fromDate || filters.toDate
        ? "Filtered Orders"
        : "Monthly Orders"}
    </span>

    <strong>
      {salesSummary.filteredApproved.totalApprovedOrders || 0}
    </strong>
  </div>

  <div className="sales-insight-card month-revenue">
    <span>
      {filters.fromDate || filters.toDate
        ? "Filtered Revenue"
        : "Monthly Revenue"}
    </span>

    <strong>
      {formatSummaryCurrency(
        salesSummary.filteredApproved.totalApprovedValue
      )}
    </strong>
  </div>
</div>
        <div className="sales-filter-card">
          <div className="sales-filter-grid">
            {canViewSalesPersonFilter && (
              <div className="filter-field">
                <label>Sales Person</label>
                <select
                  name="salesPersonId"
                  value={filters.salesPersonId}
                  onChange={handleFilterChange}
                  disabled={actionSubmitting}
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
                disabled={actionSubmitting}
              />
            </div>

            <div className="filter-field">
              <label>End Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                min={filters.fromDate || ""}
                disabled={!filters.fromDate || actionSubmitting}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-buttons">
              <button
                className="clear-btn"
                onClick={clearFilters}
                disabled={actionSubmitting}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

          <div className="sales-table-wrapper browser-scroll-table">
          <table className="sales-order-table">
            <thead>
              <tr>
                <th className="sticky-col sticky-head col-date">Date</th>

                {canViewSalesPersonFilter && (
                  <th className="sticky-col sticky-head col-sales">
                    Sales Person
                  </th>
                )}

                <th className="sticky-col sticky-head col-company">Company</th>
                <th>PO No</th>
                <th>Contact</th>
                <th>Value</th>
                <th>Payment</th>
                <th>Status</th>
                <th>PDF</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewSalesPersonFilter ? 10 : 9}
                    className="no-data"
                  >
                    No sales orders found
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order) => {
                  const pdfUrl = getPdfUrl(order);

                  return (
                    <tr key={order._id}>
                     <td className="sticky-col col-date">
  <div className="sales-order-datetime">
    <span className="sales-order-date">
      {formatDateTimeParts(order.orderDate || order.createdAt).date}
    </span>

    <span className="sales-order-time">
      {formatDateTimeParts(order.orderDate || order.createdAt).time}
    </span>
  </div>
</td>

                      {canViewSalesPersonFilter && (
                        <td className="sticky-col col-sales">
                          {order.salesPersonName ||
                            order.salesPersonId?.name ||
                            "-"}
                        </td>
                      )}

                      <td className="sticky-col col-company">
                        <b>{order.companyName || "-"}</b>
                        <br />
                        <small>{order.companyAddress || "-"}</small>
                      </td>

                      <td>{order.poNumber || "-"}</td>

                      <td>
                        {order.contactPersonName || "-"}
                        <br />
                        <small>{order.contactPersonNumber || "-"}</small>
                      </td>

                      <td>Rs. {formatCurrency(order.orderValue)}</td>

                      <td>{formatPaymentTerms(order.paymentTerms)}</td>

                      <td>{renderStatusBlock(order)}</td>

                      <td>
                        {pdfUrl ? (
                          <a
                            className="pdf-btn"
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {renderOrderActions(order)}
                        {!canEditOrder(order) &&
                          !canAdminApproveReject(order) &&
                          !canManagerApproveReject(order) &&
                          !canDeleteOrder(order) &&
                          "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sales-pagination">
          <button onClick={prevPage} disabled={pagination.currentPage <= 1} type="button">
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
                  disabled={actionSubmitting}
                  type="button"
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            onClick={nextPage}
            disabled={pagination.currentPage >= pagination.totalPages}
            type="button"
          >
            Next
          </button>

          <span className="total-records">Total: {pagination.totalRecords}</span>
        </div>
      </div>

      {showForm && (
        <SalesOrderForm
          onClose={closeForm}
          refresh={fetchSalesOrders}
          editOrder={editOrder}
        />
      )}

      {approvalModal.open && (
        <div className="approval-modal-overlay">
          <div className="approval-modal-card">
            <div
              className={`approval-icon ${
                isApproveAction ? "approval-icon-approve" : "approval-icon-reject"
              }`}
            >
              {isApproveAction ? "✓" : "!"}
            </div>

            <h3>
  {isDeleteAction
    ? "Delete Sales Order"
    : isApproveAction
    ? "Approve Sales Order"
    : "Hold Sales Order"}
</h3>

            <p>
  {isDeleteAction
    ? "Are you sure you want to permanently delete this sales order?"
    : isApproveAction
    ? "Are you sure you want to approve this sales order?"
    : "Please enter hold reason below."}
</p>

            {isRejectAction && !isDeleteAction && (
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Enter hold reason"
                disabled={actionSubmitting}
              />
            )}

            <div className="approval-modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={closeApprovalModal}
                disabled={actionSubmitting}
                type="button"
              >
                Cancel
              </button>

              <button
  className={
    isDeleteAction
      ? "modal-delete-btn"
      : isApproveAction
      ? "modal-approve-btn"
      : "modal-reject-btn"
  }
                onClick={submitApprovalAction}
                disabled={actionSubmitting}
                type="button"
              >
                {getActionButtonText()}
              </button>
            </div>

            {actionSubmitting && (
              <div className="approval-progress-note">
                Please wait, processing request and sending email...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function IosStat({ label, value }) {
  return (
    <div className="ios-sales-stat-box">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function IosInfo({ label, value, full }) {
  return (
    <div className={`ios-sales-info-box ${full ? "full" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default SalesOrderList;