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

    return salesOrders.filter(
      (order) =>
        order.approvalStatus !== "approved"
    );
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
    if (current >= total - 3)
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return Number(amount).toLocaleString("en-IN");
  };

  const formatStatus = (status) => {
    if (!status) return "-";
    return String(status).replaceAll("_", " ").toUpperCase();
  };

  const getPdfUrl = (order) => {
    const fileUrl =
      order.finalSalesOrderPackage?.fileUrl ||
      order.pdf?.fileUrl ||
      order.preShipmentInspectionPdf?.fileUrl;

    if (!fileUrl) return "";

    return fileUrl.startsWith("http")
      ? fileUrl
      : `${BACKEND_URL.replace(/\/$/, "")}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
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
    return (
      isAdmin &&
      order.approvalStatus !== "approved" &&
      order.approvalStatus !== "pending_manager_approval"
    );
  };

  const canManagerApproveReject = (order) => {
    return isManager && order.approvalStatus === "pending_manager_approval";
  };

  const handleAdminApprove = async (orderId) => {
    if (!window.confirm("Approve this sales order and send to manager?")) return;

    try {
      await approveSalesOrderByAdmin(orderId);
      alert("Sales order approved by admin and sent to manager.");
      fetchSalesOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Admin approval failed");
    }
  };

  const handleAdminReject = async (orderId) => {
    const comment = window.prompt("Enter rejection reason");

    if (!comment) return;

    try {
      await rejectSalesOrderByAdmin(orderId, {
        rejectionComment: comment,
      });
      alert("Sales order rejected by admin.");
      fetchSalesOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Admin rejection failed");
    }
  };

  const handleManagerApprove = async (orderId) => {
    if (!window.confirm("Final approve this sales order?")) return;

    try {
      await approveSalesOrderByManager(orderId);
      alert("Sales order approved by manager.");
      fetchSalesOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Manager approval failed");
    }
  };

  const handleManagerReject = async (orderId) => {
    const comment = window.prompt("Enter manager rejection reason");

    if (!comment) return;

    try {
      await rejectSalesOrderByManager(orderId, {
        rejectionComment: comment,
      });
      alert("Sales order rejected by manager.");
      fetchSalesOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Manager rejection failed");
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

  return (
    <div
      className={`sales-order-container ${
        canViewSalesPersonFilter ? "admin-view" : "user-view"
      }`}
    >
      <div className="sales-order-header">
        <div>
          <h2>Sales Order Sheet</h2>
          <p>Approved, pending and rejected sales orders</p>
        </div>

        <button
  type="button"
  className="new-sales-btn"
  onClick={() => {
    setEditOrder(null);
    setShowForm(true);
  }}
>
  + New Sales Order
</button>
      </div>

      <div className="sales-status-tabs">
        <button
  className={activeTab === "approved" ? "active-tab" : ""}
  onClick={() =>
    setActiveTab(activeTab === "approved" ? "pending_rejected" : "approved")
  }
>
  {activeTab === "approved" ? "Pending / Rejected" : "Approved"}
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
            <button className="clear-btn" onClick={clearFilters}>
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

                      <td>
                        <span className={`status-pill ${order.approvalStatus}`}>
                          {formatStatus(order.approvalStatus)}
                        </span>
                      </td>

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
                          >
                            Edit
                          </button>
                        )}

                        {canAdminApproveReject(order) && (
                          <div className="action-stack">
                            <button
                              className="approve-btn"
                              onClick={() => handleAdminApprove(order._id)}
                            >
                              Approve
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => handleAdminReject(order._id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {canManagerApproveReject(order) && (
                          <div className="action-stack">
                            <button
                              className="approve-btn"
                              onClick={() => handleManagerApprove(order._id)}
                            >
                              Approve
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => handleManagerReject(order._id)}
                            >
                              Reject
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

                  <div className="sales-card-body">
                    {canViewSalesPersonFilter && (
                      <p>
                        <b>Sales:</b>{" "}
                        {order.salesPersonName || order.salesPersonId?.name || "-"}
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
                        >
                          Edit
                        </button>
                      )}

                      {canAdminApproveReject(order) && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleAdminApprove(order._id)}
                          >
                            Approve
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() => handleAdminReject(order._id)}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {canManagerApproveReject(order) && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleManagerApprove(order._id)}
                          >
                            Approve
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() => handleManagerReject(order._id)}
                          >
                            Reject
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
    </div>
  );
};

export default SalesOrderList;