import { useEffect, useState } from "react";
import "./Dashboard.css";
import { LogOut } from "lucide-react";
import EnquiryList from "./EnquiryList";
import SalesOrderList from "./SalesOrderList";
import DashboardHome from "./DashboardHome";
import ColdCallList from "./ColdCallList";
import TimesheetPage from "./TimesheetPage";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const getInitialActive = () => {
    const hash = window.location.hash.replace("#", "");

    if (hash === "enquiry") return "sheet";
    if (hash === "sales-order") return "salesOrder";
    if (hash === "cold-call") return "coldCall";
    if (hash === "timesheet") return "timesheet";

    return "dashboard";
  };

  const [active, setActive] = useState(getInitialActive);

  useEffect(() => {
    const hashMap = {
      dashboard: "dashboard",
      sheet: "enquiry",
      salesOrder: "sales-order",
      coldCall: "cold-call",
      timesheet: "timesheet",
    };

    window.history.replaceState(null, "", `/dashboard#${hashMap[active]}`);
    localStorage.setItem("activeModule", active);
  }, [active]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeModule");
    window.location.href = "/";
  };

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "sheet", label: "Enquiry Sheet", icon: "📝" },
    { key: "salesOrder", label: "Sales Order", icon: "💼" },
    { key: "coldCall", label: "Cold Call / Visit", icon: "📞" },
    { key: "timesheet", label: "Timesheet", icon: "⏱️" },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="brand-box">
            <div className="brand-logo">
  <img src="/logo.png" alt="BSSPL Logo" />
</div>
            <div>
              <h2>Bharat Special</h2>
              <p>Steels RMS</p>
            </div>
          </div>

          <div className="user-box">
            <div className="user-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{user?.role || "Employee"}</span>
            </div>
          </div>

          <nav className="menu">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={active === item.key ? "active" : ""}
                onClick={() => setActive(item.key)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
  <button className="logout-btn" onClick={handleLogout}>
    <LogOut size={18} />
    <span>Logout</span>
  </button>
</div>
        </aside>

        <main className="main">
          {active === "dashboard" && <DashboardHome user={user} />}
          {active === "sheet" && <EnquiryList />}
          {active === "salesOrder" && <SalesOrderList />}
          {active === "coldCall" && <ColdCallList />}
          {active === "timesheet" && <TimesheetPage />}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;