import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllSalesOrders,
  getSalesPersons,
  approveSalesOrderByAdmin,
  rejectSalesOrderByAdmin,
  approveSalesOrderByManager,
  rejectSalesOrderByManager,
} from "../services/salesOrderService";
import "./SalesOrderList.css";
import SalesOrderForm from "./SalesOrderForm";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

const SalesOrderList = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "super_admin";
  const isSalesPerson = user?.role === "user";
  const canViewSalesPersonFilter = isAdmin || isManager;

  const [salesOrders, setSalesOrders] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("approved");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
    limit: 10,
  });

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    fromDate: "",
    toDate: "",
    salesPersonId: "",
  });

  const isRejectAction = approvalModal.type.includes("reject");
  const isApproveAction = approvalModal.type.includes("approve");

  const getActionButtonText = () => {
    if (actionSubmitting) {
      return isApproveAction ? "Approving..." : "Holding...";
    }

    return isApproveAction ? "Yes, Approve" : "Hold";
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const cleanFilters = {};

      Object.keys(filters).forEach((key) => {
        if (filters[key]) cleanFilters[key] = filters[key];
      });

      const response = await getAllSalesOrders(cleanFilters);

      setSalesOrders(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to load sales orders");
    }
  }, [filters, pagination]);

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
      fromDate: "",
      toDate: "",
      salesPersonId: "",
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

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return Number(amount).toLocaleString("en-IN");
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
    return isManager && order.approvalStatus === "pending_manager_approval";
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
        alert("Sales order approved and sent to manager.");
      }

      if (approvalModal.type === "admin_reject") {
        await rejectSalesOrderByAdmin(approvalModal.orderId, {
          rejectionComment: rejectionComment.trim(),
        });
        alert("Sales order put on hold by admin.");
      }

      if (approvalModal.type === "manager_approve") {
        await approveSalesOrderByManager(approvalModal.orderId);
        alert("Sales order finally approved.");
      }

      if (approvalModal.type === "manager_reject") {
        await rejectSalesOrderByManager(approvalModal.orderId, {
          rejectionComment: rejectionComment.trim(),
        });
        alert("Sales order put on hold by manager.");
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

  const closeForm = () => {
    setShowForm(false);
    setEditOrder(null);
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

  return (
    <div
      className={`sales-order-container ${
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
          onClick={() => {
            setEditOrder(null);
            setShowForm(true);
          }}
          disabled={actionSubmitting}
        >
          + New Sales Order
        </button>
      </div>

      <div className="sales-status-tabs">
        <button
          className={activeTab === "approved" ? "active-tab" : ""}
          onClick={() =>
            setActiveTab(
              activeTab === "approved" ? "pending_rejected" : "approved"
            )
          }
          disabled={actionSubmitting}
        >
          {activeTab === "approved" ? "Pending / Hold" : "Approved"}
        </button>
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
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {!isMobile ? (
        <div className="sales-table-wrapper">
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
                        {formatDate(order.orderDate || order.createdAt)}
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

                      <td>{formatStatus(order.paymentTerms)}</td>

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
                        {canEditOrder(order) && (
                          <button
                            className="edit-btn"
                            onClick={() => openEditForm(order)}
                            disabled={actionSubmitting}
                          >
                            Edit
                          </button>
                        )}

                        {canAdminApproveReject(order) && (
                          <div className="action-stack">
                            <button
                              className="approve-btn"
                              onClick={() => handleAdminApprove(order._id)}
                              disabled={actionSubmitting}
                            >
                              Approve
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => handleAdminReject(order._id)}
                              disabled={actionSubmitting}
                            >
                              Hold
                            </button>
                          </div>
                        )}

                        {canManagerApproveReject(order) && (
                          <div className="action-stack">
                            <button
                              className="approve-btn"
                              onClick={() => handleManagerApprove(order._id)}
                              disabled={actionSubmitting}
                            >
                              Approve
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => handleManagerReject(order._id)}
                              disabled={actionSubmitting}
                            >
                              Hold
                            </button>
                          </div>
                        )}

                        {!canEditOrder(order) &&
                          !canAdminApproveReject(order) &&
                          !canManagerApproveReject(order) &&
                          "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sales-mobile-list">
          {visibleOrders.length === 0 ? (
            <div className="no-data">No sales orders found</div>
          ) : (
            visibleOrders.map((order) => {
              const pdfUrl = getPdfUrl(order);
              const holdComment = getHoldComment(order);

              return (
                <div key={order._id} className="sales-card">
                  <div className="sales-card-top">
                    <div>
                      <strong>{order.companyName || "-"}</strong>
                      <span>{order.poNumber || "-"}</span>
                    </div>

                    <small>{formatDate(order.orderDate || order.createdAt)}</small>
                  </div>

                  <div className="sales-card-tags">
                    <span>{formatStatus(order.approvalStatus)}</span>
                    <span>Rs. {formatCurrency(order.orderValue)}</span>
                    <span>{order.paymentTerms || "-"}</span>
                  </div>

                  {holdComment && (
                    <div className="hold-comment-text mobile-hold-comment">
                      <strong>Comment:</strong> {holdComment}
                    </div>
                  )}

                  <div className="sales-card-body">
                    {canViewSalesPersonFilter && (
                      <p>
                        <b>Sales:</b>{" "}
                        {order.salesPersonName ||
                          order.salesPersonId?.name ||
                          "-"}
                      </p>
                    )}

                    <p>
                      <b>Contact:</b> {order.contactPersonName || "-"} (
                      {order.contactPersonNumber || "-"})
                    </p>

                    <p>
                      <b>Address:</b> {order.companyAddress || "-"}
                    </p>

                    <p>
                      <b>Status:</b> {formatStatus(order.approvalStatus)}
                    </p>

                    <div className="mobile-actions">
                      {pdfUrl ? (
                        <a
                          className="pdf-btn"
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open PDF
                        </a>
                      ) : (
                        <span>-</span>
                      )}

                      {canEditOrder(order) && (
                        <button
                          className="edit-btn"
                          onClick={() => openEditForm(order)}
                          disabled={actionSubmitting}
                        >
                          Edit
                        </button>
                      )}

                      {canAdminApproveReject(order) && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleAdminApprove(order._id)}
                            disabled={actionSubmitting}
                          >
                            Approve
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() => handleAdminReject(order._id)}
                            disabled={actionSubmitting}
                          >
                            Hold
                          </button>
                        </>
                      )}

                      {canManagerApproveReject(order) && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleManagerApprove(order._id)}
                            disabled={actionSubmitting}
                          >
                            Approve
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() => handleManagerReject(order._id)}
                            disabled={actionSubmitting}
                          >
                            Hold
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="sales-pagination">
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
                disabled={actionSubmitting}
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

        <span className="total-records">Total: {pagination.totalRecords}</span>
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

            <h3>{isApproveAction ? "Approve Sales Order" : "Hold Sales Order"}</h3>

            <p>
              {isApproveAction
                ? "Are you sure you want to approve this sales order?"
                : "Please enter hold reason below."}
            </p>

            {isRejectAction && (
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
              >
                Cancel
              </button>

              <button
                className={
                  isApproveAction ? "modal-approve-btn" : "modal-reject-btn"
                }
                onClick={submitApprovalAction}
                disabled={actionSubmitting}
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

export default SalesOrderList;