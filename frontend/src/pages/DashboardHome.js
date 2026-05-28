import React, { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import {
  getDashboardSummary,
  getCashflowSummary,
  getMisScoring,
} from "../services/dashboardService";

import { getNotifications } from "../services/notificationService";

import "./DashboardHome.css";
import "./Notification.css";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#be123c",
];

const DashboardHome = () => {
  const [data, setData] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [misScoring, setMisScoring] = useState({
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    totalLeads: 0,
    salesPersonScores: [],
  });

  const [notifications, setNotifications] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [chartWidth, setChartWidth] = useState(
    window.innerWidth <= 480 ? window.innerWidth - 80 : 420
  );

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const today = new Date();

  const [filters, setFilters] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  useEffect(() => {
    const handleResize = () => {
      setChartWidth(window.innerWidth <= 480 ? window.innerWidth - 80 : 420);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getMonthDateRange = (month, year) => {
    const fromDate = new Date(year, month, 1);
    const toDate = new Date(year, Number(month) + 1, 0);

    return {
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    };
  };

  const fetchDashboard = useCallback(
    async (customFilters = filters) => {
      try {
        const dateRange = getMonthDateRange(
          Number(customFilters.month),
          Number(customFilters.year)
        );

        const [dashboardResponse, cashflowResponse, misScoringResponse] =
          await Promise.all([
            getDashboardSummary(dateRange),
            getCashflowSummary(dateRange),
            getMisScoring(dateRange),
          ]);

        setData(dashboardResponse.data);
        setCashflow(cashflowResponse.data);

        setMisScoring(
          misScoringResponse.data || {
            hotLeads: 0,
            warmLeads: 0,
            coldLeads: 0,
            totalLeads: 0,
            salesPersonScores: [],
          }
        );
      } catch (error) {
        console.log(error);
      }
    },
    [filters]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      setNotifications(response);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
  }, [fetchDashboard, fetchNotifications]);

  const handleMonthYearChange = (e) => {
    const updated = {
      ...filters,
      [e.target.name]: e.target.value,
    };

    setFilters(updated);
    fetchDashboard(updated);
  };

  const getPriorityIcon = (priority) => {
    if (priority === "high") return "🚨";
    if (priority === "medium") return "⚠️";
    return "ℹ️";
  };

  const formatCurrency = (value) => {
    return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const getMisBarColor = (score) => {
    if (score >= 75) return "#16a34a";
    if (score >= 45) return "#f97316";
    return "#dc2626";
  };

  if (!data) return <div>Loading...</div>;

  const misChartData = misScoring?.salesPersonScores || [];
  

  return (
    <div className="dashboard-home">
      <div className="dashboard-topbar">
        <div>
          <h2>Welcome, {user?.name || "User"}</h2>
          <p>Business performance overview</p>
        </div>

        <div className="dashboard-top-actions">
          <button
            type="button"
            className="notification-icon-btn"
            onClick={() => setShowNotifications(true)}
            title="Notifications"
          >
            🔔
            {notifications?.total > 0 && (
              <span className="notification-count">{notifications.total}</span>
            )}
          </button>

          <div className="month-filter">
            <select
              name="month"
              value={filters.month}
              onChange={handleMonthYearChange}
            >
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>

            <select
              name="year"
              value={filters.year}
              onChange={handleMonthYearChange}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="card revenue">
          <h3>Total Revenue</h3>
          <p>{formatCurrency(data.totalRevenue)}</p>
        </div>

        <div className="card orders">
          <h3>Pending Sales Order</h3>
          <p>{data.pendingOrders || 0}</p>
        </div>

        <div className="card enquiries">
          <h3>Total Enquiries</h3>
          <p>{data.totalEnquiries}</p>
        </div>

        <div className="card won">
          <h3>Won</h3>
          <p>{data.wonEnquiries}</p>
        </div>

        <div className="card lost">
          <h3>Lost</h3>
          <p>{data.lostEnquiries}</p>
        </div>

        <div className="card delayed">
          <h3>Delayed</h3>
          <p>{data.delayedEnquiries}</p>
        </div>

        <div className="card active">
          <h3>Active Enquiries</h3>
          <p>{data.activeEnquiries || 0}</p>
        </div>

        <div className="card hot">
          <h3>Hot Leads</h3>
          <p>{misScoring.hotLeads || 0}</p>
        </div>

        <div className="card warm">
          <h3>Warm Leads</h3>
          <p>{misScoring.warmLeads || 0}</p>
        </div>

        <div className="card cold">
          <h3>Cold Leads</h3>
          <p>{misScoring.coldLeads || 0}</p>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="chart-card pie-card">
          <h3>Sales Person Revenue Share</h3>

          <div className="pie-layout">
            <div className="pie-box">
              <PieChart width={chartWidth} height={260}>
                <Pie
                  data={data.salesPersonRevenue || []}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ percentage }) => `${percentage}%`}
                >
                  {(data.salesPersonRevenue || []).map((entry, index) => (
                    <Cell
                      key={entry.salesPersonId}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    `₹ ${Number(value).toLocaleString("en-IN")}`
                  }
                />
              </PieChart>
            </div>

            <div className="pie-legend">
              {(data.salesPersonRevenue || []).map((sp, index) => (
                <div key={sp.salesPersonId} className="legend-row">
                  <span
                    className="legend-dot"
                    style={{ background: COLORS[index % COLORS.length] }}
                  ></span>

                  <div>
                    <strong>{sp.name}</strong>
                    <p>
                      ₹ {Number(sp.revenue || 0).toLocaleString("en-IN")} ·{" "}
                      {sp.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="insight-card">
          <h3>Business Insights</h3>

          <div className="insight-box green">
            <span>Top Performer (Won)</span>
            <h4>{data.topWonEmployee?.name || "No data"}</h4>
            <p>
              {data.topWonEmployee
                ? `${data.topWonEmployee.wonCount} won enquiries`
                : "No won enquiry"}
            </p>
          </div>

          <div className="insight-box orange">
            <span>Highest Delayed</span>
            <h4>{data.topDelayedEmployee?.name || "No delay"}</h4>
            <p>
              {data.topDelayedEmployee
                ? `${data.topDelayedEmployee.delayedCount} delayed enquiries`
                : "No delayed enquiry found"}
            </p>
          </div>

          <div className="insight-box red">
            <span>Highest Order Lost</span>
            <h4>{data.topLostEmployee?.name || "No lost order"}</h4>
            <p>
              {data.topLostEmployee
                ? `${data.topLostEmployee.lostCount} lost enquiries`
                : "No lost enquiry found"}
            </p>

            <div className="lost-reason-mini">
              <b>Top Reason:</b>{" "}
              {data.topLostReason
                ? `${data.topLostReason.reason || data.topLostReason.rawReason} (${
                    data.topLostReason.count
                  })`
                : "No reason found"}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card mis-card">
        <div className="mis-header">
          <div>
            <h3>MIS Scoring Overview</h3>
            <p>
              Steel enquiry quality, follow-up discipline and conversion
              performance
            </p>
          </div>

          <div className="mis-total-pill">
            Total Leads: {misScoring.totalLeads || 0}
          </div>
        </div>

        {!misChartData.length ? (
          <div className="cashflow-empty">No MIS scoring data available</div>
        ) : (
          <>
            <div className="mis-employee-grid">
  {misChartData.map((item, index) => {
    const score = Number(item.score || 0);

    const scoreClass =
      score >= 75 ? "excellent" : score >= 45 ? "average" : "poor";

    return (
      <div
        key={item.salesPersonId || index}
        className={`mis-employee-card ${scoreClass}`}
      >
        <div className="mis-employee-top">
          <div>
            <span className="mis-rank">#{index + 1}</span>
            <h4>{item.name}</h4>
          </div>

          <strong>{score}/100</strong>
        </div>

        <div className="mis-progress">
          <span style={{ width: `${score}%` }}></span>
        </div>

        <div className="mis-employee-stats">
          <div>
            <b>{item.totalEnquiries || 0}</b>
            <span>Enquiries</span>
          </div>

          <div>
            <b>{item.wonEnquiries || 0}</b>
            <span>Won</span>
          </div>

          <div>
            <b>{item.lostEnquiries || 0}</b>
            <span>Lost</span>
          </div>

          <div>
            <b>{item.delayedEnquiries || 0}</b>
            <span>Delayed</span>
          </div>
        </div>
      </div>
    );
  })}
</div>
   <div className="mis-chart-compact">
  <h4>Salesperson MIS Score Comparison</h4>

  <ResponsiveContainer width="100%" height={280}>
    <BarChart
      data={misChartData}
      layout="vertical"
      margin={{ top: 10, right: 25, left: 35, bottom: 10 }}
    >
      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />

      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />

      <YAxis
        type="category"
        dataKey="name"
        width={120}
        tick={{ fontSize: 12, fontWeight: 700 }}
      />

      <Tooltip
        formatter={(value, name) => {
          if (name === "score") return [`${value}/100`, "MIS Score"];
          return [value, name];
        }}
        labelFormatter={(label) => `Sales Person: ${label}`}
      />

      <Bar dataKey="score" radius={[0, 12, 12, 0]}>
        {misChartData.map((entry, index) => (
          <Cell key={index} fill={getMisBarColor(entry.score)} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
            

           
          </>
        )}
      </div>

      {cashflow && (
        <div className="cashflow-section">
          <div className="cashflow-header">
            <div>
              <h3>Cashflow Overview</h3>
              <p>Paid, pending and overdue payment position</p>
            </div>
          </div>

          <div className="cashflow-grid">
            <div className="cashflow-card total">
              <span>Total Revenue</span>
              <strong>{formatCurrency(cashflow.totalRevenue)}</strong>
            </div>

            <div className="cashflow-card paid">
              <span>Total Paid</span>
              <strong>{formatCurrency(cashflow.totalPaid)}</strong>
            </div>

            <div className="cashflow-card pending">
              <span>Total Pending</span>
              <strong>{formatCurrency(cashflow.totalPending)}</strong>
            </div>

            <div className="cashflow-card overdue">
              <span>Overdue Amount</span>
              <strong>{formatCurrency(cashflow.overdueAmount)}</strong>
            </div>
          </div>

          <div className="cashflow-detail-grid">
            <div className="cashflow-list-card">
              <h4>Upcoming Due Payments</h4>

              {!cashflow.upcomingDuePayments?.length ? (
                <p className="cashflow-empty">No upcoming dues</p>
              ) : (
                cashflow.upcomingDuePayments.map((item) => (
                  <div key={item._id} className="cashflow-row">
                    <div>
                      <strong>{item.companyName}</strong>
                      <span>Due: {formatDate(item.paymentDueDate)}</span>
                    </div>

                    <b>{formatCurrency(item.pendingAmount)}</b>
                  </div>
                ))
              )}
            </div>

            <div className="cashflow-list-card danger">
              <h4>Overdue Payments</h4>

              {!cashflow.overduePayments?.length ? (
                <p className="cashflow-empty">No overdue payments</p>
              ) : (
                cashflow.overduePayments.map((item) => (
                  <div key={item._id} className="cashflow-row">
                    <div>
                      <strong>{item.companyName}</strong>
                      <span>Due: {formatDate(item.paymentDueDate)}</span>
                    </div>

                    <b>{formatCurrency(item.pendingAmount)}</b>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="chart-card top-grade-card">
  <div className="top-grade-header">
    <div>
      <h3>Top Steel Grades</h3>
      <p>Most ordered grades from approved sales orders</p>
    </div>
  </div>

  <div className="top-grade-list">
    {(data.gradeWiseQuantity || []).length === 0 ? (
      <p className="cashflow-empty">No grade data available</p>
    ) : (
      (data.gradeWiseQuantity || []).map((g, i) => {
        const maxOrders =
          Math.max(
            ...(data.gradeWiseQuantity || []).map(
              (x) => Number(x.orders || 0)
            )
          ) || 1;

        const width =
          (Number(g.orders || 0) / maxOrders) * 100;

        return (
          <div key={i} className="top-grade-item">
            <div className="top-grade-top">
              <div>
                <strong>{g.grade || "Not Specified"}</strong>
                <p>
                  {g.orders || 0} order(s) ·{" "}
                  {formatCurrency(g.revenue || 0)}
                </p>
              </div>

              <span>#{i + 1}</span>
            </div>

            <div className="top-grade-progress">
              <div
                className="top-grade-fill"
                style={{ width: `${width}%` }}
              ></div>
            </div>
          </div>
        );
      })
    )}
  </div>
</div>

      {showNotifications && (
        <div className="notification-overlay">
          <div className="notification-panel">
            <div className="notification-header">
              <div>
                <h3>Notifications</h3>
                <p>{notifications?.total || 0} business alert(s)</p>
              </div>

              <button
                type="button"
                className="notification-close"
                onClick={() => setShowNotifications(false)}
              >
                ×
              </button>
            </div>

            <div className="notification-summary-grid">
              <div className="notification-summary-card high">
                <span>High</span>
                <strong>{notifications?.high || 0}</strong>
              </div>

              <div className="notification-summary-card medium">
                <span>Medium</span>
                <strong>{notifications?.medium || 0}</strong>
              </div>

              <div className="notification-summary-card low">
                <span>Low</span>
                <strong>{notifications?.low || 0}</strong>
              </div>
            </div>

            <div className="notification-list">
              {!notifications?.notifications?.length ? (
                <div className="notification-empty">
                  <strong>No alerts right now</strong>
                  <p>Everything looks clear for selected business rules.</p>
                </div>
              ) : (
                notifications.notifications.map((item, index) => (
                  <div
                    key={`${item.type}-${item.sourceId || index}`}
                    className={`notification-item ${item.priority}`}
                  >
                    <div className="notification-item-top">
                      <div>
                        <strong>
                          {getPriorityIcon(item.priority)} {item.title}
                        </strong>
                        <p>{item.message}</p>
                      </div>

                      <span className={`priority-pill ${item.priority}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className="notification-meta">
                      {item.companyName && <span>{item.companyName}</span>}
                      {item.salesPersonName && (
                        <span>{item.salesPersonName}</span>
                      )}
                      {item.grade && <span>{item.grade}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;