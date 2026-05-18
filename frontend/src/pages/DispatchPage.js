import React, { useEffect, useState, useCallback } from "react";
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

  const [showForm, setShowForm] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentUpdating, setPaymentUpdating] = useState(false);

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
    page: 1,
    limit: 10,
  });

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: "",
      remark: "",
      paymentBillPdf: null,
      dispatchStatus: "dispatched",
      internalRemark: "",
    });
  };

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      paymentStatus: "",
      dispatchStatus: "",
      companyName: "",
      invoiceNumber: "",
      page: 1,
      limit: 10,
    });
  };

  const openCreateForm = () => {
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
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
    if (!window.confirm("Are you sure you want to delete this dispatch?")) {
      return;
    }

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
    }));
  };

  const renderDocuments = (item) => {
    const billUrl = item.billPdf?.fileUrl;
    const lrUrl = item.lrCopyPdf?.fileUrl;
    const paymentBills =
      item.paymentHistory?.filter((p) => p.paymentBillPdf?.fileUrl) || [];

    return (
      <div className="dispatch-doc-list">
        {billUrl && (
          <a
            href={getFullFileUrl(billUrl)}
            target="_blank"
            rel="noreferrer"
            className="dispatch-doc-link"
          >
            Bill
          </a>
        )}

        {lrUrl && (
          <a
            href={getFullFileUrl(lrUrl)}
            target="_blank"
            rel="noreferrer"
            className="dispatch-doc-link"
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
            className="dispatch-doc-link payment-doc"
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
    if (!item.paymentHistory || item.paymentHistory.length === 0) {
      return null;
    }

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

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <div>
          <h2>Dispatch Management</h2>
          <p>Approved order dispatch, bill/LR tracking and payment follow-up</p>
        </div>

        <button className="dispatch-new-btn" onClick={openCreateForm}>
          + New Dispatch
        </button>
      </div>

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
                  <tr key={item._id}>
                    <td data-label="Company / Customer">
                      <div className="dispatch-company-cell">
                        <strong>{item.companyName || "-"}</strong>
                        <span>{item.contactPersonName || "-"}</span>
                        <small>{item.contactPersonEmail || "-"}</small>
                      </div>
                    </td>

                    <td data-label="Invoice">
                      <div className="dispatch-company-cell">
                        <strong>{item.invoiceNumber || "-"}</strong>
                        <span>{formatDate(item.invoiceDate)}</span>
                        <small>PO: {item.poNumber || "-"}</small>
                      </div>
                    </td>

                    <td data-label="Dispatch">
                      <div className="dispatch-company-cell">
                        <strong>{formatDate(item.dispatchDate)}</strong>
                      </div>
                    </td>

                    <td data-label="Qty">{formatQty(item.dispatchQty)}</td>

                    <td data-label="Invoice Value">
                      {formatCurrency(item.invoiceValue)}
                    </td>

                    <td data-label="Payment">
                      <div className="dispatch-company-cell">
                        <span
                          className={`dispatch-status ${getPaymentStatusClass(
                            paymentStatus
                          )}`}
                        >
                          {paymentStatus}
                        </span>
                        <small>Paid: {formatCurrency(item.paidAmount)}</small>
                        <small>
                          Pending: {formatCurrency(item.pendingAmount)}
                        </small>
                        {renderPaymentHistory(item)}
                      </div>
                    </td>

                    <td data-label="Due Date">
                      {formatDate(item.paymentDueDate)}
                    </td>

                    <td data-label="Documents">{renderDocuments(item)}</td>

                    <td data-label="Status">
                      <span
                        className={`dispatch-status dispatch-${
                          item.dispatchStatus || "dispatched"
                        }`}
                      >
                        {formatStatus(item.dispatchStatus)}
                      </span>
                    </td>

                    <td data-label="Action">
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

        <div className="dispatch-mobile-list">
          {loading ? (
            <div className="dispatch-mobile-empty">Loading dispatch data...</div>
          ) : dispatches.length === 0 ? (
            <div className="dispatch-mobile-empty">No dispatch records found</div>
          ) : (
            dispatches.map((item) => {
              const paymentStatus = item.paymentStatus || "pending";

              return (
                <div key={item._id} className="dispatch-mobile-card">
                  <div className="dispatch-mobile-card-top">
                    <div>
                      <h3>{item.companyName || "-"}</h3>
                      <p>{item.contactPersonName || "-"}</p>
                    </div>

                    <span
                      className={`dispatch-status ${getPaymentStatusClass(
                        paymentStatus
                      )}`}
                    >
                      {paymentStatus}
                    </span>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Invoice</span>
                    <strong>{item.invoiceNumber || "-"}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Dispatch Date</span>
                    <strong>{formatDate(item.dispatchDate)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Quantity</span>
                    <strong>{formatQty(item.dispatchQty)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Invoice Value</span>
                    <strong>{formatCurrency(item.invoiceValue)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Paid</span>
                    <strong>{formatCurrency(item.paidAmount)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Pending</span>
                    <strong>{formatCurrency(item.pendingAmount)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Due Date</span>
                    <strong>{formatDate(item.paymentDueDate)}</strong>
                  </div>

                  <div className="dispatch-mobile-row">
                    <span>Dispatch Status</span>
                    <strong>{formatStatus(item.dispatchStatus)}</strong>
                  </div>

                  {renderPaymentHistory(item)}

                  <div className="dispatch-mobile-docs">
                    {renderDocuments(item)}
                  </div>

                  {canManageItem(item) && (
                    <div className="dispatch-mobile-actions">
                      <button
                        type="button"
                        className="dispatch-mobile-edit-btn"
                        onClick={() => openPaymentModal(item)}
                      >
                        Edit Dispatch
                      </button>

                      {canDeleteDispatch && (
                        <button
                          type="button"
                          className="dispatch-mobile-delete-btn"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

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

      {showForm && <DispatchForm onClose={closeForm} refresh={loadDispatches} />}

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

              <button
                type="button"
                onClick={closePaymentModal}
                disabled={paymentUpdating}
              >
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

                <button
                  type="submit"
                  className="dispatch-submit"
                  disabled={paymentUpdating}
                >
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

export default DispatchPage;