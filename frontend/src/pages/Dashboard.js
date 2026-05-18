import { useEffect, useState } from "react";
import "./Dashboard.css";
import { LogOut, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import EnquiryList from "./EnquiryList";
import SalesOrderList from "./SalesOrderList";
import DashboardHome from "./DashboardHome";
import ColdCallList from "./ColdCallList";
import TimesheetPage from "./TimesheetPage";
import DispatchPage from "./DispatchPage";
import DocumentPage from "./DocumentPage";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const getInitialActive = () => {
    const hash = window.location.hash.replace("#", "");

    if (hash === "documents") return "documents";
    if (hash === "enquiry") return "sheet";
    if (hash === "sales-order") return "salesOrder";
    if (hash === "cold-call") return "coldCall";
    if (hash === "timesheet") return "timesheet";
    if (hash === "dispatch") return "dispatch";

    return "dashboard";
  };

  const [active, setActive] = useState(getInitialActive);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );

  useEffect(() => {
    const hashMap = {
      dashboard: "dashboard",
      documents: "documents",
      sheet: "enquiry",
      salesOrder: "sales-order",
      coldCall: "cold-call",
      timesheet: "timesheet",
      dispatch: "dispatch",
    };

    window.history.replaceState(null, "", `/dashboard#${hashMap[active]}`);
    localStorage.setItem("activeModule", active);
  }, [active]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeModule");
    localStorage.removeItem("sidebarCollapsed");
    window.location.href = "/";
  };

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },

    { key: "documents", label: "Document Center", icon: "📁" },

    { key: "sheet", label: "Enquiry Sheet", icon: "📝" },

    { key: "salesOrder", label: "Sales Order", icon: "💼" },

    { key: "dispatch", label: "Dispatch", icon: "🚚" },

    { key: "coldCall", label: "Cold Call / Visit", icon: "📞" },

    { key: "timesheet", label: "Timesheet", icon: "⏱️" },
  ];

  const activeItem = menuItems.find((item) => item.key === active);

  const handleMenuClick = (key) => {
    setActive(key);
    setMobileMenuOpen(false);
  };

  return (
    <div className="dashboard">
      <div className="mobile-topbar">
        <div className="mobile-brand">
          <div className="mobile-logo">
            <img src="/logo.png" alt="BSSPL Logo" />
          </div>
          <div>
            <strong>{activeItem?.label || "Dashboard"}</strong>
            <span>Bharat Special Steels RMS</span>
          </div>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
          type="button"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`mobile-menu-panel ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <div className="mobile-user">
            <div className="user-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{user?.role || "Employee"}</span>
            </div>
          </div>

          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mobile-menu-list">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={active === item.key ? "active" : ""}
              onClick={() => handleMenuClick(item.key)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="mobile-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div
        className={`dashboard-layout ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <aside className="sidebar">
          <div className="brand-box">
            <div className="brand-logo">
              <img src="/logo.png" alt="BSSPL Logo" />
            </div>

            {!sidebarCollapsed && (
              <div>
                <h2>Bharat Special</h2>
                <p>Steels RMS</p>
              </div>
            )}
          </div>

          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>

          <div className="user-box">
            <div className="user-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div>
                <strong>{user?.name || "User"}</strong>
                <span>{user?.role || "Employee"}</span>
              </div>
            )}
          </div>

          <nav className="menu">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={active === item.key ? "active" : ""}
                onClick={() => setActive(item.key)}
                title={sidebarCollapsed ? item.label : ""}
                type="button"
              >
                <span className="menu-icon">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button
              className="logout-btn"
              onClick={handleLogout}
              title={sidebarCollapsed ? "Logout" : ""}
              type="button"
            >
              <LogOut size={18} />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main className="main">
          {active === "dashboard" && <DashboardHome user={user} />}

          {active === "documents" && <DocumentPage />}

          {active === "sheet" && <EnquiryList />}

          {active === "salesOrder" && <SalesOrderList />}

          {active === "dispatch" && <DispatchPage />}

          {active === "coldCall" && <ColdCallList />}

          {active === "timesheet" && <TimesheetPage />}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;