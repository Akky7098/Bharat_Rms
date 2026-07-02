import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import "./Dispatch.css";
import DispatchForm from "./DispatchForm";

import {
  getDispatches,
  getFullFileUrl,
  updateDispatchPayment,
  updateDispatchStatus,
  deleteDispatch,
} from "../services/dispatchService";

const DispatchPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const canManageAll = ["admin", "super_admin"].includes(user?.role);
  const canDeleteDispatch = user?.role === "super_admin";

  const canManageItem = (item) => {
    if (canManageAll) return true;
    return String(item.salesPersonId) === String(user?._id || user?.id);
  };

  const [dispatches, setDispatches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
const [selectedDispatchDetail, setSelectedDispatchDetail] = useState(null);
  const [paymentUpdating, setPaymentUpdating] = useState(false);
  const [showPwaFilters, setShowPwaFilters] = useState(false);
  const [activeInsight, setActiveInsight] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    remark: "",
    paymentBillPdf: null,
    dispatchStatus: "dispatched",
    internalRemark: "",
  });

 const [filters, setFilters] = useState({
  fromDate: "",
  toDate: "",
  paymentStatus: "",
  dispatchStatus: "",
  companyName: "",
  invoiceNumber: "",
  cardFilter: "",
  page: 1,
  limit: 30,
});

  useLayoutEffect(() => {
    document.body.classList.add("dispatch-pwa-page");

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const main = document.querySelector(".main");
    if (main) main.scrollTop = 0;

    return () => {
      document.body.classList.remove("dispatch-pwa-page");
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatCurrency = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatQty = (qty) => {
    return `${Number(qty || 0).toLocaleString("en-IN")} Kg`;
  };

  const formatStatus = (status) => {
    return String(status || "-").replaceAll("_", " ");
  };

  const formatFileSize = (size) => {
    if (!size) return "";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const getPaymentStatusClass = (status) => {
    if (status === "paid") return "paid";
    if (status === "partial") return "partial";
    if (status === "overdue") return "overdue";
    return "pending";
  };

  // const getMonthRange = () => {
  //   const now = new Date();
  //   const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  //   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  //   const toInputDate = (date) => {
  //     const year = date.getFullYear();
  //     const month = String(date.getMonth() + 1).padStart(2, "0");
  //     const day = String(date.getDate()).padStart(2, "0");
  //     return `${year}-${month}-${day}`;
  //   };

  //   return {
  //     fromDate: toInputDate(firstDay),
  //     toDate: toInputDate(lastDay),
  //   };
  // };

  const isThisMonth = (date) => {
    if (!date) return false;
    const value = new Date(date);
    const now = new Date();

    return (
      value.getMonth() === now.getMonth() &&
      value.getFullYear() === now.getFullYear()
    );
  };

  const dispatchSummary = useMemo(() => {
    return dispatches.reduce(
      (summary, item) => {
        const invoiceValue = Number(item.invoiceValue || 0);
        const pendingAmount = Number(item.pendingAmount || 0);
        const paidAmount = Number(item.paidAmount || 0);
        const paymentStatus = item.paymentStatus || "pending";

        if (isThisMonth(item.dispatchDate || item.invoiceDate || item.createdAt)) {
          summary.monthlyDispatch += invoiceValue;
          summary.monthlyPaid += paidAmount;
        }

        summary.totalDue += pendingAmount;

        if (paymentStatus === "overdue") {
          summary.overdueThisMonth += pendingAmount;
        }

        return summary;
      },
      {
        monthlyDispatch: 0,
        monthlyPaid: 0,
        totalDue: 0,
        overdueThisMonth: 0,
      }
    );
  }, [dispatches]);

  const getBaseFilters = () => ({
  fromDate: "",
  toDate: "",
  paymentStatus: "",
  dispatchStatus: "",
  companyName: "",
  invoiceNumber: "",
  cardFilter: "",
  page: 1,
  limit: 30,
});

 const applyInsightFilter = (type) => {
  if (activeInsight === type) {
    setActiveInsight("");
    setFilters(getBaseFilters());
    return;
  }

  const cardMap = {
    monthlyDispatch: "monthly_dispatch",
    monthlyPaid: "monthly_paid",
    totalDue: "total_due",
    overdueThisMonth: "overdue_this_month",
  };

  setActiveInsight(type);

  setFilters({
    ...getBaseFilters(),
    cardFilter: cardMap[type] || "",
    page: 1,
    limit: 30,
  });
};


  const loadDispatches = useCallback(async () => {
    try {
      setLoading(true);

      const cleanFilters = {};
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== "" &&
          filters[key] !== null &&
          filters[key] !== undefined
        ) {
          cleanFilters[key] = filters[key];
        }
      });

      const response = await getDispatches(cleanFilters);
      setDispatches(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load dispatch data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  const refreshDispatches = async () => {
    try {
      setRefreshing(true);
      await loadDispatches();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (e) => {
  const { name, value } = e.target;

  setActiveInsight("");

  setFilters((prev) => ({
    ...prev,
    [name]: value,
    cardFilter: "",
    page: 1,
    limit: 30,
  }));
};

  const clearFilters = () => {
    setActiveInsight("");
    setFilters(getBaseFilters());
    setShowPwaFilters(false);
  };

  const openCreateForm = () => {
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
    } else {
      window.location.href = "/dashboard#dashboard";
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: "",
      remark: "",
      paymentBillPdf: null,
      dispatchStatus: "dispatched",
      internalRemark: "",
    });
  };

  const openDispatchDetail = (dispatch) => {
  if (!dispatch) return;
  setSelectedDispatchDetail(dispatch);
};

const closeDispatchDetail = () => {
  setSelectedDispatchDetail(null);
};

const stopRowClick = (e) => {
  e.stopPropagation();
};

const openPaymentModal = (dispatch) => {
    setPaymentModal(dispatch);
    setPaymentForm({
      amount: "",
      remark: "",
      paymentBillPdf: null,
      dispatchStatus: dispatch.dispatchStatus || "dispatched",
      internalRemark: dispatch.internalRemark || "",
    });
  };

  const closePaymentModal = () => {
    if (paymentUpdating) return;
    setPaymentModal(null);
    resetPaymentForm();
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!paymentModal?._id) return;

    const amount = Number(paymentForm.amount || 0);
    const hasPayment = amount > 0;

    const statusChanged =
      paymentForm.dispatchStatus !==
        (paymentModal.dispatchStatus || "dispatched") ||
      paymentForm.internalRemark !== (paymentModal.internalRemark || "");

    if (!hasPayment && !statusChanged) {
      alert("Please update payment or dispatch status");
      return;
    }

    if (hasPayment && amount > Number(paymentModal.pendingAmount || 0)) {
      alert("Payment amount cannot be greater than pending amount");
      return;
    }

    if (!hasPayment && paymentForm.paymentBillPdf) {
      alert("Please enter received amount if you are uploading payment bill.");
      return;
    }

    if (paymentForm.paymentBillPdf) {
      if (paymentForm.paymentBillPdf.type !== "application/pdf") {
        alert("Payment bill / receipt must be a PDF file");
        return;
      }

      if (paymentForm.paymentBillPdf.size > 30 * 1024 * 1024) {
        alert("Payment bill PDF must be under 30MB");
        return;
      }
    }

    try {
      setPaymentUpdating(true);

      if (hasPayment) {
        await updateDispatchPayment(
          paymentModal._id,
          {
            amount,
            remark: paymentForm.remark,
          },
          paymentForm.paymentBillPdf
        );
      }

      if (statusChanged) {
        await updateDispatchStatus(paymentModal._id, {
          dispatchStatus: paymentForm.dispatchStatus,
          internalRemark: paymentForm.internalRemark,
        });
      }

      alert("Dispatch updated successfully.");
      closePaymentModal();
      loadDispatches();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update dispatch");
    } finally {
      setPaymentUpdating(false);
    }
  };

  const handleDelete = async (dispatchId) => {
    if (!window.confirm("Are you sure you want to delete this dispatch?")) return;

    try {
      await deleteDispatch(dispatchId);
      alert("Dispatch deleted successfully");
      loadDispatches();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete dispatch");
    }
  };

  const changePage = (page) => {
    setFilters((prev) => ({
      ...prev,
      page,
      limit: 30,
    }));
  };

  const renderDocuments = (item, mode = "desktop") => {
    const billUrl = item.billPdf?.fileUrl;
    const lrUrl = item.lrCopyPdf?.fileUrl;
    const paymentBills =
      item.paymentHistory?.filter((p) => p.paymentBillPdf?.fileUrl) || [];

    return (
      <div className={mode === "pwa" ? "ios-dispatch-doc-list" : "dispatch-doc-list"}>
        {billUrl && (
          <a
            href={getFullFileUrl(billUrl)}
            target="_blank"
            rel="noreferrer"
            className={mode === "pwa" ? "ios-dispatch-doc-btn" : "dispatch-doc-link"}
          >
            Bill
          </a>
        )}

        {lrUrl && (
          <a
            href={getFullFileUrl(lrUrl)}
            target="_blank"
            rel="noreferrer"
            className={mode === "pwa" ? "ios-dispatch-doc-btn" : "dispatch-doc-link"}
          >
            LR
          </a>
        )}

        {paymentBills.map((payment, index) => (
          <a
            key={index}
            href={getFullFileUrl(payment.paymentBillPdf.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className={mode === "pwa" ? "ios-dispatch-doc-btn" : "dispatch-doc-link payment-doc"}
          >
            Payment {index + 1}
          </a>
        ))}

        {!billUrl && !lrUrl && paymentBills.length === 0 && (
          <span className="dispatch-doc-disabled">No Docs</span>
        )}
      </div>
    );
  };

  const renderPaymentHistory = (item) => {
    if (!item.paymentHistory || item.paymentHistory.length === 0) return null;

    return (
      <div className="dispatch-payment-history">
        {item.paymentHistory.map((payment, index) => (
          <div className="dispatch-payment-chip" key={index}>
            <span>Payment {index + 1}</span>
            <strong>{formatCurrency(payment.amount)}</strong>
          </div>
        ))}
      </div>
    );
  };

  const renderPwaFilters = () => (
    <div className="ios-dispatch-filter-overlay">
      <div className="ios-dispatch-filter-card">
        <div className="ios-dispatch-filter-head">
          <div>
            <h3>Filters</h3>
            <p>Filter dispatch records</p>
          </div>

          <button
            type="button"
            className="ios-dispatch-filter-close"
            onClick={() => setShowPwaFilters(false)}
          >
            ×
          </button>
        </div>

        <div className="ios-dispatch-filter-grid">
          <div className="ios-dispatch-field">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={filters.companyName}
              onChange={handleFilterChange}
              placeholder="Search company..."
            />
          </div>

          <div className="ios-dispatch-field">
            <label>Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={filters.invoiceNumber}
              onChange={handleFilterChange}
              placeholder="Search invoice..."
            />
          </div>

          <div className="ios-dispatch-date-grid">
            <div className="ios-dispatch-field">
              <label>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="ios-dispatch-field">
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
          </div>

          <div className="ios-dispatch-date-grid">
            <div className="ios-dispatch-field">
              <label>Payment</label>
              <select
                name="paymentStatus"
                value={filters.paymentStatus}
                onChange={handleFilterChange}
              >
                <option value="">All Payment</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="ios-dispatch-field">
              <label>Dispatch</label>
              <select
                name="dispatchStatus"
                value={filters.dispatchStatus}
                onChange={handleFilterChange}
              >
                <option value="">All Dispatch</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="ios-dispatch-filter-actions">
            <button type="button" onClick={clearFilters}>
              Clear
            </button>

            <button type="button" onClick={() => setShowPwaFilters(false)}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsights = (mode = "desktop") => {
    const InsightComponent = mode === "pwa" ? PwaInsight : DispatchInsight;

    return (
      <>
        <InsightComponent
          label="Monthly Dispatch"
          value={formatCurrency(dispatchSummary.monthlyDispatch)}
          active={activeInsight === "monthlyDispatch"}
          onClick={() => applyInsightFilter("monthlyDispatch")}
        />

        <InsightComponent
          label="Monthly Paid"
          value={formatCurrency(dispatchSummary.monthlyPaid)}
          active={activeInsight === "monthlyPaid"}
          onClick={() => applyInsightFilter("monthlyPaid")}
        />

        <InsightComponent
          label="Total Due"
          value={formatCurrency(dispatchSummary.totalDue)}
          active={activeInsight === "totalDue"}
          onClick={() => applyInsightFilter("totalDue")}
        />

        <InsightComponent
          label="Overdue This Month"
          value={formatCurrency(dispatchSummary.overdueThisMonth)}
          active={activeInsight === "overdueThisMonth"}
          onClick={() => applyInsightFilter("overdueThisMonth")}
        />
      </>
    );
  };

  return (
    <div className="dispatch-container">
      <div className="dispatch-pwa-shell">
        <div className="ios-dispatch-page">
          <div className="ios-dispatch-header">
            <div className="ios-dispatch-header-row">
              <button type="button" className="ios-dispatch-back" onClick={goDashboardModules}>
                ‹
              </button>

              <div className="ios-dispatch-title">
                <h2>Dispatch</h2>
                <p>Bill, LR and payment follow-up</p>
              </div>

              <button
                type="button"
                className={`ios-dispatch-refresh ${refreshing ? "spinning" : ""}`}
                onClick={refreshDispatches}
                disabled={refreshing || loading}
              >
                ↻
              </button>
            </div>

            <div className="ios-dispatch-insight-card ios-dispatch-insight-card-four">
              {renderInsights("pwa")}
            </div>

            <button type="button" className="ios-dispatch-new-btn" onClick={openCreateForm}>
              + New Dispatch
            </button>
          </div>

          <div className="ios-dispatch-content">
            <button
              type="button"
              className="ios-dispatch-filter-open"
              onClick={() => setShowPwaFilters(true)}
            >
              Filters
            </button>

            {showPwaFilters && renderPwaFilters()}

            {loading ? (
              <div className="ios-dispatch-empty">Loading dispatch data...</div>
            ) : dispatches.length === 0 ? (
              <div className="ios-dispatch-empty">No dispatch records found</div>
            ) : (
              dispatches.map((item) => {
                const paymentStatus = item.paymentStatus || "pending";

                return (
                  <div
  key={item._id}
  className="ios-dispatch-card dispatch-click-row"
  onClick={() => openDispatchDetail(item)}
>
                    <div className="ios-dispatch-card-top">
                      <div>
                        <h4>{item.companyName || "-"}</h4>
                        <p className="ios-dispatch-sales-person">
                          Sales: {item.salesPersonName || item.salesPersonId?.name || "-"}
                        </p>
                        <p>{item.contactPersonName || "-"}</p>
                        <p>{item.contactPersonEmail || "-"}</p>
                      </div>

                      <span className={`dispatch-status ${getPaymentStatusClass(paymentStatus)}`}>
                        {paymentStatus}
                      </span>
                    </div>

                    <div className="ios-dispatch-money-card">
                      <span>Invoice Value</span>
                      <strong>{formatCurrency(item.invoiceValue)}</strong>
                    </div>

                    <div className="ios-dispatch-info-grid">
                      <PwaInfo label="Sales Person" value={item.salesPersonName || item.salesPersonId?.name || "-"} />
                      <PwaInfo label="Invoice" value={item.invoiceNumber || "-"} />
                      <PwaInfo label="PO Number" value={item.poNumber || "-"} />
                      <PwaInfo label="Dispatch Date" value={formatDate(item.dispatchDate)} />
                      <PwaInfo label="Quantity" value={formatQty(item.dispatchQty)} />
                      <PwaInfo label="Paid" value={formatCurrency(item.paidAmount)} />
                      <PwaInfo label="Pending" value={formatCurrency(item.pendingAmount)} />
                      <PwaInfo label="Due Date" value={formatDate(item.paymentDueDate)} />
                      <PwaInfo label="Status" value={formatStatus(item.dispatchStatus)} />
                      <PwaInfo label="Email" value={item.contactPersonEmail || "-"} full />
                    </div>

                    {renderPaymentHistory(item)}

                    <div className="ios-dispatch-bottom-row" onClick={stopRowClick}>
                      <div className="ios-dispatch-doc-section">
                        <span>Documents</span>
                        {renderDocuments(item, "pwa")}
                      </div>

                      <div className="ios-dispatch-actions">
                        {canManageItem(item) && (
                          <button
                            type="button"
                            className="ios-dispatch-edit-btn"
                            onClick={() => openPaymentModal(item)}
                          >
                            Edit Dispatch
                          </button>
                        )}

                        {canDeleteDispatch && (
                          <button
                            type="button"
                            className="ios-dispatch-delete-btn"
                            onClick={() => handleDelete(item._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="ios-dispatch-pagination">
                <button
                  type="button"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => changePage(pagination.currentPage - 1)}
                >
                  Prev
                </button>

                <span>
                  Page {pagination.currentPage} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => changePage(pagination.currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dispatch-desktop-page">
        <div className="dispatch-header">
          <div>
            <h2>Dispatch Management</h2>
            <p>Approved order dispatch, bill/LR tracking and payment follow-up</p>
          </div>

          <button className="dispatch-new-btn" onClick={openCreateForm}>
            + New Dispatch
          </button>
        </div>

        <div className="dispatch-insight-strip">{renderInsights("desktop")}</div>

        <div className="dispatch-filters-card">
          <div className="dispatch-filters-grid">
            <div className="dispatch-filter-field">
              <label>Company Name</label>
              <input
                type="text"
                name="companyName"
                value={filters.companyName}
                onChange={handleFilterChange}
                placeholder="Search company..."
              />
            </div>

            <div className="dispatch-filter-field">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoiceNumber"
                value={filters.invoiceNumber}
                onChange={handleFilterChange}
                placeholder="Search invoice..."
              />
            </div>

            <div className="dispatch-filter-field">
              <label>From Dispatch Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="dispatch-filter-field">
              <label>To Dispatch Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                min={filters.fromDate || ""}
                disabled={!filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="dispatch-filter-field">
              <label>Payment Status</label>
              <select
                name="paymentStatus"
                value={filters.paymentStatus}
                onChange={handleFilterChange}
              >
                <option value="">All Payment</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="dispatch-filter-field">
              <label>Dispatch Status</label>
              <select
                name="dispatchStatus"
                value={filters.dispatchStatus}
                onChange={handleFilterChange}
              >
                <option value="">All Dispatch</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="dispatch-filter-actions">
              <button type="button" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="dispatch-table-wrapper">
          <table className="dispatch-table">
            <thead>
              <tr>
                <th>Company / Customer</th>
                <th>Invoice</th>
                <th>Dispatch</th>
                <th>Qty</th>
                <th>Invoice Value</th>
                <th>Payment</th>
                <th>Due Date</th>
                <th>Documents</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="no-data" colSpan="10">
                    Loading dispatch data...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td className="no-data" colSpan="10">
                    No dispatch records found
                  </td>
                </tr>
              ) : (
                dispatches.map((item) => {
                  const paymentStatus = item.paymentStatus || "pending";

                  return (
                    <tr
  key={item._id}
  className="dispatch-click-row"
  onClick={() => openDispatchDetail(item)}
>
                      <td>
                        <div className="dispatch-company-cell">
                          <strong>{item.companyName || "-"}</strong>
                          <span className="dispatch-sales-person-text">
                            Sales: {item.salesPersonName || item.salesPersonId?.name || "-"}
                          </span>
                          <span>{item.contactPersonName || "-"}</span>
                          <small>{item.contactPersonEmail || "-"}</small>
                        </div>
                      </td>

                      <td>
                        <div className="dispatch-company-cell">
                          <strong>{item.invoiceNumber || "-"}</strong>
                          <span>{formatDate(item.invoiceDate)}</span>
                          <small>PO: {item.poNumber || "-"}</small>
                        </div>
                      </td>

                      <td>
                        <div className="dispatch-company-cell">
                          <strong>{formatDate(item.dispatchDate)}</strong>
                        </div>
                      </td>

                      <td>{formatQty(item.dispatchQty)}</td>
                      <td>{formatCurrency(item.invoiceValue)}</td>

                      <td>
                        <div className="dispatch-company-cell">
                          <span className={`dispatch-status ${getPaymentStatusClass(paymentStatus)}`}>
                            {paymentStatus}
                          </span>
                          <small>Paid: {formatCurrency(item.paidAmount)}</small>
                          <small>Pending: {formatCurrency(item.pendingAmount)}</small>
                          {renderPaymentHistory(item)}
                        </div>
                      </td>

                      <td>{formatDate(item.paymentDueDate)}</td>
                      <td onClick={stopRowClick}>{renderDocuments(item)}</td>

                      <td>
                        <span className={`dispatch-status dispatch-${item.dispatchStatus || "dispatched"}`}>
                          {formatStatus(item.dispatchStatus)}
                        </span>
                      </td>
<td onClick={stopRowClick}>
  <div className="dispatch-action-group">
                          {canManageItem(item) && (
                            <button
                              type="button"
                              className="dispatch-edit-btn"
                              onClick={() => openPaymentModal(item)}
                            >
                              Edit
                            </button>
                          )}

                          {canDeleteDispatch && (
                            <button
                              type="button"
                              className="dispatch-delete-btn"
                              onClick={() => handleDelete(item._id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {pagination && pagination.totalPages > 1 && (
            <div className="dispatch-pagination">
              <button
                type="button"
                disabled={pagination.currentPage <= 1}
                onClick={() => changePage(pagination.currentPage - 1)}
              >
                Previous
              </button>

              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => changePage(pagination.currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && <DispatchForm onClose={closeForm} refresh={loadDispatches} />}

      {selectedDispatchDetail && (
  <DispatchDetailModal
    item={selectedDispatchDetail}
    onClose={closeDispatchDetail}
    formatDate={formatDate}
    formatCurrency={formatCurrency}
    formatQty={formatQty}
    formatStatus={formatStatus}
    getPaymentStatusClass={getPaymentStatusClass}
    renderDocuments={renderDocuments}
  />
)}

{paymentModal && (
        <div className="dispatch-modal-overlay">
          <div className="dispatch-payment-card">
            <div className="dispatch-form-header">
              <div>
                <h2>Manage Dispatch</h2>
                <p>
                  Invoice {paymentModal.invoiceNumber} · Pending{" "}
                  {formatCurrency(paymentModal.pendingAmount)}
                </p>
              </div>

              <button type="button" onClick={closePaymentModal} disabled={paymentUpdating}>
                ×
              </button>
            </div>

            <form className="dispatch-form" onSubmit={handlePaymentSubmit}>
              <div className="dispatch-grid">
                <div className="dispatch-field">
                  <label>Received Amount ₹</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Enter received amount"
                    disabled={paymentUpdating}
                  />
                </div>

                <div className="dispatch-field">
                  <label>Dispatch Status</label>
                  <select
                    value={paymentForm.dispatchStatus}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        dispatchStatus: e.target.value,
                      }))
                    }
                    disabled={paymentUpdating || paymentModal?.dispatchStatus === "delivered"}
                  >
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                  </select>

                  {paymentModal?.dispatchStatus === "delivered" && (
                    <small className="dispatch-lock-note">
                      Delivery status is locked. Payment can still be updated.
                    </small>
                  )}
                </div>

                <div className="dispatch-field dispatch-full">
                  <label>Payment Bill / Receipt PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    disabled={paymentUpdating}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentBillPdf: e.target.files[0] || null,
                      }))
                    }
                  />

                  {paymentForm.paymentBillPdf && (
                    <small className="dispatch-selected-payment-file">
                      {paymentForm.paymentBillPdf.name} ·{" "}
                      {formatFileSize(paymentForm.paymentBillPdf.size)}
                    </small>
                  )}
                </div>

                <div className="dispatch-field dispatch-full">
                  <label>Status / Internal Remark</label>
                  <textarea
                    value={paymentForm.internalRemark}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        internalRemark: e.target.value,
                      }))
                    }
                    placeholder="Example: Material delivered successfully"
                    disabled={paymentUpdating}
                  />
                </div>

                <div className="dispatch-field dispatch-full">
                  <label>Payment Remark</label>
                  <textarea
                    value={paymentForm.remark}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        remark: e.target.value,
                      }))
                    }
                    placeholder="Example: Payment received by NEFT"
                    disabled={paymentUpdating}
                  />
                </div>
              </div>

              <div className="dispatch-actions">
                <button
                  type="button"
                  className="dispatch-cancel"
                  onClick={closePaymentModal}
                  disabled={paymentUpdating}
                >
                  Cancel
                </button>

                <button type="submit" className="dispatch-submit" disabled={paymentUpdating}>
                  {paymentUpdating ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


function DispatchDetailModal({
  item,
  onClose,
  formatDate,
  formatCurrency,
  formatQty,
  formatStatus,
  getPaymentStatusClass,
  renderDocuments,
}) {
  const paymentStatus = item.paymentStatus || "pending";

  const rows = [
    ["Company", item.companyName],
    ["Sales Person", item.salesPersonName || item.salesPersonId?.name],
    ["Contact Person", item.contactPersonName],
    ["Contact Email", item.contactPersonEmail],
    ["Invoice Number", item.invoiceNumber],
    ["Invoice Date", formatDate(item.invoiceDate)],
    ["PO Number", item.poNumber],
    ["Dispatch Date", formatDate(item.dispatchDate)],
    ["Quantity", formatQty(item.dispatchQty)],
    ["Invoice Value", formatCurrency(item.invoiceValue)],
    ["Paid Amount", formatCurrency(item.paidAmount)],
    ["Pending Amount", formatCurrency(item.pendingAmount)],
    ["Payment Due Date", formatDate(item.paymentDueDate)],
    ["Payment Status", formatStatus(paymentStatus)],
    ["Dispatch Status", formatStatus(item.dispatchStatus)],
    ["Internal Remark", item.internalRemark],
  ];

  return (
    <div className="dispatch-detail-overlay" onClick={onClose}>
      <div className="dispatch-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-detail-head">
          <div>
            <span>Dispatch Detail</span>
            <h3>{item.companyName || "-"}</h3>
            <p>Invoice: {item.invoiceNumber || "-"} · PO: {item.poNumber || "-"}</p>
          </div>

          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="dispatch-detail-hero-grid">
          <div className="dispatch-detail-value-card">
            <span>Invoice Value</span>
            <strong>{formatCurrency(item.invoiceValue)}</strong>
          </div>

          <div className={`dispatch-detail-status-card ${getPaymentStatusClass(paymentStatus)}`}>
            <span>Payment Status</span>
            <strong>{formatStatus(paymentStatus)}</strong>
            <p>Pending: {formatCurrency(item.pendingAmount)}</p>
          </div>
        </div>

        <div className="dispatch-detail-grid">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className={`dispatch-detail-item ${
                ["Internal Remark", "Company"].includes(label)
                  ? "dispatch-detail-wide"
                  : ""
              }`}
            >
              <span>{label}</span>
              <strong>{value || "-"}</strong>
            </div>
          ))}
        </div>

        {item.paymentHistory?.length > 0 && (
          <div className="dispatch-detail-section">
            <h4>Payment History</h4>

            <div className="dispatch-detail-payment-list">
              {item.paymentHistory.map((payment, index) => (
                <div key={index} className="dispatch-detail-payment-card">
                  <span>Payment {index + 1}</span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <p>{payment.remark || "-"}</p>
                  <small>{formatDate(payment.createdAt || payment.paidAt)}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dispatch-detail-actions">
          {renderDocuments(item)}
        </div>
      </div>
    </div>
  );
}

function DispatchInsight({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      className={`dispatch-insight-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{active ? "Click to clear" : "Click to filter"}</small>
    </button>
  );
}

function PwaInsight({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      className={`ios-dispatch-insight-box ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{active ? "Tap to clear" : "Tap to filter"}</small>
    </button>
  );
}

function PwaInfo({ label, value, full }) {
  return (
    <div className={`ios-dispatch-info-box ${full ? "full" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default DispatchPage;