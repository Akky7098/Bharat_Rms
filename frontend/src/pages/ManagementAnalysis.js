import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  RefreshCw,
  Factory,
  Layers3,
  PackageSearch,
  TrendingUp,
  ChevronRight,
  Building2,
  Boxes,
  BarChart3,
  Search,
  X,
  AlertCircle,
  CalendarDays,
  Target,
  Truck,
  Clock3,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

import {
  getManagementAnalysis,
} from "../services/managementAnalysisService";

import "./ManagementAnalysis.css";

/* =========================================================
   HELPERS
========================================================= */

const ANALYSIS_START_DATE = "2026-08-13";

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(safeNumber(value));

const formatMT = (value) =>
  `${formatNumber(value)} MT`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getCompanyName = (order) =>
  order?.companyName ||
  order?.customerName ||
  "-";

const getPoNumber = (order) =>
  order?.poNumber ||
  order?.purchaseOrderNo ||
  order?.orderRef ||
  "-";

const getSalesPerson = (order) =>
  order?.salesPersonName ||
  order?.createdBy?.name ||
  "-";

const getOrderDate = (order) =>
  order?.orderDate ||
  order?.poDate ||
  order?.createdAt ||
  null;

const getTrackingType = (order) => {
  const value = String(
    order?.trackingOrderType ||
      order?.orderType ||
      ""
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (
    value === "H.O." ||
    value === "HO"
  ) {
    return "H.O.";
  }

  if (
    value === "N.H.O." ||
    value === "NHO"
  ) {
    return "N.H.O.";
  }

  return (
    order?.trackingOrderType ||
    "-"
  );
};

const getSteelMill = (order) => {
  const steelMill =
    order?.steelMill ||
    order?.mill ||
    order?.millName ||
    "";

  const otherSteelMill =
    order?.otherSteelMill ||
    "";

  if (
    normalizeText(steelMill) ===
      "others" &&
    otherSteelMill
  ) {
    return otherSteelMill;
  }

  return steelMill || "Not Specified";
};

/*
  API compatibility.

  Current/new API can return:
    newOrderMT
    dispatchTargetMT
    actualDispatchMT
    targetPendingMT
    orderBalanceMT

  Older/current response aliases can also be:
    orderedMT
    dispatchedMT
    balanceMT
*/

const getNewOrderMT = (data) =>
  safeNumber(
    data?.newOrderMT ??
      data?.orderedMT ??
      data?.orderQuantityMT ??
      data?.orderQtyMT ??
      data?.quantityMT ??
      0
  );

const getDispatchTargetMT = (data) =>
  safeNumber(
    data?.dispatchTargetMT ??
      data?.targetMT ??
      data?.dispatchTarget ??
      0
  );

const getActualDispatchMT = (data) =>
  safeNumber(
    data?.actualDispatchMT ??
      data?.dispatchMT ??
      data?.dispatchedMT ??
      0
  );

const getTargetPendingMT = (data) => {
  if (
    data?.targetPendingMT !==
      undefined &&
    data?.targetPendingMT !== null
  ) {
    return safeNumber(
      data.targetPendingMT
    );
  }

  return Math.max(
    0,
    getDispatchTargetMT(data) -
      getActualDispatchMT(data)
  );
};

const getOrderBalanceMT = (data) => {
  if (
    data?.orderBalanceMT !==
      undefined &&
    data?.orderBalanceMT !== null
  ) {
    return safeNumber(
      data.orderBalanceMT
    );
  }

  if (
    data?.balanceMT !== undefined &&
    data?.balanceMT !== null
  ) {
    return safeNumber(
      data.balanceMT
    );
  }

  return Math.max(
    0,
    getNewOrderMT(data) -
      getActualDispatchMT(data)
  );
};

const getGradeNames = (order) => {
  if (
    Array.isArray(order?.grades)
  ) {
    return order.grades
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.grade
      )
      .filter(Boolean);
  }

  if (
    Array.isArray(
      order?.analysisGrades
    )
  ) {
    return order.analysisGrades;
  }

  return [];
};

const getMaterialDetails = (order) =>
  order?.materialDetails ||
  order?.sizeGradeQuantityRate ||
  order?.analysisMaterialDetails ||
  "-";

/* =========================================================
   MONTH HELPERS
========================================================= */

const getCurrentMonthValue = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
};

const getMonthDateRange = (
  monthValue
) => {
  if (!monthValue) {
    return {
      from: "",
      to: "",
    };
  }

  const [year, month] =
    monthValue
      .split("-")
      .map(Number);

  if (!year || !month) {
    return {
      from: "",
      to: "",
    };
  }

  const lastDay = new Date(
    year,
    month,
    0
  ).getDate();

  const monthText =
    String(month).padStart(
      2,
      "0"
    );

  return {
    from:
      `${year}-${monthText}-01`,

    to:
      `${year}-${monthText}-${String(
        lastDay
      ).padStart(2, "0")}`,
  };
};

const clampAnalysisStartDate = (
  dateValue
) => {
  if (!dateValue) {
    return dateValue;
  }

  return dateValue <
    ANALYSIS_START_DATE
    ? ANALYSIS_START_DATE
    : dateValue;
};

const getPeriodText = (
  appliedFilters
) => {
  const {
    from,
    to,
  } = appliedFilters;

  if (!from && !to) {
    const currentMonth =
      getMonthDateRange(
        getCurrentMonthValue()
      );

    return `${formatDate(
      clampAnalysisStartDate(
        currentMonth.from
      )
    )} - ${formatDate(
      currentMonth.to
    )}`;
  }

  if (from && to) {
    return `${formatDate(
      from
    )} - ${formatDate(to)}`;
  }

  if (from) {
    return `From ${formatDate(
      from
    )}`;
  }

  return `Up to ${formatDate(to)}`;
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  icon,
  label,
  value,
  sub,
  className = "",
  onClick,
}) => {
  const content = (
    <>
      <div className="ma-summary-icon">
        {icon}
      </div>

      <div className="ma-summary-copy">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        {sub && (
          <small>
            {sub}
          </small>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`ma-summary-card ma-summary-clickable ${className}`}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`ma-summary-card ${className}`}
    >
      {content}
    </div>
  );
};

/* =========================================================
   NAVIGATION CARD
========================================================= */

const AnalysisNavCard = ({
  icon,
  eyebrow,
  title,
  value,
  detail,
  onClick,
  className = "",
}) => (
  <button
    type="button"
    className={`ma-nav-card ${className}`}
    onClick={onClick}
  >
    <div className="ma-nav-card-icon">
      {icon}
    </div>

    <div className="ma-nav-card-copy">
      <span>
        {eyebrow}
      </span>

      <strong>
        {title}
      </strong>

      <b>
        {value}
      </b>

      <small>
        {detail}
      </small>
    </div>

    <ChevronRight
      size={20}
      className="ma-nav-arrow"
    />
  </button>
);

/* =========================================================
   METRIC CELL
========================================================= */

const MetricCell = ({
  value,
  onClick,
}) => (
  <button
    type="button"
    className="ma-metric-value"
    onClick={onClick}
    disabled={
      !safeNumber(value)
    }
  >
    {formatMT(value)}

    {safeNumber(value) >
      0 && (
      <ChevronRight
        size={15}
      />
    )}
  </button>
);

/* =========================================================
   SEARCH
========================================================= */

function OrderSearch({
  value,
  onChange,
}) {
  return (
    <div className="ma-search-wrap">
      <Search
        size={18}
      />

      <input
        type="text"
        value={value}
        placeholder="Search company, PO, salesperson, mill..."
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

      {value && (
        <button
          type="button"
          onClick={() =>
            onChange("")
          }
          aria-label="Clear search"
        >
          <X
            size={17}
          />
        </button>
      )}
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  text,
}) {
  return (
    <div className="ma-empty">
      <PackageCheck
        size={31}
      />

      <strong>
        No data found
      </strong>

      <p>
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   ORDER CARDS
========================================================= */

function OrderCards({
  orders = [],
}) {
  if (!orders.length) {
    return (
      <EmptyState
        text="No matching sales orders found for this selection."
      />
    );
  }

  return (
    <div className="ma-order-list">
      {orders.map(
        (
          order,
          index
        ) => {
          const type =
            getTrackingType(
              order
            );

          const grades =
            getGradeNames(
              order
            );

          return (
            <article
  className="ma-order-card"
  key={
    order?._id ||
    order?.id ||
    `${getPoNumber(order)}-${index}`
  }
>
  {/* =========================
      ORDER HEADER
  ========================= */}
  <div className="ma-order-top">
    <div className="ma-order-heading">
      <div className="ma-order-title-row">
        <span className="ma-order-po">
          {getPoNumber(order)}
        </span>

        <strong className="ma-order-company">
          {getCompanyName(order)}
        </strong>
      </div>

      <div className="ma-order-date">
        <CalendarDays size={14} />

        <span>
          {formatDate(
            getOrderDate(order)
          )}
        </span>
      </div>
    </div>

    <div className="ma-order-qty">
      <span>ORDER QTY</span>

      <strong>
        {formatMT(
          getNewOrderMT(order)
        )}
      </strong>
    </div>
  </div>

  {/* =========================
      ORDER QUANTITY METRICS
  ========================= */}
  <div className="ma-order-metric-grid">
    <div className="ma-order-metric-item ma-order-metric-target">
      <div className="ma-order-metric-icon">
        <Target size={18} />
      </div>

      <div className="ma-order-metric-copy">
        <span>
          Dispatch Target
        </span>

        <strong>
          {formatMT(
            getDispatchTargetMT(order)
          )}
        </strong>
      </div>
    </div>

    <div className="ma-order-metric-item ma-order-metric-dispatch">
      <div className="ma-order-metric-icon">
        <Truck size={18} />
      </div>

      <div className="ma-order-metric-copy">
        <span>
          Actual Dispatch
        </span>

        <strong>
          {formatMT(
            getActualDispatchMT(order)
          )}
        </strong>
      </div>
    </div>

    <div className="ma-order-metric-item ma-order-metric-pending">
      <div className="ma-order-metric-icon">
        <Clock3 size={18} />
      </div>

      <div className="ma-order-metric-copy">
        <span>
          Target Pending
        </span>

        <strong>
          {formatMT(
            getTargetPendingMT(order)
          )}
        </strong>
      </div>
    </div>

    <div className="ma-order-metric-item ma-order-metric-balance">
      <div className="ma-order-metric-icon">
        <Boxes size={18} />
      </div>

      <div className="ma-order-metric-copy">
        <span>
          Order Balance
        </span>

        <strong>
          {formatMT(
            getOrderBalanceMT(order)
          )}
        </strong>
      </div>
    </div>
  </div>

  {/* =========================
      ORDER INFORMATION
  ========================= */}
  <div className="ma-order-meta-grid">
    <div className="ma-order-meta-item">
      <span>
        Sales Person
      </span>

      <strong>
        {getSalesPerson(order)}
      </strong>
    </div>

    <div className="ma-order-meta-item">
      <span>
        Order Type
      </span>

      <strong>
        {type}
      </strong>
    </div>

    {type === "N.H.O." && (
      <div className="ma-order-meta-item ma-meta-wide">
        <span>
          Steel Mill
        </span>

        <strong>
          {getSteelMill(order)}
        </strong>
      </div>
    )}
  </div>

  {/* =========================
      GRADES
  ========================= */}
  {grades.length > 0 && (
    <div className="ma-grade-section">
      <span className="ma-grade-label">
        GRADES
      </span>

      <div className="ma-grade-chips">
        {grades.map(
          (
            grade,
            gradeIndex
          ) => (
            <span
              key={`${grade}-${gradeIndex}`}
            >
              {grade}
            </span>
          )
        )}
      </div>
    </div>
  )}

  {/* =========================
      MATERIAL DETAILS
  ========================= */}
  <div className="ma-material-box">
    <div className="ma-material-title">
      <PackageSearch size={15} />

      <span>
        MATERIAL DETAILS
      </span>
    </div>

    <p>
      {getMaterialDetails(order)}
    </p>
  </div>
</article>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   MANAGEMENT ANALYSIS
========================================================= */

function ManagementAnalysis({
  goDashboardHome,
}) {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    analysis,
    setAnalysis,
  ] = useState(null);

  const [
    view,
    setView,
  ] = useState(
    "overview"
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedGrade,
    setSelectedGrade,
  ] = useState("");

  const [
    selectedMill,
    setSelectedMill,
  ] = useState("");

  const [
    drillDown,
    setDrillDown,
  ] = useState(null);

  /*
    Month is the primary frontend filter.

    On initial load:
      current month is selected.

    API receives:
      from
      to
  */

  const [
    filters,
    setFilters,
  ] = useState(() => ({
    month:
      getCurrentMonthValue(),

    from: "",

    to: "",
  }));

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(() => {
    const range =
      getMonthDateRange(
        getCurrentMonthValue()
      );

    return {
      from:
        clampAnalysisStartDate(
          range.from
        ),

      to:
        range.to,
    };
  });

  /* =======================================================
     SUPER ADMIN GUARD
  ======================================================= */

  const currentUser =
    useMemo(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "user"
          ) || "{}"
        );
      } catch {
        return {};
      }
    }, []);

  const isSuperAdmin =
    String(
      currentUser?.role ||
        ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      ) ===
    "super_admin";

  /* =======================================================
     LOAD ANALYSIS
  ======================================================= */

  const loadAnalysis =
    useCallback(
      async (
        showRefresh = false,
        nextFilters = {}
      ) => {
        try {
          setError("");

          if (showRefresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          const result =
            await getManagementAnalysis(
              nextFilters
            );

          setAnalysis(
            result || {}
          );
        } catch (err) {
          console.error(
            "Management analysis load failed:",
            err
          );

          setError(
            err?.response
              ?.data?.message ||
              err?.message ||
              "Unable to load management analysis."
          );
        } finally {
          setLoading(false);

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    loadAnalysis(
      false,
      appliedFilters
    );
  }, [
    isSuperAdmin,
    appliedFilters,
    loadAnalysis,
  ]);

  /* =======================================================
     RESPONSE NORMALIZATION
  ======================================================= */

  const rawSummary =
    useMemo(
      () =>
        analysis?.summary ||
        {},
      [analysis]
    );

  const normalizeSummaryBlock =
    useCallback(
      (data = {}) => ({
        ...data,

        newOrderMT:
          getNewOrderMT(
            data
          ),

        dispatchTargetMT:
          getDispatchTargetMT(
            data
          ),

        actualDispatchMT:
          getActualDispatchMT(
            data
          ),

        targetPendingMT:
          getTargetPendingMT(
            data
          ),

        orderBalanceMT:
          getOrderBalanceMT(
            data
          ),
      }),
      []
    );

  /*
    monthlyCombined is NOT an all-time total.

    It represents:
      H.O. + Steel Mill

    only for the selected period/month.
  */

  const monthlyCombined =
    useMemo(
      () =>
        normalizeSummaryBlock(
          analysis
            ?.monthlyCombined ||
            {}
        ),
      [
        analysis,
        normalizeSummaryBlock,
      ]
    );

  const house =
    useMemo(
      () =>
        normalizeSummaryBlock(
          rawSummary?.house ||
            rawSummary?.ho ||
            {}
        ),
      [
        rawSummary,
        normalizeSummaryBlock,
      ]
    );

  const steelMill =
    useMemo(
      () =>
        normalizeSummaryBlock(
          rawSummary
            ?.steelMill ||
            rawSummary?.nho ||
            {}
        ),
      [
        rawSummary,
        normalizeSummaryBlock,
      ]
    );

  const grades =
    useMemo(
      () =>
        Array.isArray(
          analysis?.grades
        )
          ? analysis.grades
          : [],
      [analysis]
    );

  const mills =
    useMemo(
      () =>
        Array.isArray(
          analysis?.mills
        )
          ? analysis.mills
          : [],
      [analysis]
    );

  const orders =
    useMemo(
      () =>
        Array.isArray(
          analysis?.salesOrders
        )
          ? analysis.salesOrders
          : Array.isArray(
              analysis?.orders
            )
          ? analysis.orders
          : [],
      [analysis]
    );

  /* =======================================================
     METRICS
  ======================================================= */

  const metricRows =
    useMemo(
      () => [
        {
          key:
            "newOrder",

          label:
            "New Order Qty",

          icon: (
            <PackageSearch
              size={18}
            />
          ),

          house:
            house.newOrderMT,

          steelMill:
            steelMill.newOrderMT,
        },

        {
          key:
            "dispatchTarget",

          label:
            "Dispatch Target",

          icon: (
            <Target
              size={18}
            />
          ),

          house:
            house.dispatchTargetMT,

          steelMill:
            steelMill.dispatchTargetMT,
        },

        {
          key:
            "actualDispatch",

          label:
            "Actual Dispatch",

          icon: (
            <Truck
              size={18}
            />
          ),

          house:
            house.actualDispatchMT,

          steelMill:
            steelMill.actualDispatchMT,
        },

        {
          key:
            "targetPending",

          label:
            "Target Pending",

          icon: (
            <Clock3
              size={18}
            />
          ),

          house:
            house.targetPendingMT,

          steelMill:
            steelMill.targetPendingMT,
        },

        {
          key:
            "orderBalance",

          label:
            "Order Balance",

          icon: (
            <Boxes
              size={18}
            />
          ),

          house:
            house.orderBalanceMT,

          steelMill:
            steelMill.orderBalanceMT,
        },
      ],
      [
        house,
        steelMill,
      ]
    );

  /* =======================================================
     METRIC ORDER FILTER
  ======================================================= */

  const getMetricOrders =
    useCallback(
      (
        metric,
        type = "total"
      ) => {
        let result = [
          ...orders,
        ];

        if (
          type === "house"
        ) {
          result =
            result.filter(
              (order) =>
                getTrackingType(
                  order
                ) === "H.O."
            );
        }

        if (
          type ===
          "steelMill"
        ) {
          result =
            result.filter(
              (order) =>
                getTrackingType(
                  order
                ) ===
                "N.H.O."
            );
        }

        switch (metric) {
          case "newOrder":
  return result.filter(
    (order) =>
      order?.isNewOrderInPeriod === true
  );

          case "dispatchTarget":
            return result.filter(
              (order) =>
                getDispatchTargetMT(
                  order
                ) > 0
            );

          case "actualDispatch":
            return result.filter(
              (order) =>
                getActualDispatchMT(
                  order
                ) > 0
            );

          case "targetPending":
            return result.filter(
              (order) =>
                getTargetPendingMT(
                  order
                ) > 0
            );

          case "orderBalance":
            return result.filter(
              (order) =>
                getOrderBalanceMT(
                  order
                ) > 0
            );

          default:
            return result;
        }
      },
      [orders]
    );

  /* =======================================================
     SEARCHED ORDERS
  ======================================================= */

  const filterOrders =
    useCallback(
      (sourceOrders) => {
        if (!search.trim()) {
          return sourceOrders;
        }

        const query =
          normalizeText(
            search
          );

        return sourceOrders.filter(
          (order) => {
            const text = [
              getCompanyName(
                order
              ),
              getPoNumber(
                order
              ),
              getSalesPerson(
                order
              ),
              getSteelMill(
                order
              ),
              getTrackingType(
                order
              ),
              ...getGradeNames(
                order
              ),
            ]
              .join(" ")
              .toLowerCase();

            return text.includes(
              query
            );
          }
        );
      },
      [search]
    );

  /* =======================================================
     DATE FILTER
  ======================================================= */

  const applyDateFilter =
    () => {
      let nextFrom =
        filters.from ||
        "";

      let nextTo =
        filters.to ||
        "";

      /*
        Month takes priority when
        a month is selected.
      */

      if (filters.month) {
        const monthRange =
          getMonthDateRange(
            filters.month
          );

        nextFrom =
          clampAnalysisStartDate(
            monthRange.from
          );

        nextTo =
          monthRange.to;
      }

      /*
        Never allow analysis before
        H.O./N.H.O. tracking started.
      */

      if (
        nextFrom &&
        nextFrom <
          ANALYSIS_START_DATE
      ) {
        nextFrom =
          ANALYSIS_START_DATE;
      }

      /*
        To-only remains allowed.

        Validate ordering only when
        both dates exist.
      */

      if (
        nextFrom &&
        nextTo &&
        nextTo < nextFrom
      ) {
        setError(
          "To date cannot be earlier than From date."
        );

        return;
      }

      setError("");

      setAppliedFilters({
        from: nextFrom,
        to: nextTo,
      });

      setView(
        "overview"
      );

      setSelectedGrade(
        ""
      );

      setSelectedMill(
        ""
      );

      setDrillDown(
        null
      );

      setSearch("");
    };

  const clearDateFilter =
    () => {
      const month =
        getCurrentMonthValue();

      const range =
        getMonthDateRange(
          month
        );

      setFilters({
        month,
        from: "",
        to: "",
      });

      setAppliedFilters({
        from:
          clampAnalysisStartDate(
            range.from
          ),

        to:
          range.to,
      });

      setError("");

      setView(
        "overview"
      );

      setSelectedGrade(
        ""
      );

      setSelectedMill(
        ""
      );

      setDrillDown(
        null
      );

      setSearch("");
    };

  /* =======================================================
     BACK
  ======================================================= */

  const handleBack = () => {
    if (drillDown) {
      setDrillDown(
        null
      );

      setSearch("");

      return;
    }

    if (selectedGrade) {
      setSelectedGrade(
        ""
      );

      setSearch("");

      return;
    }

    if (selectedMill) {
      setSelectedMill(
        ""
      );

      setSearch("");

      return;
    }

    if (
      view !== "overview"
    ) {
      setView(
        "overview"
      );

      setSearch("");

      return;
    }

    if (goDashboardHome) {
      goDashboardHome();

      return;
    }

    window.location.hash =
      "dashboard";
  };

  /* =======================================================
     DRILL DOWN
  ======================================================= */

  const openMetric =
    (
      metric,
      type,
      title
    ) => {
      setSearch("");

      setDrillDown({
        metric,
        type,
        title,
      });
    };

  const drillDownOrders =
    useMemo(() => {
      if (!drillDown) {
        return [];
      }

      return filterOrders(
        getMetricOrders(
          drillDown.metric,
          drillDown.type
        )
      );
    }, [
      drillDown,
      filterOrders,
      getMetricOrders,
    ]);

  /* =======================================================
     H.O. ORDERS
  ======================================================= */

  const hoOrders =
    useMemo(
      () =>
        filterOrders(
          orders.filter(
            (order) =>
              getTrackingType(
                order
              ) ===
              "H.O."
          )
        ),
      [
        orders,
        filterOrders,
      ]
    );

  /* =======================================================
     STEEL MILL ORDERS
  ======================================================= */

  const millOrders =
    useMemo(() => {
      let result =
        orders.filter(
          (order) =>
            getTrackingType(
              order
            ) ===
            "N.H.O."
        );

      if (selectedMill) {
        result =
          result.filter(
            (order) =>
              normalizeText(
                getSteelMill(
                  order
                )
              ) ===
              normalizeText(
                selectedMill
              )
          );
      }

      return filterOrders(
        result
      );
    }, [
      orders,
      selectedMill,
      filterOrders,
    ]);

  /* =======================================================
     GRADE ORDERS
  ======================================================= */

  const gradeOrders =
    useMemo(() => {
      if (!selectedGrade) {
        return [];
      }

      const result =
        orders.filter(
          (order) =>
            getGradeNames(
              order
            ).some(
              (grade) =>
                normalizeText(
                  grade
                ) ===
                normalizeText(
                  selectedGrade
                )
            )
        );

      return filterOrders(
        result
      );
    }, [
      orders,
      selectedGrade,
      filterOrders,
    ]);

  /* =======================================================
     ALL ORDERS
  ======================================================= */

  const searchedOrders =
    useMemo(
      () =>
        filterOrders(
          orders
        ),
      [
        orders,
        filterOrders,
      ]
    );

  /* =======================================================
     ACCESS
  ======================================================= */

  if (!isSuperAdmin) {
    return (
      <div className="management-analysis">
        <div className="ma-access-denied">
          <AlertCircle
            size={38}
          />

          <h2>
            Management Analysis
          </h2>

          <p>
            This module is
            available only to
            Super Admin.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    !analysis
  ) {
    return (
      <div className="management-analysis">
        <header className="ma-app-header">
          <button
            type="button"
            className="ma-header-btn"
            onClick={
              handleBack
            }
          >
            <ArrowLeft
              size={21}
            />
          </button>

          <div className="ma-header-title">
            <span>
              MANAGEMENT
            </span>

            <strong>
              Management Analysis
            </strong>

            <small>
              Loading management intelligence...
            </small>
          </div>

          <button
            type="button"
            className="ma-header-btn"
            disabled
          >
            <RefreshCw
              size={19}
              className="ma-spin"
            />
          </button>
        </header>

        <div className="ma-loading-state">
          <div className="ma-loading-spinner" />

          <strong>
            Loading analysis
          </strong>

          <span>
            Please wait...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <div className="management-analysis">
      {/* HEADER */}

      <header className="ma-app-header">
        <button
          type="button"
          className="ma-header-btn"
          onClick={
            handleBack
          }
          aria-label="Back"
        >
          <ArrowLeft
            size={21}
          />
        </button>

        <div className="ma-header-title">
          <span>
            MANAGEMENT
          </span>

          <strong>
            Management Analysis
          </strong>

          <small>
            Sales order intelligence
          </small>
        </div>

        <button
          type="button"
          className="ma-header-btn"
          disabled={
            refreshing
          }
          onClick={() =>
            loadAnalysis(
              true,
              appliedFilters
            )
          }
          aria-label="Refresh"
        >
          <RefreshCw
            size={19}
            className={
              refreshing
                ? "ma-spin"
                : ""
            }
          />
        </button>
      </header>

      <div className="ma-scroll-area">
        {/* ERROR */}

        {error && (
          <div className="ma-error-banner">
            <AlertCircle
              size={18}
            />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {/* =================================================
            FILTER
        ================================================= */}

        <section className="ma-date-filter">
          <div className="ma-date-filter-copy">
            <div className="ma-date-icon">
              <CalendarDays
                size={20}
              />
            </div>

            <div>
              <span>
                PERIOD
              </span>

              <strong>
                Analysis Period
              </strong>

              <small>
                {getPeriodText(
                  appliedFilters
                )}
              </small>
            </div>
          </div>

          <div className="ma-date-fields">
            {/* MONTH */}

            <label className="ma-month-field">
              <span>
                MONTH
              </span>

              <input
                type="month"
                value={
                  filters.month
                }
                min="2026-08"
                onChange={(event) => {
                  const month =
                    event.target.value;

                  if (!month) {
                    return;
                  }

                  const range =
                    getMonthDateRange(
                      month
                    );

                  const nextFrom =
                    clampAnalysisStartDate(
                      range.from
                    );

                  setFilters({
                    month,
                    from: "",
                    to: "",
                  });

                  setAppliedFilters({
                    from:
                      nextFrom,

                    to:
                      range.to,
                  });

                  setError("");

                  setView(
                    "overview"
                  );

                  setSelectedGrade(
                    ""
                  );

                  setSelectedMill(
                    ""
                  );

                  setDrillDown(
                    null
                  );

                  setSearch("");
                }}
              />
            </label>

            {/* FROM */}

            <label>
              <span>
                FROM
              </span>

              <input
                type="date"
                min={
                  ANALYSIS_START_DATE
                }
                value={
                  filters.from
                }
                onChange={(event) => {
                  const nextFrom =
                    event.target.value;

                  setFilters(
                    (current) => ({
                      ...current,

                      month: "",

                      from:
                        nextFrom,

                      to:
                        current.to &&
                        nextFrom &&
                        current.to <
                          nextFrom
                          ? nextFrom
                          : current.to,
                    })
                  );
                }}
              />
            </label>

            {/* TO */}

            <label>
              <span>
                TO
              </span>

              <input
                type="date"
                value={
                  filters.to
                }
                min={
                  filters.from ||
                  ANALYSIS_START_DATE
                }
                onChange={(
                  event
                ) =>
                  setFilters(
                    (
                      current
                    ) => ({
                      ...current,

                      month: "",

                      to:
                        event
                          .target
                          .value,
                    })
                  )
                }
              />
            </label>

            <button
              type="button"
              className="ma-filter-apply"
              onClick={
                applyDateFilter
              }
            >
              Apply
            </button>

            <button
              type="button"
              className="ma-filter-reset"
              onClick={
                clearDateFilter
              }
              aria-label="Reset to current month"
              title="Reset to current month"
            >
              <RotateCcw
                size={17}
              />
            </button>
          </div>
        </section>

        {/* =================================================
            DRILL DOWN
        ================================================= */}

        {drillDown ? (
          <>
            <section className="ma-detail-hero ho">
              <span>
                MANAGEMENT DETAIL
              </span>

              <strong>
                {drillDown.title}
              </strong>

              <div className="ma-detail-hero-grid">
                <div>
                  <small>
                    Orders
                  </small>

                  <b>
                    {
                      drillDownOrders.length
                    }
                  </b>
                </div>

                <div>
                  <small>
                    Quantity
                  </small>

                  <b>
                    {formatMT(
                      drillDownOrders.reduce(
                        (
                          sum,
                          order
                        ) =>
                          sum +
                          getNewOrderMT(
                            order
                          ),
                        0
                      )
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Period
                  </small>

                  <b>
                    {getPeriodText(
                      appliedFilters
                    )}
                  </b>
                </div>
              </div>
            </section>

            <OrderSearch
              value={search}
              onChange={
                setSearch
              }
            />

            <OrderCards
              orders={
                drillDownOrders
              }
            />
          </>
        ) : view ===
          "overview" ? (
          <>
            {/* HERO */}

            <section className="ma-hero">
              <div>
                <span className="ma-hero-label">
                  MONTHLY NEW ORDER
                  QUANTITY
                </span>

                <strong>
                  {formatMT(
                    monthlyCombined
                      .newOrderMT
                  )}
                </strong>

                <p>
                  H.O.{" "}
                  {formatMT(
                    house.newOrderMT
                  )}

                  {"  •  "}

                  Steel Mill{" "}
                  {formatMT(
                    steelMill.newOrderMT
                  )}
                </p>
              </div>

              <div className="ma-hero-badge">
                <BarChart3
                  size={26}
                />
              </div>
            </section>

            {/* TOP METRIC CARDS */}

            <div className="ma-kpi-grid">
              <SummaryCard
                icon={
                  <PackageSearch
                    size={20}
                  />
                }
                label="New Order"
                value={formatMT(
                  monthlyCombined
                    .newOrderMT
                )}
                sub="Selected month order quantity"
                className="quantity"
                onClick={() =>
                  openMetric(
                    "newOrder",
                    "total",
                    "New Order Quantity"
                  )
                }
              />

              <SummaryCard
                icon={
                  <Target
                    size={20}
                  />
                }
                label="Dispatch Target"
                value={formatMT(
                  monthlyCombined
                    .dispatchTargetMT
                )}
                sub="Target quantity"
                onClick={() =>
                  openMetric(
                    "dispatchTarget",
                    "total",
                    "Dispatch Target"
                  )
                }
              />

              <SummaryCard
                icon={
                  <Truck
                    size={20}
                  />
                }
                label="Actual Dispatch"
                value={formatMT(
                  monthlyCombined
                    .actualDispatchMT
                )}
                sub="Dispatched quantity"
                onClick={() =>
                  openMetric(
                    "actualDispatch",
                    "total",
                    "Actual Dispatch"
                  )
                }
              />

              <SummaryCard
                icon={
                  <Clock3
                    size={20}
                  />
                }
                label="Target Pending"
                value={formatMT(
                  monthlyCombined
                    .targetPendingMT
                )}
                sub="Pending against target"
                onClick={() =>
                  openMetric(
                    "targetPending",
                    "total",
                    "Target Pending"
                  )
                }
              />

              <SummaryCard
                icon={
                  <Boxes
                    size={20}
                  />
                }
                label="Order Balance"
                value={formatMT(
                  monthlyCombined
                    .orderBalanceMT
                )}
                sub="Pending order quantity"
                onClick={() =>
                  openMetric(
                    "orderBalance",
                    "total",
                    "Order Balance"
                  )
                }
              />
            </div>

            {/* QUANTITY PERFORMANCE */}

            <section className="ma-section">
              <div className="ma-section-heading">
                <div>
                  <span>
                    MANAGEMENT
                    SUMMARY
                  </span>

                  <h2>
                    Quantity
                    Performance
                  </h2>
                </div>

                <TrendingUp
                  size={21}
                />
              </div>

              <div className="ma-metric-table-wrap">
                <table className="ma-metric-table">
                  <thead>
                    <tr>
                      <th>
                        METRIC
                      </th>

                      <th>
                        H.O.
                      </th>

                      <th>
                        STEEL MILL
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {metricRows.map(
                      (row) => (
                        <tr
                          key={
                            row.key
                          }
                        >
                          <td>
                            <div className="ma-metric-name">
                              <span>
                                {
                                  row.icon
                                }
                              </span>

                              <strong>
                                {
                                  row.label
                                }
                              </strong>
                            </div>
                          </td>

                          <td>
                            <MetricCell
                              value={
                                row.house
                              }
                              onClick={() =>
                                openMetric(
                                  row.key,
                                  "house",
                                  `${row.label} - H.O.`
                                )
                              }
                            />
                          </td>

                          <td>
                            <MetricCell
                              value={
                                row.steelMill
                              }
                              onClick={() =>
                                openMetric(
                                  row.key,
                                  "steelMill",
                                  `${row.label} - Steel Mill`
                                )
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* NAVIGATION */}

            <section className="ma-section">
              <div className="ma-section-heading">
                <div>
                  <span>
                    ANALYSIS
                  </span>

                  <h2>
                    Explore Business
                  </h2>
                </div>

                <BarChart3
                  size={21}
                />
              </div>

              <div className="ma-analysis-navigation">
                <AnalysisNavCard
                  icon={
                    <Building2
                      size={21}
                    />
                  }
                  eyebrow="HOUSE ORDER"
                  title="H.O. Analysis"
                  value={formatMT(
                    house.newOrderMT
                  )}
                  detail="View all H.O. business and orders"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setView(
                      "ho"
                    );
                  }}
                />

                <AnalysisNavCard
                  icon={
                    <Factory
                      size={21}
                    />
                  }
                  eyebrow="N.H.O."
                  title="Steel Mill"
                  value={formatMT(
                    steelMill.newOrderMT
                  )}
                  detail="Mill-wise quantity and business"
                  className="mill"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setSelectedMill(
                      ""
                    );

                    setView(
                      "steelMill"
                    );
                  }}
                />

                <AnalysisNavCard
                  icon={
                    <Layers3
                      size={21}
                    />
                  }
                  eyebrow="PRODUCT"
                  title="Grade Analysis"
                  value={`${grades.length} Grades`}
                  detail="Select grade and view its orders"
                  className="grade"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setSelectedGrade(
                      ""
                    );

                    setView(
                      "grades"
                    );
                  }}
                />

                <AnalysisNavCard
                  icon={
                    <Boxes
                      size={21}
                    />
                  }
                  eyebrow="ORDERS"
                  title="All Orders"
                  value={`${orders.length} Orders`}
                  detail="Search and inspect order details"
                  className="all"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setView(
                      "orders"
                    );
                  }}
                />
              </div>
            </section>
          </>
        ) : view === "ho" ? (
          <>
            <section className="ma-detail-hero ho">
              <span>
                H.O. BUSINESS
              </span>

              <strong>
                {formatMT(
                  house.newOrderMT
                )}
              </strong>

              <div className="ma-detail-hero-grid">
                <div>
                  <small>
                    Orders
                  </small>

                  <b>
                    {
                      hoOrders.length
                    }
                  </b>
                </div>

                <div>
                  <small>
                    Dispatch
                  </small>

                  <b>
                    {formatMT(
                      house.actualDispatchMT
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Balance
                  </small>

                  <b>
                    {formatMT(
                      house.orderBalanceMT
                    )}
                  </b>
                </div>
              </div>
            </section>

            <OrderSearch
              value={search}
              onChange={
                setSearch
              }
            />

            <OrderCards
              orders={
                hoOrders
              }
            />
          </>
        ) : view ===
          "steelMill" ? (
          <>
            <section className="ma-detail-hero mill">
              <span>
                STEEL MILL BUSINESS
              </span>

              <strong>
                {selectedMill ||
                  formatMT(
                    steelMill.newOrderMT
                  )}
              </strong>

              <div className="ma-detail-hero-grid">
                <div>
                  <small>
                    Mills
                  </small>

                  <b>
                    {
                      mills.length
                    }
                  </b>
                </div>

                <div>
                  <small>
                    Orders
                  </small>

                  <b>
                    {
                      millOrders.length
                    }
                  </b>
                </div>

                <div>
                  <small>
                    Balance
                  </small>

                  <b>
                    {formatMT(
                      steelMill.orderBalanceMT
                    )}
                  </b>
                </div>
              </div>
            </section>

            {!selectedMill &&
              mills.length >
                0 && (
                <section className="ma-section">
                  <div className="ma-section-heading">
                    <div>
                      <span>
                        MILL WISE
                      </span>

                      <h2>
                        Steel Mills
                      </h2>
                    </div>

                    <Factory
                      size={21}
                    />
                  </div>

                  <div className="ma-mill-list">
                    {mills.map(
                      (
                        mill,
                        index
                      ) => {
                        const name =
                          mill?.name ||
                          mill?.mill ||
                          mill?.steelMill ||
                          "Not Specified";

                        return (
                          <button
                            type="button"
                            className="ma-mill-card ma-mill-card-button"
                            key={`${name}-${index}`}
                            onClick={() => {
                              setSearch(
                                ""
                              );

                              setSelectedMill(
                                name
                              );
                            }}
                          >
                            <span className="ma-rank">
                              #
                              {index +
                                1}
                            </span>

                            <div className="ma-mill-copy">
                              <strong>
                                {name}
                              </strong>

                              <span>
                                {formatMT(
                                  getNewOrderMT(
                                    mill
                                  )
                                )}
                              </span>

                              <small>
                                {safeNumber(
                                  mill?.orderCount ??
                                    mill?.orders
                                      ?.length
                                )}{" "}
                                Orders
                              </small>
                            </div>

                            <ChevronRight
                              size={18}
                            />
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>
              )}

            <OrderSearch
              value={search}
              onChange={
                setSearch
              }
            />

            <OrderCards
              orders={
                millOrders
              }
            />
          </>
        ) : view ===
          "grades" ? (
          <>
            {!selectedGrade ? (
              <section className="ma-section">
                <div className="ma-section-heading">
                  <div>
                    <span>
                      GRADE WISE
                    </span>

                    <h2>
                      Grade Analysis
                    </h2>
                  </div>

                  <Layers3
                    size={21}
                  />
                </div>

                {grades.length ? (
                  <div className="ma-grade-list">
                    {grades.map(
                      (
                        grade,
                        index
                      ) => {
                        const name =
                          typeof grade ===
                          "string"
                            ? grade
                            : grade?.grade ||
                              grade?.name ||
                              "-";

                        return (
                          <button
                            type="button"
                            className="ma-grade-card"
                            key={`${name}-${index}`}
                            onClick={() => {
                              setSearch(
                                ""
                              );

                              setSelectedGrade(
                                name
                              );
                            }}
                          >
                            <div>
                              <Layers3
                                size={19}
                              />
                            </div>

                            <span>
                              <strong>
                                {name}
                              </strong>

                              <small>
                                {formatMT(
                                  getNewOrderMT(
                                    grade
                                  )
                                )}
                              </small>
                            </span>

                            <ChevronRight
                              size={18}
                            />
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <EmptyState
                    text="No grade analysis is available in the current response."
                  />
                )}
              </section>
            ) : (
              <>
                <section className="ma-detail-hero ho">
                  <span>
                    GRADE ANALYSIS
                  </span>

                  <strong>
                    {
                      selectedGrade
                    }
                  </strong>

                  <div className="ma-detail-hero-grid">
                    <div>
                      <small>
                        Orders
                      </small>

                      <b>
                        {
                          gradeOrders.length
                        }
                      </b>
                    </div>

                    <div>
                      <small>
                        Quantity
                      </small>

                      <b>
                        {formatMT(
                          gradeOrders.reduce(
                            (
                              sum,
                              order
                            ) =>
                              sum +
                              getNewOrderMT(
                                order
                              ),
                            0
                          )
                        )}
                      </b>
                    </div>

                    <div>
                      <small>
                        Period
                      </small>

                      <b>
                        {getPeriodText(
                          appliedFilters
                        )}
                      </b>
                    </div>
                  </div>
                </section>

                <OrderSearch
                  value={
                    search
                  }
                  onChange={
                    setSearch
                  }
                />

                <OrderCards
                  orders={
                    gradeOrders
                  }
                />
              </>
            )}
          </>
        ) : (
          <>
            <section className="ma-section">
              <div className="ma-section-heading">
                <div>
                  <span>
                    ORDER DATABASE
                  </span>

                  <h2>
                    All Orders
                  </h2>
                </div>

                <Boxes
                  size={21}
                />
              </div>

              <p className="ma-section-description">
                {
                  searchedOrders.length
                }{" "}
                orders in the current
                selection.
              </p>
            </section>

            <OrderSearch
              value={search}
              onChange={
                setSearch
              }
            />

            <OrderCards
              orders={
                searchedOrders
              }
            />
          </>
        )}

        <div className="ma-bottom-space" />
      </div>
    </div>
  );
}

export default ManagementAnalysis;