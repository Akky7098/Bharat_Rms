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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = [2026, 2025, 2024];

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
  const [loading, setLoading] = useState(true);

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
    async (customFilters = filters, silent = false) => {
      try {
        if (!silent) setLoading(true);

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
      } finally {
        setLoading(false);
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
      [e.target.name]: Number(e.target.value),
    };

    setFilters(updated);
    fetchDashboard(updated);
  };

  const handleMobileMonthChange = (monthIndex) => {
    const updated = {
      ...filters,
      month: monthIndex,
    };

    setFilters(updated);
    fetchDashboard(updated);
  };

  const handleMobileYearChange = (yearValue) => {
    const updated = {
      ...filters,
      year: yearValue,
    };

    setFilters(updated);
    fetchDashboard(updated);
  };

  const handleRefresh = () => {
    fetchDashboard(filters, true);
    fetchNotifications();
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

  const getScoreClass = (score) => {
    if (score >= 75) return "excellent";
    if (score >= 45) return "average";
    return "poor";
  };

   const getMonthlyScore = (item) => {
  return Number(item?.monthlyScore ?? item?.score ?? 0);
};

const getWeeklyScore = (item) => {
  const currentWeek = getFrontendCurrentWeek(item);
  return Number(currentWeek?.weekScore || 0);
};

const getWeekLabel = (item) => {
  return item?.currentWeek?.label || "Current Week";
};

const getMisChartData = (items = []) => {
  return items.map((item) => ({
    ...item,
    weeklyScore: getWeeklyScore(item),
    monthlyScoreValue: getMonthlyScore(item),
  }));
};
const getFrontendCurrentWeek = (item) => {
  if (item?.currentWeek?.weekNo) {
    return item.currentWeek;
  }

  return item?.weeklyReport?.[0] || {};
};
  if (loading) {
    return (
      <div className="dashboard-home">
        <div className="ios-dashboardhome-loading">
          <div className="ios-loader-spinner"></div>
          <p>Loading business dashboard...</p>
        </div>

        <div className="desktop-dashboardhome-loading">Loading...</div>
      </div>
    );
  }

  if (!data) return <div>Loading...</div>;

  const misChartData = misScoring?.salesPersonScores || [];
  const weeklyMisChartData = getMisChartData(misChartData);
  const revenueShare = data?.salesPersonRevenue || [];
  const grades = data?.gradeWiseQuantity || [];

  const maxGradeOrders =
    Math.max(...grades.map((g) => Number(g.orders || 0)), 1) || 1;

  return (
    <div className="dashboard-home">
      {/* ================= iOS PWA VERSION ================= */}
      <div className="ios-dashboardhome">
        <div className="ios-dh-header">
          <div className="ios-dh-header-top">
            <div>
              <h2>Business Dashboard</h2>
              <p>
                {MONTHS[Number(filters.month)]} {filters.year} performance
              </p>
            </div>

            <button
              type="button"
              className="ios-dh-refresh"
              onClick={handleRefresh}
            >
              ↻
            </button>
          </div>

          <div className="ios-month-strip">
            {MONTHS.map((monthName, index) => (
              <button
                key={monthName}
                type="button"
                className={Number(filters.month) === index ? "active" : ""}
                onClick={() => handleMobileMonthChange(index)}
              >
                {monthName}
              </button>
            ))}
          </div>

          <div className="ios-year-row">
            {YEARS.map((year) => (
              <button
                key={year}
                type="button"
                className={Number(filters.year) === year ? "active" : ""}
                onClick={() => handleMobileYearChange(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="ios-dh-content">
          <div className="ios-hero-card">
            <span>Total Revenue</span>
            <strong>{formatCurrency(data?.totalRevenue)}</strong>
            <p>Approved sales performance</p>
          </div>

          <div className="ios-kpi-grid">
            <MobileKpi title="Pending Orders" value={data?.pendingOrders || 0} icon="💼" />
            <MobileKpi title="Total Enquiries" value={data?.totalEnquiries || 0} icon="📝" />
            <MobileKpi title="Won" value={data?.wonEnquiries || 0} icon="✅" />
            <MobileKpi title="Lost" value={data?.lostEnquiries || 0} icon="❌" />
            <MobileKpi title="Delayed" value={data?.delayedEnquiries || 0} icon="⏳" />
            <MobileKpi title="Active" value={data?.activeEnquiries || 0} icon="🔥" />
            <MobileKpi title="Hot Leads" value={misScoring?.hotLeads || 0} icon="🚨" />
            <MobileKpi title="Warm Leads" value={misScoring?.warmLeads || 0} icon="⚠️" />
          </div>

          <MobileSection title="Business Insights">
            <MobileInsight
              tone="green"
              label="Top Performer"
              title={data?.topWonEmployee?.name || "No data"}
              desc={
                data?.topWonEmployee
                  ? `${data.topWonEmployee.wonCount} won enquiries`
                  : "No won enquiry found"
              }
            />

            <MobileInsight
              tone="orange"
              label="Highest Delayed"
              title={data?.topDelayedEmployee?.name || "No delay"}
              desc={
                data?.topDelayedEmployee
                  ? `${data.topDelayedEmployee.delayedCount} delayed enquiries`
                  : "No delayed enquiry found"
              }
            />

            <MobileInsight
              tone="red"
              label="Highest Order Lost"
              title={data?.topLostEmployee?.name || "No lost order"}
              desc={
                data?.topLostEmployee
                  ? `${data.topLostEmployee.lostCount} lost enquiries`
                  : "No lost enquiry found"
              }
            />

            <p className="ios-reason-text">
              <b>Top Lost Reason:</b>{" "}
              {data?.topLostReason
                ? `${data.topLostReason.reason || data.topLostReason.rawReason} (${data.topLostReason.count})`
                : "No reason found"}
            </p>
          </MobileSection>

          <MobileSection title="Sales Person Revenue Share">
            {!revenueShare.length ? (
              <p className="ios-empty">No revenue share data available</p>
            ) : (
              <div className="ios-pie-wrap">
                <PieChart width={chartWidth} height={250}>
                  <Pie
                    data={revenueShare}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={78}
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {revenueShare.map((entry, index) => (
                      <Cell
                        key={entry.salesPersonId || index}
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

                <div className="ios-revenue-list">
                  {revenueShare.map((sp, index) => (
                    <MobileProgress
                      key={sp.salesPersonId || index}
                      title={sp.name || "Unknown"}
                      subtitle={`${formatCurrency(sp.revenue)} · ${sp.percentage || 0}%`}
                      value={Number(sp.percentage || 0)}
                      color={COLORS[index % COLORS.length]}
                    />
                  ))}
                </div>
              </div>
            )}
          </MobileSection>

         <MobileSection title="MIS Scoring">
  <div className="ios-total-pill">
    Total Leads: {misScoring?.totalLeads || 0}
  </div>

  {!misChartData.length ? (
    <p className="ios-empty">No MIS scoring data available</p>
  ) : (
    misChartData.map((item, index) => {
  const monthlyScore = getMonthlyScore(item);
  const currentWeek = getFrontendCurrentWeek(item);
  const weekLabel = currentWeek?.label || getWeekLabel(item);
  const weeklyScore = Number(currentWeek?.weekScore || 0);
  const scoreClass = getScoreClass(monthlyScore);

  return (
    <div
      key={item.salesPersonId || index}
      className={`ios-score-card ${scoreClass}`}
    >
      <div className="ios-score-top">
        <div>
          <span>#{index + 1}</span>
          <strong>{item.name}</strong>
        </div>

        <b>{monthlyScore}/100</b>
      </div>

      <div className="ios-score-track">
        <div
          style={{
            width: `${Math.min(monthlyScore, 100)}%`,
            background: getMisBarColor(monthlyScore),
          }}
        ></div>
      </div>

      <div className="ios-score-stats">
        <MiniStat label="Enq" value={item.totalEnquiries || 0} />
        <MiniStat label="Won" value={item.wonEnquiries || 0} />
        <MiniStat label="Orders" value={item.approvedOrders || 0} />
        <MiniStat label="Visits" value={item.visitsDone || 0} />
      </div>

      <div className="ios-mis-month-card">
        <div className="ios-mis-month-head">
          <span>Monthly Target</span>
          <b>{formatCurrency(item?.target?.monthly?.salesValue || 0)}</b>
        </div>

        <div className="ios-mis-month-grid">
          <div>
            <span>Sales Done</span>
            <b>{formatCurrency(item?.approvedSalesValue || 0)}</b>
          </div>

          <div>
            <span>Sales Missing</span>
            <b>{formatCurrency(item?.shortBy?.salesValue || 0)}</b>
          </div>

          <div>
            <span>Enq Target</span>
            <b>{item?.target?.monthly?.enquiries || 0}</b>
          </div>

          <div>
            <span>Enq Done</span>
            <b>{item?.totalEnquiries || 0}</b>
          </div>

          <div>
            <span>Enq Missing</span>
            <b>{item?.shortBy?.enquiries || 0}</b>
          </div>

          <div>
            <span>Visit Target</span>
            <b>{item?.target?.monthly?.visits || 0}</b>
          </div>

          <div>
            <span>Visit Done</span>
            <b>{item?.visitsDone || 0}</b>
          </div>

          <div>
            <span>Visit Missing</span>
            <b>{item?.shortBy?.visits || 0}</b>
          </div>
        </div>
      </div>

      <div className="ios-mis-week-card">
        <div className="ios-mis-week-head">
          <span>{weekLabel} Target</span>
          <strong>{weeklyScore}/100</strong>
        </div>

        <div className="ios-mis-week-score-track">
          <div
            style={{
              width: `${Math.min(weeklyScore, 100)}%`,
              background: getMisBarColor(weeklyScore),
            }}
          ></div>
        </div>

        <div className="ios-mis-week-grid">
          <MiniStat
            label="Sales Target"
            value={formatCurrency(
              currentWeek?.targetWithCarryForward?.salesValue || 0
            )}
          />

          <MiniStat
            label="Sales Done"
            value={formatCurrency(currentWeek?.approvedSalesValue || 0)}
          />

          <MiniStat
            label="Sales Missing"
            value={formatCurrency(currentWeek?.shortBy?.salesValue || 0)}
          />

          <MiniStat
            label="Enq Target"
            value={Math.ceil(
              currentWeek?.targetWithCarryForward?.enquiries || 0
            )}
          />

          <MiniStat label="Enq Done" value={currentWeek?.enquiries || 0} />

          <MiniStat
            label="Enq Missing"
            value={Math.ceil(currentWeek?.shortBy?.enquiries || 0)}
          />

          <MiniStat
            label="Visit Target"
            value={Math.ceil(
              currentWeek?.targetWithCarryForward?.visits || 0
            )}
          />

          <MiniStat label="Visit Done" value={currentWeek?.visits || 0} />

          <MiniStat
            label="Visit Missing"
            value={Math.ceil(currentWeek?.shortBy?.visits || 0)}
          />
        </div>

        <div className="ios-mis-insight-list">
          <p>
            {currentWeek?.insight?.sales ||
              item?.userInsight?.sales ||
              "No sales insight available"}
          </p>

          <p>
            {currentWeek?.insight?.enquiries ||
              item?.userInsight?.enquiries ||
              "No enquiry insight available"}
          </p>

          <p>
            {currentWeek?.insight?.visits ||
              item?.userInsight?.visits ||
              "No visit insight available"}
          </p>
        </div>
      </div>
    </div>
  );
})
  )}
</MobileSection>

          {cashflow && (
            <MobileSection title="Cashflow Overview">
              <div className="ios-cash-grid">
                <MobileCash title="Revenue" value={formatCurrency(cashflow.totalRevenue)} tone="blue" />
                <MobileCash title="Paid" value={formatCurrency(cashflow.totalPaid)} tone="green" />
                <MobileCash title="Pending" value={formatCurrency(cashflow.totalPending)} tone="orange" />
                <MobileCash title="Overdue" value={formatCurrency(cashflow.overdueAmount)} tone="red" />
              </div>

              <MobilePaymentList
                title="Upcoming Due Payments"
                data={cashflow.upcomingDuePayments || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />

              <MobilePaymentList
                title="Overdue Payments"
                data={cashflow.overduePayments || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                danger
              />
            </MobileSection>
          )}

          <MobileSection title="Top Steel Grades">
            {!grades.length ? (
              <p className="ios-empty">No grade data available</p>
            ) : (
              grades.map((g, index) => {
                const width = (Number(g.orders || 0) / maxGradeOrders) * 100;

                return (
                  <MobileProgress
                    key={index}
                    title={`${index + 1}. ${g.grade || "Not Specified"}`}
                    subtitle={`${g.orders || 0} order(s) · ${formatCurrency(g.revenue || 0)}`}
                    value={width}
                    color="#166534"
                  />
                );
              })
            )}
          </MobileSection>
        </div>
      </div>

      {/* ================= DESKTOP ORIGINAL VERSION ================= */}
      <div className="desktop-dashboardhome">
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
                <span className="notification-count">
                  {notifications.total}
                </span>
              )}
            </button>

            <div className="month-filter">
              <select
                name="month"
                value={filters.month}
                onChange={handleMonthYearChange}
              >
                {FULL_MONTHS.map((m, index) => (
                  <option key={m} value={index}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                name="year"
                value={filters.year}
                onChange={handleMonthYearChange}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
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
                        key={entry.salesPersonId || index}
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
                  <div key={sp.salesPersonId || index} className="legend-row">
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
                  ? `${data.topLostReason.reason || data.topLostReason.rawReason} (${data.topLostReason.count})`
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
        Monthly score, current week target and action insight
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
      <div className="mis-employee-grid mis-employee-grid-premium">
  {misChartData.map((item, index) => {
    const monthlyScore = getMonthlyScore(item);
const currentWeek = getFrontendCurrentWeek(item);
const weekLabel = currentWeek?.label || getWeekLabel(item);
const weeklyScore = Number(currentWeek?.weekScore || 0);
const scoreClass = getScoreClass(monthlyScore);
const monthlyTarget = item?.target?.monthly || {};
const monthlyShortBy = item?.shortBy || {};

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

          <strong>{monthlyScore}/100</strong>
        </div>

        <p className="mis-monthly-label">Monthly MIS Score</p>

        <div className="mis-progress">
          <span style={{ width: `${Math.min(monthlyScore, 100)}%` }}></span>
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
            <b>{item.approvedOrders || 0}</b>
            <span>Orders</span>
          </div>

          <div>
            <b>{item.visitsDone || 0}</b>
            <span>Visits</span>
          </div>
        </div>

        <div className="mis-month-target-box">
  <div className="mis-target-title">
    <span>Monthly Target</span>
  </div>

  <div className="mis-target-grid">
    <div>
      <span>Sales Target</span>
      <b>{formatCurrency(monthlyTarget.salesValue || 0)}</b>
    </div>

    <div>
      <span>Sales Done</span>
      <b>{formatCurrency(item.approvedSalesValue || 0)}</b>
    </div>

    <div>
      <span>Sales Missing</span>
      <b>{formatCurrency(monthlyShortBy.salesValue || 0)}</b>
    </div>

    <div>
      <span>Enquiry Target</span>
      <b>{monthlyTarget.enquiries || 0}</b>
    </div>

    <div>
      <span>Enquiry Done</span>
      <b>{item.totalEnquiries || 0}</b>
    </div>

    <div>
      <span>Enquiry Missing</span>
      <b>{monthlyShortBy.enquiries || 0}</b>
    </div>

    <div>
      <span>Visit Target</span>
      <b>{monthlyTarget.visits || 0}</b>
    </div>

    <div>
      <span>Visit Done</span>
      <b>{item.visitsDone || 0}</b>
    </div>

    <div>
      <span>Visit Missing</span>
      <b>{monthlyShortBy.visits || 0}</b>
    </div>
  </div>
</div>

<div className="mis-week-premium">
  <div className="mis-week-title">
    <div>
      <span>{currentWeek?.label || weekLabel}</span>
      <strong>{Number(currentWeek?.weekScore || weeklyScore || 0)}/100</strong>
    </div>

    <b>Weekly Score</b>
  </div>

  <div className="mis-week-progress">
    <span
      style={{
        width: `${Math.min(Number(currentWeek?.weekScore || weeklyScore || 0), 100)}%`,
        background: getMisBarColor(Number(currentWeek?.weekScore || weeklyScore || 0)),
      }}
    ></span>
  </div>

  <div className="mis-week-target-grid">
    <div>
      <span>Sales Target</span>
      <b>
        {formatCurrency(
          currentWeek?.targetWithCarryForward?.salesValue || 0
        )}
      </b>
    </div>

    <div>
      <span>Sales Done</span>
      <b>{formatCurrency(currentWeek?.approvedSalesValue || 0)}</b>
    </div>

    <div>
      <span>Sales Missing</span>
      <b>{formatCurrency(currentWeek?.shortBy?.salesValue || 0)}</b>
    </div>

    <div>
      <span>Enq Target</span>
      <b>
        {Math.ceil(currentWeek?.targetWithCarryForward?.enquiries || 0)}
      </b>
    </div>

    <div>
      <span>Enq Done</span>
      <b>{currentWeek?.enquiries || 0}</b>
    </div>

    <div>
      <span>Enq Missing</span>
      <b>{Math.ceil(currentWeek?.shortBy?.enquiries || 0)}</b>
    </div>

    <div>
      <span>Visit Target</span>
      <b>
        {Math.ceil(currentWeek?.targetWithCarryForward?.visits || 0)}
      </b>
    </div>

    <div>
      <span>Visit Done</span>
      <b>{currentWeek?.visits || 0}</b>
    </div>

    <div>
      <span>Visit Missing</span>
      <b>{Math.ceil(currentWeek?.shortBy?.visits || 0)}</b>
    </div>
  </div>

  <div className="mis-insight-list">
    <p>
      {currentWeek?.insight?.sales ||
        item?.userInsight?.sales ||
        "No sales insight available"}
    </p>

    <p>
      {currentWeek?.insight?.enquiries ||
        item?.userInsight?.enquiries ||
        "No enquiry insight available"}
    </p>

    <p>
      {currentWeek?.insight?.visits ||
        item?.userInsight?.visits ||
        "No visit insight available"}
    </p>
  </div>
</div>
      </div>
    );
  })}
</div>

      <div className="mis-chart-compact">
        <h4>Salesperson Weekly MIS Score Comparison</h4>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={weeklyMisChartData}
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
                if (name === "weeklyScore")
                  return [`${value}/100`, "Weekly MIS Score"];

                if (name === "monthlyScoreValue")
                  return [`${value}/100`, "Monthly MIS Score"];

                return [value, name];
              }}
              labelFormatter={(label) => `Sales Person: ${label}`}
            />
            <Bar dataKey="weeklyScore" radius={[0, 12, 12, 0]}>
              {weeklyMisChartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={getMisBarColor(entry.weeklyScore)}
                />
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
              <DesktopPaymentList
                title="Upcoming Due Payments"
                data={cashflow.upcomingDuePayments || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />

              <DesktopPaymentList
                title="Overdue Payments"
                data={cashflow.overduePayments || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                danger
              />
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
            {!grades.length ? (
              <p className="cashflow-empty">No grade data available</p>
            ) : (
              grades.map((g, i) => {
                const width = (Number(g.orders || 0) / maxGradeOrders) * 100;

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
                      {item.salesPersonName && <span>{item.salesPersonName}</span>}
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

function MobileKpi({ title, value, icon }) {
  return (
    <div className="ios-kpi-card">
      <span>{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function MobileSection({ title, children }) {
  return (
    <section className="ios-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function MobileInsight({ label, title, desc, tone }) {
  return (
    <div className={`ios-insight-card ${tone}`}>
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  );
}

function MobileProgress({ title, subtitle, value, color }) {
  return (
    <div className="ios-progress-row">
      <strong>{title}</strong>
      <p>{subtitle}</p>
      <div className="ios-progress-track">
        <span
          style={{
            width: `${Math.min(Number(value || 0), 100)}%`,
            background: color || "#166534",
          }}
        ></span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="ios-mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MobileCash({ title, value, tone }) {
  return (
    <div className={`ios-cash-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MobilePaymentList({
  title,
  data,
  formatCurrency,
  formatDate,
  danger,
}) {
  return (
    <div className={`ios-payment-box ${danger ? "danger" : ""}`}>
      <h4>{title}</h4>

      {!data.length ? (
        <p className="ios-empty">No records found</p>
      ) : (
        data.slice(0, 5).map((item) => (
          <div key={item._id} className="ios-payment-row">
            <div>
              <strong>{item.companyName}</strong>
              <span>Due: {formatDate(item.paymentDueDate)}</span>
            </div>

            <b>{formatCurrency(item.pendingAmount)}</b>
          </div>
        ))
      )}
    </div>
  );
}

function DesktopPaymentList({
  title,
  data,
  formatCurrency,
  formatDate,
  danger,
}) {
  return (
    <div className={`cashflow-list-card ${danger ? "danger" : ""}`}>
      <h4>{title}</h4>

      {!data.length ? (
        <p className="cashflow-empty">
          {danger ? "No overdue payments" : "No upcoming dues"}
        </p>
      ) : (
        data.map((item) => (
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
  );
}

export default DashboardHome;