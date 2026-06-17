import React, { useEffect, useState } from "react";
import {
  createDispatch,
  searchDispatchSalesOrders,
} from "../services/dispatchService";
import "./Dispatch.css";

const DispatchForm = ({ onClose, refresh }) => {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasFocusedSearch, setHasFocusedSearch] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({
    show: false,
    percent: 0,
    uploadedMB: 0,
    totalMB: 0,
    status: "",
  });

  const [form, setForm] = useState({
    salesOrderId: "",
    invoiceNumber: "",
    invoiceDate: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    dispatchQty: "",
    invoiceValue: "",
    paymentDueDays: "",
    paidAmount: "0",
    additionalCcEmailsText: "",
    dispatchStatus: "dispatched",
    internalRemark: "",
    paymentRemark: "",
    billPdf: null,
    lrCopyPdf: null,
    tcCertificatePdf: null,
  });

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatCurrency = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatFileSize = (size) => {
    if (!size) return "-";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const calculatePendingAmount = () => {
    const invoiceValue = Number(form.invoiceValue || 0);
    const paidAmount = Number(form.paidAmount || 0);
    return Math.max(invoiceValue - paidAmount, 0);
  };

  const calculateDueDatePreview = () => {
    if (!form.dispatchDate || form.paymentDueDays === "") return "-";

    const dueDate = new Date(form.dispatchDate);
    dueDate.setDate(dueDate.getDate() + Number(form.paymentDueDays || 0));

    return formatDate(dueDate);
  };

  const loadOrders = async (searchValue = "") => {
    try {
      setLoadingOrders(true);

      const response = await searchDispatchSalesOrders({
        search: searchValue,
        limit: 6,
      });

      setOrders(response.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to search sales orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!hasFocusedSearch || selectedOrder) {
      return;
    }

    const delay = setTimeout(() => {
      loadOrders(search);
    }, 300);

    return () => clearTimeout(delay);
  }, [search, selectedOrder, hasFocusedSearch]);

  const handleSearchFocus = () => {
    if (selectedOrder || submitting) return;

    setHasFocusedSearch(true);
    setSearchError("");
    loadOrders(search);
  };

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setSearch(order.companyName || "");
    setSearchError("");
    setOrders([]);

    setForm((prev) => ({
  ...prev,
  salesOrderId: order._id,
  invoiceValue: "",
  paymentDueDays: "",
}));
  };

  const clearSelectedOrder = () => {
    setSelectedOrder(null);
    setSearch("");
    setOrders([]);
    setSearchError("");
    setHasFocusedSearch(false);

    setForm((prev) => ({
      ...prev,
      salesOrderId: "",
      invoiceValue: "",
    }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;

    setSearch(value);
    setSelectedOrder(null);
    setSearchError("");
    setHasFocusedSearch(true);

    setForm((prev) => ({
      ...prev,
      salesOrderId: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setForm((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getAdditionalCcEmails = () => {
    return form.additionalCcEmailsText
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email && email.includes("@"));
  };

  const validateForm = () => {
    if (!selectedOrder || !form.salesOrderId) {
      setSearchError("Please select a valid approved sales order");
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

    if (Number(form.invoiceValue) <= 0) {
      alert("Invoice value must be greater than 0");
      return false;
    }

    if (form.paymentDueDays === "" || Number(form.paymentDueDays) < 0) {
      alert("Payment due days is required");
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

    if (!form.billPdf) {
      alert("Bill PDF is required");
      return false;
    }

    

    if (form.billPdf.type !== "application/pdf") {
      alert("Bill file must be PDF");
      return false;
    }
     if (form.billPdf.size > 30 * 1024 * 1024) {
      alert("Bill PDF must be under 30MB");
      return false;
    }
    if (form.lrCopyPdf) {
  if (form.lrCopyPdf.type !== "application/pdf") {
    alert("LR copy file must be PDF");
    return false;
  }

  if (form.lrCopyPdf.size > 30 * 1024 * 1024) {
    alert("LR copy PDF must be under 30MB");
    return false;
  }
}
if (form.tcCertificatePdf) {
  if (form.tcCertificatePdf.type !== "application/pdf") {
    alert("TC Certificate file must be PDF");
    return false;
  }

  if (form.tcCertificatePdf.size > 30 * 1024 * 1024) {
    alert("TC Certificate PDF must be under 30MB");
    return false;
  }
}
    return true;
  };

  const buildPayload = () => ({
    salesOrderId: form.salesOrderId,
    invoiceNumber: form.invoiceNumber.trim(),
    invoiceDate: form.invoiceDate,
    dispatchDate: form.dispatchDate,
    dispatchQty: Number(form.dispatchQty),
    invoiceValue: Number(form.invoiceValue),
    paymentDueDays: Number(form.paymentDueDays),
    paidAmount: Number(form.paidAmount || 0),
    additionalCcEmails: getAdditionalCcEmails(),
    dispatchStatus: form.dispatchStatus,
    internalRemark: form.internalRemark,
    paymentRemark: form.paymentRemark,
  });

  const resetUploadProgress = () => {
    setUploadProgress({
      show: false,
      percent: 0,
      uploadedMB: 0,
      totalMB: 0,
      status: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const totalSize =
  Number(form.billPdf?.size || 0) +
  Number(form.lrCopyPdf?.size || 0) +
  Number(form.tcCertificatePdf?.size || 0);

      setUploadProgress({
        show: true,
        percent: 0,
        uploadedMB: 0,
        totalMB: totalSize / (1024 * 1024),
        status: "Uploading dispatch documents...",
      });

      await createDispatch(
        buildPayload(),
        form.billPdf,
        form.lrCopyPdf,
        form.tcCertificatePdf,
        (progressEvent) => {
          const loaded = progressEvent.loaded || 0;
          const total = progressEvent.total || totalSize;
          const percent = Math.round((loaded * 100) / total);

          setUploadProgress({
            show: true,
            percent,
            uploadedMB: loaded / (1024 * 1024),
            totalMB: total / (1024 * 1024),
            status:
              percent >= 100
                ? "Processing dispatch..."
                : "Uploading dispatch documents...",
          });
        }
      );

      setUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        uploadedMB: prev.totalMB,
        status: "Dispatch created successfully",
      }));

      alert("Dispatch created successfully. Email has been sent to customer.");

      refresh();
      onClose();

      setTimeout(() => {
        resetUploadProgress();
      }, 1200);
    } catch (error) {
      resetUploadProgress();
      alert(error.response?.data?.message || "Failed to create dispatch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dispatch-modal-overlay">
      <div className="dispatch-form-card">
        <div className="dispatch-form-header">
          <div>
            <h2>Create Dispatch</h2>
            <p>
              Select approved sales order, upload bill and LR copy, and notify
              customer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form className="dispatch-form" onSubmit={handleSubmit}>
          <div className="dispatch-search-section">
            <label>
              Approved Sales Order <span className="dispatch-required">*</span>
            </label>

            <input
              type="text"
              placeholder="Click to view latest approved orders, or search company name"
              value={search}
              onFocus={handleSearchFocus}
              onChange={handleSearchChange}
              disabled={submitting}
              onBlur={() => {
                setTimeout(() => {
                  if (!selectedOrder && search.trim()) {
                    setSearchError(
                      "Please select a valid sales order from dropdown"
                    );
                  }
                }, 180);
              }}
            />

            {searchError && (
              <small className="dispatch-search-error">{searchError}</small>
            )}

            {loadingOrders && (
              <div className="dispatch-search-loading">
                Searching approved orders...
              </div>
            )}

            {!loadingOrders &&
              hasFocusedSearch &&
              orders.length === 0 &&
              !selectedOrder && (
                <div className="dispatch-no-result">
                  No approved sales order found
                  {search.trim() ? ` for "${search}"` : ""}
                </div>
              )}

            {orders.length > 0 && (
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
                        <strong>{order.companyName}</strong>
                        <small>
                          SO: {order.salesOrderNo || "-"} · PO:{" "}
                          {order.poNumber || "-"} · Sales:{" "}
                          {order.salesPersonName || "-"}
                        </small>
                      </div>

                      <span>{order.dispatchCount || 0} dispatch</span>
                    </div>

                    <div className="dispatch-order-mini-grid">
                      <div>
                        <label>Contact</label>
                        <p>{order.contactPersonName || "-"}</p>
                      </div>

                      <div>
                        <label>Email</label>
                        <p>{order.contactPersonEmail || "-"}</p>
                      </div>

                      <div>
                        <label>Mobile</label>
                        <p>{order.contactPersonNumber || "-"}</p>
                      </div>

                      <div>
                        <label>Order Value</label>
                        <p>{formatCurrency(order.orderValue)}</p>
                      </div>

                      <div>
                        <label>Payment Terms</label>
                        <p>{order.paymentTerms || "-"}</p>
                      </div>

                      <div>
                        <label>Status</label>
                        <p>{order.approvalStatus || "-"}</p>
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
                <strong>Selected Sales Order</strong>

                <button
                  type="button"
                  onClick={clearSelectedOrder}
                  disabled={submitting}
                >
                  Change
                </button>
              </div>

              <div className="dispatch-selected-grid">
                <div>
                  <span>Company</span>
                  <strong>{selectedOrder.companyName || "-"}</strong>
                </div>

                <div>
                  <span>SO No.</span>
                  <strong>{selectedOrder.salesOrderNo || "-"}</strong>
                </div>

                <div>
                  <span>PO No.</span>
                  <strong>{selectedOrder.poNumber || "-"}</strong>
                </div>

                <div>
                  <span>Contact Person</span>
                  <strong>{selectedOrder.contactPersonName || "-"}</strong>
                </div>

                <div>
                  <span>Customer Email</span>
                  <strong>{selectedOrder.contactPersonEmail || "-"}</strong>
                </div>

                <div>
                  <span>Sales Person</span>
                  <strong>{selectedOrder.salesPersonName || "-"}</strong>
                </div>

                <div className="dispatch-selected-wide">
                  <span>Material</span>
                  <strong>{selectedOrder.sizeGradeQuantityRate || "-"}</strong>
                </div>

                <div>
                  <span>Order Value</span>
                  <strong>{formatCurrency(selectedOrder.orderValue)}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="dispatch-section-title">
            <h3>Invoice & Dispatch Details</h3>
            <p>Invoice details and dispatch quantity for customer notification.</p>
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
                placeholder="Example: BSS/INV/1024"
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
              />
            </div>

            <div className="dispatch-field">
              <label>Dispatch Status</label>
              <select
                name="dispatchStatus"
                value={form.dispatchStatus}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="dispatch-section-title">
            <h3>Payment Tracking</h3>
            <p>
              Due date will be calculated from dispatch date + payment due days.
            </p>
          </div>

          <div className="dispatch-grid">
            <div className="dispatch-field">
              <label>
                Payment Due Days <span className="dispatch-required">*</span>
              </label>
              <input
                type="number"
                name="paymentDueDays"
                value={form.paymentDueDays}
                onChange={handleChange}
                placeholder="Example: 30"
                min="0"
                disabled={submitting}
              />
            </div>

            <div className="dispatch-field">
              <label>Payment Due Date</label>
              <input value={calculateDueDatePreview()} disabled readOnly />
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
                disabled={submitting}
              />
            </div>

            <div className="dispatch-field">
              <label>Pending Amount ₹</label>
              <input value={formatCurrency(calculatePendingAmount())} disabled readOnly />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>Payment Remark</label>
              <textarea
                name="paymentRemark"
                value={form.paymentRemark}
                onChange={handleChange}
                placeholder="Example: ₹4,00,000 received as advance"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="dispatch-section-title">
            <h3>PDF Documents</h3>
            <p>
  Bill PDF is mandatory. LR Copy and TC Certificate are optional and
  will be attached in customer email if uploaded.
</p>
          </div>

          <div className="dispatch-grid">
            <div className="dispatch-field dispatch-file-field">
              <label>
                Bill PDF <span className="dispatch-required">*</span>
              </label>
              <input
                type="file"
                name="billPdf"
                accept="application/pdf"
                onChange={handleChange}
                disabled={submitting}
              />
              {form.billPdf && (
                <small>
                  {form.billPdf.name} · {formatFileSize(form.billPdf.size)}
                </small>
              )}
            </div>

            <div className="dispatch-field dispatch-file-field">
              <label>
  LR Copy PDF
</label>
              <input
                type="file"
                name="lrCopyPdf"
                accept="application/pdf"
                onChange={handleChange}
                disabled={submitting}
              />
              {form.lrCopyPdf && (
                <small>
                  {form.lrCopyPdf.name} · {formatFileSize(form.lrCopyPdf.size)}
                </small>
              )}
            </div>
             <div className="dispatch-field dispatch-file-field">
  <label>TC Certificate PDF</label>

  <input
    type="file"
    name="tcCertificatePdf"
    accept="application/pdf"
    onChange={handleChange}
    disabled={submitting}
  />

  {form.tcCertificatePdf && (
    <small>
      {form.tcCertificatePdf.name} ·{" "}
      {formatFileSize(form.tcCertificatePdf.size)}
    </small>
  )}
</div>
            <div className="dispatch-field dispatch-full">
              <label>Additional CC Emails</label>
              <input
                name="additionalCcEmailsText"
                value={form.additionalCcEmailsText}
                onChange={handleChange}
                placeholder="accounts@client.com, purchase@client.com"
                disabled={submitting}
              />
            </div>

            <div className="dispatch-field dispatch-full">
              <label>Internal Remark</label>
              <textarea
                name="internalRemark"
                value={form.internalRemark}
                onChange={handleChange}
                placeholder="Any internal note for dispatch/accounts team"
                disabled={submitting}
              />
            </div>
          </div>

          {uploadProgress.show && (
            <div className="dispatch-upload-progress">
              <div className="dispatch-upload-head">
                <strong>{uploadProgress.status}</strong>
                <span>{uploadProgress.percent}%</span>
              </div>

              <div className="dispatch-upload-bar">
                <div style={{ width: `${uploadProgress.percent}%` }} />
              </div>

              <small>
                {uploadProgress.uploadedMB.toFixed(2)} MB of{" "}
                {uploadProgress.totalMB.toFixed(2)} MB uploaded
              </small>
            </div>
          )}

          <div className="dispatch-actions">
            <button
              type="button"
              className="dispatch-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="dispatch-submit"
              disabled={submitting}
            >
              {submitting
                ? "Creating Dispatch..."
                : "Create Dispatch & Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DispatchForm;