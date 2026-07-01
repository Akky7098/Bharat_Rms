import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Calendar,
  Download,
  RefreshCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./MtcPage.css";
import { getMtcCertificates } from "../services/mtcService";
import MtcForm from "./MtcForm";

const API_ORIGIN = "https://bharatspecialsteels.bharatspecialsteels.com";

function MtcPage() {
  const [mtcList, setMtcList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPwaFilters, setShowPwaFilters] = useState(false);

  const [filters, setFilters] = useState({
    companyName: "",
    fromDate: "",
    toDate: "",
  });

  useLayoutEffect(() => {
  document.body.classList.add("mtc-pwa-page");

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector(".main");
  if (main) main.scrollTop = 0;

  return () => {
    document.body.classList.remove("mtc-pwa-page");
  };
}, []);

  const fetchMtcList = async () => {
    try {
      setLoading(true);
      const response = await getMtcCertificates(filters);
      setMtcList(response?.data || []);
    } catch (error) {
      console.log("MTC LIST ERROR =>", error);
      setMtcList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMtcList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshMtcList = async () => {
    try {
      setRefreshing(true);
      await fetchMtcList();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredList = useMemo(() => {
    return mtcList.filter((item) => {
      const company = String(
        item.messers || item.companyName || ""
      ).toLowerCase();
      const search = filters.companyName.toLowerCase();

      if (search && !company.includes(search)) return false;
      return true;
    });
  }, [mtcList, filters.companyName]);

  const totalCertificates = mtcList.length;

  const monthCertificates = useMemo(() => {
    const now = new Date();
    return mtcList.filter((item) => {
      if (!item.mtcDate) return false;
      const value = new Date(item.mtcDate);
      return (
        value.getMonth() === now.getMonth() &&
        value.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [mtcList]);

  const gradesCount = useMemo(() => {
    const grades = new Set(mtcList.map((item) => item.grade).filter(Boolean));
    return grades.size;
  }, [mtcList]);

  const pdfCount = mtcList.filter((item) => item.pdfUrl).length;

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      companyName: "",
      fromDate: "",
      toDate: "",
    });
  };

  const clearPwaFilters = () => {
    resetFilters();
    setShowPwaFilters(false);
  };

  const applyPwaFilters = async () => {
    setShowPwaFilters(false);
    await fetchMtcList();
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
    } else {
      window.location.href = "/dashboard#dashboard";
    }
  };

  const openPdf = (item) => {
    if (item?.pdfUrl) {
      window.open(`${API_ORIGIN}${item.pdfUrl}`, "_blank");
      return;
    }

    if (item?._id) {
      window.open(`${API_ORIGIN}/api/mtc/${item._id}/pdf`, "_blank");
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const renderPwaFilters = () => (
    <div className="ios-mtc-filter-overlay">
      <div className="ios-mtc-filter-card">
        <div className="ios-mtc-filter-head">
          <div>
            <h3>Filters</h3>
            <p>Filter MTC certificates</p>
          </div>

          <button
            type="button"
            className="ios-mtc-filter-close"
            onClick={() => setShowPwaFilters(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="ios-mtc-filter-grid">
          <div className="ios-mtc-field">
            <label>Company / Messers</label>
            <input
              type="text"
              name="companyName"
              placeholder="Search company..."
              value={filters.companyName}
              onChange={handleFilterChange}
            />
          </div>

          <div className="ios-mtc-date-grid">
            <div className="ios-mtc-field">
              <label>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="ios-mtc-field">
              <label>To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                min={filters.fromDate || ""}
                disabled={!filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="ios-mtc-filter-actions">
            <button type="button" onClick={clearPwaFilters}>
              Clear
            </button>

            <button type="button" onClick={applyPwaFilters}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (showCreate) {
    return (
      <div className="mtc-page">
        <MtcForm
          onBack={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchMtcList();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mtc-page">
      <div className="mtc-pwa-shell">
        <div className="ios-mtc-page">
          <div className="ios-mtc-header">
            <div className="ios-mtc-header-row">
              <button
                type="button"
                className="ios-mtc-back"
                onClick={goDashboardModules}
              >
                <span>‹</span>
              </button>

              <div className="ios-mtc-title">
                <h2>MTC</h2>
                <p>Material certificates</p>
              </div>

              <button
                type="button"
                className={`ios-mtc-refresh ${refreshing ? "spinning" : ""}`}
                onClick={refreshMtcList}
                disabled={refreshing || loading}
              >
                <RefreshCcw size={17} />
              </button>
            </div>

            <div className="ios-mtc-insight-card ios-mtc-insight-card-four">
              <PwaInsight label="Total MTC" value={totalCertificates} />
              <PwaInsight label="This Month" value={monthCertificates} />
              <PwaInsight label="Grades" value={gradesCount} />
              <PwaInsight label="PDF Ready" value={pdfCount} />
            </div>

            <button
              type="button"
              className="ios-mtc-new-btn"
              onClick={() => setShowCreate(true)}
            >
              + New MTC
            </button>
          </div>

          <div className="ios-mtc-content">
            <button
              type="button"
              className="ios-mtc-filter-open"
              onClick={() => setShowPwaFilters(true)}
            >
              <SlidersHorizontal size={15} />
              Filters
            </button>

            {showPwaFilters && renderPwaFilters()}

            {loading ? (
              <div className="ios-mtc-empty">Loading MTC certificates...</div>
            ) : filteredList.length === 0 ? (
              <div className="ios-mtc-empty">No MTC certificate found</div>
            ) : (
              filteredList.map((item) => (
                <div className="ios-mtc-card" key={item._id}>
                  <div className="ios-mtc-card-top">
                    <div>
                      <h4>{item.messers || item.companyName || "No company"}</h4>
                      <p>Order: {item.orderNo || "-"}</p>
                      <p>File: {item.fileNo || "-"}</p>
                    </div>

                    <span className="ios-mtc-status">
                      {item.mtcProvider || "gloria"}
                    </span>
                  </div>

                  <div className="ios-mtc-main-card">
                    <span>Certificate</span>
                    <strong>{item.grade || "-"}</strong>
                  </div>

                  <div className="ios-mtc-info-grid">
                    <PwaInfo label="Grade" value={item.grade || "-"} />
                    <PwaInfo label="Size" value={item.size || "-"} />
                    <PwaInfo label="Weight" value={item.weight || "-"} />
                    <PwaInfo label="Pcs" value={item.pcs || "-"} />
                    <PwaInfo label="Heat Lot" value={item.heatLotNo || "-"} />
                    <PwaInfo label="Date" value={formatDate(item.mtcDate)} />
                    <PwaInfo
                      label="Condition"
                      value={item.condition || "-"}
                      full
                    />
                  </div>

                  <button
                    type="button"
                    className="ios-mtc-pdf-btn"
                    onClick={() => openPdf(item)}
                  >
                    <Download size={16} />
                    View PDF
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mtc-desktop-page">
        <div className="mtc-header">
          <div>
            <span className="mtc-kicker">Material Test Certificate</span>
            <h1>MTC Certificates</h1>
            <p>Generate and manage provider-wise inspection certificates.</p>
          </div>

          <button
            type="button"
            className="mtc-create-btn"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} />
            Create MTC
          </button>
        </div>

        <div className="mtc-filter-card">
          <div className="mtc-filter-field">
            <label>Company / Messers</label>
            <div>
              <Search size={16} />
              <input
                type="text"
                name="companyName"
                placeholder="Search company"
                value={filters.companyName}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="mtc-filter-field">
            <label>From Date</label>
            <div>
              <Calendar size={16} />
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="mtc-filter-field">
            <label>To Date</label>
            <div>
              <Calendar size={16} />
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="mtc-filter-actions">
            <button type="button" onClick={fetchMtcList}>
              <Search size={16} />
              Filter
            </button>

            <button type="button" className="secondary" onClick={resetFilters}>
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>
        </div>

        <div className="mtc-desktop-section">
          <div className="mtc-table-card">
            <table>
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Company</th>
                  <th>Provider</th>
                  <th>Grade</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>PDF</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="mtc-empty">
                      Loading MTC certificates...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="mtc-empty">
                      No MTC certificate found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item._id}>
                      <td>{item.orderNo || "-"}</td>
                      <td>{item.messers || item.companyName || "-"}</td>
                      <td>{item.mtcProvider || "-"}</td>
                      <td>{item.grade || "-"}</td>
                      <td>{item.size || "-"}</td>
                      <td>{formatDate(item.mtcDate)}</td>
                      <td>
                        <button
                          type="button"
                          className="mtc-pdf-btn"
                          onClick={() => openPdf(item)}
                        >
                          <Download size={15} />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PwaInsight({ label, value }) {
  return (
    <div className="ios-mtc-insight-box">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Tap to view</small>
    </div>
  );
}

function PwaInfo({ label, value, full }) {
  return (
    <div className={`ios-mtc-info-box ${full ? "full" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default MtcPage;