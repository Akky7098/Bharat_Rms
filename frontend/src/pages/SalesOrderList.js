import React, { useCallback, useEffect, useState } from "react";
import {
  getAllSalesOrders,
  getSalesPersons,
} from "../services/salesOrderService";
import "./SalesOrderList.css";
import SalesOrderForm from "./SalesOrderForm";

const SalesOrderList = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [salesOrders, setSalesOrders] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

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
      setPagination(response.pagination);
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
    if (isAdmin) {
      fetchSalesPersons();
    }
  }, [isAdmin, fetchSalesPersons]);

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

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }

    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return Number(amount).toLocaleString("en-IN");
  };

  return (
    <div className={`sales-order-container ${isAdmin ? "admin-view" : "user-view"}`}>
      <div className="sales-order-header">
        <div>
          <h2>Sales Order Sheet</h2>
          <p>Latest sales orders appear first</p>
        </div>

        <button className="new-sales-btn" onClick={() => setShowForm(true)}>
          + New Sales Order
        </button>
      </div>

      <div className="sales-filter-card">
        <div className="sales-filter-grid">
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
                <th className="sticky-col sticky-head col-date">Order Date</th>

                {isAdmin && (
                  <th className="sticky-col sticky-head col-sales">
                    Sales Person
                  </th>
                )}

                <th className="sticky-col sticky-head col-company">Company</th>
                <th>Location</th>
                <th>Contact Person</th>
                <th>Contact No</th>
                <th>Email</th>
                <th>Product</th>
                <th>Grade</th>
                <th>Size</th>
                <th>Qty Kg</th>
                <th>Value ₹</th>
                <th>Payment Terms</th>
              </tr>
            </thead>

            <tbody>
              {salesOrders.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 13 : 12} className="no-data">
                    No sales orders found
                  </td>
                </tr>
              ) : (
                salesOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="sticky-col col-date">
                      {formatDate(order.orderDate)}
                    </td>

                    {isAdmin && (
                      <td className="sticky-col col-sales">
                        {order.salesPersonId?.name || "-"}
                      </td>
                    )}

                    <td className="sticky-col col-company">
                      {order.companyName}
                    </td>

                    <td>{order.location}</td>
                    <td>{order.contactPersonName}</td>
                    <td>{order.contactPersonNumber}</td>
                    <td>{order.contactPersonEmailId || "-"}</td>
                    <td>{order.productCategory}</td>
                    <td>{order.grade}</td>
                    <td className="size-cell">{order.size}</td>
                    <td>{order.quantityInKg}</td>
                    <td>₹ {formatCurrency(order.valueInRupees)}</td>
                    <td>{order.paymentTerms}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sales-mobile-list">
          {salesOrders.length === 0 ? (
            <div className="no-data">No sales orders found</div>
          ) : (
            salesOrders.map((order) => (
              <div key={order._id} className="sales-card">
                <div className="sales-card-top">
                  <div>
                    <strong>{order.companyName}</strong>
                    <span>{order.contactPersonName || "-"}</span>
                  </div>

                  <small>{formatDate(order.orderDate)}</small>
                </div>

                <div className="sales-card-tags">
                  <span>{order.productCategory || "-"}</span>
                  <span>{order.grade || "-"}</span>
                  <span>{order.quantityInKg || 0} Kg</span>
                </div>

                <div className="sales-card-body">
                  {isAdmin && (
                    <p>
                      <b>Sales:</b> {order.salesPersonId?.name || "-"}
                    </p>
                  )}

                  <p>
                    <b>Contact:</b> {order.contactPersonNumber || "-"}
                  </p>

                  <p>
                    <b>Email:</b> {order.contactPersonEmailId || "-"}
                  </p>

                  <p>
                    <b>Location:</b> {order.location || "-"}
                  </p>

                  <p>
                    <b>Size:</b> {order.size || "-"}
                  </p>

                  <p>
                    <b>Value:</b> ₹ {formatCurrency(order.valueInRupees)}
                  </p>

                  <p>
                    <b>Payment:</b> {order.paymentTerms || "-"}
                  </p>
                </div>
              </div>
            ))
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
          onClose={() => setShowForm(false)}
          refresh={fetchSalesOrders}
        />
      )}
    </div>
  );
};

export default SalesOrderList;