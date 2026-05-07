import React, { useEffect, useState } from "react";

import { createDispatch, updateDispatch } from "../services/dispatchService";

import { searchPendingDispatchSalesOrders } from "../services/salesOrderService";

import "./Dispatch.css";

const DispatchForm = ({ editData = null, onClose, refresh }) => {
  const isEditMode = Boolean(editData?._id);

  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [searchError, setSearchError] = useState("");

  const [form, setForm] = useState({
    salesOrderId: "",
    invoiceNumber: "",
    invoiceDate: "",
    dispatchDate: "",
    dispatchQty: "",
    invoiceValue: "",
    paymentDays: "",
    paidAmount: "0",
    paymentStatus: "pending",
    transporterName: "",
    vehicleNumber: "",
    lrNumber: "",
    ewayBillNumber: "",
    invoicePdf: "",
    lrCopyPdf: "",
    ewayBillPdf: "",
    dispatchStatus: "dispatched",
    internalRemark: "",
  });

  const toInputDate = (date) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  const formatCurrency = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const calculatePendingAmount = () => {
    const invoiceValue = Number(form.invoiceValue || 0);
    const paidAmount = Number(form.paidAmount || 0);

    return Math.max(invoiceValue - paidAmount, 0);
  };

  const calculateDueDatePreview = () => {
    if (!form.dispatchDate || form.paymentDays === "") return "-";

    const dueDate = new Date(form.dispatchDate);
    dueDate.setDate(dueDate.getDate() + Number(form.paymentDays || 0));

    return formatDate(dueDate);
  };

  useEffect(() => {
    if (!isEditMode || !editData) return;

    const salesOrder = editData.salesOrder || editData.salesOrderId || {};

    setSelectedOrder(salesOrder);
    setSearch(salesOrder.companyName || "");

    setForm({
      salesOrderId: salesOrder._id || editData.salesOrderId?._id || editData.salesOrderId || "",
      invoiceNumber: editData.invoiceNumber || "",
      invoiceDate: toInputDate(editData.invoiceDate),
      dispatchDate: toInputDate(editData.dispatchDate),
      dispatchQty: editData.dispatchQty || "",
      invoiceValue: editData.invoiceValue || "",
      paymentDays: editData.paymentDays ?? "",
      paidAmount: editData.paidAmount ?? "0",
      paymentStatus: editData.paymentStatus || "pending",
      transporterName: editData.transporterName || "",
      vehicleNumber: editData.vehicleNumber || "",
      lrNumber: editData.lrNumber || "",
      ewayBillNumber: editData.ewayBillNumber || "",
      invoicePdf: editData.invoicePdf || "",
      lrCopyPdf: editData.lrCopyPdf || "",
      ewayBillPdf: editData.ewayBillPdf || "",
      dispatchStatus: editData.dispatchStatus || "dispatched",
      internalRemark: editData.internalRemark || "",
    });
  }, [editData, isEditMode]);

  const loadOrders = async (searchValue) => {
    try {
      setLoadingOrders(true);

      const response = await searchPendingDispatchSalesOrders({
        search: searchValue,
        limit: 20,
      });

      setOrders(response.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isEditMode) return;

    if (search.trim().length < 1) {
      setOrders([]);
      return;
    }

    const delay = setTimeout(() => {
      loadOrders(search);
    }, 350);

    return () => clearTimeout(delay);
  }, [search, isEditMode]);

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setSearchError("");
    setOrders([]);
    setSearch(order.companyName);

    setForm((prev) => ({
      ...prev,
      salesOrderId: order._id,
      paymentDays: "",
    }));
  };

  const clearSelectedOrder = () => {
    if (isEditMode) return;

    setSelectedOrder(null);
    setSearch("");
    setOrders([]);
    setSearchError("");

    setForm((prev) => ({
      ...prev,
      salesOrderId: "",
    }));
  };

  const handleSearchChange = (e) => {
    if (isEditMode) return;

    const value = e.target.value;

    setSearch(value);
    setSelectedOrder(null);
    setSearchError("");

    setForm((prev) => ({
      ...prev,
      salesOrderId: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      const invoiceValue =
        name === "invoiceValue" ? Number(value || 0) : Number(updated.invoiceValue || 0);

      const paidAmount =
        name === "paidAmount" ? Number(value || 0) : Number(updated.paidAmount || 0);

      if (name === "invoiceValue" || name === "paidAmount") {
        if (paidAmount <= 0) {
          updated.paymentStatus = "pending";
        } else if (paidAmount >= invoiceValue && invoiceValue > 0) {
          updated.paymentStatus = "paid";
        } else if (paidAmount > 0 && paidAmount < invoiceValue) {
          updated.paymentStatus = "partial";
        }
      }

      return updated;
    });
  };

  const validateForm = () => {
    if (!selectedOrder || !form.salesOrderId) {
      setSearchError("Please select a valid sales order from dropdown");
      return false;
    }

    if (!form.invoiceNumber.trim()) {
      alert("Invoice number is required");
      return false;
    }

    if (!form.invoiceDate) {
      alert("Invoice date is required");
      return false;
    }

    if (!form.dispatchDate) {
      alert("Dispatch date is required");
      return false;
    }

    if (Number(form.dispatchQty) <= 0) {
      alert("Dispatch quantity must be greater than 0");
      return false;
    }

    if (
      !isEditMode &&
      selectedOrder?.pendingDispatchQty > 0 &&
      Number(form.dispatchQty) > Number(selectedOrder.pendingDispatchQty)
    ) {
      alert(
        `Dispatch quantity cannot be greater than pending quantity ${selectedOrder.pendingDispatchQty} Kg`
      );
      return false;
    }

    if (Number(form.invoiceValue) <= 0) {
      alert("Invoice value must be greater than 0");
      return false;
    }

    if (form.paymentDays === "" || Number(form.paymentDays) < 0) {
      alert("Payment days is required");
      return false;
    }

    if (Number(form.paidAmount || 0) < 0) {
      alert("Paid amount cannot be negative");
      return false;
    }

    if (Number(form.paidAmount || 0) > Number(form.invoiceValue || 0)) {
      alert("Paid amount cannot be greater than invoice value");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    ...form,
    dispatchQty: Number(form.dispatchQty),
    invoiceValue: Number(form.invoiceValue),
    paymentDays: Number(form.paymentDays),
    paidAmount: Number(form.paidAmount || 0),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (isEditMode) {
        await updateDispatch(editData._id, buildPayload());
        alert("Dispatch updated successfully");
      } else {
        await createDispatch(buildPayload());
        alert("Dispatch created successfully");
      }

      refresh();
      onClose();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          (isEditMode ? "Failed to update dispatch" : "Failed to create dispatch")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dispatch-modal-overlay">
      <div className="dispatch-form-card">
        <div className="dispatch-form-header">
          <div>
            <h2>{isEditMode ? "Update Dispatch" : "Create Dispatch"}</h2>
            <p>
              {isEditMode
                ? "Update invoice, payment and document details"
                : "Select sales order, add invoice and dispatch details"}
            </p>
          </div>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="dispatch-form" onSubmit={handleSubmit}>
          <div className="dispatch-search-section">
            <label>
              Sales Order <span className="dispatch-required">*</span>
            </label>

            <input
              type="text"
              placeholder="Type company name, example: MTN"
              value={search}
              onChange={handleSearchChange}
              disabled={isEditMode}
              onBlur={() => {
                setTimeout(() => {
                  if (!isEditMode && !selectedOrder && search.trim()) {
                    setSearchError("Please select a valid sales order from dropdown");
                  }
                }, 180);
              }}
            />

            {isEditMode && (
              <small className="dispatch-edit-note">
                Sales order cannot be changed while updating dispatch.
              </small>
            )}

            {searchError && (
              <small className="dispatch-search-error">{searchError}</small>
            )}

            {loadingOrders && (
              <div className="dispatch-search-loading">Searching orders...</div>
            )}

            {!isEditMode &&
              !loadingOrders &&
              search.trim() &&
              orders.length === 0 &&
              !selectedOrder && (
                <div className="dispatch-no-result">
                  No pending sales order found for "{search}"
                </div>
              )}

            {!isEditMode && orders.length > 0 && (
              <div className="dispatch-search-results">
                {orders.map((order) => (
                  <button
                    type="button"
                    key={order._id}
                    className="dispatch-order-card"
                    onMouseDown={() => selectOrder(order)}
                  >
                    <div className="dispatch-order-top">
                      <div>
                        <strong>⭐ {order.companyName}</strong>
                        <small>
                          Order Date: {formatDate(order.orderDate)} · Sales:{" "}
                          {order.salesPersonId?.name || "-"}
                        </small>
                      </div>

                      <span>{formatNumber(order.pendingDispatchQty)} Kg Pending</span>
                    </div>

                    <div className="dispatch-order-mini-grid">
                      <div>
                        <label>Grade</label>
                        <p>{order.grade || "-"}</p>
                      </div>

                      <div>
                        <label>Size</label>
                        <p>{order.size || "-"}</p>
                      </div>

                      <div>
                        <label>Order Qty</label>
                        <p>{formatNumber(order.quantityInKg)} Kg</p>
                      </div>

                      <div>
                        <label>Order Value</label>
                        <p>{formatCurrency(order.valueInRupees)}</p>
                      </div>

                      <div>
                        <label>Rate/Kg</label>
                        <p>{formatCurrency(order.ratePerKg)}</p>
                      </div>

                      <div>
                        <label>Status</label>
                        <p>{order.orderStatus || "pending_dispatch"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedOrder && (
            <div className="dispatch-selected-order">
              <div className="dispatch-selected-title">
                <strong>⭐ Selected Sales Order</strong>

                {!isEditMode && (
                  <button type="button" onClick={clearSelectedOrder}>
                    Change
                  </button>
                )}
              </div>

              <div className="dispatch-selected-grid">
                <div>
                  <span>Company</span>
                  <strong>{selectedOrder.companyName || "-"}</strong>
                </div>

                <div>
                  <span>Grade</span>
                  <strong>{selectedOrder.grade || "-"}</strong>
                </div>

                <div>
                  <span>Pending Qty</span>
                  <strong>{formatNumber(selectedOrder.pendingDispatchQty)} Kg</strong>
                </div>

                <div>
                  <span>Order Value</span>
                  <strong>{formatCurrency(selectedOrder.valueInRupees)}</strong>
                </div>

                <div>
                  <span>Rate/Kg</span>
                  <strong>{formatCurrency(selectedOrder.ratePerKg)}</strong>
                </div>

                <div>
                  <span>Payment Terms</span>
                  <strong>{selectedOrder.paymentTerms || "-"}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="dispatch-section-title">
            <h3>Invoice & Payment Details</h3>
            <p>These fields control due date, payment status and reminder cronjob</p>
          </div>

          <div className="dispatch-grid">
            <div className="dispatch-field">
              <label>
                Invoice Number <span className="dispatch-required">*</span>
              </label>
              <input
                name="invoiceNumber"
                value={form.invoiceNumber}
                onChange={handleChange}
                placeholder="Example: INV-1024"
                required
              />
            </div>

            <div className="dispatch-field">
              <label>
                Invoice Date <span className="dispatch-required">*</span>
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={form.invoiceDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="dispatch-field">
              <label>
                Dispatch Date <span className="dispatch-required">*</span>
              </label>
              <input
                type="date"
                name="dispatchDate"
                value={form.dispatchDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="dispatch-field">
              <label>
                Dispatch Qty Kg <span className="dispatch-required">*</span>
              </label>
              <input
                type="number"
                name="dispatchQty"
                value={form.dispatchQty}
                onChange={handleChange}
                placeholder="Enter dispatch quantity"
                required
              />
            </div>

            <div className="dispatch-field">
              <label>
                Invoice Value ₹ <span className="dispatch-required">*</span>
              </label>
              <input
                type="number"
                name="invoiceValue"
                value={form.invoiceValue}
                onChange={handleChange}
                placeholder="Enter invoice amount"
                required
              />
            </div>

            <div className="dispatch-field">
              <label>
                Payment Days <span className="dispatch-required">*</span>
              </label>
              <input
                type="number"
                name="paymentDays"
                value={form.paymentDays}
                onChange={handleChange}
                placeholder="Example: 45"
                min="0"
                required
              />
            </div>

            <div className="dispatch-field">
              <label>Paid Amount ₹</label>
              <input
                type="number"
                name="paidAmount"
                value={form.paidAmount}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="dispatch-field">
              <label>Payment Status</label>
              <select
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="dispatch-field">
              <label>Pending Amount ₹</label>
              <input value={calculatePendingAmount()} disabled readOnly />
            </div>

            <div className="dispatch-field">
              <label>Payment Due Date</label>
              <input value={calculateDueDatePreview()} disabled readOnly />
            </div>

            <div className="dispatch-field">
              <label>Dispatch Status</label>
              <select
                name="dispatchStatus"
                value={form.dispatchStatus}
                onChange={handleChange}
              >
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="dispatch-section-title">
            <h3>Transport & Documents</h3>
            <p>Optional fields for invoice, LR and e-way bill tracking</p>
          </div>

          <div className="dispatch-grid">
            <div className="dispatch-field">
              <label>Transporter Name</label>
              <input
                name="transporterName"
                value={form.transporterName}
                onChange={handleChange}
                placeholder="Transport name"
              />
            </div>

            <div className="dispatch-field">
              <label>Vehicle Number</label>
              <input
                name="vehicleNumber"
                value={form.vehicleNumber}
                onChange={handleChange}
                placeholder="Vehicle number"
              />
            </div>

            <div className="dispatch-field">
              <label>LR Number</label>
              <input
                name="lrNumber"
                value={form.lrNumber}
                onChange={handleChange}
                placeholder="LR number"
              />
            </div>

            <div className="dispatch-field">
              <label>E-Way Bill Number</label>
              <input
                name="ewayBillNumber"
                value={form.ewayBillNumber}
                onChange={handleChange}
                placeholder="E-way bill number"
              />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>Invoice PDF Link</label>
              <input
                name="invoicePdf"
                value={form.invoicePdf}
                onChange={handleChange}
                placeholder="Paste invoice PDF link"
              />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>LR Copy PDF Link</label>
              <input
                name="lrCopyPdf"
                value={form.lrCopyPdf}
                onChange={handleChange}
                placeholder="Paste LR copy link"
              />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>E-Way Bill PDF Link</label>
              <input
                name="ewayBillPdf"
                value={form.ewayBillPdf}
                onChange={handleChange}
                placeholder="Paste e-way bill PDF link"
              />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>Internal Remark</label>
              <textarea
                name="internalRemark"
                value={form.internalRemark}
                onChange={handleChange}
                placeholder="Any internal note for dispatch/accounts team"
              />
            </div>
          </div>

          <div className="dispatch-actions">
            <button
              type="button"
              className="dispatch-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="dispatch-submit"
              disabled={submitting}
            >
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Dispatch"
                : "Create Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DispatchForm;