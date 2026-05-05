import React, { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { getDashboardSummary } from "../services/dashboardService";
import "./DashboardHome.css";

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
 const [chartWidth, setChartWidth] = useState(
  window.innerWidth <= 480 ? window.innerWidth - 80 : 420
);

useEffect(() => {
  const handleResize = () => {
    setChartWidth(window.innerWidth <= 480 ? window.innerWidth - 80 : 420);
  };

  handleResize();
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const today = new Date();

  const [filters, setFilters] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

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

        const response = await getDashboardSummary(dateRange);
        setData(response.data);
      } catch (error) {
        console.log(error);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMonthYearChange = (e) => {
    const updated = {
      ...filters,
      [e.target.name]: e.target.value,
    };

    setFilters(updated);
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="dashboard-home">
      <div className="dashboard-topbar">
        <div>
          <h2>Welcome, {user?.name || "User"}</h2>
          <p>Business performance overview</p>
        </div>

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
      {/* TOP CARDS */}
      <div className="card-grid">

        <div className="card revenue">
          <h3>Total Revenue</h3>
          <p>₹ {data.totalRevenue.toLocaleString("en-IN")}</p>
        </div>

        <div className="card orders">
          <h3>Total Orders</h3>
          <p>{data.totalOrders}</p>
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

      </div>

      {/* SALES PERSON PERFORMANCE */}
      <div className="dashboard-row">
  <div className="chart-card pie-card">
    <h3>Sales Person Revenue Share</h3>

    <div className="pie-layout">
     <div className="pie-box">
  
   <PieChart width={chartWidth} height={260}>
  <Pie
    data={data.salesPersonRevenue}
    dataKey="revenue"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={85}
    label={({ percentage }) => `${percentage}%`}
  >
    {data.salesPersonRevenue.map((entry, index) => (
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
        {data.salesPersonRevenue.map((sp, index) => (
          <div key={sp.salesPersonId} className="legend-row">
            <span
              className="legend-dot"
              style={{ background: COLORS[index % COLORS.length] }}
            ></span>

            <div>
              <strong>{sp.name}</strong>
              <p>
                ₹ {sp.revenue.toLocaleString("en-IN")} · {sp.percentage}%
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
    </div>
  </div>
</div>

      {/* TOP GRADES */}
      <div className="chart-card">
        <h3>Top Grades</h3>

        {data.gradeWiseQuantity.map((g, i) => (
          <div key={i} className="grade-row">
            <span>{g.grade}</span>
            <span>{g.quantity} Kg</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default DashboardHome;