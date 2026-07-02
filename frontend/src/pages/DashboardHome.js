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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

    const formatLocalDate = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const getMonthDateRange = useCallback(
    (month, year) => {
      const fromDate = new Date(Number(year), Number(month), 1);
      const toDate = new Date(Number(year), Number(month) + 1, 0);

      return {
        fromDate: formatLocalDate(fromDate),
        toDate: formatLocalDate(toDate),
      };
    },
    [formatLocalDate]
  );

  const getActiveDateRange = useCallback(() => {
    return getMonthDateRange(Number(filters.month), Number(filters.year));
  }, [filters.month, filters.year, getMonthDateRange]);

  const buildQuery = (params = {}) => {
    const cleanParams = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        cleanParams[key] = value;
      }
    });

    return new URLSearchParams(cleanParams).toString();
  };

   const drillTo = (moduleKey, params = {}) => {
    const dateRange = getActiveDateRange();

    const filtersPayload = {
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      source: "dashboard",
      ...params,
    };

    if (window.__openDashboardModule) {
      window.__openDashboardModule(moduleKey, filtersPayload);
      return;
    }

    const query = buildQuery(filtersPayload);
    window.location.hash = `${moduleKey}${query ? `?${query}` : ""}`;
  };

      const openSalesOrders = (extra = {}) => {
    drillTo("salesOrder", {
      approvalTab: "approved",
      status: "approved",
      ...extra,
    });
  };

  const openPendingSalesOrders = (extra = {}) => {
    drillTo("salesOrder", {
      approvalTab: "pending_rejected",
      status: "pending",
      ...extra,
    });
  };

  const openEnquiries = (extra = {}) => {
    drillTo("sheet", extra);
  };

  const openReceivables = (extra = {}) => {
    drillTo("receivables", extra);
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
        [filters, getMonthDateRange]
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

  const getFrontendCurrentWeek = (item) => {
    if (item?.currentWeek?.weekNo) return item.currentWeek;
    return item?.weeklyReport?.[0] || {};
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
      <div className="ios-dashboardhome">
        <div className="ios-dh-header">
          <div className="ios-dh-header-top">
            <div>
              <h2>Business Dashboard</h2>
              <p>{MONTHS[Number(filters.month)]} {filters.year} performance</p>
            </div>

            <button type="button" className="ios-dh-refresh" onClick={handleRefresh}>
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
          <button
            type="button"
            className="ios-hero-card drill-card"
            onClick={() => openSalesOrders({ view: "revenue" })}
          >
            <span>Total Revenue</span>
            <strong>{formatCurrency(data?.totalRevenue)}</strong>
            <p>Tap to open approved sales orders</p>
          </button>

          <div className="ios-kpi-grid">
            <MobileKpi title="Pending Orders" value={data?.pendingOrders || 0} icon="💼" onClick={() => openPendingSalesOrders()} />
            <MobileKpi title="Total Enquiries" value={data?.totalEnquiries || 0} icon="📝" onClick={() => openEnquiries({})} />
            <MobileKpi title="Won" value={data?.wonEnquiries || 0} icon="✅" onClick={() => openEnquiries({ status: "won" })} />
            <MobileKpi title="Lost" value={data?.lostEnquiries || 0} icon="❌" onClick={() => openEnquiries({ status: "lost" })} />
            <MobileKpi title="Delayed" value={data?.delayedEnquiries || 0} icon="⏳" onClick={() => openEnquiries({ status: "delayed" })} />
            <MobileKpi title="Active" value={data?.activeEnquiries || 0} icon="🔥" onClick={() => openEnquiries({ status: "active" })} />
            <MobileKpi title="Hot Leads" value={misScoring?.hotLeads || 0} icon="🚨" onClick={() => openEnquiries({ leadType: "hot" })} />
            <MobileKpi title="Warm Leads" value={misScoring?.warmLeads || 0} icon="⚠️" onClick={() => openEnquiries({ leadType: "warm" })} />
          </div>

          <MobileSection title="Business Insights">
            <MobileInsight
              tone="green"
              label="Top Performer"
              title={data?.topWonEmployee?.name || "No data"}
              desc={data?.topWonEmployee ? `${data.topWonEmployee.wonCount} won enquiries` : "No won enquiry found"}
              onClick={() =>
                openEnquiries({
                  status: "won",
                  salesPersonId: data?.topWonEmployee?.salesPersonId || data?.topWonEmployee?._id,
                  salesPersonName: data?.topWonEmployee?.name,
                })
              }
            />

            <MobileInsight
              tone="orange"
              label="Highest Delayed"
              title={data?.topDelayedEmployee?.name || "No delay"}
              desc={data?.topDelayedEmployee ? `${data.topDelayedEmployee.delayedCount} delayed enquiries` : "No delayed enquiry found"}
              onClick={() =>
                openEnquiries({
                  status: "delayed",
                  salesPersonId: data?.topDelayedEmployee?.salesPersonId || data?.topDelayedEmployee?._id,
                  salesPersonName: data?.topDelayedEmployee?.name,
                })
              }
            />

            <MobileInsight
              tone="red"
              label="Highest Order Lost"
              title={data?.topLostEmployee?.name || "No lost order"}
              desc={data?.topLostEmployee ? `${data.topLostEmployee.lostCount} lost enquiries` : "No lost enquiry found"}
              onClick={() =>
                openEnquiries({
                  status: "lost",
                  salesPersonId: data?.topLostEmployee?.salesPersonId || data?.topLostEmployee?._id,
                  salesPersonName: data?.topLostEmployee?.name,
                })
              }
            />

            <button
              type="button"
              className="ios-reason-text drill-link"
              onClick={() =>
                openEnquiries({
                  status: "lost",
                  lostReason: data?.topLostReason?.reason || data?.topLostReason?.rawReason,
                })
              }
            >
              <b>Top Lost Reason:</b>{" "}
              {data?.topLostReason
                ? `${data.topLostReason.reason || data.topLostReason.rawReason} (${data.topLostReason.count})`
                : "No reason found"}
            </button>
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
                    onClick={(entry) =>
                      openSalesOrders({
                        salesPersonId: entry?.salesPersonId,
                        salesPersonName: entry?.name,
                      })
                    }
                  >
                    {revenueShare.map((entry, index) => (
                      <Cell key={entry.salesPersonId || index} fill={COLORS[index % COLORS.length]} className="drill-chart-cell" />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString("en-IN")}`} />
                </PieChart>

                <div className="ios-revenue-list">
                  {revenueShare.map((sp, index) => (
                    <MobileProgress
                      key={sp.salesPersonId || index}
                      title={sp.name || "Unknown"}
                      subtitle={`${formatCurrency(sp.revenue)} · ${sp.percentage || 0}%`}
                      value={Number(sp.percentage || 0)}
                      color={COLORS[index % COLORS.length]}
                      onClick={() =>
                        openSalesOrders({
                          salesPersonId: sp.salesPersonId,
                          salesPersonName: sp.name,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </MobileSection>

          <MobileSection title="MIS Scoring">
            <button
              type="button"
              className="ios-total-pill drill-pill"
              onClick={() => openEnquiries({ leadSource: "mis" })}
            >
              Total Leads: {misScoring?.totalLeads || 0}
            </button>

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
                  <div key={item.salesPersonId || index} className={`ios-score-card ${scoreClass}`}>
                    <div className="ios-score-top">
                      <button
                        type="button"
                        className="mis-person-drill"
                        onClick={() =>
                          openEnquiries({
                            salesPersonId: item.salesPersonId,
                            salesPersonName: item.name,
                          })
                        }
                      >
                        <span>#{index + 1}</span>
                        <strong>{item.name}</strong>
                      </button>

                      <b>{monthlyScore}/100</b>
                    </div>

                    <div className="ios-score-track">
                      <div style={{ width: `${Math.min(monthlyScore, 100)}%`, background: getMisBarColor(monthlyScore) }}></div>
                    </div>

                    <div className="ios-score-stats">
                      <MiniStat label="Enq" value={item.totalEnquiries || 0} onClick={() => openEnquiries({ salesPersonId: item.salesPersonId })} />
                      <MiniStat label="Won" value={item.wonEnquiries || 0} onClick={() => openEnquiries({ status: "won", salesPersonId: item.salesPersonId })} />
                      <MiniStat label="Orders" value={item.approvedOrders || 0} onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId })} />
                      <MiniStat label="Visits" value={item.visitsDone || 0} onClick={() => drillTo("coldCall", { activityType: "visit", salesPersonId: item.salesPersonId })} />
                    </div>

                    <div className="ios-mis-month-card">
                      <div className="ios-mis-month-head">
                        <span>Monthly Target</span>
                        <b>{formatCurrency(item?.target?.monthly?.salesValue || 0)}</b>
                      </div>

                      <div className="ios-mis-month-grid">
                        <MisMetric label="Sales Done" value={formatCurrency(item?.approvedSalesValue || 0)} onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId })} />
                        <MisMetric label="Enq Done" value={item?.totalEnquiries || 0} onClick={() => openEnquiries({ salesPersonId: item.salesPersonId })} />
                        <MisMetric label="Visit Done" value={item?.visitsDone || 0} onClick={() => drillTo("attendance", { type: "visits", salesPersonId: item.salesPersonId })} />
                      </div>
                    </div>

                    <div className="ios-mis-week-card">
                      <div className="ios-mis-week-head">
                        <span>{weekLabel} Target</span>
                        <strong>{weeklyScore}/100</strong>
                      </div>

                      <div className="ios-mis-week-score-track">
                        <div style={{ width: `${Math.min(weeklyScore, 100)}%`, background: getMisBarColor(weeklyScore) }}></div>
                      </div>

                      <div className="ios-mis-week-grid">
                        <MiniStat label="Sales Done" value={formatCurrency(currentWeek?.approvedSalesValue || 0)} onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
                        <MiniStat label="Enq Done" value={currentWeek?.enquiries || 0} onClick={() => openEnquiries({ salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
                        <MiniStat label="Visit Done" value={currentWeek?.visits || 0} onClick={() => drillTo("coldCall", { activityType: "visit", salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
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
                <MobileCash title="Revenue" value={formatCurrency(cashflow.totalRevenue)} tone="blue" onClick={() => openReceivables({ paymentStatus: "all" })} />
                <MobileCash title="Paid" value={formatCurrency(cashflow.totalPaid)} tone="green" onClick={() => openReceivables({ paymentStatus: "paid" })} />
                <MobileCash title="Pending" value={formatCurrency(cashflow.totalPending)} tone="orange" onClick={() => openReceivables({ paymentStatus: "pending" })} />
                <MobileCash title="Overdue" value={formatCurrency(cashflow.overdueAmount)} tone="red" onClick={() => openReceivables({ paymentStatus: "overdue" })} />
              </div>

              <MobilePaymentList title="Upcoming Due Payments" data={cashflow.upcomingDuePayments || []} formatCurrency={formatCurrency} formatDate={formatDate} onClickItem={(item) => openReceivables({ companyName: item.companyName, paymentId: item._id })} />

              <MobilePaymentList title="Overdue Payments" data={cashflow.overduePayments || []} formatCurrency={formatCurrency} formatDate={formatDate} danger onClickItem={(item) => openReceivables({ paymentStatus: "overdue", companyName: item.companyName, paymentId: item._id })} />
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
                    onClick={() => openSalesOrders({ grade: g.grade })}
                  />
                );
              })
            )}
          </MobileSection>
        </div>
      </div>

      <div className="desktop-dashboardhome">
        <div className="dashboard-topbar">
          <div>
            <h2>Welcome, {user?.name || "User"}</h2>
            <p>Business performance overview</p>
          </div>

          <div className="dashboard-top-actions">
            <button type="button" className="notification-icon-btn" onClick={() => setShowNotifications(true)} title="Notifications">
              🔔
              {notifications?.total > 0 && <span className="notification-count">{notifications.total}</span>}
            </button>

            <div className="month-filter">
              <select name="month" value={filters.month} onChange={handleMonthYearChange}>
                {FULL_MONTHS.map((m, index) => (
                  <option key={m} value={index}>{m}</option>
                ))}
              </select>

              <select name="year" value={filters.year} onChange={handleMonthYearChange}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-grid">
          <DashboardCard title="Total Revenue" value={formatCurrency(data.totalRevenue)} className="revenue" onClick={() => openSalesOrders({ view: "revenue" })} />
          <DashboardCard title="Pending Sales Order" value={data.pendingOrders || 0} className="orders" onClick={() => openPendingSalesOrders()} />
          <DashboardCard title="Total Enquiries" value={data.totalEnquiries} className="enquiries" onClick={() => openEnquiries({})} />
          <DashboardCard title="Won" value={data.wonEnquiries} className="won" onClick={() => openEnquiries({ status: "won" })} />
          <DashboardCard title="Lost" value={data.lostEnquiries} className="lost" onClick={() => openEnquiries({ status: "lost" })} />
          <DashboardCard title="Delayed" value={data.delayedEnquiries} className="delayed" onClick={() => openEnquiries({ status: "delayed" })} />
          <DashboardCard title="Active Enquiries" value={data.activeEnquiries || 0} className="active" onClick={() => openEnquiries({ status: "active" })} />
          <DashboardCard title="Hot Leads" value={misScoring.hotLeads || 0} className="hot" onClick={() => openEnquiries({ leadType: "hot" })} />
          <DashboardCard title="Warm Leads" value={misScoring.warmLeads || 0} className="warm" onClick={() => openEnquiries({ leadType: "warm" })} />
          <DashboardCard title="Cold Leads" value={misScoring.coldLeads || 0} className="cold" onClick={() => openEnquiries({ leadType: "cold" })} />
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
                    onClick={(entry) =>
                      openSalesOrders({
                        salesPersonId: entry?.salesPersonId,
                        salesPersonName: entry?.name,
                      })
                    }
                  >
                    {(data.salesPersonRevenue || []).map((entry, index) => (
                      <Cell key={entry.salesPersonId || index} fill={COLORS[index % COLORS.length]} className="drill-chart-cell" />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString("en-IN")}`} />
                </PieChart>
              </div>

              <div className="pie-legend">
                {(data.salesPersonRevenue || []).map((sp, index) => (
                  <button
                    key={sp.salesPersonId || index}
                    type="button"
                    className="legend-row drill-legend"
                    onClick={() =>
                      openSalesOrders({
                        salesPersonId: sp.salesPersonId,
                        salesPersonName: sp.name,
                      })
                    }
                  >
                    <span className="legend-dot" style={{ background: COLORS[index % COLORS.length] }}></span>
                    <div>
                      <strong>{sp.name}</strong>
                      <p>₹ {Number(sp.revenue || 0).toLocaleString("en-IN")} · {sp.percentage}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="insight-card">
            <h3>Business Insights</h3>

            <InsightBox
              tone="green"
              label="Top Performer (Won)"
              title={data.topWonEmployee?.name || "No data"}
              desc={data.topWonEmployee ? `${data.topWonEmployee.wonCount} won enquiries` : "No won enquiry"}
              onClick={() =>
                openEnquiries({
                  status: "won",
                  salesPersonId: data?.topWonEmployee?.salesPersonId || data?.topWonEmployee?._id,
                  salesPersonName: data?.topWonEmployee?.name,
                })
              }
            />

            <InsightBox
              tone="orange"
              label="Highest Delayed"
              title={data.topDelayedEmployee?.name || "No delay"}
              desc={data.topDelayedEmployee ? `${data.topDelayedEmployee.delayedCount} delayed enquiries` : "No delayed enquiry found"}
              onClick={() =>
                openEnquiries({
                  status: "delayed",
                  salesPersonId: data?.topDelayedEmployee?.salesPersonId || data?.topDelayedEmployee?._id,
                  salesPersonName: data?.topDelayedEmployee?.name,
                })
              }
            />

            <InsightBox
              tone="red"
              label="Highest Order Lost"
              title={data.topLostEmployee?.name || "No lost order"}
              desc={data.topLostEmployee ? `${data.topLostEmployee.lostCount} lost enquiries` : "No lost enquiry found"}
              onClick={() =>
                openEnquiries({
                  status: "lost",
                  salesPersonId: data?.topLostEmployee?.salesPersonId || data?.topLostEmployee?._id,
                  salesPersonName: data?.topLostEmployee?.name,
                })
              }
            />

            <button
              type="button"
              className="lost-reason-mini drill-link"
              onClick={() =>
                openEnquiries({
                  status: "lost",
                  lostReason: data?.topLostReason?.reason || data?.topLostReason?.rawReason,
                })
              }
            >
              <b>Top Reason:</b>{" "}
              {data.topLostReason
                ? `${data.topLostReason.reason || data.topLostReason.rawReason} (${data.topLostReason.count})`
                : "No reason found"}
            </button>
          </div>
        </div>

        <div className="chart-card mis-card">
          <div className="mis-header">
            <div>
              <h3>MIS Scoring Overview</h3>
              <p>Monthly score, current week target and action insight</p>
            </div>

            <button type="button" className="mis-total-pill drill-pill" onClick={() => openEnquiries({ leadSource: "mis" })}>
              Total Leads: {misScoring.totalLeads || 0}
            </button>
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
                    <div key={item.salesPersonId || index} className={`mis-employee-card ${scoreClass}`}>
                      <div className="mis-employee-top">
                        <button
                          type="button"
                          className="mis-person-drill"
                          onClick={() =>
                            openEnquiries({
                              salesPersonId: item.salesPersonId,
                              salesPersonName: item.name,
                            })
                          }
                        >
                          <span className="mis-rank">#{index + 1}</span>
                          <h4>{item.name}</h4>
                        </button>

                        <strong>{monthlyScore}/100</strong>
                      </div>

                      <p className="mis-monthly-label">Monthly MIS Score</p>

                      <div className="mis-progress">
                        <span style={{ width: `${Math.min(monthlyScore, 100)}%` }}></span>
                      </div>

                      <div className="mis-employee-stats">
                        <MisStat value={item.totalEnquiries || 0} label="Enquiries" onClick={() => openEnquiries({ salesPersonId: item.salesPersonId })} />
                        <MisStat value={item.wonEnquiries || 0} label="Won" onClick={() => openEnquiries({ status: "won", salesPersonId: item.salesPersonId })} />
                        <MisStat value={item.approvedOrders || 0} label="Orders" onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId })} />
                        <MisStat value={item.visitsDone || 0} label="Visits" onClick={() => drillTo("attendance", { type: "visits", salesPersonId: item.salesPersonId })} />
                      </div>

                      <div className="mis-month-target-box">
                        <div className="mis-target-title">
                          <span>Monthly Target</span>
                        </div>

                        <div className="mis-target-grid">
                          <div><span>Sales Target</span><b>{formatCurrency(monthlyTarget.salesValue || 0)}</b></div>
                          <MisMetric label="Sales Done" value={formatCurrency(item.approvedSalesValue || 0)} onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId })} />
                          <div><span>Sales Missing</span><b>{formatCurrency(monthlyShortBy.salesValue || 0)}</b></div>

                          <div><span>Enquiry Target</span><b>{monthlyTarget.enquiries || 0}</b></div>
                          <MisMetric label="Enquiry Done" value={item.totalEnquiries || 0} onClick={() => openEnquiries({ salesPersonId: item.salesPersonId })} />
                          <div><span>Enquiry Missing</span><b>{monthlyShortBy.enquiries || 0}</b></div>

                          <div><span>Visit Target</span><b>{monthlyTarget.visits || 0}</b></div>
                          <MisMetric label="Visit Done" value={item.visitsDone || 0} onClick={() => drillTo("attendance", { type: "visits", salesPersonId: item.salesPersonId })} />
                          <div><span>Visit Missing</span><b>{monthlyShortBy.visits || 0}</b></div>
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
                          <div><span>Sales Target</span><b>{formatCurrency(currentWeek?.targetWithCarryForward?.salesValue || 0)}</b></div>
                          <MisMetric label="Sales Done" value={formatCurrency(currentWeek?.approvedSalesValue || 0)} onClick={() => openSalesOrders({ salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
                          <div><span>Sales Missing</span><b>{formatCurrency(currentWeek?.shortBy?.salesValue || 0)}</b></div>

                          <div><span>Enq Target</span><b>{Math.ceil(currentWeek?.targetWithCarryForward?.enquiries || 0)}</b></div>
                          <MisMetric label="Enq Done" value={currentWeek?.enquiries || 0} onClick={() => openEnquiries({ salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
                          <div><span>Enq Missing</span><b>{Math.ceil(currentWeek?.shortBy?.enquiries || 0)}</b></div>

                          <div><span>Visit Target</span><b>{Math.ceil(currentWeek?.targetWithCarryForward?.visits || 0)}</b></div>
                          <MisMetric label="Visit Done" value={currentWeek?.visits || 0} onClick={() => drillTo("attendance", { type: "visits", salesPersonId: item.salesPersonId, weekNo: currentWeek?.weekNo })} />
                          <div><span>Visit Missing</span><b>{Math.ceil(currentWeek?.shortBy?.visits || 0)}</b></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mis-chart-compact">
                <h4>Salesperson Weekly MIS Score Comparison</h4>

                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyMisChartData} layout="vertical" margin={{ top: 10, right: 25, left: 35, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "weeklyScore") return [`${value}/100`, "Weekly MIS Score"];
                        if (name === "monthlyScoreValue") return [`${value}/100`, "Monthly MIS Score"];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Sales Person: ${label}`}
                    />
                    <Bar
                      dataKey="weeklyScore"
                      radius={[0, 12, 12, 0]}
                      onClick={(entry) =>
                        openEnquiries({
                          salesPersonId: entry?.salesPersonId,
                          salesPersonName: entry?.name,
                          sourceType: "weeklyMis",
                        })
                      }
                    >
                      {weeklyMisChartData.map((entry, index) => (
                        <Cell key={index} fill={getMisBarColor(entry.weeklyScore)} className="drill-chart-cell" />
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
              <CashflowCard title="Total Revenue" value={formatCurrency(cashflow.totalRevenue)} tone="total" onClick={() => openReceivables({ paymentStatus: "all" })} />
              <CashflowCard title="Total Paid" value={formatCurrency(cashflow.totalPaid)} tone="paid" onClick={() => openReceivables({ paymentStatus: "paid" })} />
              <CashflowCard title="Total Pending" value={formatCurrency(cashflow.totalPending)} tone="pending" onClick={() => openReceivables({ paymentStatus: "pending" })} />
              <CashflowCard title="Overdue Amount" value={formatCurrency(cashflow.overdueAmount)} tone="overdue" onClick={() => openReceivables({ paymentStatus: "overdue" })} />
            </div>

            <div className="cashflow-detail-grid">
              <DesktopPaymentList title="Upcoming Due Payments" data={cashflow.upcomingDuePayments || []} formatCurrency={formatCurrency} formatDate={formatDate} onClickItem={(item) => openReceivables({ companyName: item.companyName, paymentId: item._id })} />

              <DesktopPaymentList title="Overdue Payments" data={cashflow.overduePayments || []} formatCurrency={formatCurrency} formatDate={formatDate} danger onClickItem={(item) => openReceivables({ paymentStatus: "overdue", companyName: item.companyName, paymentId: item._id })} />
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
                  <button key={i} type="button" className="top-grade-item drill-grade" onClick={() => openSalesOrders({ grade: g.grade })}>
                    <div className="top-grade-top">
                      <div>
                        <strong>{g.grade || "Not Specified"}</strong>
                        <p>{g.orders || 0} order(s) · {formatCurrency(g.revenue || 0)}</p>
                      </div>

                      <span>#{i + 1}</span>
                    </div>

                    <div className="top-grade-progress">
                      <div className="top-grade-fill" style={{ width: `${width}%` }}></div>
                    </div>
                  </button>
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

              <button type="button" className="notification-close" onClick={() => setShowNotifications(false)}>
                ×
              </button>
            </div>

            <div className="notification-summary-grid">
              <div className="notification-summary-card high"><span>High</span><strong>{notifications?.high || 0}</strong></div>
              <div className="notification-summary-card medium"><span>Medium</span><strong>{notifications?.medium || 0}</strong></div>
              <div className="notification-summary-card low"><span>Low</span><strong>{notifications?.low || 0}</strong></div>
            </div>

            <div className="notification-list">
              {!notifications?.notifications?.length ? (
                <div className="notification-empty">
                  <strong>No alerts right now</strong>
                  <p>Everything looks clear for selected business rules.</p>
                </div>
              ) : (
                notifications.notifications.map((item, index) => (
                  <div key={`${item.type}-${item.sourceId || index}`} className={`notification-item ${item.priority}`}>
                    <div className="notification-item-top">
                      <div>
                        <strong>{getPriorityIcon(item.priority)} {item.title}</strong>
                        <p>{item.message}</p>
                      </div>

                      <span className={`priority-pill ${item.priority}`}>{item.priority}</span>
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

function DashboardCard({ title, value, className, onClick }) {
  return (
    <button type="button" className={`card ${className} drill-card`} onClick={onClick}>
      <h3>{title}</h3>
      <p>{value}</p>
      <small>View details →</small>
    </button>
  );
}

function MobileKpi({ title, value, icon, onClick }) {
  return (
    <button type="button" className="ios-kpi-card drill-card" onClick={onClick}>
      <span>{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
    </button>
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

function MobileInsight({ label, title, desc, tone, onClick }) {
  return (
    <button type="button" className={`ios-insight-card ${tone} drill-card`} onClick={onClick}>
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{desc}</p>
    </button>
  );
}

function InsightBox({ tone, label, title, desc, onClick }) {
  return (
    <button type="button" className={`insight-box ${tone} drill-card`} onClick={onClick}>
      <span>{label}</span>
      <h4>{title}</h4>
      <p>{desc}</p>
    </button>
  );
}

function MobileProgress({ title, subtitle, value, color, onClick }) {
  return (
    <button type="button" className="ios-progress-row drill-progress" onClick={onClick}>
      <strong>{title}</strong>
      <p>{subtitle}</p>
      <div className="ios-progress-track">
        <span style={{ width: `${Math.min(Number(value || 0), 100)}%`, background: color || "#166534" }}></span>
      </div>
    </button>
  );
}

function MiniStat({ label, value, onClick }) {
  return (
    <button type="button" className="ios-mini-stat drill-mini" onClick={onClick}>
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function MobileCash({ title, value, tone, onClick }) {
  return (
    <button type="button" className={`ios-cash-card ${tone} drill-card`} onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
    </button>
  );
}

function CashflowCard({ title, value, tone, onClick }) {
  return (
    <button type="button" className={`cashflow-card ${tone} drill-card`} onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
    </button>
  );
}

function MisStat({ value, label, onClick }) {
  return (
    <button type="button" className="mis-stat-drill" onClick={onClick}>
      <b>{value}</b>
      <span>{label}</span>
    </button>
  );
}

function MisMetric({ label, value, onClick }) {
  return (
    <button type="button" className="mis-metric-drill" onClick={onClick}>
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );
}

function MobilePaymentList({ title, data, formatCurrency, formatDate, danger, onClickItem }) {
  return (
    <div className={`ios-payment-box ${danger ? "danger" : ""}`}>
      <h4>{title}</h4>

      {!data.length ? (
        <p className="ios-empty">No records found</p>
      ) : (
        data.slice(0, 5).map((item) => (
          <button key={item._id} type="button" className="ios-payment-row drill-payment-row" onClick={() => onClickItem?.(item)}>
            <div>
              <strong>{item.companyName}</strong>
              <span>Due: {formatDate(item.paymentDueDate)}</span>
            </div>

            <b>{formatCurrency(item.pendingAmount)}</b>
          </button>
        ))
      )}
    </div>
  );
}

function DesktopPaymentList({ title, data, formatCurrency, formatDate, danger, onClickItem }) {
  return (
    <div className={`cashflow-list-card ${danger ? "danger" : ""}`}>
      <h4>{title}</h4>

      {!data.length ? (
        <p className="cashflow-empty">{danger ? "No overdue payments" : "No upcoming dues"}</p>
      ) : (
        data.map((item) => (
          <button key={item._id} type="button" className="cashflow-row drill-payment-row" onClick={() => onClickItem?.(item)}>
            <div>
              <strong>{item.companyName}</strong>
              <span>Due: {formatDate(item.paymentDueDate)}</span>
            </div>

            <b>{formatCurrency(item.pendingAmount)}</b>
          </button>
        ))
      )}
    </div>
  );
}

export default DashboardHome;