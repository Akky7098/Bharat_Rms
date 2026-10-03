import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Factory,
  FileText,
  Layers3,
  MoreVertical,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  getManagementOrderAnalysis,
  getHouseOrderAnalysis,
  getSteelMillOrderAnalysis,
  getSteelMillDetail,
  downloadHouseOrderAnalysisPdf,
  downloadSteelMillOrderAnalysisPdf,
} from "../services/managementOrderAnalysisService";

import "./ManagementOrderAnalysis.css";


const MAIN_PERIODS = [1, 3, 6];

const MILL_PERIODS = [1, 3, 6, 12];

const SUPPLY_CONDITIONS = [
  {
    value: "ALL",
    label: "All Conditions",
  },
  {
    value: "as_per_standard",
    label: "As Per Standard",
  },
  {
    value: "as_rolled",
    label: "As Rolled",
  },
  {
    value: "as_forged",
    label: "As Forged",
  },
  {
    value: "as_rolled_or_as_forged",
    label: "As Rolled / As Forged",
  },
  {
    value: "as_rolled_annealed",
    label: "As Rolled Annealed",
  },
  {
    value: "as_forged_annealed",
    label: "As Forged Annealed",
  },
  {
    value: "as_rolled_or_forged_annealed",
    label: "Rolled / Forged Annealed",
  },
  {
    value: "as_rolled_normalised",
    label: "As Rolled Normalised",
  },
  {
    value: "as_rolled_or_as_forged_normalised",
    label: "Rolled / Forged Normalised",
  },
  {
    value: "as_rolled_qt",
    label: "As Rolled Q&T",
  },
  {
    value: "as_forged_qt",
    label: "As Forged Q&T",
  },
  {
    value: "as_rolled_or_as_forged_qt",
    label: "Rolled / Forged Q&T",
  },
  {
    value: "other",
    label: "Other",
  },
];

const GRADE_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#2563eb",
  "#db2777",
  "#ea580c",
  "#0f766e",
  "#9333ea",
  "#0284c7",
  "#65a30d",
];


const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


const formatNumber = (
  value,
  maximumFractionDigits = 0
) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
  }).format(
    safeNumber(value)
  );


const formatKG = (value) =>
  `${formatNumber(value)} KG`;


const formatCompactKG = (value) => {
  const kg = safeNumber(value);

  if (kg >= 1000000) {
    return `${formatNumber(
      kg / 1000000,
      2
    )}M KG`;
  }

  if (kg >= 100000) {
    return `${formatNumber(
      kg / 1000,
      1
    )}K KG`;
  }

  return formatKG(kg);
};


const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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


const getDateRange = (
  month,
  months
) => {
  if (!month) {
    return {
      from: "",
      to: "",
    };
  }

  const [
    year,
    monthNumber,
  ] = month
    .split("-")
    .map(Number);

  const period =
    Number(months) || 1;

  const start =
    new Date(
      year,
      monthNumber - period,
      1
    );

  const end =
    new Date(
      year,
      monthNumber,
      0
    );

  return {
    from: start,
    to: end,
  };
};


const getPeriodText = (
  month,
  months
) => {
  const {
    from,
    to,
  } = getDateRange(
    month,
    months
  );

  if (
    !from ||
    !to
  ) {
    return "";
  }

  return `${formatDate(
    from
  )} – ${formatDate(to)}`;
};


const unwrap = (response) =>
  response?.data ??
  response ??
  {};


const getSummary = (response) => {
  const data =
    unwrap(response);

  return (
    data?.summary ||
    data?.totals ||
    data
  );
};


const getOverallSummary = (
  response
) => {
  const summary =
    getSummary(response);

  return (
    summary?.combined ||
    summary?.overall ||
    summary?.total ||
    summary
  );
};


const getHouseSummary = (
  response
) => {
  const summary =
    getSummary(response);

  return (
    summary?.house ||
    summary?.ho ||
    summary?.headOffice ||
    unwrap(response)?.house ||
    {}
  );
};


const getMillSummary = (
  response
) => {
  const summary =
    getSummary(response);

  return (
    summary?.steelMill ||
    summary?.nho ||
    summary?.mill ||
    unwrap(response)?.steelMill ||
    {}
  );
};


const getQuantityKG = (
  object = {}
) => {
  const kg =
    object?.quantityKG ??
    object?.orderKG ??
    object?.orderQuantityKG ??
    object?.orderTakenKG ??
    object?.orderedKG ??
    object?.totalOrderKG ??
    object?.totalQuantityKG;

  if (
    kg !== undefined &&
    kg !== null
  ) {
    return safeNumber(kg);
  }

  const mt =
    object?.quantityMT ??
    object?.orderQuantityMT ??
    object?.orderedMT ??
    object?.newOrderMT ??
    object?.totalQuantityMT;

  if (
    mt !== undefined &&
    mt !== null
  ) {
    return (
      safeNumber(mt) *
      1000
    );
  }

  return 0;
};


const getOrderCount = (
  object = {}
) =>
  safeNumber(
    object?.orderCount ??
      object?.orders ??
      object?.count ??
      object?.totalOrders ??
      object?.ordersCount
  );


const getOrders = (response) => {
  const data =
    unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  const candidates = [
    data?.salesOrders,
    data?.orders,
    data?.orderDetails,
    data?.rows,

    data?.salesOrderDetails,
    data?.orderRegister,
    data?.records,
    data?.items,
    data?.results,

    data?.house?.salesOrders,
    data?.house?.orders,
    data?.house?.orderDetails,
    data?.house?.rows,

    data?.ho?.salesOrders,
    data?.ho?.orders,
    data?.ho?.orderDetails,
    data?.ho?.rows,

    data?.headOffice?.salesOrders,
    data?.headOffice?.orders,
    data?.headOffice?.orderDetails,
    data?.headOffice?.rows,

    data?.data?.salesOrders,
    data?.data?.orders,
    data?.data?.orderDetails,
    data?.data?.rows,
  ];

  const found =
    candidates.find(
      (value) =>
        Array.isArray(value)
    );

  return found || [];
};


const getGrades = (response) => {
  const data =
    unwrap(response);

  return (
    data?.grades ||
    data?.gradeSummary ||
    data?.gradeWise ||
    []
  );
};


const getMills = (response) => {
  const data =
    unwrap(response);

  return (
    data?.mills ||
    data?.millSummary ||
    data?.millWise ||
    []
  );
};


const getOrderQuantity = (
  order
) =>
  getQuantityKG(order);


const getCompany = (order) =>
  order?.companyName ||
  order?.customerName ||
  "—";


const getPo = (order) =>
  order?.poNumber ||
  order?.purchaseOrderNo ||
  order?.orderRef ||
  "—";


const getOrderDate = (
  order
) =>
  order?.orderDate ||
  order?.poDate ||
  order?.bookingDate ||
  order?.createdAt ||
  null;


const getSalesPerson = (
  order
) =>
  order?.salesPersonName ||
  order?.createdBy?.name ||
  "—";


const getMillName = (
  order
) => {
  const mill =
    order?.steelMill ||
    order?.mill ||
    order?.millName ||
    "";

  if (
    normalizeText(mill) ===
      "others" &&
    order?.otherSteelMill
  ) {
    return order.otherSteelMill;
  }

  return (
    mill ||
    "Not Specified"
  );
};


const getSupplyCondition = (
  order
) =>
  order?.supplyCondition ||
  "as_per_standard";


const getSupplyConditionLabel = (
  value,
  order = {}
) => {
  if (
    normalizeText(value) ===
    "other"
  ) {
    const otherText =
      String(
        order?.otherSupplyConditions ||
        order?.otherSupplyCondition ||
        order?.otherCondition ||
        order?.supplyConditionOther ||
        order?.supplyConditionDetails ||
        order?.customSupplyCondition ||
        ""
      ).trim();

    if (otherText) {
      return otherText;
    }

    console.warn(
      "OTHER SUPPLY CONDITION VALUE MISSING =>",
      order
    );

    return "Other";
  }

  const found =
    SUPPLY_CONDITIONS.find(
      (item) =>
        item.value === value
    );

  if (found) {
    return found.label;
  }

  return String(
    value || "—"
  )
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};


const getGradeNames = (
  order
) => {
  if (
    Array.isArray(
      order?.grades
    )
  ) {
    return order.grades
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }

        return (
          item?.grade ||
          item?.name
        );
      })
      .filter(Boolean);
  }

  if (
    Array.isArray(
      order?.analysisGrades
    )
  ) {
    return order.analysisGrades;
  }

  if (order?.grade) {
    return [order.grade];
  }

  return [];
};


const getMaterial = (
  order
) =>
  order?.sizeGradeQuantityRate ||
  order?.materialDetails ||
  order?.analysisMaterialDetails ||
  "—";




const getGradeDisplay = (
  order = {}
) => {
  const grades =
    getGradeNames(order);

  return grades.length
    ? grades.join(", ")
    : "—";
};


const getOrderId = (
  order = {}
) =>
  order?.salesOrderNo ||
  order?.orderNumber ||
  order?.salesOrderId ||
  order?._id ||
  "—";





const normalizeGrade = (
  row,
  index
) => {
  const grade =
    row?.grade ||
    row?.name ||
    row?.gradeName ||
    `Grade ${index + 1}`;

  const houseKG =
    getQuantityKG(
      row?.house ||
        row?.ho ||
        {
          quantityKG:
            row?.houseKG ??
            row?.hoKG,
        }
    );

  const millKG =
    getQuantityKG(
      row?.steelMill ||
        row?.nho ||
        {
          quantityKG:
            row?.steelMillKG ??
            row?.nhoKG,
        }
    );

  const directTotal =
    getQuantityKG(row);

  return {
    ...row,
    grade,
    houseKG,
    millKG,

    totalKG:
      directTotal ||
      houseKG +
        millKG,

    orderCount:
      getOrderCount(row),

    color:
      GRADE_COLORS[
        index %
          GRADE_COLORS.length
      ],
  };
};


const normalizeMill = (
  row,
  index
) => ({
  ...row,

  mill:
    row?.steelMill ||
    row?.mill ||
    row?.millName ||
    row?.name ||
    `Mill ${index + 1}`,

  quantityKG:
    getQuantityKG(row),

  orderCount:
    getOrderCount(row),
});


function PeriodFilter({
  month,
  months,
  periods,
  onMonthChange,
  onMonthsChange,
  showMonth = true,
  disabled = false,
}) {
  return (
    <div className="moa-period-filter">
      {showMonth && (
        <label className="moa-field">
          <span>
            ENDING MONTH
          </span>

          <input
            type="month"
            value={month}
            disabled={disabled}
            onChange={(
              event
            ) =>
              onMonthChange?.(
                event.target.value
              )
            }
          />
        </label>
      )}

      <div className="moa-period-block">
        <span>
          PERIOD
        </span>

        <div className="moa-period-buttons">
          {periods.map(
            (period) => (
              <button
                type="button"
                key={period}
                disabled={
                  disabled
                }
                className={
                  Number(
                    months
                  ) ===
                  period
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onMonthsChange?.(
                    period
                  )
                }
              >
                {period}M
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}


function EmptyState({
  title = "No order data",
  text = "No sales orders are available for the selected analysis.",
}) {
  return (
    <div className="moa-empty">
      <PackageSearch
        size={28}
      />

      <strong>
        {title}
      </strong>

      <span>
        {text}
      </span>
    </div>
  );
}


function LoadingState({
  text = "Loading order analysis...",
}) {
  return (
    <div className="moa-loading">
      <div>
        <RefreshCw
          size={23}
        />
      </div>

      <strong>
        Management Order Analysis
      </strong>

      <span>
        {text}
      </span>
    </div>
  );
}


function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  right,
}) {
  return (
    <div className="moa-section-header">
      <div>
        <span>
          {eyebrow}
        </span>

        <h3>
          {title}
        </h3>

        {description && (
          <p>
            {description}
          </p>
        )}
      </div>

      {right ||
        (Icon && (
          <div className="moa-section-icon">
            <Icon size={19} />
          </div>
        ))}
    </div>
  );
}


function GradeChart({
  grades,
  route = "ALL",
  selectedGrade,
  onGradeClick,
}) {
  const rows =
    useMemo(
      () =>
        (grades || [])
          .map(
            normalizeGrade
          )
          .map((row) => {
            let quantity =
              row.totalKG;

            if (
              route === "HO"
            ) {
              quantity =
                row.houseKG ||
                row.totalKG;
            }

            if (
              route === "MILL"
            ) {
              quantity =
                row.millKG ||
                row.totalKG;
            }

            return {
              ...row,
              quantity,
            };
          })
          .filter(
            (row) =>
              row.quantity > 0
          )
          .sort(
            (a, b) =>
              b.quantity -
              a.quantity
          ),
      [
        grades,
        route,
      ]
    );

  const max =
    Math.max(
      1,
      ...rows.map(
        (row) =>
          row.quantity
      )
    );

  if (!rows.length) {
    return (
      <EmptyState
        title="No grade data"
        text="No grade-wise order quantity is available for this period."
      />
    );
  }

  return (
    <div className="moa-grade-chart">
      {rows.map(
        (row) => {
          const width =
            Math.max(
              3,
              (row.quantity /
                max) *
                100
            );

          return (
            <button
              type="button"
              key={row.grade}
              className={`moa-grade-row ${
                selectedGrade ===
                row.grade
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                onGradeClick?.(
                  row.grade
                )
              }
            >
              <div className="moa-grade-head">
                <div>
                  <i
                    style={{
                      background:
                        row.color,
                    }}
                  />

                  <strong>
                    {row.grade}
                  </strong>
                </div>

                <b>
                  {formatKG(
                    row.quantity
                  )}
                </b>
              </div>

              <div className="moa-grade-bar">
                <div
                  style={{
                    width:
                      `${width}%`,
                    background:
                      row.color,
                  }}
                />
              </div>

              <div className="moa-grade-footer">
                <span>
                  {formatNumber(
                    row.orderCount
                  )}{" "}
                  orders
                </span>

                {route ===
                  "ALL" && (
                  <>
                    <span>
                      H.O.{" "}
                      <b>
                        {formatCompactKG(
                          row.houseKG
                        )}
                      </b>
                    </span>

                    <span>
                      Mill{" "}
                      <b>
                        {formatCompactKG(
                          row.millKG
                        )}
                      </b>
                    </span>
                  </>
                )}

                <ChevronRight
                  size={13}
                />
              </div>
            </button>
          );
        }
      )}
    </div>
  );
}


function OrderCard({
  order,
  showMill = false,
  showSupply = false,
}) {
  const grades =
    getGradeNames(order);

  const orderedKG =
    getOrderQuantity(order);

  return (
    <article className="moa-order-card moa-order-card-detailed">
      <div className="moa-order-card-accent" />

      <div className="moa-order-top">
        <div className="moa-order-company">
          <span>
            SALES ORDER
          </span>

          <strong>
            {getCompany(
              order
            )}
          </strong>

          <small>
            PO No.{" "}
            <b>
              {getPo(order)}
            </b>
          </small>
        </div>

        <div className="moa-order-quantity">
          <span>
            ORDER QTY
          </span>

          <strong>
            {formatKG(
              orderedKG
            )}
          </strong>
        </div>
      </div>

      <div className="moa-order-detail-grid">
        <div>
          <span>
            Order Date
          </span>

          <strong>
            {formatDate(
              getOrderDate(
                order
              )
            )}
          </strong>
        </div>

        <div>
          <span>
            PO Number
          </span>

          <strong>
            {getPo(order)}
          </strong>
        </div>

        <div>
          <span>
            Grade
          </span>

          <strong>
            {getGradeDisplay(
              order
            )}
          </strong>
        </div>

        <div>
          <span>
            Sales Person
          </span>

          <strong>
            {getSalesPerson(
              order
            )}
          </strong>
        </div>

        {showMill && (
          <div>
            <span>
              Steel Mill
            </span>

            <strong>
              {getMillName(
                order
              )}
            </strong>
          </div>
        )}

        {showSupply && (
          <div>
            <span>
              Supply Condition
            </span>

            <strong>
  {getSupplyConditionLabel(
    getSupplyCondition(
      order
    ),
    order
  )}
</strong>
          </div>
        )}
      </div>

      {!!grades.length && (
        <div className="moa-order-grades">
          {grades.map(
            (
              grade,
              index
            ) => (
              <span
                key={`${grade}-${index}`}
              >
                {grade}
              </span>
            )
          )}
        </div>
      )}

      <div className="moa-order-material">
        <span>
          MATERIAL DETAILS
        </span>

        <p>
          {getMaterial(
            order
          )}
        </p>
      </div>
    </article>
  );
}


function OrderRegister({
  orders,
  selectedGrade,
  onClearGrade,
  showMill = false,
  showSupply = false,
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const filtered =
    useMemo(() => {
      let result =
        orders || [];

      if (
        selectedGrade
      ) {
        result =
          result.filter(
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
      }

      const query =
        normalizeText(
          search
        );

      if (query) {
        result =
          result.filter(
            (order) => {
              const content = [
                getCompany(
                  order
                ),
                getPo(order),
                getSalesPerson(
                  order
                ),
                getMillName(
                  order
                ),
                getSupplyConditionLabel(
  getSupplyCondition(
    order
  ),
  order
),
                ...getGradeNames(
                  order
                ),
              ]
                .join(" ")
                .toLowerCase();

              return content.includes(
                query
              );
            }
          );
      }

      return result;
    }, [
      orders,
      search,
      selectedGrade,
    ]);

  return (
    <>
      <div className="moa-order-toolbar">
        <div className="moa-search">
          <Search
            size={15}
          />

          <input
            value={search}
            placeholder="Search company, PO, grade, salesperson..."
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="moa-register-right">
          {selectedGrade && (
            <button
              type="button"
              className="moa-selected-filter"
              onClick={
                onClearGrade
              }
            >
              Grade:{" "}
              {selectedGrade}

              <X size={12} />
            </button>
          )}

          <span>
            {formatNumber(
              filtered.length
            )}{" "}
            orders
          </span>
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState />
      ) : (
        <div className="moa-order-list">
          {filtered.map(
            (
              order,
              index
            ) => (
              <OrderCard
                key={
                  order?._id ||
                  order?.id ||
                  `${getPo(
                    order
                  )}-${index}`
                }
                order={order}
                showMill={
                  showMill
                }
                showSupply={
                  showSupply
                }
              />
            )
          )}
        </div>
      )}
    </>
  );
}


function DetailKpis({
  quantity,
  orderCount,
  thirdLabel,
  thirdValue,
}) {
  return (
    <div className="moa-detail-kpis">
      <div>
        <span>
          ORDER QUANTITY
        </span>

        <strong>
          {formatKG(
            quantity
          )}
        </strong>
      </div>

      <div>
        <span>
          SALES ORDERS
        </span>

        <strong>
          {formatNumber(
            orderCount
          )}
        </strong>
      </div>

      <div>
        <span>
          {thirdLabel}
        </span>

        <strong className="moa-detail-text-value">
          {thirdValue}
        </strong>
      </div>
    </div>
  );
}


function HouseDrillDown({
  response,
  month,
  months,
  loading,
}) {
  const [
    selectedGrade,
    setSelectedGrade,
  ] = useState("");

  const summary =
    getHouseSummary(
      response
    );

  const grades =
    getGrades(response);

  const orders =
    getOrders(response);

  const totalOrderedKG =
    orders.reduce(
      (
        total,
        order
      ) =>
        total +
        getOrderQuantity(
          order
        ),
      0
    );

  const quantity =
    getQuantityKG(
      summary
    ) ||
    totalOrderedKG;

  const orderCount =
    getOrderCount(
      summary
    ) ||
    orders.length;

  if (loading) {
    return (
      <LoadingState
        text="Loading H.O. orders..."
      />
    );
  }

  return (
    <section className="moa-drill-view moa-drill-view-single-header moa-house-view">

      <div className="moa-house-mobile-summary">
        <div>
          <span>
            HEAD OFFICE
          </span>

          <strong>
            H.O. Order Analysis
          </strong>

          <small>
            {getPeriodText(
              month,
              months
            )}
          </small>
        </div>
      </div>

      <div className="moa-house-kpis moa-house-kpis-orders-only">
        <article>
          <span className="moa-house-kpi-icon primary">
            <Layers3
              size={18}
            />
          </span>

          <div>
            <small>
              ORDER QUANTITY
            </small>

            <strong>
              {formatKG(
                quantity
              )}
            </strong>
          </div>
        </article>

        <article>
          <span className="moa-house-kpi-icon orders">
            <FileText
              size={18}
            />
          </span>

          <div>
            <small>
              SALES ORDERS
            </small>

            <strong>
              {formatNumber(
                orderCount
              )}
            </strong>
          </div>
        </article>
      </div>

      <div className="moa-house-analysis-layout">

        <section className="moa-panel moa-house-grade-panel">
          <SectionHeader
            eyebrow="GRADE INSIGHT"
            title="H.O. Grade Mix"
            description="Select a grade to filter the H.O. order register."
            icon={
              BarChart3
            }
          />

          <GradeChart
            grades={
              grades
            }
            route="HO"
            selectedGrade={
              selectedGrade
            }
            onGradeClick={(
              grade
            ) =>
              setSelectedGrade(
                (
                  current
                ) =>
                  current ===
                  grade
                    ? ""
                    : grade
              )
            }
          />
        </section>

        <section className="moa-panel moa-house-register-panel">
          <SectionHeader
            eyebrow="ORDER REGISTER"
            title={
              selectedGrade
                ? `${selectedGrade} H.O. Orders`
                : "H.O. Sales Order Register"
            }
            description={
              selectedGrade
                ? "Orders containing the selected grade."
                : "Customer, PO, grade and order quantity."
            }
            icon={
              PackageSearch
            }
          />

          <OrderRegister
            orders={
              orders
            }
            selectedGrade={
              selectedGrade
            }
            onClearGrade={() =>
              setSelectedGrade(
                ""
              )
            }
          />
        </section>

      </div>
    </section>
  );
}


function SteelMillList({
  response,
  loading,
  onSelectMill,
 
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const summary =
    getMillSummary(
      response
    );

  const mills =
    useMemo(
      () =>
        getMills(response)
          .map(
            normalizeMill
          )
          .sort(
            (a, b) =>
              b.quantityKG -
              a.quantityKG
          ),
      [response]
    );

  const filtered =
    useMemo(() => {
      const query =
        normalizeText(
          search
        );

      if (!query) {
        return mills;
      }

      return mills.filter(
        (mill) =>
          normalizeText(
            mill.mill
          ).includes(query)
      );
    }, [
      mills,
      search,
    ]);

  const totalKG =
    getQuantityKG(
      summary
    );

  const orderCount =
    getOrderCount(
      summary
    );

  return (
  <section className="moa-drill-view moa-drill-view-single-header moa-steel-mill-list-view">

    {/* =========================================
        LOADING
    ========================================= */}
      {loading ? (
        <LoadingState
          text="Loading Steel Mill orders..."
        />
      ) : (
        <>

          {/* =====================================
              KPI
          ===================================== */}

          <DetailKpis
            quantity={
              totalKG
            }
            orderCount={
              orderCount
            }
            thirdLabel="ACTIVE MILLS"
            thirdValue={
              formatNumber(
                mills.length
              )
            }
          />


          {/* =====================================
              MILL TABLE PANEL
          ===================================== */}

          <section className="moa-panel moa-steel-mill-table-panel">

            <SectionHeader
              eyebrow="MILL-WISE INSIGHT"
              title="Steel Mill Orders"
              description="Select a mill to see its grade, supply condition and individual order analysis."
              icon={Factory}
              right={
                <div className="moa-small-search">
                  <Search
                    size={14}
                  />

                  <input
                    value={
                      search
                    }
                    placeholder="Search mill..."
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                    }
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      <X
                        size={13}
                      />
                    </button>
                  )}
                </div>
              }
            />


            {!filtered.length ? (
              <EmptyState
                title="No steel mills"
                text="No steel mill orders are available for the selected period."
              />
            ) : (
              <>

                {/* ===============================
                    DESKTOP TABLE
                =============================== */}

                <div className="moa-mill-structured-table-wrap">

                  <table className="moa-mill-structured-table">

                    <thead>
                      <tr>
                        <th className="moa-mill-col-mill">
                          STEEL MILL
                        </th>

                        <th className="moa-mill-col-orders">
                          ORDERS
                        </th>

                        <th className="moa-mill-col-quantity">
                          ORDER QUANTITY
                        </th>

                        <th className="moa-mill-col-share">
                          SHARE
                        </th>

                        <th className="moa-mill-col-action">
                          VIEW
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {filtered.map(
                        (
                          mill,
                          index
                        ) => {
                          const share =
                            totalKG > 0
                              ? (
                                  mill.quantityKG /
                                  totalKG
                                ) *
                                100
                              : 0;

                          return (
                            <tr
                              key={
                                mill.mill
                              }
                              onClick={() =>
                                onSelectMill(
                                  mill.mill
                                )
                              }
                            >

                              {/* MILL */}

                              <td className="moa-mill-col-mill">
                                <div className="moa-mill-table-name">

                                  <span className="moa-mill-table-number">
                                    {String(
                                      index + 1
                                    ).padStart(
                                      2,
                                      "0"
                                    )}
                                  </span>

                                  <span className="moa-mill-table-icon">
                                    <Factory
                                      size={16}
                                    />
                                  </span>

                                  <div>
                                    <strong>
                                      {mill.mill}
                                    </strong>

                                    <small>
                                      Steel Mill
                                    </small>
                                  </div>

                                </div>
                              </td>


                              {/* ORDERS */}

                              <td className="moa-mill-col-orders">
                                <div className="moa-mill-order-count">
                                  <strong>
                                    {formatNumber(
                                      mill.orderCount
                                    )}
                                  </strong>

                                  <small>
                                    {mill.orderCount ===
                                    1
                                      ? "Order"
                                      : "Orders"}
                                  </small>
                                </div>
                              </td>


                              {/* QUANTITY */}

                              <td className="moa-mill-col-quantity">
                                <strong className="moa-mill-table-quantity">
                                  {formatKG(
                                    mill.quantityKG
                                  )}
                                </strong>
                              </td>


                              {/* SHARE */}

                              <td className="moa-mill-col-share">

                                <div className="moa-mill-share-cell">

                                  <div className="moa-mill-share-value">
                                    <strong>
                                      {formatNumber(
                                        share,
                                        1
                                      )}
                                      %
                                    </strong>
                                  </div>

                                  <div className="moa-mill-share-track">
                                    <span
                                      style={{
                                        width:
                                          `${Math.min(
                                            100,
                                            Math.max(
                                              0,
                                              share
                                            )
                                          )}%`,
                                      }}
                                    />
                                  </div>

                                </div>

                              </td>


                              {/* ACTION */}

                              <td className="moa-mill-col-action">

                                <button
                                  type="button"
                                  className="moa-mill-view-button"
                                  aria-label={`View ${mill.mill}`}
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    onSelectMill(
                                      mill.mill
                                    );
                                  }}
                                >
                                  <ChevronRight
                                    size={17}
                                  />
                                </button>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>


                {/* ===============================
                    MOBILE CARDS
                =============================== */}

                <div className="moa-mobile-mills">

                  {filtered.map(
                    (
                      mill,
                      index
                    ) => {
                      const share =
                        totalKG > 0
                          ? (
                              mill.quantityKG /
                              totalKG
                            ) *
                            100
                          : 0;

                      return (
                        <button
                          type="button"
                          key={
                            mill.mill
                          }
                          onClick={() =>
                            onSelectMill(
                              mill.mill
                            )
                          }
                        >

                          <div className="moa-mobile-mill-left">

                            <span className="moa-mobile-mill-number">
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <i>
                              <Factory
                                size={16}
                              />
                            </i>

                            <span>
                              <strong>
                                {mill.mill}
                              </strong>

                              <small>
                                {formatNumber(
                                  mill.orderCount
                                )}{" "}
                                {mill.orderCount ===
                                1
                                  ? "order"
                                  : "orders"}
                              </small>
                            </span>

                          </div>

                          <div className="moa-mobile-mill-right">

                            <span>
                              <b>
                                {formatCompactKG(
                                  mill.quantityKG
                                )}
                              </b>

                              <small>
                                {formatNumber(
                                  share,
                                  1
                                )}
                                % share
                              </small>
                            </span>

                            <ChevronRight
                              size={16}
                            />

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </>
            )}

          </section>

        </>
      )}

    </section>
  );
}


function MillDrillDown({
  mill,
  initialMonth,
  initialMonths,
}) {
  const [
    month,
    setMonth,
  ] = useState(
    initialMonth
  );

  const [
    months,
    setMonths,
  ] = useState(
    MILL_PERIODS.includes(
      Number(
        initialMonths
      )
    )
      ? Number(
          initialMonths
        )
      : 1
  );

  const [
    supplyCondition,
    setSupplyCondition,
  ] = useState("ALL");

  const [
    response,
    setResponse,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pdfMenuOpen,
    setPdfMenuOpen,
  ] = useState(false);

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState("");

  const requestIdRef =
    useRef(0);

  const pageSize = 100;


  const loadMill =
    useCallback(
      async () => {
        const requestId =
          ++requestIdRef.current;

        try {
          setLoading(true);
          setError("");

          const result =
            await getSteelMillDetail(
              mill,
              {
                month,
                months,
              }
            );

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setResponse(
            result
          );
        } catch (err) {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setError(
              err?.message ||
                "Unable to load steel mill analysis."
            );
          }
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        mill,
        month,
        months,
      ]
    );


  useEffect(() => {
    loadMill();

    return () => {
      requestIdRef.current +=
        1;
    };
  }, [loadMill]);


  useEffect(() => {
    setPage(1);
  }, [
    search,
    supplyCondition,
    month,
    months,
    mill,
  ]);


  const allOrders =
    getOrders(
      response
    );


  const filteredOrders =
    useMemo(() => {
      let result =
        allOrders || [];

      if (
        supplyCondition !==
        "ALL"
      ) {
        result =
          result.filter(
            (order) =>
              getSupplyCondition(
                order
              ) ===
              supplyCondition
          );
      }

      const query =
        normalizeText(
          search
        );

      if (query) {
        result =
          result.filter(
            (order) => {
              const searchable =
                [
                  getCompany(
                    order
                  ),
                  getPo(
                    order
                  ),
                  getGradeDisplay(
                    order
                  ),
                  getSalesPerson(
                    order
                  ),
                  getSupplyConditionLabel(
  getSupplyCondition(
    order
  ),
  order
),
                  getMaterial(
                    order
                  ),
                  getOrderId(
                    order
                  ),
                ]
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                query
              );
            }
          );
      }

      return result;
    }, [
      allOrders,
      supplyCondition,
      search,
    ]);


  const totalQuantity =
    useMemo(
      () =>
        filteredOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            getOrderQuantity(
              order
            ),
          0
        ),
      [
        filteredOrders,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
          pageSize
      )
    );


  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);


  const pageStart =
    (page - 1) *
    pageSize;


  const pageOrders =
    filteredOrders.slice(
      pageStart,
      pageStart +
        pageSize
    );


  const firstVisible =
    filteredOrders.length
      ? pageStart + 1
      : 0;


  const lastVisible =
    Math.min(
      pageStart +
        pageSize,
      filteredOrders.length
    );


 const handlePdfDownload =
  async (
    includeCustomerName
  ) => {
    if (pdfLoading) {
      return;
    }

    if (!mill) {
      window.alert(
        "Please select a Steel Mill first."
      );

      return;
    }

    const type =
      includeCustomerName
        ? "with"
        : "without";

    try {
      setPdfLoading(
        type
      );

      setPdfMenuOpen(
        false
      );

      await downloadSteelMillOrderAnalysisPdf(
        mill,
        {
          month,
          months,

          supplyCondition:
            supplyCondition ===
            "ALL"
              ? ""
              : supplyCondition,
        },
        includeCustomerName
      );
    } catch (err) {
      console.error(
        "STEEL MILL PDF DOWNLOAD ERROR =>",
        err
      );

      window.alert(
        err?.message ||
          "Unable to download Steel Mill PDF."
      );
    } finally {
      setPdfLoading(
        ""
      );
    }
  };


  return (
    <section className="moa-mill-clean-view">

      {/* =========================================
          SINGLE MILL HEADER
      ========================================= */}

      <div className="moa-mill-unified-toolbar moa-mill-unified-toolbar-filter-only">

       


        <div className="moa-mill-toolbar-filters">

          <label className="moa-mill-toolbar-field">

            <span>
              ENDING MONTH
            </span>

            <input
              type="month"
              value={month}
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setMonth(
                  event.target.value
                )
              }
            />

          </label>


          <div className="moa-mill-toolbar-period">

            <span>
              PERIOD
            </span>

            <div>

              {MILL_PERIODS.map(
                (
                  period
                ) => (
                  <button
                    type="button"
                    key={
                      period
                    }
                    disabled={
                      loading
                    }
                    className={
                      Number(
                        months
                      ) ===
                      period
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setMonths(
                        period
                      )
                    }
                  >
                    {period}M
                  </button>
                )
              )}

            </div>

          </div>


          <label className="moa-mill-toolbar-supply">

            <span>
              SUPPLY CONDITION
            </span>

            <div>

              <SlidersHorizontal
                size={14}
              />

              <select
                value={
                  supplyCondition
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  setSupplyCondition(
                    event.target.value
                  )
                }
              >

                {SUPPLY_CONDITIONS.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}

              </select>

              <ChevronDown
                size={14}
              />

            </div>

          </label>

        </div>


        <div className="moa-mill-toolbar-actions">

          <div className="moa-mill-pdf-wrap">

            <button
              type="button"
              className={`moa-mill-pdf-main ${
                pdfLoading
                  ? "is-loading"
                  : ""
              }`}
              disabled={
                loading ||
                Boolean(
                  pdfLoading
                )
              }
              onClick={() =>
                setPdfMenuOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
            >

              {pdfLoading ? (
                <RefreshCw
                  size={16}
                  className="moa-spin"
                />
              ) : (
                <Download
                  size={16}
                />
              )}

              <span>
                {pdfLoading
                  ? "Preparing..."
                  : "Download PDF"}
              </span>

              {!pdfLoading && (
                <ChevronDown
                  size={14}
                />
              )}

            </button>


            {pdfMenuOpen && (
              <div className="moa-mill-pdf-menu">

                <button
                  type="button"
                  onClick={() =>
                    handlePdfDownload(
                      true
                    )
                  }
                >
                  <FileText
                    size={15}
                  />

                  <span>
                    <strong>
                      With Customer Name
                    </strong>

                    <small>
                      Include customer/company name
                    </small>
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    handlePdfDownload(
                      false
                    )
                  }
                >
                  <FileText
                    size={15}
                  />

                  <span>
                    <strong>
                      Without Customer Name
                    </strong>

                    <small>
                      Hide customer/company name
                    </small>
                  </span>
                </button>

              </div>
            )}

          </div>


          <button
            type="button"
            className="moa-mill-refresh-button"
            disabled={
              loading ||
              Boolean(
                pdfLoading
              )
            }
            onClick={
              loadMill
            }
            title="Refresh mill analysis"
            aria-label="Refresh mill analysis"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "moa-spin"
                  : ""
              }
            />
          </button>

        </div>

      </div>


      {/* =========================================
          ERROR
      ========================================= */}

      {error && (
        <div className="moa-error">

          <AlertCircle
            size={16}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={
              loadMill
            }
          >
            Retry
          </button>

        </div>
      )}


      {/* =========================================
          ORDER REGISTER ONLY
      ========================================= */}

      {loading ? (
        <LoadingState
          text={`Loading ${mill} orders...`}
        />
      ) : (
        <section className="moa-panel moa-mill-final-register">

          <div className="moa-mill-register-head">

            <div>

              <span>
                ORDER REGISTER
              </span>

              <h3>
                {mill} Orders
              </h3>

              <p>
                Mill-wise sales orders for the selected period and supply condition.
              </p>

            </div>


            <div className="moa-mill-register-stats">

              <span>
                <small>
                  ORDERS
                </small>

                <strong>
                  {formatNumber(
                    filteredOrders.length
                  )}
                </strong>
              </span>

              <span>
                <small>
                  QUANTITY
                </small>

                <strong>
                  {formatKG(
                    totalQuantity
                  )}
                </strong>
              </span>

            </div>

          </div>


          <div className="moa-mill-register-toolbar">

            <div className="moa-mill-order-search">

              <Search
                size={15}
              />

              <input
                value={
                  search
                }
                placeholder="Search customer, PO, grade, salesperson, material..."
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X
                    size={14}
                  />
                </button>
              )}

            </div>


            <div className="moa-mill-register-range">

              <strong>
                {firstVisible}
                {" – "}
                {lastVisible}
              </strong>

              <span>
                of{" "}
                {formatNumber(
                  filteredOrders.length
                )}{" "}
                orders
              </span>

            </div>

          </div>


          {!filteredOrders.length ? (
            <EmptyState
              title="No mill orders"
              text="No orders match the selected period, supply condition or search."
            />
          ) : (
            <>

              {/* =====================================
                  DESKTOP TABLE
              ===================================== */}

              <div className="moa-mill-order-table-wrap">

                <table className="moa-mill-order-table">

                  <thead>
                    <tr>

                      <th className="moa-mot-sr">
                        #
                      </th>

                      <th className="moa-mot-date">
                        ORDER DATE
                      </th>

                      <th className="moa-mot-customer">
                        CUSTOMER
                      </th>

                      <th className="moa-mot-po">
                        PO NUMBER
                      </th>

                      <th className="moa-mot-grade">
                        GRADE
                      </th>

                      <th className="moa-mot-supply">
                        SUPPLY CONDITION
                      </th>

                      <th className="moa-mot-sales">
                        SALES PERSON
                      </th>

                      <th className="moa-mot-qty">
                        ORDER QTY
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    {pageOrders.map(
                      (
                        order,
                        index
                      ) => (
                        <tr
                          key={
                            order?._id ||
                            order?.id ||
                            `${getPo(
                              order
                            )}-${index}`
                          }
                        >

                          <td className="moa-mot-sr">
                            {String(
                              pageStart +
                                index +
                                1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </td>


                          <td className="moa-mot-date">

                            <strong>
                              {formatDate(
                                getOrderDate(
                                  order
                                )
                              )}
                            </strong>

                          </td>


                          <td className="moa-mot-customer">

                            <strong
                              title={
                                getCompany(
                                  order
                                )
                              }
                            >
                              {getCompany(
                                order
                              )}
                            </strong>

                          </td>


                          <td className="moa-mot-po">

                            <span
                              title={
                                getPo(
                                  order
                                )
                              }
                            >
                              {getPo(
                                order
                              )}
                            </span>

                          </td>


                          <td className="moa-mot-grade">

                            <span
                              title={
                                getGradeDisplay(
                                  order
                                )
                              }
                            >
                              {getGradeDisplay(
                                order
                              )}
                            </span>

                          </td>


                          <td className="moa-mot-supply">

                            <span className="moa-mill-supply-badge">
                              {getSupplyConditionLabel(
  getSupplyCondition(
    order
  ),
  order
)}
                            </span>

                          </td>


                          <td className="moa-mot-sales">

                            <span>
                              {getSalesPerson(
                                order
                              )}
                            </span>

                          </td>


                          <td className="moa-mot-qty">

                            <strong>
                              {formatKG(
                                getOrderQuantity(
                                  order
                                )
                              )}
                            </strong>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* =====================================
                  MOBILE CARDS
              ===================================== */}

              <div className="moa-mill-mobile-orders">

                {pageOrders.map(
                  (
                    order,
                    index
                  ) => (
                    <article
                      className="moa-mill-mobile-order"
                      key={
                        order?._id ||
                        order?.id ||
                        `${getPo(
                          order
                        )}-mobile-${index}`
                      }
                    >

                      <div className="moa-mmo-top">

                        <span className="moa-mmo-number">
                          {String(
                            pageStart +
                              index +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>


                        <div className="moa-mmo-company">

                          <span>
                            SALES ORDER
                          </span>

                          <strong>
                            {getCompany(
                              order
                            )}
                          </strong>

                          <small>
                            PO{" "}
                            {getPo(
                              order
                            )}
                          </small>

                        </div>


                        <div className="moa-mmo-quantity">

                          <span>
                            ORDER QTY
                          </span>

                          <strong>
                            {formatCompactKG(
                              getOrderQuantity(
                                order
                              )
                            )}
                          </strong>

                        </div>

                      </div>


                      <div className="moa-mmo-grid">

                        <div>
                          <span>
                            ORDER DATE
                          </span>

                          <strong>
                            {formatDate(
                              getOrderDate(
                                order
                              )
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            GRADE
                          </span>

                          <strong>
                            {getGradeDisplay(
                              order
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            SUPPLY CONDITION
                          </span>

                          <strong>
  {getSupplyConditionLabel(
    getSupplyCondition(
      order
    ),
    order
  )}
</strong>
                        </div>


                        <div>
                          <span>
                            SALES PERSON
                          </span>

                          <strong>
                            {getSalesPerson(
                              order
                            )}
                          </strong>
                        </div>

                      </div>


                      <div className="moa-mmo-material">

                        <span>
                          MATERIAL DETAILS
                        </span>

                        <p>
                          {getMaterial(
                            order
                          )}
                        </p>

                      </div>

                    </article>
                  )
                )}

              </div>


              {/* =====================================
                  PAGINATION
              ===================================== */}

              <div className="moa-mill-pagination">

                <div>
                  <strong>
                    {firstVisible}
                    {" – "}
                    {lastVisible}
                  </strong>

                  <span>
                    of{" "}
                    {formatNumber(
                      filteredOrders.length
                    )}{" "}
                    orders
                  </span>

                  <small>
                    100 per page
                  </small>
                </div>


                <div className="moa-mill-pagination-controls">

                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                  >
                    Previous
                  </button>


                  <span>
                    Page{" "}
                    <strong>
                      {page}
                    </strong>
                    {" of "}
                    <strong>
                      {totalPages}
                    </strong>
                  </span>


                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            totalPages,
                            current +
                              1
                          )
                      )
                    }
                  >
                    Next
                  </button>

                </div>

              </div>

            </>
          )}

        </section>
      )}

    </section>
  );
}


function OrderRouteColumnChart({
  houseKG,
  houseOrders,
  millKG,
  millOrders,
  onHouse,
  onSteelMill,
}) {
  const data = [
    {
      key: "house",
      name: "H.O.",
      fullName: "Head Office",

      quantityKG:
        safeNumber(houseKG),

      orders:
        safeNumber(houseOrders),
    },
    {
      key: "mill",
      name: "Steel Mill",

      fullName:
        "Steel Mill",

      quantityKG:
        safeNumber(millKG),

      orders:
        safeNumber(millOrders),
    },
  ];

  const totalKG =
    data.reduce(
      (sum, item) =>
        sum +
        item.quantityKG,
      0
    );

  const totalOrders =
    data.reduce(
      (sum, item) =>
        sum +
        item.orders,
      0
    );

  const formatAxisKG = (
    value
  ) => {
    const number =
      safeNumber(value);

    if (number >= 100000) {
      return `${formatNumber(
        number / 100000,
        1
      )}L`;
    }

    if (number >= 1000) {
      return `${formatNumber(
        number / 1000,
        0
      )}K`;
    }

    return formatNumber(
      number
    );
  };

  const renderTopLabel = (
    props
  ) => {
    const {
      x,
      y,
      width,
      value,
    } = props;

    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    return (
      <text
        x={
          x +
          width / 2
        }
        y={y - 12}
        textAnchor="middle"
        className="moa-route-bar-value"
      >
        {formatNumber(
          value
        )}
      </text>
    );
  };

  const RouteTooltip = ({
    active,
    payload,
  }) => {
    if (
      !active ||
      !payload?.length
    ) {
      return null;
    }

    const row =
      payload[0]?.payload;

    if (!row) {
      return null;
    }

    const percentage =
      totalKG > 0
        ? (
            row.quantityKG /
            totalKG
          ) *
          100
        : 0;

    return (
      <div className="moa-route-tooltip">
        <div className="moa-route-tooltip-head">
          <span
            className={`moa-route-tooltip-icon ${
              row.key ===
              "house"
                ? "house"
                : "mill"
            }`}
          >
            {row.key ===
            "house" ? (
              <Building2
                size={17}
              />
            ) : (
              <Factory
                size={17}
              />
            )}
          </span>

          <div>
            <small>
              {row.fullName}
            </small>

            <strong>
              {row.name}
            </strong>
          </div>
        </div>

        <div className="moa-route-tooltip-divider" />

        <div className="moa-route-tooltip-row">
          <span>
            Order Quantity
          </span>

          <strong>
            {formatKG(
              row.quantityKG
            )}
          </strong>
        </div>

        <div className="moa-route-tooltip-row">
          <span>
            Orders
          </span>

          <strong>
            {formatNumber(
              row.orders
            )}
          </strong>
        </div>

        <div className="moa-route-tooltip-row">
          <span>
            Share
          </span>

          <strong>
            {formatNumber(
              percentage,
              1
            )}
            %
          </strong>
        </div>

        <div className="moa-route-tooltip-open">
          Click to open drill-down

          <ChevronRight
            size={14}
          />
        </div>
      </div>
    );
  };

  const handleBarClick = (
    barData
  ) => {
    const row =
      barData?.payload ||
      barData;

    if (
      row?.key ===
      "house"
    ) {
      onHouse?.();
      return;
    }

    if (
      row?.key ===
      "mill"
    ) {
      onSteelMill?.();
    }
  };

  return (
    <section className="moa-route-column-panel">
      <div className="moa-route-column-header">
        <div>
          <span>
            ORDER ROUTE ANALYSIS
          </span>

          <h3>
            H.O. vs Steel Mill Orders
          </h3>

          <p>
            Compare order quantity by route. Hover for details or click either column to open its analysis.
          </p>
        </div>

        <div className="moa-route-column-summary">
          <div>
            <small>
              TOTAL QUANTITY
            </small>

            <strong>
              {formatKG(
                totalKG
              )}
            </strong>
          </div>

          <i />

          <div>
            <small>
              TOTAL ORDERS
            </small>

            <strong>
              {formatNumber(
                totalOrders
              )}
            </strong>
          </div>
        </div>
      </div>

      <div className="moa-route-column-chart-wrap">
        <div className="moa-route-chart-inner">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              margin={{
                top: 42,
                right: 18,
                left: 8,
                bottom: 12,
              }}
              barCategoryGap="42%"
            >
              <CartesianGrid
                strokeDasharray="4 5"
                vertical={false}
                stroke="#e7ebf2"
              />

              <XAxis
                dataKey="name"
                axisLine={{
                  stroke:
                    "#94a3b8",
                }}
                tickLine={false}
                tick={{
                  fill:
                    "#334155",
                  fontSize: 13,
                  fontWeight:
                    800,
                }}
                dy={10}
              />

              <YAxis
                axisLine={{
                  stroke:
                    "#94a3b8",
                }}
                tickLine={false}
                tick={{
                  fill:
                    "#64748b",
                  fontSize: 11,
                  fontWeight:
                    750,
                }}
                tickFormatter={
                  formatAxisKG
                }
                width={48}
              />

              <Tooltip
                cursor={{
                  fill:
                    "rgba(79,70,229,0.035)",
                }}
                content={
                  <RouteTooltip />
                }
              />

              <Bar
                dataKey="quantityKG"
                radius={[
                  12,
                  12,
                  3,
                  3,
                ]}
                maxBarSize={105}
                label={
                  renderTopLabel
                }
                cursor="pointer"
                onClick={
                  handleBarClick
                }
                isAnimationActive
                animationDuration={
                  550
                }
              >
                {data.map(
                  (entry) => (
                    <Cell
                      key={
                        entry.key
                      }
                      className={
                        entry.key ===
                        "house"
                          ? "moa-route-cell-house"
                          : "moa-route-cell-mill"
                      }
                      fill={
                        entry.key ===
                        "house"
                          ? "#4f46e5"
                          : "#10b981"
                      }
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="moa-route-chart-footer">
          <button
            type="button"
            className="house"
            onClick={
              onHouse
            }
          >
            <span>
              <Building2
                size={16}
              />
            </span>

            <div>
              <small>
                HEAD OFFICE
              </small>

              <strong>
                {formatNumber(
                  houseOrders
                )}{" "}
                orders
              </strong>
            </div>

            <ChevronRight
              size={16}
            />
          </button>

          <button
            type="button"
            className="mill"
            onClick={
              onSteelMill
            }
          >
            <span>
              <Factory
                size={16}
              />
            </span>

            <div>
              <small>
                STEEL MILL
              </small>

              <strong>
                {formatNumber(
                  millOrders
                )}{" "}
                orders
              </strong>
            </div>

            <ChevronRight
              size={16}
            />
          </button>
        </div>
      </div>
    </section>
  );
}


function Overview({
  response,
  appliedFilters,
  loading,
  onHouse,
  onSteelMill,
}) {
  const overall =
    getOverallSummary(
      response
    );

  const house =
    getHouseSummary(
      response
    );

  const mill =
    getMillSummary(
      response
    );

  const houseKG =
    getQuantityKG(
      house
    );

  const houseOrders =
    getOrderCount(
      house
    );

  const millKG =
    getQuantityKG(
      mill
    );

  const millOrders =
    getOrderCount(
      mill
    );

  const apiTotalKG =
    getQuantityKG(
      overall
    );

  const apiTotalOrders =
    getOrderCount(
      overall
    );

  const calculatedTotalKG =
    houseKG +
    millKG;

  const calculatedTotalOrders =
    houseOrders +
    millOrders;

  const totalKG =
    apiTotalKG > 0
      ? apiTotalKG
      : calculatedTotalKG;

  const totalOrders =
    apiTotalOrders > 0
      ? apiTotalOrders
      : calculatedTotalOrders;

  if (loading) {
    return (
      <LoadingState
        text="Loading order analysis..."
      />
    );
  }

  return (
    <>
      <div className="moa-current-period moa-current-period-compact">
        <CalendarDays
          size={13}
        />

        <span>
          {getPeriodText(
            appliedFilters.month,
            appliedFilters.months
          )}
        </span>
      </div>

      <section className="moa-overview-cards">
        <article className="moa-total-order-card">
          <div className="moa-total-order-icon">
            <Layers3
              size={23}
            />
          </div>

          <div>
            <span>
              TOTAL ORDER QUANTITY
            </span>

            <strong>
              {formatKG(
                totalKG
              )}
            </strong>

            <small>
              {formatNumber(
                totalOrders
              )}{" "}
              orders in selected period
            </small>
          </div>

          <b>
            {
              appliedFilters
                .months
            }
            M
          </b>
        </article>

        <button
          type="button"
          className="moa-business-card moa-business-ho"
          onClick={
            onHouse
          }
        >
          <div>
            <i>
              <Building2
                size={19}
              />
            </i>

            <ChevronRight
              size={17}
            />
          </div>

          <span>
            HEAD OFFICE
          </span>

          <strong>
            {formatKG(
              houseKG
            )}
          </strong>

          <small>
            {formatNumber(
              houseOrders
            )}{" "}
            orders
          </small>

          <em>
            Drill down
          </em>
        </button>

        <button
          type="button"
          className="moa-business-card moa-business-mill"
          onClick={
            onSteelMill
          }
        >
          <div>
            <i>
              <Factory
                size={19}
              />
            </i>

            <ChevronRight
              size={17}
            />
          </div>

          <span>
            STEEL MILL
          </span>

          <strong>
            {formatKG(
              millKG
            )}
          </strong>

          <small>
            {formatNumber(
              millOrders
            )}{" "}
            orders
          </small>

          <em>
            Mill-wise drill down
          </em>
        </button>
      </section>

      <OrderRouteColumnChart
        houseKG={
          houseKG
        }
        houseOrders={
          houseOrders
        }
        millKG={
          millKG
        }
        millOrders={
          millOrders
        }
        onHouse={
          onHouse
        }
        onSteelMill={
          onSteelMill
        }
      />
    </>
  );
}


function ManagementOrderAnalysis({
  goDashboardHome,
}) {
  const currentMonth =
    getCurrentMonth();

  const [
    filters,
    setFilters,
  ] = useState({
    month:
      currentMonth,
    months: 1,
  });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    month:
      currentMonth,
    months: 1,
  });

  const [
    response,
    setResponse,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    filtering,
    setFiltering,
  ] = useState(false);

  const [
    autoFiltering,
    setAutoFiltering,
  ] = useState(false);

 const [
  refreshing,
  setRefreshing,
] = useState(false);

const [
  pdfLoading,
  setPdfLoading,
] = useState(false);

const [
  error,
  setError,
] = useState("");

  const [
    view,
    setView,
  ] = useState(
    "overview"
  );

  const [
    detailResponse,
    setDetailResponse,
  ] = useState(null);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    selectedMill,
    setSelectedMill,
  ] = useState("");

  const overviewRequestId =
    useRef(0);

const detailRequestId =
  useRef(0);

const viewRef =
  useRef("overview");

const selectedMillRef =
  useRef("");

const historyReadyRef =
  useRef(false);


const normalizeMainFilters =
    useCallback(
      (
        source
      ) => ({
        month:
          source?.month ||
          currentMonth,

        months:
          MAIN_PERIODS.includes(
            Number(
              source?.months
            )
          )
            ? Number(
                source.months
              )
            : 1,
      }),
      [
        currentMonth,
      ]
    );


  const loadOverview =
    useCallback(
      async (
        nextFilters,
        mode = "load"
      ) => {
        const requestId =
          ++overviewRequestId.current;

        try {
          if (
            mode === "load"
          ) {
            setLoading(true);
          }

          if (
            mode === "filter"
          ) {
            setFiltering(true);
          }

          if (
            mode === "auto"
          ) {
            setAutoFiltering(
              true
            );
          }

          if (
            mode === "refresh"
          ) {
            setRefreshing(
              true
            );
          }

          setError("");

          const result =
            await getManagementOrderAnalysis(
              nextFilters
            );

          if (
            requestId !==
            overviewRequestId.current
          ) {
            return null;
          }

          setResponse(
            result
          );

          setAppliedFilters(
            nextFilters
          );

          return result;
        } catch (err) {
          if (
            requestId ===
            overviewRequestId.current
          ) {
            setError(
              err?.message ||
                "Unable to load Management Order Analysis."
            );
          }

          return null;
        } finally {
          if (
            requestId ===
            overviewRequestId.current
          ) {
            setLoading(false);
            setFiltering(false);
            setAutoFiltering(
              false
            );
            setRefreshing(
              false
            );
          }
        }
      },
      []
    );


  useEffect(() => {
    const initialFilters = {
      month:
        currentMonth,
      months: 1,
    };

    setFilters(
      initialFilters
    );

    loadOverview(
      initialFilters,
      "load"
    );

    return () => {
      overviewRequestId.current +=
        1;

      detailRequestId.current +=
        1;
    };
    }, [
    currentMonth,
    loadOverview,
  ]);


  /* =========================================================
     UNIVERSAL MODULE NAVIGATION

     Makes:
     - Header back button
     - Browser back button
     - iPhone Safari back gesture
     - Android browser back

     follow the same Management Analysis navigation.
  ========================================================= */

  useEffect(() => {
    viewRef.current =
      view;

    selectedMillRef.current =
      selectedMill;
  }, [
    view,
    selectedMill,
  ]);


  useEffect(() => {
    const existingState =
      window.history.state || {};

    const existingManagementState =
      existingState
        ?.managementOrderAnalysis;

    /*
     * Register the current Management Analysis page
     * without adding another browser-history entry.
     */
    if (
      !existingManagementState
    ) {
      window.history.replaceState(
        {
          ...existingState,

          managementOrderAnalysis: {
            view: "overview",
            mill: "",
          },
        },
        ""
      );
    }

    historyReadyRef.current =
      true;


    const handlePopState =
      (event) => {
        const navigation =
          event.state
            ?.managementOrderAnalysis;

        /*
         * No Management Analysis state means
         * browser history has left this module.
         * Do not interfere with normal dashboard/browser
         * navigation.
         */
        if (!navigation) {
          return;
        }

        detailRequestId.current +=
          1;

        const nextView =
          navigation.view ||
          "overview";

        const nextMill =
          navigation.mill ||
          "";

        viewRef.current =
          nextView;

        selectedMillRef.current =
          nextMill;

        setView(
          nextView
        );

        setSelectedMill(
          nextMill
        );

        /*
         * Mill detail uses its own API request,
         * therefore existing Steel Mill list data
         * can remain available underneath it.
         */
        if (
          nextView ===
          "overview"
        ) {
          setDetailResponse(
            null
          );

          setDetailLoading(
            false
          );
        }
      };


    window.addEventListener(
      "popstate",
      handlePopState
    );


    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);


  const pushManagementHistory =
    (
      nextView,
      mill = ""
    ) => {
      if (
        !historyReadyRef.current
      ) {
        return;
      }

      const currentState =
        window.history.state || {};

      const currentNavigation =
        currentState
          ?.managementOrderAnalysis;

      /*
       * Prevent duplicate entries.
       */
      if (
        currentNavigation?.view ===
          nextView &&
        (
          currentNavigation?.mill ||
          ""
        ) ===
          (mill || "")
      ) {
        return;
      }

      window.history.pushState(
        {
          ...currentState,

          managementOrderAnalysis: {
            view:
              nextView,

            mill:
              mill || "",
          },
        },
        ""
      );
    };


  const runMainFilter =
    useCallback(
      async (
        nextFilters,
        mode = "auto"
      ) => {
        const next =
          normalizeMainFilters(
            nextFilters
          );

        setView(
          "overview"
        );

        setSelectedMill(
          ""
        );

        setDetailResponse(
          null
        );

        detailRequestId.current +=
          1;

        await loadOverview(
          next,
          mode
        );
      },
      [
        loadOverview,
        normalizeMainFilters,
      ]
    );

const loadHouseWithFilters =
  useCallback(
    async (
      nextFilters
    ) => {
      const next =
        normalizeMainFilters(
          nextFilters
        );

      const requestId =
        ++detailRequestId.current;

      try {
        setDetailLoading(
          true
        );

        setError("");

        const result =
          await getHouseOrderAnalysis(
            next
          );

        if (
          requestId !==
          detailRequestId.current
        ) {
          return;
        }

        setFilters(
          next
        );

        setAppliedFilters(
          next
        );

        setDetailResponse(
          result
        );
      } catch (err) {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setError(
            err?.message ||
              "Unable to load H.O. order analysis."
          );
        }
      } finally {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setDetailLoading(
            false
          );
        }
      }
    },
    [
      normalizeMainFilters,
    ]
  );


const loadSteelMillWithFilters =
  useCallback(
    async (
      nextFilters
    ) => {
      const next =
        normalizeMainFilters(
          nextFilters
        );

      const requestId =
        ++detailRequestId.current;

      try {
        setDetailLoading(
          true
        );

        setError("");

        const result =
          await getSteelMillOrderAnalysis(
            next
          );

        if (
          requestId !==
          detailRequestId.current
        ) {
          return;
        }

        setFilters(
          next
        );

        setAppliedFilters(
          next
        );

        setDetailResponse(
          result
        );

        setSelectedMill(
          ""
        );

        setView(
          "steelMill"
        );
      } catch (err) {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setError(
            err?.message ||
              "Unable to load Steel Mill order analysis."
          );
        }
      } finally {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setDetailLoading(
            false
          );
        }
      }
    },
    [
      normalizeMainFilters,
    ]
  );


const handleMainMonthChange =
  (
    value
  ) => {
    const next =
      normalizeMainFilters({
        ...filters,
        month: value,
      });

    setFilters(
      next
    );

    if (
      view ===
      "house"
    ) {
      loadHouseWithFilters(
        next
      );

      return;
    }

    if (
      view ===
      "steelMill"
    ) {
      loadSteelMillWithFilters(
        next
      );

      return;
    }

    runMainFilter(
      next,
      "auto"
    );
  };


const handleMainPeriodChange =
  (
    period
  ) => {
    const next =
      normalizeMainFilters({
        ...filters,
        months: period,
      });

    setFilters(
      next
    );

    if (
      view ===
      "house"
    ) {
      loadHouseWithFilters(
        next
      );

      return;
    }

    if (
      view ===
      "steelMill"
    ) {
      loadSteelMillWithFilters(
        next
      );

      return;
    }

    runMainFilter(
      next,
      "auto"
    );
  };


const applyFilters =
  async () => {
    const next =
      normalizeMainFilters(
        filters
      );

    setFilters(
      next
    );

    if (
      view ===
      "house"
    ) {
      await loadHouseWithFilters(
        next
      );

      return;
    }

    if (
      view ===
      "steelMill"
    ) {
      await loadSteelMillWithFilters(
        next
      );

      return;
    }

    await runMainFilter(
      next,
      "filter"
    );
  };

  const openHouse =
    async () => {
      const requestId =
        ++detailRequestId.current;
      try {
        pushManagementHistory(
          "house"
        );

        viewRef.current =
          "house";

        selectedMillRef.current =
          "";

        setView(
          "house"
        );

        setSelectedMill(
          ""
        );

        setDetailLoading(
          true
        );

        setDetailResponse(
          null
        );

        setError("");

        const result =
          await getHouseOrderAnalysis(
            appliedFilters
          );

        if (
          requestId !==
          detailRequestId.current
        ) {
          return;
        }

        setDetailResponse(
          result
        );
      } catch (err) {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setError(
            err?.message ||
              "Unable to load H.O. order analysis."
          );
        }
      } finally {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setDetailLoading(
            false
          );
        }
      }
    };


  const openSteelMill =
    async () => {
      const requestId =
        ++detailRequestId.current;

            try {
        pushManagementHistory(
          "steelMill"
        );

        viewRef.current =
          "steelMill";

        selectedMillRef.current =
          "";

        setView(
          "steelMill"
        );

        setSelectedMill(
          ""
        );

        setDetailLoading(
          true
        );

        setDetailResponse(
          null
        );

        setError("");

        const result =
          await getSteelMillOrderAnalysis(
            appliedFilters
          );

        if (
          requestId !==
          detailRequestId.current
        ) {
          return;
        }

        setDetailResponse(
          result
        );
      } catch (err) {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setError(
            err?.message ||
              "Unable to load Steel Mill analysis."
          );
        }
      } finally {
        if (
          requestId ===
          detailRequestId.current
        ) {
          setDetailLoading(
            false
          );
        }
      }
    };

    const downloadHousePdf =
  async () => {
    if (
      pdfLoading
    ) {
      return;
    }

    try {
      setPdfLoading(
        true
      );

      await downloadHouseOrderAnalysisPdf({
        month:
          appliedFilters.month,

        months:
          appliedFilters.months,
      });
    } catch (error) {
      console.error(
        "H.O. PDF DOWNLOAD ERROR =>",
        error
      );

      window.alert(
        error?.message ||
          "Unable to download H.O. Order Analysis PDF."
      );
    } finally {
      setPdfLoading(
        false
      );
    }
  };


  const refresh =
    async () => {
      if (
        loading ||
        filtering ||
        autoFiltering ||
        refreshing ||
        detailLoading
      ) {
        return;
      }

      if (
        view ===
        "overview"
      ) {
        await loadOverview(
          appliedFilters,
          "refresh"
        );

        return;
      }

      if (
        view ===
        "house"
      ) {
        await openHouse();
        return;
      }

      if (
        view ===
        "steelMill"
      ) {
        await openSteelMill();
      }
    };


   const handleHeaderBack =
    () => {
      detailRequestId.current +=
        1;

      /*
       * Inside Management Analysis use the same
       * browser history as Safari/iPhone back.
       */
      if (
        viewRef.current !==
        "overview"
      ) {
        window.history.back();

        return;
      }

      /*
       * Already at Management Analysis root:
       * return to Dashboard exactly as before.
       */
      if (
        typeof goDashboardHome ===
        "function"
      ) {
        goDashboardHome();
      }
    };


  const filterBusy =
    loading ||
    filtering ||
    autoFiltering;

  const pageBusy =
    filterBusy ||
    refreshing ||
    detailLoading;


  return (
    <div className="management-order-analysis">
     <header
  className={`moa-unified-header ${
    filterBusy ||
    (
      view ===
        "house" &&
      detailLoading
    )
      ? "is-filtering"
      : ""
  }`}
>
  <div className="moa-unified-header-left">
    <button
      type="button"
      className="moa-header-button"
      onClick={
        handleHeaderBack
      }
      disabled={
        pageBusy ||
        pdfLoading
      }
      aria-label="Back"
    >
      <ArrowLeft
        size={18}
      />
    </button>

   <div className="moa-app-title">
  <span>
    {view === "house"
  ? "HEAD OFFICE"
  : view === "steelMill"
  ? "STEEL MILL"
  : view === "mill"
  ? "STEEL MILL DETAIL"
  : "MANAGEMENT ANALYSIS"}
  </span>

  <strong>
    {view === "overview"
      ? "Order Analysis"
      : view === "house"
      ? "H.O. Order Analysis"
      : view === "steelMill"
      ? "Steel Mill Order Analysis"
      : selectedMill ||
        "Mill Analysis"}
  </strong>

  <small>
    {view === "overview"
      ? "Sales order intelligence"
      : getPeriodText(
          appliedFilters.month,
          appliedFilters.months
        )}
  </small>
</div>
  </div>

  {(
  view === "overview" ||
  view === "house" ||
  view === "steelMill"
) && (
    <div className="moa-unified-filter">
      <label className="moa-unified-month">
        <span>
          ENDING MONTH
        </span>

        <input
          type="month"
          value={
            filters.month
          }
          disabled={
            filterBusy ||
            detailLoading
          }
          onChange={(
            event
          ) =>
            handleMainMonthChange(
              event.target.value
            )
          }
        />
      </label>

      <div className="moa-unified-period">
        <span>
          PERIOD
        </span>

        <div>
          {MAIN_PERIODS.map(
            (
              period
            ) => (
              <button
                type="button"
                key={
                  period
                }
                disabled={
                  filterBusy ||
                  detailLoading
                }
                className={
                  Number(
                    filters.months
                  ) ===
                  period
                    ? "active"
                    : ""
                }
                onClick={() =>
                  handleMainPeriodChange(
                    period
                  )
                }
              >
                {period}
                M
              </button>
            )
          )}
        </div>
      </div>

      <button
        type="button"
        className="moa-apply moa-unified-apply"
        disabled={
          filterBusy ||
          detailLoading
        }
        onClick={
          applyFilters
        }
      >
        {filterBusy ||
        (
          view ===
            "house" &&
          detailLoading
        ) ? (
          <RefreshCw
            size={16}
            className="moa-spin"
          />
        ) : (
          <BarChart3
            size={16}
          />
        )}

        <span>
          {filterBusy ||
          (
            view ===
              "house" &&
            detailLoading
          )
            ? "Updating..."
            : "Apply"}
        </span>
      </button>
    </div>
  )}

  <div className="moa-unified-header-actions">
    {view ===
      "house" && (
      <button
        type="button"
        className={`moa-header-pdf-button ${
          pdfLoading
            ? "is-loading"
            : ""
        }`}
        disabled={
          pdfLoading ||
          detailLoading
        }
        onClick={
          downloadHousePdf
        }
        title="Download H.O. Order Analysis PDF"
        aria-label="Download H.O. Order Analysis PDF"
      >
        {pdfLoading ? (
          <RefreshCw
            size={17}
            className="moa-spin"
          />
        ) : (
          <Download
            size={17}
          />
        )}

        <span>
          {pdfLoading
            ? "Preparing..."
            : "PDF"}
        </span>
      </button>
    )}

    <button
      type="button"
      className="moa-header-button moa-unified-refresh"
      disabled={
        pageBusy ||
        pdfLoading
      }
      onClick={
        refresh
      }
      title="Refresh analysis"
      aria-label="Refresh analysis"
    >
      <RefreshCw
        size={17}
        className={
          refreshing
            ? "moa-spin"
            : ""
        }
      />
    </button>
  </div>

  {(
    filterBusy ||
    (
      view ===
        "house" &&
      detailLoading
    )
  ) && (
    <div className="moa-header-loading-line">
      <span />
    </div>
  )}
</header>

      <main className="moa-scroll moa-scroll-relative">
        {(
  autoFiltering ||
  filtering ||
  (
    view ===
      "house" &&
    detailLoading
  )
) && (
          <div className="moa-filter-loading-overlay">
            <div className="moa-filter-loading-card">
              <span className="moa-filter-loading-spinner">
                <RefreshCw
                  size={22}
                />
              </span>

              <div>
                <strong>
                  Updating Analysis
                </strong>

               <small>
  Loading{" "}
  {
    filters.months
  }
  M{" "}
  {view ===
  "house"
    ? "H.O."
    : "management"}{" "}
  order data...
</small>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="moa-error">
            <AlertCircle
              size={16}
            />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="Close error"
            >
              <X
                size={14}
              />
            </button>
          </div>
        )}

        {view ===
          "overview" && (
          <Overview
            response={
              response
            }
            appliedFilters={
              appliedFilters
            }
            loading={
              loading
            }
            onHouse={
              openHouse
            }
            onSteelMill={
              openSteelMill
            }
          />
        )}

        {view ===
          "house" && (
          <HouseDrillDown
            response={
              detailResponse
            }
            month={
              appliedFilters.month
            }
            months={
              appliedFilters.months
            }
            loading={
              detailLoading
            }
          />
        )}

        {view ===
  "steelMill" && (
  <SteelMillList
    response={
      detailResponse
    }
    loading={
      detailLoading
    }
    onSelectMill={(
      mill
    ) => {
      pushManagementHistory(
        "mill",
        mill
      );

      selectedMillRef.current =
        mill;

      viewRef.current =
        "mill";

      setSelectedMill(
        mill
      );

      setView(
        "mill"
      );
    }}
  />
)}

        {view ===
          "mill" &&
          selectedMill && (
            <MillDrillDown
              mill={
                selectedMill
              }
              initialMonth={
                appliedFilters.month
              }
              initialMonths={
                appliedFilters.months
              }
            />
          )}

        <div className="moa-bottom-space" />
      </main>
    </div>
  );
}


export default ManagementOrderAnalysis;