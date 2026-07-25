import { useEffect, useState } from "react";
import "./Dashboard.css";
import { LogOut, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import DashboardHome from "./DashboardHome";
import AttendancePage from "./AttendancePage";
import EnquiryList from "./EnquiryList";
import SalesOrderList from "./SalesOrderList";
import DispatchPage from "./DispatchPage";
import TimesheetPage from "./TimesheetPage";
import ReceivablePage from "./ReceivablePage";
import ColdCallList from "./ColdCallList";
import DocumentPage from "./DocumentPage";
import NotificationBell from "../components/NotificationBell";
import MtcPage from "./MtcPage";
import SupportPage from "./SupportPage";
import ITSupportPage from "./ITSupportPage";
import OrderTrackingPage from
  "./orderTracking/OrderTrackingPage";
import { disablePushNotifications } from "../services/pushNotificationService";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

    const getInitialActive = () => {
    const rawHash = window.location.hash.replace("#", "") || "dashboard";
    const hash = rawHash.split("?")[0];

    if (hash === "dashboard") return "dashboard";
    if (hash === "dashboard-home") return "dashboardHome";
    if (hash === "attendance") return "attendance";
    if (hash === "enquiry") return "sheet";
    if (hash === "sales-order") return "salesOrder";
    if (hash === "dispatch") return "dispatch";
    if (hash === "order-tracking") return "orderTracking";
    if (hash === "timesheet") return "timesheet";
    if (hash === "receivables") return "receivables";
    if (hash === "cold-call") return "coldCall";
    if (hash === "documents") return "documents";
    if (hash === "mtc") return "mtc";
    if (hash === "it-support") return "itSupport";
if (hash === "support") return "support";

    return "dashboard";
  };

    const [active, setActive] = useState(getInitialActive);
  const [modulePayload, setModulePayload] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "📊",
      desc: "Business overview",
    },
    {
      key: "attendance",
      label: "Attendance",
      icon: "🟢",
      desc: "Check-in & records",
    },
    {
      key: "sheet",
      label: "Enquiry",
      icon: "📝",
      desc: "Customer enquiries",
    },
    {
      key: "salesOrder",
      label: "Sales Order",
      icon: "💼",
      desc: "Orders & approvals",
    },
    {
      key: "dispatch",
      label: "Dispatch",
      icon: "🚚",
      desc: "Invoices & LR copies",
    },
    {
  key: "orderTracking",
  label: "Order Tracking",
  icon: "📦",
  desc: "Factory status, chat & updates",
},
    {
      key: "timesheet",
      label: "Timesheet",
      icon: "⏱️",
      desc: "Daily work reports",
    },
    {
      key: "receivables",
      label: "Receivables",
      icon: "💰",
      desc: "Payment tracking",
    },
    {
      key: "coldCall",
      label: "Cold Call / Visit",
      icon: "📞",
      desc: "Sales activities",
    },
    {
      key: "documents",
      label: "Documents",
      icon: "📁",
      desc: "Company files",
    },
    {
  key: "mtc",
  label: "MTC",
  icon: "📄",
  desc: "Material certificates",
},
{
  key: "support",
  label: "Task&Delegation",
  icon: "🎫",
  desc: "Tasks & delegation",
},
{
  key: "itSupport",
  label: "IT Support",
  icon: "🛠️",
  desc: "FAQ & issue tickets",
},
  ];

 

  const activeItem =
    active === "dashboardHome"
      ? { label: "Dashboard", icon: "📊" }
      : menuItems.find((item) => item.key === active);

  
useEffect(() => {
  const hashMap = {
    dashboard: "dashboard",
    dashboardHome: "dashboard-home",
    attendance: "attendance",
    sheet: "enquiry",
    salesOrder: "sales-order",
    orderTracking: "order-tracking",
    dispatch: "dispatch",
    timesheet: "timesheet",
    receivables: "receivables",
    coldCall: "cold-call",
    documents: "documents",
    mtc: "mtc",
    support: "support",
    itSupport: "it-support",
  };

  const targetHash = hashMap[active] || "dashboard";

  const currentRawHash = window.location.hash.replace("#", "");
  const currentModule = currentRawHash.split("?")[0];
  const currentQuery = currentRawHash.includes("?")
    ? `?${currentRawHash.split("?")[1]}`
    : "";

  const shouldKeepDashboardQuery =
    currentModule === targetHash && currentQuery.includes("source=dashboard");

  window.history.replaceState(
    null,
    "",
    `/dashboard#${targetHash}${shouldKeepDashboardQuery ? currentQuery : ""}`
  );

  localStorage.setItem("activeModule", active);
}, [active]);
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.__openDashboardModule = (moduleKey, filters = {}) => {
      setModulePayload({
        moduleKey,
        filters,
        openedAt: Date.now(),
      });

      setActive(moduleKey);
      setMobileMenuOpen(false);
    };

    return () => {
      delete window.__openDashboardModule;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setActive(getInitialActive());
      setMobileMenuOpen(false);
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

    const goDashboardModules = () => {
    setModulePayload(null);
    setActive("dashboard");
    setMobileMenuOpen(false);
  };

const handleLogout = () => {
  const confirmLogout = window.confirm("Are you sure you want to logout?");

  if (!confirmLogout) return;

  const token = localStorage.getItem("token");

  // Clear login immediately — do not wait for push/browser/network
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("lastLoginTime");
  localStorage.removeItem("activeModule");
  localStorage.removeItem("sidebarCollapsed");
  localStorage.removeItem("notificationFocus");

  sessionStorage.clear();

  // Push unsubscribe should run in background only
  if (token) {
    disablePushNotifications().catch((error) => {
      console.log("Push disable on logout failed:", error?.message || error);
    });
  }

  window.location.replace("/");
};

      const handleMenuClick = (key) => {
    setModulePayload(null);

    const hashMap = {
  dashboard: "dashboard",
  dashboardHome: "dashboard-home",
  attendance: "attendance",
  sheet: "enquiry",
  salesOrder: "sales-order",
  dispatch: "dispatch",
  orderTracking: "order-tracking",
  timesheet: "timesheet",
  receivables: "receivables",
  coldCall: "cold-call",
  documents: "documents",
  mtc: "mtc",
  support: "support",
  itSupport: "it-support",
};

    window.history.replaceState(
      null,
      "",
      `/dashboard#${hashMap[key] || "dashboard"}`
    );

    setActive(key);
    setMobileMenuOpen(false);
  };

  const handleIosModuleClick = (key) => {
    if (key === "dashboard") {
      setActive("dashboardHome");
      setMobileMenuOpen(false);
      return;
    }

    setActive(key);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className={
        active === "dashboard"
          ? "dashboard ios-dashboard-screen"
          : `dashboard pwa-module-${active}`
      }
    >
      <NotificationBell />
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
              className={
                active === item.key ||
                (active === "dashboardHome" && item.key === "dashboard")
                  ? "active"
                  : ""
              }
              onClick={() => handleMenuClick(item.key)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="mobile-logout-btn" onClick={handleLogout} type="button">
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
                className={
                  active === item.key ||
                  (active === "dashboardHome" && item.key === "dashboard")
                    ? "active"
                    : ""
                }
               onClick={() => handleMenuClick(item.key)}
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
          {active === "dashboard" && (
            <>
              <div className="ios-dashboard-home">
                <div className="ios-dashboard-header">
                  <div className="ios-dashboard-top-row">
                    <div className="ios-dashboard-logo-box">
                      <img src="/logo.png" alt="BSSPL Logo" />
                    </div>

                    <button
                      className="ios-dashboard-logout"
                      onClick={handleLogout}
                      type="button"
                    >
                      Logout
                    </button>
                  </div>

                  <p className="ios-welcome">Welcome back,</p>
                  <h1>{user?.name || "User"}</h1>
                  <p className="ios-role">
                    {user?.role || "Employee"} · Bharat RMS
                  </p>

                  <div className="ios-summary-card">
                    <div>
                      <span>Today’s Workspace</span>
                      <strong>Manage your steel business faster</strong>
                    </div>
                    <b>⚡</b>
                  </div>
                </div>

                <div className="ios-dashboard-content">
                  <h2>Modules</h2>

                  <div className="ios-module-grid">
                    {menuItems.map((item) => (
                      <button
                        key={item.key}
                        className="ios-module-card"
                        onClick={() => handleIosModuleClick(item.key)}
                        type="button"
                      >
                        <span className="ios-module-icon">{item.icon}</span>
                        <strong>{item.label}</strong>
                        <small>{item.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="desktop-dashboard-home">
                <DashboardHome user={user} />
              </div>
            </>
          )}

          {active === "dashboardHome" && (
  <div className="ios-dashboardhome-shell">
    <div className="ios-dashboardhome-fixed-header">
      <button
        type="button"
        className="ios-dashboardhome-back"
        onClick={goDashboardModules}
      >
        ‹
      </button>

      <div>
        <h2>Dashboard</h2>
        <p>Business performance overview</p>
      </div>
    </div>

    <div className="ios-dashboardhome-scroll">
      <DashboardHome user={user} />
    </div>
  </div>
)}

          {active === "attendance" && (
            <AttendancePage goDashboardHome={goDashboardModules} />
          )}

                    {active === "sheet" && (
            <EnquiryList dashboardFilters={modulePayload?.filters} />
          )}

          {active === "salesOrder" && (
            <SalesOrderList dashboardFilters={modulePayload?.filters} />
          )}
           {active === "orderTracking" && (
  <OrderTrackingPage />
)}
          {active === "dispatch" && <DispatchPage />}

          {active === "timesheet" && <TimesheetPage />}

          {active === "receivables" && (
            <ReceivablePage dashboardFilters={modulePayload?.filters} />
          )}

          {active === "coldCall" && (
            <ColdCallList
              goDashboardHome={goDashboardModules}
              dashboardFilters={modulePayload?.filters}
            />
          )}

          {active === "documents" && <DocumentPage />}
          {active === "mtc" && <MtcPage />}
{active === "support" && <SupportPage />}
{active === "itSupport" && <ITSupportPage />}
        </main>
      </div>
    </div>
  );
}
export default Dashboard;