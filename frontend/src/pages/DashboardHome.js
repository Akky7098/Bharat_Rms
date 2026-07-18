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

const SALES_MIS_USERS = [
  "deepak yadav",
  "renu",
  "deepesh",
  "shalu",
  "saloni",
  "kailash",
];

/* =================================================
   MIS SCORING WEIGHTAGE
================================================= */

const MIS_WEIGHTAGE_RULES = [
  {
    key: "enquiry",
    title: "Enquiries",
    shortTitle: "Enquiries",
    weightage: 15,
    tone: "blue",
  },
  {
    key: "meeting",
    title: "Customer Meetings",
    shortTitle: "Customer Meetings",
    weightage: 25,
    tone: "purple",
  },
  {
    key: "sales_volume",
    title: "Sales Value",
    shortTitle: "Sales Value",
    weightage: 40,
    tone: "green",
  },
  {
    key: "orders",
    title: "Sales Orders",
    shortTitle: "Sales Orders",
    weightage: 20,
    tone: "orange",
  },
];

const normalizeSalesName = (name = "") =>
  String(name).toLowerCase().trim().replace(/\s+/g, " ");

const isSalesMisUser = (item) =>
  SALES_MIS_USERS.includes(normalizeSalesName(item?.name));

const DashboardHome = () => {
  const [data, setData] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [misScoring, setMisScoring] = useState({
  summary: {},
  businessInsight: null,
  salesPersonScores: [],
});

  const [notifications, setNotifications] = useState(null);
const [showNotifications, setShowNotifications] = useState(false);
const [loading, setLoading] = useState(true);

/* MIS tab is shared between desktop and PWA */

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
    summary: {},
    businessInsight: null,
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

  // const getWeeklyScore = (item) => {
  //   const currentWeek = getFrontendCurrentWeek(item);
  //   return Number(currentWeek?.weekScore || 0);
  // };

  const getWeekLabel = (item) => {
    return item?.currentWeek?.label || "Current Week";
  };

  const getMisChartData = (items = []) => {
  return items
    .map((item) => {
      const currentWeek =
        getFrontendCurrentWeek(item);

      return {
        ...item,

        name:
          item?.name ||
          "Unknown",

        weeklyScore:
          Number(
            currentWeek?.weekScore ||
              0
          ),

        monthlyScoreValue:
          Number(
            item?.monthlyScore ??
              item?.score ??
              0
          ),

        currentWeekLabel:
          currentWeek?.label ||
          "Current Week",

        weeklyOrders:
          Number(
            currentWeek?.approvedOrders ||
              0
          ),

        weeklySalesValue:
          Number(
            currentWeek
              ?.approvedSalesValue ||
              0
          ),

        weeklyEnquiries:
          Number(
            currentWeek?.enquiries ||
              0
          ),

        weeklyVisits:
          Number(
            currentWeek?.visits ||
              0
          ),
      };
    })
    .sort(
      (a, b) =>
        Number(
          b.weeklyScore || 0
        ) -
        Number(
          a.weeklyScore || 0
        )
    );
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

  const misChartData = (misScoring?.salesPersonScores || []).filter(isSalesMisUser);
const weeklyMisChartData = getMisChartData(misChartData);

const sortedSalesUsers = [...misChartData].sort((a, b) => {
  if (Number(b.monthlyScore || 0) !== Number(a.monthlyScore || 0)) {
    return Number(b.monthlyScore || 0) - Number(a.monthlyScore || 0);
  }

  if (Number(b.approvedOrders || 0) !== Number(a.approvedOrders || 0)) {
    return Number(b.approvedOrders || 0) - Number(a.approvedOrders || 0);
  }

  return Number(b.approvedSalesValue || 0) - Number(a.approvedSalesValue || 0);
});

const topPerformer = sortedSalesUsers[0] || null;
const worstPerformer =
  sortedSalesUsers.length > 1 ? sortedSalesUsers[sortedSalesUsers.length - 1] : null;

const orderWonChartData = [...misChartData]
  .map((item) => ({
    name: item.name || "Unknown",
    salesPersonId: item.salesPersonId,
    approvedOrders: Number(item.approvedOrders || 0),
  }))
  .sort((a, b) => b.approvedOrders - a.approvedOrders);


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
            <MobileKpi
  title="Top Performer"
  value={topPerformer?.name || "No data"}
  icon="🏆"
  onClick={() =>
    topPerformer?.salesPersonId &&
    openSalesOrders({
      salesPersonId: topPerformer.salesPersonId,
      salesPersonName: topPerformer.name,
    })
  }
/>
<MobileKpi
  title="Needs Focus"
  value={worstPerformer?.name || "No data"}
  icon="📌"
  onClick={() =>
    worstPerformer?.salesPersonId &&
    openSalesOrders({
      salesPersonId: worstPerformer.salesPersonId,
      salesPersonName: worstPerformer.name,
    })
  }
/>
</div>

<MobileSection title="Orders Won by Salesperson">
  {!orderWonChartData.length ? (
    <p className="ios-empty">
      No order won data available
    </p>
  ) : (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <BarChart
        data={orderWonChartData}
        margin={{
          top: 15,
          right: 15,
          left: 0,
          bottom: 30,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          opacity={0.15}
        />

        <XAxis
          dataKey="name"
          interval={0}
          tick={{
            fontSize: 10,
            fontWeight: 700,
          }}
        />

        <YAxis
          allowDecimals={false}
        />

        <Tooltip
          formatter={(value) => [
            `${value} order(s)`,
            "Orders Won",
          ]}
        />

        <Bar
          dataKey="approvedOrders"
          radius={[10, 10, 0, 0]}
          label={{
            position: "top",
            fontWeight: 700,
            fontSize: 11,
            fill: "#111827",
          }}
        >
          {orderWonChartData.map(
            (entry, index) => (
              <Cell
                key={
                  entry.salesPersonId ||
                  index
                }
                fill={
                  COLORS[
                    index %
                      COLORS.length
                  ]
                }
              />
            )
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )}
</MobileSection>

{/* =================================================
    MOBILE WEEKLY MIS COMPARISON
================================================= */}

<MobileSection title="Weekly MIS Score Comparison">
  {!weeklyMisChartData.length ? (
    <p className="ios-empty">
      No weekly MIS data available
    </p>
  ) : (
    <>
      <p className="ios-weekly-mis-subtitle">
        Team-wide current-week performance
      </p>

      <ResponsiveContainer
        width="100%"
        height={Math.max(
          300,
          weeklyMisChartData.length *
            52
        )}
      >
        <BarChart
          data={weeklyMisChartData}
          layout="vertical"
          margin={{
            top: 10,
            right: 45,
            left: 5,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.15}
          />

          <XAxis
            type="number"
            domain={[0, 100]}
            allowDecimals={false}
            tick={{
              fontSize: 10,
            }}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={88}
            interval={0}
            tick={{
              fontSize: 10,
              fontWeight: 800,
            }}
          />

          <Tooltip
            formatter={(
              value,
              name,
              props
            ) => {
              if (
                name ===
                "weeklyScore"
              ) {
                return [
                  `${Number(
                    value || 0
                  )}/100`,
                  `${
                    props?.payload
                      ?.currentWeekLabel ||
                    "Current Week"
                  } Score`,
                ];
              }

              return [
                value,
                name,
              ];
            }}
            labelFormatter={(
              label
            ) =>
              `Sales Person: ${label}`
            }
          />

          <Bar
            dataKey="weeklyScore"
            radius={[
              0,
              10,
              10,
              0,
            ]}
            label={{
              position: "right",
              formatter: (
                value
              ) =>
                `${Number(
                  value || 0
                )}`,
              fontSize: 10,
              fontWeight: 800,
              fill: "#334155",
            }}
            onClick={(entry) =>
              openEnquiries({
                salesPersonId:
                  entry
                    ?.salesPersonId,

                salesPersonName:
                  entry?.name,

                sourceType:
                  "weeklyMis",
              })
            }
          >
            {weeklyMisChartData.map(
              (
                entry,
                index
              ) => (
                <Cell
                  key={
                    entry
                      .salesPersonId ||
                    index
                  }
                  fill={getMisBarColor(
                    entry
                      .weeklyScore
                  )}
                  className="drill-chart-cell"
                />
              )
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  )}
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
            <Cell
              key={entry.salesPersonId || index}
              fill={COLORS[index % COLORS.length]}
              className="drill-chart-cell"
            />
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
  <div className="ios-mis-weightage-summary">
    <div className="ios-mis-weightage-summary-head">
      <div>
        <span>MIS WEIGHTAGE</span>
        <strong>Scoring Formula</strong>
      </div>

      <b>100%</b>
    </div>

    <div className="ios-mis-weightage-summary-grid">
      {MIS_WEIGHTAGE_RULES.map((rule) => (
        <div
          key={rule.key}
          className={`ios-mis-weightage-summary-item ${rule.tone}`}
        >
          <span>{rule.shortTitle}</span>
          <strong>{rule.weightage}%</strong>
        </div>
      ))}
    </div>
  </div>

  <div
    className="ios-total-pill"
  >
    Total Leads: {misScoring?.totalLeads || 0}
  </div>

  {!misChartData.length ? (
    <p className="ios-empty">
      No MIS scoring data available
    </p>
  ) : (
    misChartData.map((item, index) => {
      const monthlyScore = getMonthlyScore(item);
      const currentWeek = getFrontendCurrentWeek(item);
      const weekLabel =
        currentWeek?.label || getWeekLabel(item);
      const weeklyScore = Number(
        currentWeek?.weekScore || 0
      );
      const scoreClass = getScoreClass(monthlyScore);

      return (
        <div
          key={item.salesPersonId || index}
          className={`ios-score-card ${scoreClass}`}
        >
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
            <div
              style={{
                width: `${Math.min(monthlyScore, 100)}%`,
                background: getMisBarColor(monthlyScore),
              }}
            />
          </div>

          <div className="ios-score-stats">
            <MiniStat
              label="Enq"
              value={item.totalEnquiries || 0}
              onClick={() =>
                openEnquiries({
                  salesPersonId: item.salesPersonId,
                })
              }
            />

            <MiniStat
              label="Won"
              value={item.wonEnquiries || 0}
              onClick={() =>
                openEnquiries({
                  status: "won",
                  salesPersonId: item.salesPersonId,
                })
              }
            />

            <MiniStat
              label="Orders"
              value={item.approvedOrders || 0}
              onClick={() =>
                openSalesOrders({
                  salesPersonId: item.salesPersonId,
                })
              }
            />

            <MiniStat
              label="Visits"
              value={item.visitsDone || 0}
              onClick={() =>
                drillTo("coldCall", {
                  activityType: "visit",
                  salesPersonId: item.salesPersonId,
                })
              }
            />
          </div>

          <div className="ios-mis-month-card">
            <div className="ios-mis-month-head">
              <span>Monthly Target</span>

              <b>
                {formatCurrency(
                  item?.target?.monthly?.salesValue || 0
                )}
              </b>
            </div>

            <div className="ios-mis-month-grid">
              <MisMetric
                label="Sales Done"
                value={formatCurrency(
                  item?.approvedSalesValue || 0
                )}
                onClick={() =>
                  openSalesOrders({
                    salesPersonId: item.salesPersonId,
                  })
                }
              />

              <MisMetric
                label="Enq Done"
                value={item?.totalEnquiries || 0}
                onClick={() =>
                  openEnquiries({
                    salesPersonId: item.salesPersonId,
                  })
                }
              />

              <MisMetric
                label="Visit Done"
                value={item?.visitsDone || 0}
                onClick={() =>
                  drillTo("attendance", {
                    type: "visits",
                    salesPersonId: item.salesPersonId,
                  })
                }
              />
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
              />
            </div>

            <div className="ios-mis-week-grid">
              <MiniStat
                label="Sales Done"
                value={formatCurrency(
                  currentWeek?.approvedSalesValue || 0
                )}
                onClick={() =>
                  openSalesOrders({
                    salesPersonId: item.salesPersonId,
                    weekNo: currentWeek?.weekNo,
                  })
                }
              />

              <MiniStat
                label="Enq Done"
                value={currentWeek?.enquiries || 0}
                onClick={() =>
                  openEnquiries({
                    salesPersonId: item.salesPersonId,
                    weekNo: currentWeek?.weekNo,
                  })
                }
              />

              <MiniStat
                label="Visit Done"
                value={currentWeek?.visits || 0}
                onClick={() =>
                  drillTo("coldCall", {
                    activityType: "visit",
                    salesPersonId: item.salesPersonId,
                    weekNo: currentWeek?.weekNo,
                  })
                }
              />
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

          <PerformerCard
  title="Top Performer"
  name={topPerformer?.name || "No data"}
  desc={
    topPerformer
      ? `${topPerformer.approvedOrders || 0} orders · ${formatCurrency(
          topPerformer.approvedSalesValue || 0
        )} · ${topPerformer.monthlyScore || 0}/100`
      : "No sales data available"
  }
  className="top-performer-card"
  onClick={() =>
    topPerformer?.salesPersonId &&
    openSalesOrders({
      salesPersonId: topPerformer.salesPersonId,
      salesPersonName: topPerformer.name,
    })
  }
/>

<PerformerCard
  title="Needs Focus"
  name={worstPerformer?.name || "No data"}
  desc={
    worstPerformer
      ? `${worstPerformer.approvedOrders || 0} orders · ${formatCurrency(
          worstPerformer.approvedSalesValue || 0
        )} · ${worstPerformer.monthlyScore || 0}/100`
      : "No sales data available"
  }
  className="focus-performer-card"
  onClick={() =>
    worstPerformer?.salesPersonId &&
    openSalesOrders({
      salesPersonId: worstPerformer.salesPersonId,
      salesPersonName: worstPerformer.name,
    })
  }
/>
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
  <h3>Total Orders Won by Salesperson</h3>

  {!orderWonChartData.length ? (
    <p className="cashflow-empty">No order won data available</p>
  ) : (
   <ResponsiveContainer width="100%" height={340}>
  <BarChart
    data={orderWonChartData}
    margin={{
      top: 35,
      right: 20,
      left: 0,
      bottom: 55,
    }}
  >
    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />

    <XAxis
      dataKey="name"
      interval={0}
      angle={-18}
      textAnchor="end"
      height={55}
      tick={{
        fontSize: 12,
        fontWeight: 700,
      }}
    />

    <YAxis allowDecimals={false} />

    <Tooltip
      formatter={(value) => [`${value} Orders`, "Orders Won"]}
    />

    <Bar
      dataKey="approvedOrders"
      radius={[12,12,0,0]}
      label={{
        position: "top",
        fontSize: 13,
        fontWeight: 700,
        fill: "#111827",
      }}
      onClick={(entry)=>
        openSalesOrders({
          salesPersonId:entry?.salesPersonId,
          salesPersonName:entry?.name,
        })
      }
    >
      {orderWonChartData.map((entry,index)=>(
        <Cell
          key={entry.salesPersonId || index}
          fill={COLORS[index % COLORS.length]}
        />
      ))}
    </Bar>

  </BarChart>
</ResponsiveContainer>
  )}
</div>
        </div>

        <div className="chart-card mis-card">
  <div className="mis-header">
    <div>
      <span className="mis-header-eyebrow">
        PERFORMANCE INTELLIGENCE
      </span>

      <h3>MIS Scoring Overview</h3>

      <p>
        Monthly performance, weekly targets and transparent scoring rules
      </p>
    </div>

    <button
      type="button"
      className="mis-total-pill drill-pill"
      onClick={() => openSalesOrders({ view: "ordersWon" })}
    >
      Orders Won: {misScoring?.summary?.totalMonthlyOrdersWon || 0}
    </button>
  </div>

 <div className="mis-weightage-summary">
  <div className="mis-weightage-summary-title">
    <span>MIS WEIGHTAGE</span>
    <strong>Performance Scoring Formula</strong>
  </div>

  <div className="mis-weightage-summary-items">
    {MIS_WEIGHTAGE_RULES.map((rule) => (
      <div
        key={rule.key}
        className={`mis-weightage-summary-item ${rule.tone}`}
      >
        <span>{rule.shortTitle}</span>
        <strong>{rule.weightage}%</strong>
      </div>
    ))}
  </div>
</div>

  {!misChartData.length ? (
  <div className="cashflow-empty">
    No MIS scoring data available
  </div>
) : (
  <>
    <div className="mis-employee-grid mis-employee-grid-premium">
      {misChartData.map((item, index) => {
        const monthlyScore = getMonthlyScore(item);
        const currentWeek = getFrontendCurrentWeek(item);
        const weekLabel =
          currentWeek?.label || getWeekLabel(item);
        const weeklyScore = Number(
          currentWeek?.weekScore || 0
        );
        const scoreClass = getScoreClass(monthlyScore);
        const monthlyTarget = item?.target?.monthly || {};
        

        return (
          <div
            key={item.salesPersonId || index}
            className={`mis-employee-card ${scoreClass}`}
          >
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
                <span className="mis-rank">
                  #{index + 1}
                </span>

                <h4>{item.name}</h4>
              </button>

              <strong>{monthlyScore}/100</strong>
            </div>

            <p className="mis-monthly-label">
              Monthly MIS Score
            </p>

            <div className="mis-progress">
              <span
                style={{
                  width: `${Math.min(monthlyScore, 100)}%`,
                }}
              />
            </div>

            <div className="mis-employee-stats">
              <MisStat
                value={item.totalEnquiries || 0}
                label="Enquiries"
                onClick={() =>
                  openEnquiries({
                    salesPersonId: item.salesPersonId,
                  })
                }
              />

              <MisStat
                value={item.wonEnquiries || 0}
                label="Won"
                onClick={() =>
                  openEnquiries({
                    status: "won",
                    salesPersonId: item.salesPersonId,
                  })
                }
              />

              <MisStat
                value={item.approvedOrders || 0}
                label="Orders"
                onClick={() =>
                  openSalesOrders({
                    salesPersonId: item.salesPersonId,
                  })
                }
              />

              <MisStat
                value={item.visitsDone || 0}
                label="Visits"
                onClick={() =>
                  drillTo("attendance", {
                    type: "visits",
                    salesPersonId: item.salesPersonId,
                  })
                }
              />
            </div>

            <div className="mis-month-target-box">
              <div className="mis-target-title">
                <span>Monthly Target</span>
              </div>

              <div className="mis-target-grid mis-target-grid-two-column">
  <div>
    <span>Sales Target</span>
    <b>
      {formatCurrency(
        monthlyTarget.salesValue || 0
      )}
    </b>
  </div>

  <MisMetric
    label="Sales Done"
    value={formatCurrency(
      item.approvedSalesValue || 0
    )}
    onClick={() =>
      openSalesOrders({
        salesPersonId: item.salesPersonId,
      })
    }
  />

  <div>
    <span>Enquiry Target</span>
    <b>{monthlyTarget.enquiries || 0}</b>
  </div>

  <MisMetric
    label="Enquiry Done"
    value={item.totalEnquiries || 0}
    onClick={() =>
      openEnquiries({
        salesPersonId: item.salesPersonId,
      })
    }
  />

  <div>
    <span>Visit Target</span>
    <b>{monthlyTarget.visits || 0}</b>
  </div>

  <MisMetric
    label="Visit Done"
    value={item.visitsDone || 0}
    onClick={() =>
      drillTo("attendance", {
        type: "visits",
        salesPersonId: item.salesPersonId,
      })
    }
  />
</div>
            </div>

            <div className="mis-week-premium">
              <div className="mis-week-title">
                <div>
                  <span>
                    {currentWeek?.label || weekLabel}
                  </span>

                  <strong>
                    {Number(
                      currentWeek?.weekScore ||
                        weeklyScore ||
                        0
                    )}
                    /100
                  </strong>
                </div>

                <b>Weekly Score</b>
              </div>

              <div className="mis-week-progress">
                <span
                  style={{
                    width: `${Math.min(
                      Number(
                        currentWeek?.weekScore ||
                          weeklyScore ||
                          0
                      ),
                      100
                    )}%`,
                    background: getMisBarColor(
                      Number(
                        currentWeek?.weekScore ||
                          weeklyScore ||
                          0
                      )
                    ),
                  }}
                />
              </div>

             <div className="mis-week-target-grid mis-week-target-grid-two-column">
  <div>
    <span>Sales Target</span>
    <b>
      {formatCurrency(
        currentWeek?.targetWithCarryForward
          ?.salesValue || 0
      )}
    </b>
  </div>

  <MisMetric
    label="Sales Done"
    value={formatCurrency(
      currentWeek?.approvedSalesValue || 0
    )}
    onClick={() =>
      openSalesOrders({
        salesPersonId: item.salesPersonId,
        weekNo: currentWeek?.weekNo,
      })
    }
  />

  <div>
    <span>Enq Target</span>
    <b>
      {Math.ceil(
        currentWeek?.targetWithCarryForward
          ?.enquiries || 0
      )}
    </b>
  </div>

  <MisMetric
    label="Enq Done"
    value={currentWeek?.enquiries || 0}
    onClick={() =>
      openEnquiries({
        salesPersonId: item.salesPersonId,
        weekNo: currentWeek?.weekNo,
      })
    }
  />

  <div>
    <span>Visit Target</span>
    <b>
      {Math.ceil(
        currentWeek?.targetWithCarryForward
          ?.visits || 0
      )}
    </b>
  </div>

  <MisMetric
    label="Visit Done"
    value={currentWeek?.visits || 0}
    onClick={() =>
      drillTo("attendance", {
        type: "visits",
        salesPersonId: item.salesPersonId,
        weekNo: currentWeek?.weekNo,
      })
    }
  />
</div>
            </div>
          </div>
        );
      })}
    </div>

    <div className="mis-chart-compact">
      <div className="mis-weekly-chart-head">
        <div>
          <span>TEAM COMPETITION</span>

          <h4>
            Salesperson Weekly MIS Score Comparison
          </h4>

          <p>
            Current-week score for every sales employee
          </p>
        </div>
      </div>

      {!weeklyMisChartData.length ? (
        <div className="cashflow-empty">
          No weekly MIS data available
        </div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(
            300,
            weeklyMisChartData.length * 55
          )}
        >
          <BarChart
            data={weeklyMisChartData}
            layout="vertical"
            margin={{
              top: 18,
              right: 55,
              left: 35,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.15}
            />

            <XAxis
              type="number"
              domain={[0, 100]}
              allowDecimals={false}
              tick={{
                fontSize: 12,
              }}
            />

            <YAxis
              type="category"
              dataKey="name"
              width={120}
              interval={0}
              tick={{
                fontSize: 12,
                fontWeight: 700,
              }}
            />

            <Tooltip
              formatter={(value, name, props) => {
                if (name === "weeklyScore") {
                  return [
                    `${Number(value || 0)}/100`,
                    `${
                      props?.payload?.currentWeekLabel ||
                      "Current Week"
                    } MIS Score`,
                  ];
                }

                return [value, name];
              }}
              labelFormatter={(label) =>
                `Sales Person: ${label}`
              }
            />

            <Bar
              dataKey="weeklyScore"
              radius={[0, 12, 12, 0]}
              label={{
                position: "right",
                formatter: (value) =>
                  `${Number(value || 0)}/100`,
                fontSize: 11,
                fontWeight: 800,
                fill: "#334155",
              }}
              onClick={(entry) =>
                openEnquiries({
                  salesPersonId: entry?.salesPersonId,
                  salesPersonName: entry?.name,
                  sourceType: "weeklyMis",
                })
              }
            >
              {weeklyMisChartData.map(
                (entry, index) => (
                  <Cell
                    key={
                      entry.salesPersonId || index
                    }
                    fill={getMisBarColor(
                      entry.weeklyScore
                    )}
                    className="drill-chart-cell"
                  />
                )
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
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

function PerformerCard({ title, name, desc, className, onClick }) {
  return (
    <button type="button" className={`performer-card ${className}`} onClick={onClick}>
      <span>{title}</span>
      <strong>{name}</strong>
      <p>{desc}</p>
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

// function MobileInsight({ label, title, desc, tone, onClick }) {
//   return (
//     <button type="button" className={`ios-insight-card ${tone} drill-card`} onClick={onClick}>
//       <span>{label}</span>
//       <strong>{title}</strong>
//       <p>{desc}</p>
//     </button>
//   );
// }

// function InsightBox({ tone, label, title, desc, onClick }) {
//   return (
//     <button type="button" className={`insight-box ${tone} drill-card`} onClick={onClick}>
//       <span>{label}</span>
//       <h4>{title}</h4>
//       <p>{desc}</p>
//     </button>
//   );
// }

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