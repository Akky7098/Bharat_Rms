import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  Calendar,
  Download,
  RefreshCcw,
  SlidersHorizontal,
  X,
  Building2,
} from "lucide-react";

import "./MtcPage.css";

import {
  getMtcCertificates,
  getMtcProviders,
} from "../services/mtcService";

import MtcForm from "./MtcForm";


const API_ORIGIN =
  "https://bharatspecialsteels.bharatspecialsteels.com";

const EMPTY_FILTERS = {
  companyName: "",
  mtcProvider: "",
  fromDate: "",
  toDate: "",
};

const DEFAULT_PROVIDER_OPTIONS = [
  {
    value: "gloria",
    label: "Gloria",
  },
  {
    value: "bharat",
    label: "Bharat Special Steel",
  },
];

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (value, fallback = "-") => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
};

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const normalizeProvider = (provider) => {
  return String(provider || "")
    .trim()
    .toLowerCase();
};

const getProviderLabel = (
  provider,
  providerOptions = []
) => {
  const normalizedProvider =
    normalizeProvider(provider);

  if (!normalizedProvider) {
    return "Not specified";
  }

  const matchingProvider =
    providerOptions.find(
      (item) =>
        normalizeProvider(item.value) ===
        normalizedProvider
    );

  if (matchingProvider?.label) {
    return matchingProvider.label;
  }

  return normalizedProvider
    .split(/[_-]/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const getCompanyName = (item) => {
  return cleanText(
    firstValue(
      item?.messers,
      item?.customerName,
      item?.companyName
    ),
    "No company"
  );
};

const getOrderNumber = (item) => {
  return cleanText(
    firstValue(
      item?.orderNo,
      item?.salesOrderNo,
      item?.poNo,
      item?.poNumber
    )
  );
};

const getCertificateNumber = (item) => {
  return cleanText(
    firstValue(
      item?.tcNo,
      item?.certificateNo,
      item?.mtcNumber,
      item?.fileNo
    )
  );
};

const getCertificateDate = (item) => {
  return firstValue(
    item?.mtcDate,
    item?.issueDate,
    item?.createdAt
  );
};

const getPrimaryItem = (item) => {
  if (
    Array.isArray(item?.items) &&
    item.items.length > 0
  ) {
    return item.items[0] || {};
  }

  return {};
};

const getGrade = (item) => {
  return cleanText(
    firstValue(
      item?.grade,
      item?.purchaseSpecification
    )
  );
};

const getSize = (item) => {
  const primaryItem =
    getPrimaryItem(item);

  return cleanText(
    firstValue(
      item?.size,
      primaryItem?.size,
      primaryItem?.materialSize
    )
  );
};

const getWeight = (item) => {
  const primaryItem =
    getPrimaryItem(item);

  return cleanText(
    firstValue(
      item?.weight,
      item?.quantityInKgs,
      primaryItem?.quantityInKgs,
      primaryItem?.quantity,
      primaryItem?.weight
    )
  );
};

const getPieces = (item) => {
  const primaryItem =
    getPrimaryItem(item);

  return cleanText(
    firstValue(
      item?.pcs,
      primaryItem?.noOfPcs,
      primaryItem?.pcs,
      primaryItem?.quantityPcs
    )
  );
};

const getHeatNumber = (item) => {
  const primaryItem =
    getPrimaryItem(item);

  return cleanText(
    firstValue(
      item?.heatLotNo,
      item?.heatNo,
      primaryItem?.heatNo,
      primaryItem?.heatNumber
    )
  );
};

const getCondition = (item) => {
  return cleanText(
    firstValue(
      item?.condition,
      item?.manufacturingRoute,
      item?.product
    )
  );
};

const hasPdf = (item) => {
  return Boolean(
    item?.pdfUrl ||
      item?.pdf?.fileUrl ||
      item?.pdf?.filePath
  );
};

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return "-";
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function MtcPage() {
  const [mtcList, setMtcList] =
    useState([]);

  const [
    providerOptions,
    setProviderOptions,
  ] = useState(
    DEFAULT_PROVIDER_OPTIONS
  );

  const [loading, setLoading] =
    useState(false);

  const [
    providersLoading,
    setProvidersLoading,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    showPwaFilters,
    setShowPwaFilters,
  ] = useState(false);

  const [filters, setFilters] =
    useState(EMPTY_FILTERS);

  /* =======================================================
     PWA PAGE SCROLL MANAGEMENT
  ======================================================= */

  useLayoutEffect(() => {
    document.body.classList.add(
      "mtc-pwa-page"
    );

    window.scrollTo(0, 0);

    document.documentElement.scrollTop =
      0;

    document.body.scrollTop = 0;

    const main =
      document.querySelector(".main");

    if (main) {
      main.scrollTop = 0;
    }

    return () => {
      document.body.classList.remove(
        "mtc-pwa-page"
      );
    };
  }, []);

  /* =======================================================
     LOAD PROVIDERS
  ======================================================= */

  const fetchProviderOptions =
    useCallback(async () => {
      try {
        setProvidersLoading(true);

        const response =
          await getMtcProviders();

        const providers =
          Array.isArray(response?.data)
            ? response.data
            : [];

        const validProviders =
          providers
            .filter(
              (item) =>
                item?.value &&
                item?.label
            )
            .map((item) => ({
              value:
                normalizeProvider(
                  item.value
                ),
              label: cleanText(
                item.label,
                item.value
              ),
            }));

        if (validProviders.length > 0) {
          setProviderOptions(
            validProviders
          );
        }
      } catch (error) {
        console.log(
          "MTC PROVIDERS ERROR =>",
          error
        );

        /*
         * Keep fallback providers so the
         * page remains usable.
         */
        setProviderOptions(
          DEFAULT_PROVIDER_OPTIONS
        );
      } finally {
        setProvidersLoading(false);
      }
    }, []);

  /* =======================================================
     LOAD CERTIFICATES
  ======================================================= */

  const fetchMtcList = useCallback(
    async (
      appliedFilters = filters,
      options = {}
    ) => {
      const {
        showMainLoader = true,
      } = options;

      try {
        if (showMainLoader) {
          setLoading(true);
        }

        const response =
          await getMtcCertificates({
            companyName:
              appliedFilters.companyName ||
              "",

            mtcProvider:
              appliedFilters.mtcProvider ||
              "",

            fromDate:
              appliedFilters.fromDate ||
              "",

            toDate:
              appliedFilters.toDate ||
              "",

            limit: 200,
          });

        setMtcList(
          Array.isArray(response?.data)
            ? response.data
            : []
        );
      } catch (error) {
        console.log(
          "MTC LIST ERROR =>",
          error
        );

        setMtcList([]);
      } finally {
        if (showMainLoader) {
          setLoading(false);
        }
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchProviderOptions();
  }, [fetchProviderOptions]);

  useEffect(() => {
    fetchMtcList(
      EMPTY_FILTERS
    );

    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     FILTERED DISPLAY LIST
  ======================================================= */

  const filteredList = useMemo(() => {
    const searchText = String(
      filters.companyName || ""
    )
      .trim()
      .toLowerCase();

    const selectedProvider =
      normalizeProvider(
        filters.mtcProvider
      );

    return mtcList.filter((item) => {
      const searchableCompany = String(
        firstValue(
          item?.messers,
          item?.customerName,
          item?.companyName,
          item?.orderNo,
          item?.tcNo,
          item?.fileNo,
          item?.heatLotNo
        )
      ).toLowerCase();

      if (
        searchText &&
        !searchableCompany.includes(
          searchText
        )
      ) {
        return false;
      }

      if (
        selectedProvider &&
        normalizeProvider(
          item?.mtcProvider
        ) !== selectedProvider
      ) {
        return false;
      }

      return true;
    });
  }, [
    mtcList,
    filters.companyName,
    filters.mtcProvider,
  ]);

  /* =======================================================
     INSIGHT COUNTS
  ======================================================= */

  const totalCertificates =
    filteredList.length;

  const monthCertificates =
    useMemo(() => {
      const now = new Date();

      return filteredList.filter(
        (item) => {
          const rawDate =
            getCertificateDate(item);

          if (!rawDate) {
            return false;
          }

          const value =
            new Date(rawDate);

          if (
            Number.isNaN(
              value.getTime()
            )
          ) {
            return false;
          }

          return (
            value.getMonth() ===
              now.getMonth() &&
            value.getFullYear() ===
              now.getFullYear()
          );
        }
      ).length;
    }, [filteredList]);

  const gradesCount = useMemo(() => {
    const grades = new Set(
      filteredList
        .map((item) =>
          getGrade(item)
        )
        .filter(
          (grade) =>
            grade && grade !== "-"
        )
    );

    return grades.size;
  }, [filteredList]);

  const pdfCount = useMemo(() => {
    return filteredList.filter(
      (item) => hasPdf(item)
    ).length;
  }, [filteredList]);

  const activeFilterCount =
    useMemo(() => {
      return Object.values(filters).filter(
        (value) =>
          String(value || "").trim() !==
          ""
      ).length;
    }, [filters]);

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleFilterChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setFilters((previous) => {
      const nextFilters = {
        ...previous,
        [name]: value,
      };

      /*
       * Clear invalid To Date when From Date
       * is moved beyond it.
       */
      if (
        name === "fromDate" &&
        previous.toDate &&
        value &&
        previous.toDate < value
      ) {
        nextFilters.toDate = "";
      }

      return nextFilters;
    });
  };

  const applyDesktopFilters =
    async () => {
      await fetchMtcList(filters);
    };

  const applyPwaFilters = async () => {
    setShowPwaFilters(false);

    await fetchMtcList(filters);
  };

  const resetFilters = async () => {
    setFilters(EMPTY_FILTERS);

    await fetchMtcList(
      EMPTY_FILTERS
    );
  };

  const clearPwaFilters =
    async () => {
      setFilters(EMPTY_FILTERS);
      setShowPwaFilters(false);

      await fetchMtcList(
        EMPTY_FILTERS
      );
    };

  const refreshMtcList = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchMtcList(filters, {
          showMainLoader: false,
        }),
        fetchProviderOptions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const goDashboardModules = () => {
    if (window.__goDashboardHome) {
      window.__goDashboardHome();
      return;
    }

    window.location.href =
      "/dashboard#dashboard";
  };

  const openPdf = (item) => {
    const directPdfUrl =
      item?.pdfUrl ||
      item?.pdf?.fileUrl ||
      "";

    if (directPdfUrl) {
      const finalUrl =
        /^https?:\/\//i.test(
          directPdfUrl
        )
          ? directPdfUrl
          : `${API_ORIGIN}${directPdfUrl}`;

      window.open(
        finalUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    if (!item?._id) {
      return;
    }

    const provider =
      normalizeProvider(
        item.mtcProvider
      );

    const queryString = provider
      ? `?mtcProvider=${encodeURIComponent(
          provider
        )}`
      : "";

    window.open(
      `${API_ORIGIN}/api/mtc/${item._id}/pdf${queryString}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =======================================================
     PWA FILTER SHEET
  ======================================================= */

  const renderPwaFilters = () => (
    <div
      className="ios-mtc-filter-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          setShowPwaFilters(false);
        }
      }}
    >
      <div
        className="ios-mtc-filter-card"
        role="dialog"
        aria-modal="true"
        aria-label="MTC filters"
      >
        <div className="ios-mtc-filter-head">
          <div>
            <h3>Filters</h3>
            <p>
              Filter certificates by
              provider, company and date
            </p>
          </div>

          <button
            type="button"
            className="ios-mtc-filter-close"
            onClick={() =>
              setShowPwaFilters(false)
            }
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ios-mtc-filter-grid">
          <div className="ios-mtc-field">
            <label htmlFor="pwaMtcProvider">
              TC Provider
            </label>

            <select
              id="pwaMtcProvider"
              name="mtcProvider"
              value={
                filters.mtcProvider
              }
              onChange={
                handleFilterChange
              }
              disabled={providersLoading}
            >
              <option value="">
                All TC Providers
              </option>

              {providerOptions.map(
                (provider) => (
                  <option
                    key={provider.value}
                    value={provider.value}
                  >
                    {provider.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="ios-mtc-field">
            <label htmlFor="pwaMtcCompany">
              Company / Messers
            </label>

            <input
              id="pwaMtcCompany"
              type="text"
              name="companyName"
              placeholder="Search company..."
              value={
                filters.companyName
              }
              onChange={
                handleFilterChange
              }
            />
          </div>

          <div className="ios-mtc-date-grid">
            <div className="ios-mtc-field">
              <label htmlFor="pwaMtcFromDate">
                From Date
              </label>

              <input
                id="pwaMtcFromDate"
                type="date"
                name="fromDate"
                value={
                  filters.fromDate
                }
                max={
                  filters.toDate ||
                  undefined
                }
                onChange={
                  handleFilterChange
                }
              />
            </div>

            <div className="ios-mtc-field">
              <label htmlFor="pwaMtcToDate">
                To Date
              </label>

              <input
                id="pwaMtcToDate"
                type="date"
                name="toDate"
                value={filters.toDate}
                min={
                  filters.fromDate ||
                  undefined
                }
                disabled={
                  !filters.fromDate
                }
                onChange={
                  handleFilterChange
                }
              />
            </div>
          </div>

          <div className="ios-mtc-filter-actions">
            <button
              type="button"
              onClick={clearPwaFilters}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={applyPwaFilters}
              disabled={loading}
            >
              {loading
                ? "Applying..."
                : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* =======================================================
     CREATE FORM
  ======================================================= */

  if (showCreate) {
    return (
      <div className="mtc-page">
        <MtcForm
          onBack={() =>
            setShowCreate(false)
          }
          onCreated={async () => {
            setShowCreate(false);

            await Promise.all([
              fetchMtcList(filters),
              fetchProviderOptions(),
            ]);
          }}
        />
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="mtc-page">
      {/* ===================================================
          PWA VIEW
      =================================================== */}

      <div className="mtc-pwa-shell">
        <div className="ios-mtc-page">
          <div className="ios-mtc-header">
            <div className="ios-mtc-header-row">
              <button
                type="button"
                className="ios-mtc-back"
                onClick={
                  goDashboardModules
                }
                aria-label="Back to dashboard"
              >
                <span>‹</span>
              </button>

              <div className="ios-mtc-title">
                <h2>MTC</h2>
                <p>
                  Provider-wise material
                  certificates
                </p>
              </div>

              <button
                type="button"
                className={`ios-mtc-refresh ${
                  refreshing
                    ? "spinning"
                    : ""
                }`}
                onClick={
                  refreshMtcList
                }
                disabled={
                  refreshing ||
                  loading
                }
                aria-label="Refresh certificates"
              >
                <RefreshCcw
                  size={17}
                />
              </button>
            </div>

            <div className="ios-mtc-insight-card ios-mtc-insight-card-four">
              <PwaInsight
                label="Total TC"
                value={
                  totalCertificates
                }
              />

              <PwaInsight
                label="This Month"
                value={
                  monthCertificates
                }
              />

              <PwaInsight
                label="Grades"
                value={gradesCount}
              />

              <PwaInsight
                label="PDF Ready"
                value={pdfCount}
              />
            </div>

            <button
              type="button"
              className="ios-mtc-new-btn"
              onClick={() =>
                setShowCreate(true)
              }
            >
              + New MTC
            </button>
          </div>

          <div className="ios-mtc-content">
            <button
              type="button"
              className="ios-mtc-filter-open"
              onClick={() =>
                setShowPwaFilters(true)
              }
            >
              <SlidersHorizontal
                size={15}
              />

              <span>Filters</span>

              {activeFilterCount > 0 && (
                <span className="ios-mtc-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showPwaFilters &&
              renderPwaFilters()}

            {filters.mtcProvider && (
              <div className="ios-mtc-active-provider">
                <Building2 size={14} />

                <span>
                  Showing{" "}
                  <strong>
                    {getProviderLabel(
                      filters.mtcProvider,
                      providerOptions
                    )}
                  </strong>{" "}
                  certificates
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    const nextFilters = {
                      ...filters,
                      mtcProvider: "",
                    };

                    setFilters(
                      nextFilters
                    );

                    await fetchMtcList(
                      nextFilters
                    );
                  }}
                  aria-label="Clear provider filter"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="ios-mtc-empty">
                Loading MTC
                certificates...
              </div>
            ) : filteredList.length ===
              0 ? (
              <div className="ios-mtc-empty">
                No MTC certificate
                found
              </div>
            ) : (
              filteredList.map(
                (item) => {
                  const provider =
                    normalizeProvider(
                      item.mtcProvider
                    ) || "unknown";

                  return (
                    <div
                      className={`ios-mtc-card ios-mtc-card-provider-${provider}`}
                      key={`${provider}-${item._id}`}
                    >
                      <div className="ios-mtc-card-top">
                        <div>
                          <h4>
                            {getCompanyName(
                              item
                            )}
                          </h4>

                          <p>
                            Order:{" "}
                            {getOrderNumber(
                              item
                            )}
                          </p>

                          <p>
                            TC / File:{" "}
                            {getCertificateNumber(
                              item
                            )}
                          </p>
                        </div>

                        <span
                          className={`ios-mtc-status ios-mtc-status-${provider}`}
                        >
                          {getProviderLabel(
                            provider,
                            providerOptions
                          )}
                        </span>
                      </div>

                      <div className="ios-mtc-main-card">
                        <span>
                          Certificate
                          Grade /
                          Specification
                        </span>

                        <strong>
                          {getGrade(item)}
                        </strong>
                      </div>

                      <div className="ios-mtc-info-grid">
                        <PwaInfo
                          label="Provider"
                          value={getProviderLabel(
                            provider,
                            providerOptions
                          )}
                        />

                        <PwaInfo
                          label="TC Number"
                          value={getCertificateNumber(
                            item
                          )}
                        />

                        <PwaInfo
                          label="Size"
                          value={getSize(
                            item
                          )}
                        />

                        <PwaInfo
                          label="Weight"
                          value={getWeight(
                            item
                          )}
                        />

                        <PwaInfo
                          label="Pcs"
                          value={getPieces(
                            item
                          )}
                        />

                        <PwaInfo
                          label="Heat / Lot"
                          value={getHeatNumber(
                            item
                          )}
                        />

                        <PwaInfo
                          label="Date"
                          value={formatDate(
                            getCertificateDate(
                              item
                            )
                          )}
                        />

                        <PwaInfo
                          label="Condition / Route"
                          value={getCondition(
                            item
                          )}
                          full
                        />
                      </div>

                      <button
                        type="button"
                        className="ios-mtc-pdf-btn"
                        onClick={() =>
                          openPdf(item)
                        }
                      >
                        <Download
                          size={16}
                        />
                        View PDF
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          DESKTOP VIEW
      =================================================== */}

      <div className="mtc-desktop-page">
        <div className="mtc-header">
          <div>
            <span className="mtc-kicker">
              Material Test
              Certificate
            </span>

            <h1>
              MTC Certificates
            </h1>

            <p>
              Generate and manage
              provider-wise inspection
              certificates.
            </p>
          </div>

          <button
            type="button"
            className="mtc-create-btn"
            onClick={() =>
              setShowCreate(true)
            }
          >
            <Plus size={18} />
            Create MTC
          </button>
        </div>

        <div className="mtc-filter-card">
          <div className="mtc-filter-field">
            <label htmlFor="desktopMtcCompany">
              Company / Messers
            </label>

            <div>
              <Search size={16} />

              <input
                id="desktopMtcCompany"
                type="text"
                name="companyName"
                placeholder="Search company"
                value={
                  filters.companyName
                }
                onChange={
                  handleFilterChange
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    applyDesktopFilters();
                  }
                }}
              />
            </div>
          </div>

          <div className="mtc-filter-field">
            <label htmlFor="desktopMtcProvider">
              TC Provider
            </label>

            <div>
              <Building2 size={16} />

              <select
                id="desktopMtcProvider"
                name="mtcProvider"
                value={
                  filters.mtcProvider
                }
                onChange={
                  handleFilterChange
                }
                disabled={
                  providersLoading
                }
              >
                <option value="">
                  All TC Providers
                </option>

                {providerOptions.map(
                  (provider) => (
                    <option
                      key={
                        provider.value
                      }
                      value={
                        provider.value
                      }
                    >
                      {
                        provider.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mtc-filter-field">
            <label htmlFor="desktopMtcFromDate">
              From Date
            </label>

            <div>
              <Calendar size={16} />

              <input
                id="desktopMtcFromDate"
                type="date"
                name="fromDate"
                value={
                  filters.fromDate
                }
                max={
                  filters.toDate ||
                  undefined
                }
                onChange={
                  handleFilterChange
                }
              />
            </div>
          </div>

          <div className="mtc-filter-field">
            <label htmlFor="desktopMtcToDate">
              To Date
            </label>

            <div>
              <Calendar size={16} />

              <input
                id="desktopMtcToDate"
                type="date"
                name="toDate"
                value={filters.toDate}
                min={
                  filters.fromDate ||
                  undefined
                }
                disabled={
                  !filters.fromDate
                }
                onChange={
                  handleFilterChange
                }
              />
            </div>
          </div>

          <div className="mtc-filter-actions">
            <button
              type="button"
              onClick={
                applyDesktopFilters
              }
              disabled={loading}
            >
              <Search size={16} />

              {loading
                ? "Filtering..."
                : "Filter"}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              <RefreshCcw
                size={16}
              />
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
                  <th>TC / File No.</th>
                  <th>Company</th>
                  <th>TC Provider</th>
                  <th>
                    Grade / Specification
                  </th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>PDF</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="mtc-empty"
                    >
                      Loading MTC
                      certificates...
                    </td>
                  </tr>
                ) : filteredList.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="mtc-empty"
                    >
                      No MTC certificate
                      found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map(
                    (item) => {
                      const provider =
                        normalizeProvider(
                          item.mtcProvider
                        ) ||
                        "unknown";

                      return (
                        <tr
                          key={`${provider}-${item._id}`}
                        >
                          <td>
                            {getOrderNumber(
                              item
                            )}
                          </td>

                          <td>
                            {getCertificateNumber(
                              item
                            )}
                          </td>

                          <td>
                            {getCompanyName(
                              item
                            )}
                          </td>

                          <td>
                            <span
                              className={`mtc-provider-badge mtc-provider-badge-${provider}`}
                            >
                              {getProviderLabel(
                                provider,
                                providerOptions
                              )}
                            </span>
                          </td>

                          <td>
                            {getGrade(
                              item
                            )}
                          </td>

                          <td>
                            {getSize(item)}
                          </td>

                          <td>
                            {formatDate(
                              getCertificateDate(
                                item
                              )
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="mtc-pdf-btn"
                              onClick={() =>
                                openPdf(
                                  item
                                )
                              }
                            >
                              <Download
                                size={
                                  15
                                }
                              />
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function PwaInsight({
  label,
  value,
}) {
  return (
    <div className="ios-mtc-insight-box">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        Current result
      </small>
    </div>
  );
}

function PwaInfo({
  label,
  value,
  full = false,
}) {
  return (
    <div
      className={`ios-mtc-info-box ${
        full ? "full" : ""
      }`}
    >
      <span>{label}</span>

      <strong>
        {cleanText(value)}
      </strong>
    </div>
  );
}

export default MtcPage;