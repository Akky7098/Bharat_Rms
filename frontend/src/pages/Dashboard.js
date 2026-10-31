import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import "./Dashboard.css";
import "./DashboardLauncher.css";
import MobilePageSearch from "../components/MobilePageSearch";
import { syncModuleHistory, returnToModuleLauncher } from "../utils/moduleNavigation";

import {
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard, CalendarCheck2, ClipboardList, ShoppingBag, Truck,
  ChartNoAxesCombined, PackageSearch, Timer, Wallet, PhoneCall,
  FolderOpen, FileBadge2, ListTodo, Headset, Files, ChevronRight,

} from "lucide-react";

import DashboardHome from "./DashboardHome";
import AttendancePage from "./Attendance/AttendancePage";
import EnquiryList from "./EnquiryList";
import SalesOrderList from "./SalesOrderList";
import DispatchPage from "./DispatchPage";
import TimesheetPage from "./TimesheetPage";
import ManagementOrderAnalysis from "./ManagementOrderAnalysis";
import ReceivablePage from "./ReceivablePage";
import ColdCallList from "./ColdCallList";
import DocumentPage from "./DocumentPage";
import PdfGeneratorPage from "../pages/pdfgeneration/PdfGeneration";

import BharatIntelligence from "../components/bharatAi/BharatIntelligence";
import NotificationBell from "../components/NotificationBell";

/*
 * GLOBAL ATTENDANCE LOCATION TRACKER
 *
 * IMPORTANT:
 *
 * This component renders nothing.
 *
 * It stays mounted for the entire authenticated Dashboard
 * session so location tracking does NOT depend on the
 * Attendance page being open.
 */
import GlobalAttendanceLocationTracker from "./Attendance/components/GlobalAttendanceLocationTracker";
import MtcPage from "./MtcPage";
import SupportPage from "./SupportPage";
import ITSupportPage from "./ITSupportPage";

import OrderTrackingPage from "./orderTracking/OrderTrackingPage";

import {
  disablePushNotifications,
} from "../services/pushNotificationService";

import "./ModulePremium.css";

const launcherIcons = {
  dashboard: LayoutDashboard, attendance: CalendarCheck2, sheet: ClipboardList,
  salesOrder: ShoppingBag, dispatch: Truck, managementAnalysis: ChartNoAxesCombined,
  orderTracking: PackageSearch, timesheet: Timer, receivables: Wallet,
  coldCall: PhoneCall, documents: FolderOpen, mtc: FileBadge2,
  support: ListTodo, itSupport: Headset, pdfGenerator: Files,
};

function Dashboard() {
  const [moduleSearch, setModuleSearch] = useState("");
  /* =========================================================
     USER
  ========================================================= */

  let user = {};

  try {
    user =
      JSON.parse(
        localStorage.getItem(
          "user"
        ) || "{}"
      );
 } catch {
  user = {};
}

/* =========================================================
   SUPER ADMIN

   Handles:
   super_admin
   super-admin
   super admin
========================================================= */

const normalizedUserRole =
  String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isSuperAdmin =
  normalizedUserRole ===
  "super_admin";

/* =========================================================
   INITIAL ACTIVE MODULE
========================================================= */

  const getInitialActive =
  useCallback(() => {
    const rawHash =
      window.location.hash.replace(
        "#",
        ""
      ) ||
      "dashboard";

      const hash =
        rawHash.split(
          "?"
        )[0];

      if (
        hash ===
        "dashboard"
      ) {
        return "dashboard";
      }

      if (
        hash ===
        "dashboard-home"
      ) {
        return "dashboardHome";
      }

      if (
        hash ===
        "attendance"
      ) {
        return "attendance";
      }

      if (
        hash ===
        "enquiry"
      ) {
        return "sheet";
      }

     if (
  hash ===
  "sales-order"
) {
  return "salesOrder";
}

/* =====================================================
   MANAGEMENT ANALYSIS
   SUPER ADMIN ONLY
===================================================== */

if (
  hash ===
  "management-analysis"
) {
  return isSuperAdmin
    ? "managementAnalysis"
    : "dashboard";
}

if (
  hash ===
  "pdf-generator"
) {
  return "pdfGenerator";
}

      if (
        hash ===
        "dispatch"
      ) {
        return "dispatch";
      }

      if (
        hash ===
        "order-tracking"
      ) {
        return "orderTracking";
      }

      if (
        hash ===
        "timesheet"
      ) {
        return "timesheet";
      }

      if (
        hash ===
        "receivables"
      ) {
        return "receivables";
      }

      if (
        hash ===
        "cold-call"
      ) {
        return "coldCall";
      }

      if (
        hash ===
        "documents"
      ) {
        return "documents";
      }

      if (
        hash ===
        "mtc"
      ) {
        return "mtc";
      }

      if (
        hash ===
        "it-support"
      ) {
        return "itSupport";
      }

      if (
        hash ===
        "support"
      ) {
        return "support";
      }

         return "dashboard";
  }, [isSuperAdmin]);

  /* =========================================================
     STATE
  ========================================================= */

  const [
    active,
    setActive,
  ] =
    useState(
      getInitialActive
    );

  const [
    modulePayload,
    setModulePayload,
  ] =
    useState(
      null
    );

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(
      false
    );

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] =
    useState(
      localStorage.getItem(
        "sidebarCollapsed"
      ) ===
        "true"
    );

  /* =========================================================
     MENU
  ========================================================= */

  const menuItems = [
    {
      key:
        "dashboard",

      label:
        "Dashboard",

      icon:
        "📊",

      desc:
        "Business overview",
    },

    {
      key:
        "attendance",

      label:
        "Attendance",

      icon:
        "🟢",

      desc:
        "Check-in & records",
    },

    {
      key:
        "sheet",

      label:
        "Enquiry",

      icon:
        "📝",

      desc:
        "Customer enquiries",
    },

    {
      key:
        "salesOrder",

      label:
        "Sales Order",

      icon:
        "💼",

      desc:
        "Orders & approvals",
    },

    {
  key:
    "dispatch",

  label:
    "Dispatch",

  icon:
    "🚚",

  desc:
    "Invoices & LR copies",
},

/* =====================================================
   SUPER ADMIN ONLY
===================================================== */

...(isSuperAdmin
  ? [
      {
        key:
          "managementAnalysis",

        label:
          "Management Analysis",

        icon:
          "📈",

        desc:
          "H.O., Steel Mill & grade insights",
      },
    ]
  : []),

{
  key:
    "orderTracking",

  label:
    "Order Tracking",

  icon:
    "📦",

  desc:
    "Factory status, chat & updates",
},

    {
      key:
        "timesheet",

      label:
        "Timesheet",

      icon:
        "⏱️",

      desc:
        "Daily work reports",
    },

    {
      key:
        "receivables",

      label:
        "Receivables",

      icon:
        "💰",

      desc:
        "Payment tracking",
    },

    {
      key:
        "coldCall",

      label:
        "Cold Call / Visit",

      icon:
        "📞",

      desc:
        "Sales activities",
    },

    {
      key:
        "documents",

      label:
        "Documents",

      icon:
        "📁",

      desc:
        "Company files",
    },

    {
      key:
        "mtc",

      label:
        "MTC",

      icon:
        "📄",

      desc:
        "Material certificates",
    },

    {
      key:
        "support",

      label:
        "Task&Delegation",

      icon:
        "🎫",

      desc:
        "Tasks & delegation",
    },

    {
      key:
        "itSupport",

      label:
        "IT Support",

      icon:
        "🛠️",

      desc:
        "FAQ & issue tickets",
    },

    {
  key:
    "pdfGenerator",

  label:
    "PDF Generator",

  icon:
    "📑",

  desc:
    "Generate business PDFs",
},
  ];

  /* =========================================================
     CURRENT MODULE META
  ========================================================= */

  const activeItem =
    active ===
    "dashboardHome"
      ? {
          label:
            "Dashboard",

          icon:
            "📊",
        }
      : menuItems.find(
          (
            item
          ) =>
            item.key ===
            active
        );

  /* =========================================================
     ACTIVE MODULE -> HASH
  ========================================================= */

  useEffect(
    () => {
      const hashMap = {
        dashboard:
          "dashboard",

        dashboardHome:
          "dashboard-home",

        attendance:
          "attendance",

        sheet:
          "enquiry",

        salesOrder:
          "sales-order",

          managementAnalysis:
  "management-analysis",

        orderTracking:
          "order-tracking",

        dispatch:
          "dispatch",

        timesheet:
          "timesheet",

        receivables:
          "receivables",

        coldCall:
          "cold-call",

        documents:
          "documents",

        mtc:
          "mtc",

        support:
          "support",

        itSupport:
          "it-support",
        pdfGenerator: "pdf-generator",
      };

      const targetHash =
        hashMap[
          active
        ] ||
        "dashboard";

      syncModuleHistory(targetHash);

      localStorage.setItem(
        "activeModule",
        active
      );
    },
    [
      active,
    ]
  );

  /* =========================================================
     SIDEBAR STATE
  ========================================================= */

  useEffect(
    () => {
      localStorage.setItem(
        "sidebarCollapsed",
        sidebarCollapsed
      );
    },
    [
      sidebarCollapsed,
    ]
  );

  /* =========================================================
     GLOBAL DASHBOARD MODULE OPENER
  ========================================================= */

  useEffect(
    () => {
      window.__openDashboardModule =
  (
    moduleKey,
    filters = {}
  ) => {

    if (
      moduleKey ===
        "managementAnalysis" &&
      !isSuperAdmin
    ) {
      return;
    }

    setModulePayload(
            {
              moduleKey,

              filters,

              openedAt:
                Date.now(),
            }
          );

          setActive(
            moduleKey
          );

          setMobileMenuOpen(
            false
          );
        };

      return () => {
        delete window.__openDashboardModule;
      };
    },
    [isSuperAdmin]

  );

  /* =========================================================
     HASH CHANGE
  ========================================================= */

 useEffect(
  () => {
    const handleHashChange =
      () => {
        setModulePayload(null);
        setActive(
          getInitialActive()
        );

        setMobileMenuOpen(
          false
        );
      };

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleHashChange
      );
    };
  },
  [getInitialActive]
);

  /* =========================================================
     DASHBOARD MODULES
  ========================================================= */

  const goDashboardModules = useCallback(() => {
    setModulePayload(null);
    setMobileMenuOpen(false);
    returnToModuleLauncher(setActive);
  }, []);

  useEffect(() => {
    window.__goDashboardHome = goDashboardModules;
    return () => { delete window.__goDashboardHome; };
  }, [goDashboardModules]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    () => {
      const confirmLogout =
        window.confirm(
          "Are you sure you want to logout?"
        );

      if (
        !confirmLogout
      ) {
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      /*
       * Clear login immediately.
       *
       * Do not wait for push unsubscribe or network.
       */
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "isLoggedIn"
      );

      localStorage.removeItem(
        "lastLoginTime"
      );

      localStorage.removeItem(
        "activeModule"
      );

      localStorage.removeItem(
        "sidebarCollapsed"
      );

      localStorage.removeItem(
        "notificationFocus"
      );

      /*
       * Clear attendance location cache.
       *
       * IMPORTANT:
       * Prevents the next employee who logs into the
       * same browser/device from inheriting the previous
       * user's checkpoint timestamp.
       */
      localStorage.removeItem(
        "attendanceLocationLastCheckpointAt"
      );

      sessionStorage.clear();

      /*
       * Push unsubscribe runs only in background.
       */
      if (token) {
        disablePushNotifications()
          .catch(
            (
              error
            ) => {
              console.log(
                "Push disable on logout failed:",
                error
                  ?.message ||
                  error
              );
            }
          );
      }

      window.location.replace(
        "/"
      );
    };

  /* =========================================================
     MENU CLICK
  ========================================================= */

  const handleMenuClick =
  (
    key
  ) => {

    /* =====================================================
       MANAGEMENT ANALYSIS SECURITY GUARD
    ===================================================== */

    if (
      key ===
        "managementAnalysis" &&
      !isSuperAdmin
    ) {
      setActive(
        "dashboard"
      );

      setMobileMenuOpen(
        false
      );

      return;
    }

    setModulePayload(
      null
    );

      setActive(
        key
      );

      setMobileMenuOpen(
        false
      );
    };

  /* =========================================================
     IOS MODULE CLICK
  ========================================================= */

  const handleIosModuleClick =
    (
      key
    ) => {
      if (
        key ===
        "dashboard"
      ) {
        setActive(
          "dashboardHome"
        );

        setMobileMenuOpen(
          false
        );

        return;
      }

      setActive(
        key
      );

      setMobileMenuOpen(
        false
      );
    };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className={
        active ===
        "dashboard"
          ? "dashboard ios-dashboard-screen"
          : `dashboard ${active === "salesOrder" ? "" : "module-premium"} pwa-module-${active}`
      }
    >
      {/* =====================================================
          GLOBAL ATTENDANCE LOCATION TRACKER

          IMPORTANT:

          This stays mounted for the entire logged-in
          Dashboard session.

          Employee does NOT need to keep Attendance open.

          It runs silently for user/admin.

          It renders no UI.

          Super Admin is excluded inside the tracker.
      ====================================================== */}

      <GlobalAttendanceLocationTracker />

{/* =====================================================
    MOBILE TOPBAR
====================================================== */}

<div className="mobile-topbar">
        <div className="mobile-brand">
          <div className="mobile-logo">
            <img
              src="/logo.png"
              alt="BSSPL Logo"
            />
          </div>

          <div>
            <strong>
              {activeItem
                ?.label ||
                "Dashboard"}
            </strong>

            <span>
              Bharat Special Steels RMS
            </span>
          </div>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() =>
            setMobileMenuOpen(
              true
            )
          }
          type="button"
        >
          <Menu
            size={
              22
            }
          />
        </button>
      </div>

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() =>
            setMobileMenuOpen(
              false
            )
          }
        />
      )}

      {/* =====================================================
          MOBILE MENU
      ====================================================== */}

      <div
        className={`mobile-menu-panel ${
          mobileMenuOpen
            ? "open"
            : ""
        }`}
      >
        <div className="mobile-menu-header">
          <div className="mobile-user">
            <div className="user-avatar">
              {(
                user?.name ||
                "U"
              )
                .charAt(
                  0
                )
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name ||
                  "User"}
              </strong>

              <span>
                {user?.role ||
                  "Employee"}
              </span>
            </div>
          </div>

          <button
            className="mobile-close-btn"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
            type="button"
          >
            <X
              size={
                20
              }
            />
          </button>
        </div>

        <nav className="mobile-menu-list">
          {menuItems.map(
            (
              item
            ) => (
              <button
                key={
                  item.key
                }
                className={
                  active ===
                    item.key ||
                  (
                    active ===
                      "dashboardHome" &&
                    item.key ===
                      "dashboard"
                  )
                    ? "active"
                    : ""
                }
                onClick={() =>
                  handleMenuClick(
                    item.key
                  )
                }
                type="button"
              >
                <span>
                  {
                    item.icon
                  }
                </span>

                {
                  item.label
                }
              </button>
            )
          )}
        </nav>

        <button
          className="mobile-logout-btn"
          onClick={
            handleLogout
          }
          type="button"
        >
          <LogOut
            size={
              18
            }
          />

          Logout
        </button>
      </div>

      {/* =====================================================
          DASHBOARD LAYOUT
      ====================================================== */}

      <div
        className={`dashboard-layout ${
          sidebarCollapsed
            ? "sidebar-collapsed"
            : ""
        }`}
      >
        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="sidebar">
          <div className="brand-box">
            <div className="brand-logo">
              <img
                src="/logo.png"
                alt="BSSPL Logo"
              />
            </div>

            {!sidebarCollapsed && (
              <div>
                <h2>
                  Bharat Special
                </h2>

                <p>
                  Steels RMS
                </p>
              </div>
            )}
          </div>

          {/* SIDEBAR COLLAPSE */}

          <button
            className="sidebar-collapse-btn"
            onClick={() =>
              setSidebarCollapsed(
                !sidebarCollapsed
              )
            }
            type="button"
            title={
              sidebarCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen
                size={
                  18
                }
              />
            ) : (
              <PanelLeftClose
                size={
                  18
                }
              />
            )}
          </button>

          {/* USER */}

          <div className="user-box">
            <div className="user-avatar">
              {(
                user?.name ||
                "U"
              )
                .charAt(
                  0
                )
                .toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div>
                <strong>
                  {user?.name ||
                    "User"}
                </strong>

                <span>
                  {user?.role ||
                    "Employee"}
                </span>
              </div>
            )}
          </div>

          {/* MENU */}

          <nav className="menu">
            {menuItems.map(
              (
                item
              ) => (
                <button
                  key={
                    item.key
                  }
                  className={
                    active ===
                      item.key ||
                    (
                      active ===
                        "dashboardHome" &&
                      item.key ===
                        "dashboard"
                    )
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    handleMenuClick(
                      item.key
                    )
                  }
                  title={
                    sidebarCollapsed
                      ? item.label
                      : ""
                  }
                  type="button"
                >
                  <span className="menu-icon">
                    {
                      item.icon
                    }
                  </span>

                  {!sidebarCollapsed && (
                    <span>
                      {
                        item.label
                      }
                    </span>
                  )}
                </button>
              )
            )}
          </nav>

          {/* FOOTER */}

          <div className="sidebar-footer">
            <button
              className="logout-btn"
              onClick={
                handleLogout
              }
              title={
                sidebarCollapsed
                  ? "Logout"
                  : ""
              }
              type="button"
            >
              <LogOut
                size={
                  18
                }
              />

              {!sidebarCollapsed && (
                <span>
                  Logout
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* ===================================================
    MAIN AREA
=================================================== */}

<div className="dashboard-main-area">

  {/* =================================================
      DESKTOP GLOBAL HEADER
      Bharat AI + Notifications
  ================================================= */}

  <header className="desktop-global-header">
    <div className="desktop-global-header-spacer" />

    <div className="desktop-global-actions">
<BharatIntelligence headerMode />     
 <NotificationBell />
    </div>
  </header>

  {/* =================================================
      SCROLLABLE PAGE CONTENT
  ================================================= */}

  <main className="main">

    {/* =================================================
        DASHBOARD MODULES
    ================================================= */}

    {active ===
      "dashboard" && (
            <>
              <div className="ios-dashboard-home rms-launcher">
                <div className="ios-dashboard-header">
                  <span className="launcher-header-art" aria-hidden="true"><span /></span>
                  <div className="ios-dashboard-top-row">
                    <div className="ios-dashboard-logo-box">
                      <img src="/logo.png" alt="Bharat Special Steels" />
                    </div>
                    <div className="ios-dashboard-header-actions">
                      <MobilePageSearch moduleKey="dashboard" value={moduleSearch} onChange={setModuleSearch} suggestions={menuItems.map(item => item.label)} label="Search modules" placeholder="Find a module…" />
                      <div className="ios-dashboard-notification"><NotificationBell /></div>
                      <button className="ios-dashboard-logout" onClick={handleLogout} type="button" aria-label="Log out" title="Log out"><LogOut size={17} strokeWidth={1.8} /></button>
                    </div>
                  </div>
                  <div className="launcher-greeting">
                    <p className="ios-welcome">Welcome back</p>
                    <div className="launcher-identity-row">
                      <h1>{user?.name || "Your workspace"}<span className="launcher-greeting-dot" aria-hidden="true">.</span></h1>
                      <div className="launcher-assistant"><BharatIntelligence headerMode /></div>
                    </div>
                    <p className="ios-role"><span className="launcher-role-dot" aria-hidden="true" />{(user?.role || "Employee").replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())}<span className="launcher-role-separator">/</span>Bharat RMS</p>
                  </div>
                </div>
                <div className="ios-dashboard-content">
                  <div className="launcher-section-heading"><div><span>EVERYTHING IN ONE PLACE</span><h2>Your modules</h2></div><span className="launcher-module-count">{menuItems.filter(item => `${item.label} ${item.desc || ''}`.toLowerCase().includes(moduleSearch.trim().toLowerCase())).length} apps</span></div>
                  <div className="ios-module-grid">
                    {menuItems.filter(item => `${item.label} ${item.desc || ''}`.toLowerCase().includes(moduleSearch.trim().toLowerCase())).map(
                      (
                        item
                      ) => (
                        <button
                          key={
                            item.key
                          }
                          className={`ios-module-card launcher-module-${item.key}`}
                          onClick={() =>
                            handleIosModuleClick(
                              item.key
                            )
                          }
                          type="button"
                        >
                          <span className="launcher-card-top"><span className="ios-module-icon">{React.createElement(launcherIcons[item.key] || Files, { size: 23, strokeWidth: 1.8 })}</span><ChevronRight className="launcher-card-chevron" size={16} aria-hidden="true" /></span>

                          <strong>
                            {
                              item.key === 'support' ? 'Tasks & Delegation' : item.label
                            }
                          </strong>

                          <small>
                            {
                              item.desc
                            }
                          </small>
                        </button>
                      )
                    )}
                  </div>
                  {moduleSearch && !menuItems.some(item => `${item.label} ${item.desc || ''}`.toLowerCase().includes(moduleSearch.trim().toLowerCase())) && <p className="launcher-empty">No modules found. Try another name.</p>}
                  <p className="launcher-footer">BHARAT SPECIAL STEELS<span>Your business. One workspace.</span></p>
                </div>
              </div>

              <div className="desktop-dashboard-home">
                <DashboardHome
                  user={
                    user
                  }
                />
              </div>
            </>
          )}

          {/* =================================================
              IOS DASHBOARD HOME
          ================================================= */}

          {active ===
            "dashboardHome" && (
            <div className="ios-dashboardhome-shell">
              <div className="ios-dashboardhome-fixed-header">
                <button
                  type="button"
                  className="ios-dashboardhome-back"
                  onClick={
                    goDashboardModules
                  }
                >
                  ‹
                </button>

                <div>
                  <h2>
                    Dashboard
                  </h2>

                  <p>
                    Business performance overview
                  </p>
                </div>
              </div>

              <div className="ios-dashboardhome-scroll">
                <DashboardHome
                  user={
                    user
                  }
                />
              </div>
            </div>
          )}

          {/* =================================================
              ATTENDANCE
          ================================================= */}

          {active ===
            "attendance" && (
            <AttendancePage
              goDashboardHome={
                goDashboardModules
              }
            />
          )}

          {/* =================================================
              ENQUIRY
          ================================================= */}

          {active ===
            "sheet" && (
            <EnquiryList
              dashboardFilters={
                modulePayload
                  ?.filters
              }
            />
          )}

          {/* =================================================
              SALES ORDER
          ================================================= */}

          {active ===
            "salesOrder" && (
            <SalesOrderList
              dashboardFilters={
                modulePayload
                  ?.filters
              }
            />
          )}

          {/* =================================================
              ORDER TRACKING
          ================================================= */}

          {active ===
            "orderTracking" && (
            <OrderTrackingPage onBack={goDashboardModules} />
          )}

          {/* =================================================
              DISPATCH
          ================================================= */}

          {active ===
            "dispatch" && (
            <DispatchPage />
          )}


          {active ===
  "managementAnalysis" &&
  isSuperAdmin && (
    <ManagementOrderAnalysis
      goDashboardHome={
        goDashboardModules
      }
    />
  )}

          {/* =================================================
              TIMESHEET
          ================================================= */}

          {active ===
            "timesheet" && (
            <TimesheetPage />
          )}

          {/* =================================================
              RECEIVABLES
          ================================================= */}

          {active ===
            "receivables" && (
            <ReceivablePage
              dashboardFilters={
                modulePayload
                  ?.filters
              }
            />
          )}

          {/* =================================================
              COLD CALL
          ================================================= */}

          {active ===
            "coldCall" && (
            <ColdCallList
              goDashboardHome={
                goDashboardModules
              }
              dashboardFilters={
                modulePayload
                  ?.filters
              }
            />
          )}

          {/* =================================================
              DOCUMENTS
          ================================================= */}

          {active ===
            "documents" && (
            <DocumentPage />
          )}

          {/* =================================================
              MTC
          ================================================= */}

          {active ===
            "mtc" && (
            <MtcPage />
          )}

          {/* =================================================
    PDF GENERATOR
================================================= */}

{active ===
  "pdfGenerator" && (
  <PdfGeneratorPage />
)}

          {/* =================================================
              SUPPORT
          ================================================= */}

          {active ===
            "support" && (
            <SupportPage />
          )}

          {/* =================================================
              IT SUPPORT
          ================================================= */}

          {active ===
            "itSupport" && (
            <ITSupportPage />
          )}


              </main>

    </div>
  </div>
</div>
);
}

export default Dashboard;