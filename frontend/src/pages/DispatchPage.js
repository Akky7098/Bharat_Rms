import React, { useEffect, useState, useCallback } from "react";

import "./Dispatch.css";

import DispatchForm from "./DispatchForm";

import { getDispatches } from "../services/dispatchService";

const DispatchPage = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState(null);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    paymentStatus: "",
    companyName: "",
  });

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

      setDispatches(response.dispatches || []);
    } catch (error) {
      console.log(error);
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
    }));
  };

  const clearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      paymentStatus: "",
      companyName: "",
    });
  };

  const openCreateForm = () => {
    setEditingDispatch(null);
    setShowForm(true);
  };

  const openEditForm = (dispatch) => {
    setEditingDispatch(dispatch);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDispatch(null);
  };

  const renderDocuments = (item) => {
    return (
      <div className="dispatch-doc-list">
        {item.invoicePdf && (
          <a
            href={item.invoicePdf}
            target="_blank"
            rel="noreferrer"
            className="dispatch-doc-link"
          >
            Invoice
          </a>
        )}

        {item.lrCopyPdf && (
          <a
            href={item.lrCopyPdf}
            target="_blank"
            rel="noreferrer"
            className="dispatch-doc-link"
          >
            LR
          </a>
        )}

        {item.ewayBillPdf && (
          <a
            href={item.ewayBillPdf}
            target="_blank"
            rel="noreferrer"
            className="dispatch-doc-link"
          >
            Eway
          </a>
        )}

        {!item.invoicePdf && !item.lrCopyPdf && !item.ewayBillPdf && (
          <span className="dispatch-doc-disabled">No Docs</span>
        )}
      </div>
    );
  };

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <div>
          <h2>Dispatch Management</h2>
          <p>Invoice, dispatch and payment tracking dashboard</p>
        </div>

        <button className="dispatch-new-btn" onClick={openCreateForm}>
          + New Dispatch
        </button>
      </div>

      <div className="dispatch-filters-card">
        <div className="dispatch-filters-grid">
          <div className="dispatch-filter-field">
            <label>Search Company Name</label>
            <input
              type="text"
              name="companyName"
              value={filters.companyName}
              onChange={handleFilterChange}
              placeholder="Type company name..."
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
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
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
              <th>Company</th>
              <th>Invoice</th>
              <th>Dispatch Date</th>
              <th>Qty</th>
              <th>Invoice Value</th>
              <th>Pending</th>
              <th>Payment Status</th>
              <th>Documents</th>
              <th>Dispatch Status</th>
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
                const salesOrder = item.salesOrder || item.salesOrderId || {};
                const paymentStatus = item.paymentStatus || "pending";

                return (
                  <tr key={item._id}>
                    <td data-label="Company">
                      <div className="dispatch-company-cell">
                        <strong>{salesOrder.companyName || "-"}</strong>
                        <span>{salesOrder.grade || "-"}</span>
                      </div>
                    </td>

                    <td data-label="Invoice">
                      <div className="dispatch-company-cell">
                        <strong>{item.invoiceNumber || "-"}</strong>
                        <span>Invoice Date: {formatDate(item.invoiceDate)}</span>
                      </div>
                    </td>

                    <td data-label="Dispatch Date">
                      {formatDate(item.dispatchDate)}
                    </td>

                    <td data-label="Qty">{formatQty(item.dispatchQty)}</td>

                    <td data-label="Invoice Value">
                      {formatCurrency(item.invoiceValue)}
                    </td>

                    <td data-label="Pending">
                      <div className="dispatch-company-cell">
                        <strong>{formatCurrency(item.pendingAmount)}</strong>
                        <span>Paid: {formatCurrency(item.paidAmount)}</span>
                      </div>
                    </td>

                    <td data-label="Payment Status">
                      <span
                        className={`dispatch-status ${getPaymentStatusClass(
                          paymentStatus
                        )}`}
                      >
                        {paymentStatus}
                      </span>
                    </td>

                    <td data-label="Documents">{renderDocuments(item)}</td>

                    <td data-label="Dispatch Status">
  <span
    className={`dispatch-status dispatch-${item.dispatchStatus || "dispatched"}`}
  >
    {(item.dispatchStatus || "dispatched")
      .replaceAll("_", " ")}
  </span>
</td>

                    <td data-label="Action">
                      <button
                        type="button"
                        className="dispatch-edit-btn"
                        onClick={() => openEditForm(item)}
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

        <div className="dispatch-mobile-list">
          {loading ? (
            <div className="dispatch-mobile-empty">Loading dispatch data...</div>
          ) : dispatches.length === 0 ? (
            <div className="dispatch-mobile-empty">No dispatch records found</div>
          ) : (
            dispatches.map((item) => {
              const salesOrder = item.salesOrder || item.salesOrderId || {};
              const paymentStatus = item.paymentStatus || "pending";

              return (
                <div key={item._id} className="dispatch-mobile-card">
                  <div className="dispatch-mobile-card-top">
                    <div>
                      <h3>{salesOrder.companyName || "-"}</h3>
                      <p>{salesOrder.grade || "-"}</p>
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
                    <span>Pending</span>
                    <strong>{formatCurrency(item.pendingAmount)}</strong>
                  </div>

                 <div className="dispatch-mobile-row">
  <span>Dispatch Status</span>

  <strong>
    {(item.dispatchStatus || "dispatched")
      .replaceAll("_", " ")}
  </strong>
</div>

                  <div className="dispatch-mobile-docs">
                    {item.invoicePdf && (
                      <a
                        href={item.invoicePdf}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Invoice
                      </a>
                    )}

                    {item.lrCopyPdf && (
                      <a
                        href={item.lrCopyPdf}
                        target="_blank"
                        rel="noreferrer"
                      >
                        LR
                      </a>
                    )}

                    {item.ewayBillPdf && (
                      <a
                        href={item.ewayBillPdf}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Eway
                      </a>
                    )}

                    {!item.invoicePdf &&
                      !item.lrCopyPdf &&
                      !item.ewayBillPdf && <span>No Docs</span>}
                  </div>

                  <button
                    type="button"
                    className="dispatch-mobile-edit-btn"
                    onClick={() => openEditForm(item)}
                  >
                    Edit Dispatch
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && (
        <DispatchForm
          editData={editingDispatch}
          onClose={closeForm}
          refresh={loadDispatches}
        />
      )}
    </div>
  );
};

export default DispatchPage;