    import React, {
      useCallback,
      useEffect,
      useMemo,
      useRef,
      useState,
    } from "react";

    import {
      ArrowLeft,
      RefreshCw,
      Factory,
      Layers3,
      PackageSearch,
      ChevronRight,
      Building2,
      Boxes,
      Search,
      X,
      AlertCircle,
      CalendarDays,
      Target,
      Truck,
      Clock3,
      PackageCheck,
      TrendingUp,
      TrendingDown,
      Minus,
      Gauge,
      CheckCircle2,
      ArrowUpRight,
      BarChart3,
      Download,
    } from "lucide-react";

    import {
      getManagementAnalysis,
    } from "../services/managementAnalysisService";

    import "./ManagementAnalysis.css";


    /* =========================================================
       CONSTANTS
    ========================================================= */



    /* =========================================================
       NUMBER HELPERS
    ========================================================= */

    const safeNumber = (value) => {
      const number =
        Number(value);

      return Number.isFinite(number)
        ? number
        : 0;
    };


    const formatNumber = (
      value,
      maximumFractionDigits = 0
    ) =>
      new Intl.NumberFormat(
        "en-IN",
        {
          maximumFractionDigits,
        }
      ).format(
        safeNumber(value)
      );


    /*
     * Backend quantities are in MT.
     *
     * Management dashboard is intentionally
     * displayed primarily in KG because this
     * is easier for operational users.
     */
    const getOrderTakenKG = (data) => {
      const directKG =
        data?.orderTakenKG ??
        data?.orderedKG ??
        data?.orderQuantityKG ??
        data?.orderQtyKG ??
        data?.quantityKG;

      if (directKG !== undefined && directKG !== null) {
        return safeNumber(directKG);
      }

      const oldMT =
        data?.newOrderMT ??
        data?.orderedMT ??
        data?.orderQuantityMT ??
        data?.orderQtyMT ??
        data?.quantityMT;

      return oldMT !== undefined && oldMT !== null
        ? safeNumber(oldMT) * 1000
        : 0;
    };


    const getTotalDispatchKG = (data) => {
      const directKG =
        data?.totalDispatchKG ??
        data?.dispatchedKG ??
        data?.actualDispatchKG;

      if (directKG !== undefined && directKG !== null) {
        return safeNumber(directKG);
      }

      const oldMT =
        data?.actualDispatchMT ??
        data?.dispatchMT ??
        data?.dispatchedMT;

      return oldMT !== undefined && oldMT !== null
        ? safeNumber(oldMT) * 1000
        : 0;
    };


    const getDispatchTargetKG = (data) => {
      const directKG =
        data?.dispatchTargetKG ??
        data?.targetKG ??
        data?.plannedDispatchKG;

      if (directKG !== undefined && directKG !== null) {
        return safeNumber(directKG);
      }

      const oldMT =
        data?.dispatchTargetMT ??
        data?.targetMT ??
        data?.dispatchTarget;

      return oldMT !== undefined && oldMT !== null
        ? safeNumber(oldMT) * 1000
        : 0;
    };


    /*
     * UI receives normalized MT metrics from the analytics response.
     * Convert them once here so every management quantity is displayed in KG.
     */
    const formatKG = (mtValue) =>
      `${formatNumber(
        safeNumber(mtValue) * 1000,
        0
      )} KG`;


    const formatCompactKG = (mtValue) => {
      const kg =
        safeNumber(mtValue) * 1000;

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

      return `${formatNumber(
        kg,
        0
      )} KG`;
    };


    /*
     * Legacy helper name retained because older JSX sections
     * still call formatMT. The dashboard requirement is KG,
     * so this compatibility helper converts MT -> KG.
     */
    const formatMT = (mtValue) =>
      formatKG(mtValue);


    /* =========================================================
       TEXT HELPERS
    ========================================================= */

    const normalizeText = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();


    /* =========================================================
       DATE HELPERS
    ========================================================= */

    const formatDate = (value) => {
      if (!value) {
        return "-";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
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


    const getCurrentMonthValue =
      () => {
        const now =
          new Date();

        const year =
          now.getFullYear();

        const month =
          String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          );

        return `${year}-${month}`;
      };


    const getPreviousPeriodMonthValue = (
      monthValue,
      months = 1
    ) => {
      if (!monthValue) {
        return "";
      }

      const [year, month] =
        monthValue
          .split("-")
          .map(Number);

      const safeMonths =
        [1, 3, 6].includes(
          Number(months)
        )
          ? Number(months)
          : 1;

      const date =
        new Date(
          year,
          month - 1 - safeMonths,
          1
        );

      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
    };


    const getAnalysisRange = (
      monthValue,
      months = 1
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

      const safeMonths =
        [1, 3, 6].includes(
          Number(months)
        )
          ? Number(months)
          : 1;

      /*
       * Selected month is the ENDING month.
       *
       * September + 3 months:
       * Jul 01 -> Sep 30
       */
      const startDate =
        new Date(
          year,
          month - safeMonths,
          1
        );

      const endDate =
        new Date(
          year,
          month,
          0
        );

      const toYmd = (date) => {
        const y =
          date.getFullYear();

        const m =
          String(
            date.getMonth() + 1
          ).padStart(2, "0");

        const d =
          String(
            date.getDate()
          ).padStart(2, "0");

        return `${y}-${m}-${d}`;
      };

      return {
        from: toYmd(startDate),
        to: toYmd(endDate),
      };
    };



    const getMonthLabel = (
      monthValue
    ) => {
      if (!monthValue) {
        return "";
      }

      const [
        year,
        month,
      ] = monthValue
        .split("-")
        .map(Number);

      if (
        !year ||
        !month
      ) {
        return "";
      }

      return new Date(
        year,
        month - 1,
        1
      ).toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      );
    };


    const getPeriodText = (
      monthOrFilters,
      months = 1
    ) => {
      const month =
        typeof monthOrFilters === "object"
          ? monthOrFilters?.month
          : monthOrFilters;

      const periodMonths =
        typeof monthOrFilters === "object"
          ? monthOrFilters?.months ?? 1
          : months;

      const range =
        getAnalysisRange(
          month,
          periodMonths
        );

      if (!range.from || !range.to) {
        return "";
      }

      return `${formatDate(range.from)} - ${formatDate(range.to)}`;
    };


    /* =========================================================
       ORDER HELPERS
    ========================================================= */

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


    const getTrackingType = (
      order
    ) => {
      const value =
        String(
          order?.trackingOrderType ||
            order?.orderType ||
            ""
        )
          .trim()
          .toUpperCase()
          .replace(
            /\s+/g,
            ""
          );

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


    const getSteelMill = (
      order
    ) => {
      const steelMill =
        order?.steelMill ||
        order?.mill ||
        order?.millName ||
        "";

      const otherSteelMill =
        order?.otherSteelMill ||
        "";

      if (
        normalizeText(
          steelMill
        ) === "others" &&
        otherSteelMill
      ) {
        return otherSteelMill;
      }

      return (
        steelMill ||
        "Not Specified"
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
          .map(
            (item) =>
              typeof item ===
              "string"
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
        return (
          order.analysisGrades
        );
      }

      return [];
    };


    const getMaterialDetails = (
      order
    ) =>
      order?.materialDetails ||
      order?.sizeGradeQuantityRate ||
      order
        ?.analysisMaterialDetails ||
      "-";


    /* =========================================================
       BACKEND METRIC COMPATIBILITY
    ========================================================= */

    const getNewOrderMT = (data) => {
      const mtValue =
        data?.newOrderMT ??
        data?.orderedMT ??
        data?.orderQuantityMT ??
        data?.orderQtyMT ??
        data?.quantityMT;

      if (mtValue !== undefined && mtValue !== null) {
        return safeNumber(mtValue);
      }

      return getOrderTakenKG(data) / 1000;
    };


    const getDispatchTargetMT = (data) => {
      const mtValue =
        data?.dispatchTargetMT ??
        data?.targetMT ??
        data?.dispatchTarget;

      if (mtValue !== undefined && mtValue !== null) {
        return safeNumber(mtValue);
      }

      return getDispatchTargetKG(data) / 1000;
    };


    const getActualDispatchMT = (data) => {
      const mtValue =
        data?.actualDispatchMT ??
        data?.dispatchMT ??
        data?.dispatchedMT;

      if (mtValue !== undefined && mtValue !== null) {
        return safeNumber(mtValue);
      }

      return getTotalDispatchKG(data) / 1000;
    };


    const getTargetPendingMT = (data) => {
  const dispatchTargetMT =
    getDispatchTargetMT(data);

  const actualDispatchMT =
    getActualDispatchMT(data);

  /*
   * MANAGEMENT DEFINITION:
   *
   * Dispatch Left =
   * Dispatch Planned - Actual Dispatch
   *
   * Do NOT use old order balance /
   * dispatchLeftKG / pendingKG here.
   */
  return Math.max(
    0,
    dispatchTargetMT -
      actualDispatchMT
  );
};


    /* =========================================================
       SUMMARY NORMALIZER
    ========================================================= */

    const normalizeSummaryBlock = (
      data = {}
    ) => ({
      ...data,

      newOrderMT:
        getNewOrderMT(data),

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
    });


    const hasAnyMetricField = (
      data,
      fields
    ) =>
      Boolean(
        data &&
          fields.some(
            (field) =>
              data[field] !== undefined &&
              data[field] !== null
          )
      );


    /* =========================================================
       COMPARISON HELPERS
    ========================================================= */

    const getPercentChange = (
      current,
      previous
    ) => {
      const currentValue =
        safeNumber(current);

      const previousValue =
        safeNumber(previous);

      if (
        previousValue === 0
      ) {
        if (
          currentValue === 0
        ) {
          return 0;
        }

        return null;
      }

      return (
        ((currentValue -
          previousValue) /
          previousValue) *
        100
      );
    };


    function ChangeIndicator({
      current,
      previous,
      reverse = false,
    }) {
      const change =
        getPercentChange(
          current,
          previous
        );

      if (change === null) {
        return (
          <span className="ma-change ma-change-new">
            NEW
          </span>
        );
      }

      const absolute =
        Math.abs(change);

      if (
        absolute < 0.05
      ) {
        return (
          <span className="ma-change ma-change-same">
            <Minus size={13} />
            Same
          </span>
        );
      }

      const increased =
        change > 0;

      const positive =
        reverse
          ? !increased
          : increased;

      return (
        <span
          className={`ma-change ${
            positive
              ? "ma-change-good"
              : "ma-change-bad"
          }`}
        >
          {increased ? (
            <TrendingUp
              size={13}
            />
          ) : (
            <TrendingDown
              size={13}
            />
          )}

          {formatNumber(
            absolute,
            1
          )}
          %
        </span>
      );
    }


    /* =========================================================
       SEARCH
    ========================================================= */

    function OrderSearch({
      value,
      onChange,
    }) {
      return (
        <div className="ma-search-wrap">
          <Search size={18} />

          <input
            type="text"
            value={value}
            placeholder="Search company, PO, salesperson, mill..."
            onChange={(
              event
            ) =>
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
              <X size={17} />
            </button>
          )}
        </div>
      );
    }


    /* =========================================================
       EMPTY STATE
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

          <p>{text}</p>
        </div>
      );
    }


    /* =========================================================
       FILTER LOADING OVERLAY

       IMPORTANT:
       This appears even when old analysis is already on screen.
    ========================================================= */

    function UpdatingOverlay({
      periodText,
    }) {
      return (
        <div className="ma-updating-overlay">
          <div className="ma-updating-card">
            <div className="ma-updating-spinner">
              <RefreshCw
                size={27}
              />
            </div>

            <span>
              PLEASE WAIT
            </span>

            <strong>
              Updating Analysis
            </strong>

            <p>
              Applying your selected
              period and rebuilding the
              management numbers.
            </p>

            <div className="ma-updating-period">
              <CalendarDays
                size={16}
              />

              {periodText}
            </div>

            <small>
              Do not press Apply again.
              The filter is working.
            </small>
          </div>
        </div>
      );
    }


    /* =========================================================
       DESKTOP KPI CARD
    ========================================================= */

    function DesktopKpiCard({
      icon,
      eyebrow,
      label,
      value,
      previousValue,
      detail,
      className = "",
      onClick,
    }) {
      return (
        <button
          type="button"
          className={`ma-desk-kpi ${className}`}
          onClick={onClick}
          disabled={!onClick}
        >
          <div className="ma-desk-kpi-top">
            <div className="ma-desk-kpi-icon">
              {icon}
            </div>

            <span className="ma-desk-kpi-eyebrow">
              {eyebrow}
            </span>

            {onClick && (
              <ArrowUpRight
                size={17}
              />
            )}
          </div>

          <strong className="ma-desk-kpi-value">
            {formatKG(value)}
          </strong>

          <span className="ma-desk-kpi-label">
            {label}
          </span>

          <div className="ma-desk-kpi-bottom">
            <small>
              {detail}
            </small>

            {previousValue !==
              undefined && (
              <ChangeIndicator
                current={value}
                previous={
                  previousValue
                }
              />
            )}
          </div>
        </button>
      );
    }


    /* =========================================================
       MOBILE KPI CARD
    ========================================================= */

    function MobileKpiCard({
      icon,
      label,
      value,
      helper,
      className = "",
      onClick,
    }) {
      return (
        <button
          type="button"
          className={`ma-mobile-kpi ${className}`}
          onClick={onClick}
          disabled={!onClick}
        >
          <div className="ma-mobile-kpi-icon">
            {icon}
          </div>

          <div className="ma-mobile-kpi-copy">
            <span>
              {label}
            </span>

            <strong>
              {formatCompactKG(
                value
              )}
            </strong>

            <small>
              {helper}
            </small>
          </div>

          {onClick && (
            <ChevronRight
              size={17}
            />
          )}
        </button>
      );
    }


    /* =========================================================
       DISPATCH PROGRESS
    ========================================================= */

    function DispatchProgress({
      target,
      dispatched,
    }) {
      const targetValue =
        safeNumber(target);

      const dispatchValue =
        safeNumber(dispatched);

      const percentage =
        targetValue > 0
          ? Math.min(
              100,
              Math.max(
                0,
                (dispatchValue /
                  targetValue) *
                  100
              )
            )
          : 0;

      return (
        <div className="ma-dispatch-progress">
          <div className="ma-progress-heading">
            <div>
              <span>
                DISPATCH PROGRESS
              </span>

              <strong>
                {formatNumber(
                  percentage,
                  1
                )}
                %
              </strong>
            </div>

            <small>
              {formatKG(
                dispatchValue
              )}{" "}
              dispatched
            </small>
          </div>

          <div className="ma-progress-track">
            <div
              className="ma-progress-fill"
              style={{
                width:
                  `${percentage}%`,
              }}
            />
          </div>

          <div className="ma-progress-labels">
            <span>
              0 KG
            </span>

            <span>
              Plan{" "}
              {formatKG(
                targetValue
              )}
            </span>
          </div>
        </div>
      );
    }


    /* =========================================================
       DESKTOP BUSINESS SPLIT
    ========================================================= */

    function BusinessSplit({
      house,
      steelMill,
      onHouse,
      onSteelMill,
    }) {
      const total =
        getNewOrderMT(house) +
        getNewOrderMT(
          steelMill
        );

      const housePercentage =
        total > 0
          ? (getNewOrderMT(
              house
            ) /
              total) *
            100
          : 0;

      const millPercentage =
        total > 0
          ? (getNewOrderMT(
              steelMill
            ) /
              total) *
            100
          : 0;

      return (
        <section className="ma-business-split">
          <div className="ma-section-heading-v2">
            <div>
              <span>
                ORDER SOURCE
              </span>

              <h2>
                Where Orders Came From
              </h2>
            </div>

            <BarChart3
              size={21}
            />
          </div>

          <div className="ma-business-split-grid">
            <button
              type="button"
              className="ma-business-side ma-business-ho"
              onClick={onHouse}
            >
              <div className="ma-business-icon">
                <Building2
                  size={22}
                />
              </div>

              <span>
                H.O. Orders
              </span>

              <strong>
                {formatKG(
                  getNewOrderMT(
                    house
                  )
                )}
              </strong>

              <small>
                {formatNumber(
                  housePercentage,
                  1
                )}
                % of this period
              </small>

              <div className="ma-business-mini-track">
                <div
                  style={{
                    width:
                      `${housePercentage}%`,
                  }}
                />
              </div>
            </button>

            <button
              type="button"
              className="ma-business-side ma-business-mill"
              onClick={
                onSteelMill
              }
            >
              <div className="ma-business-icon">
                <Factory
                  size={22}
                />
              </div>

              <span>
                Steel Mill Orders
              </span>

              <strong>
                {formatKG(
                  getNewOrderMT(
                    steelMill
                  )
                )}
              </strong>

              <small>
                {formatNumber(
                  millPercentage,
                  1
                )}
                % of this period
              </small>

              <div className="ma-business-mini-track">
                <div
                  style={{
                    width:
                      `${millPercentage}%`,
                  }}
                />
              </div>
            </button>
          </div>
        </section>
      );
    }

const GRADE_CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#7c3aed",
  "#0891b2",
  "#e11d48",
  "#ca8a04",
  "#4f46e5",
  "#059669",
  "#c026d3",
  "#0284c7",
  "#ea580c",
  "#65a30d",
  "#9333ea",
  "#0d9488",
  "#db2777",
  "#1d4ed8",
  "#15803d",
  "#b45309",
  "#6d28d9",
  "#0369a1",
  "#be123c",
  "#a16207",
  "#4338ca",
  "#047857",
  "#a21caf",
  "#0e7490",
  "#c2410c",
  "#4d7c0f",
  "#7e22ce",
  "#1e40af",
  "#166534",
  "#9a3412",
  "#581c87",
  "#155e75",
  "#9f1239",
  "#854d0e",
  "#3730a3",
  "#065f46",
];


const getGradeAxisStepKG = (
  maxKG
) => {
  if (maxKG <= 10000) {
    return 1000;
  }

  if (maxKG <= 50000) {
    return 5000;
  }

  if (maxKG <= 100000) {
    return 10000;
  }

  return 25000;
};


const getNiceGradeAxisMaxKG = (
  maxKG
) => {
  const step =
    getGradeAxisStepKG(
      maxKG
    );

  return Math.max(
    step,
    Math.ceil(
      maxKG / step
    ) * step
  );
};

function GradePerformance({
  grades = [],
  orders = [],
  onGrade,
}) {
  const [
    gradeScope,
    setGradeScope,
  ] = useState("overall");

  /*
   * MANAGEMENT PURPOSE
   * ------------------
   * This graph answers only:
   *
   * "Which grades are selling the most?"
   *
   * No Plan.
   * No Dispatch.
   * No Pending.
   *
   * Quantity sold = order quantity punched
   * during the selected analysis period.
   */
  const gradeDemandData =
    useMemo(() => {
      /*
       * OVERALL
       *
       * Use backend grade aggregation.
       * This is the safest and most accurate
       * overall grade quantity source.
       */
      if (
        gradeScope ===
        "overall"
      ) {
        return grades
          .map(
            (
              grade,
              index
            ) => ({
              raw:
                grade,

              index,

              name:
                typeof grade ===
                "string"
                  ? grade
                  : grade?.grade ||
                    grade?.name ||
                    "UNIDENTIFIED",

              quantityMT:
                getNewOrderMT(
                  grade
                ),
            })
          )
          .filter(
            (item) =>
              item.quantityMT >
              0
          )
          .sort(
            (a, b) =>
              b.quantityMT -
              a.quantityMT
          );
      }

      /*
       * H.O. / STEEL MILL
       *
       * Build scoped grade demand from
       * the already-filtered period orders.
       */
      const wantedType =
        gradeScope === "ho"
          ? "H.O."
          : "N.H.O.";

      const gradeMap =
        new Map();

      orders
        .filter(
          (order) =>
            getTrackingType(
              order
            ) === wantedType
        )
        .forEach(
          (order) => {
            const gradeNames =
              [
                ...new Set(
                  getGradeNames(
                    order
                  )
                    .map(
                      (grade) =>
                        String(
                          grade ||
                          ""
                        ).trim()
                    )
                    .filter(
                      Boolean
                    )
                ),
              ];

            const finalGrades =
              gradeNames.length
                ? gradeNames
                : [
                    "UNIDENTIFIED",
                  ];

            const totalOrderMT =
              getNewOrderMT(
                order
              );

            /*
             * If one order contains more
             * than one grade but the order
             * object does not expose an
             * individual grade quantity,
             * divide the order quantity
             * between those grade labels.
             *
             * This prevents multiplying the
             * same order quantity several times.
             */
            const quantityPerGrade =
              finalGrades.length >
              0
                ? totalOrderMT /
                  finalGrades.length
                : 0;

            finalGrades.forEach(
              (gradeName) => {
                const key =
                  String(
                    gradeName ||
                    "UNIDENTIFIED"
                  )
                    .trim()
                    .toUpperCase() ||
                  "UNIDENTIFIED";

                const existing =
                  gradeMap.get(
                    key
                  ) || {
                    name:
                      gradeName ||
                      "UNIDENTIFIED",

                    quantityMT:
                      0,
                  };

                existing.quantityMT +=
                  quantityPerGrade;

                gradeMap.set(
                  key,
                  existing
                );
              }
            );
          }
        );

      return Array.from(
        gradeMap.values()
      )
        .filter(
          (item) =>
            item.quantityMT >
            0
        )
        .sort(
          (a, b) =>
            b.quantityMT -
            a.quantityMT
        );
    }, [
      grades,
      orders,
      gradeScope,
    ]);

  const totalQuantityMT =
    gradeDemandData.reduce(
      (
        total,
        item
      ) =>
        total +
        safeNumber(
          item.quantityMT
        ),
      0
    );

  const topGrade =
    gradeDemandData[0] ||
    null;

 const gradeChartData =
  useMemo(
    () =>
      gradeDemandData
        .map(
          (
            item,
            index
          ) => ({
            ...item,

            quantityKG:
              Math.round(
                safeNumber(
                  item.quantityMT
                ) * 1000
              ),

            color:
              GRADE_CHART_COLORS[
                index %
                  GRADE_CHART_COLORS.length
              ],
          })
        )
        .filter(
          (item) =>
            item.quantityKG >=
            1000
        ),
    [
      gradeDemandData,
    ]
  );


const maxGradeKG =
  Math.max(
    0,
    ...gradeChartData.map(
      (item) =>
        item.quantityKG
    )
  );


const gradeAxisMaxKG =
  getNiceGradeAxisMaxKG(
    maxGradeKG
  );


const gradeAxisStepKG =
  getGradeAxisStepKG(
    maxGradeKG
  );


const gradeAxisTicks =
  useMemo(() => {
    const ticks = [];

    for (
      let value = 0;
      value <= gradeAxisMaxKG;
      value += gradeAxisStepKG
    ) {
      ticks.push(value);
    }

    return ticks;
  }, [
    gradeAxisMaxKG,
    gradeAxisStepKG,
  ]);

  const getDemandShare = (
    quantityMT
  ) =>
    totalQuantityMT > 0
      ? (
          safeNumber(
            quantityMT
          ) /
          totalQuantityMT
        ) *
        100
      : 0;

  const getScopeTitle =
    () => {
      if (
        gradeScope ===
        "ho"
      ) {
        return "H.O. Grade Demand";
      }

      if (
        gradeScope ===
        "steelMill"
      ) {
        return "Steel Mill Grade Demand";
      }

      return "Overall Grade Demand";
    };

  const getScopeDescription =
    () => {
      if (
        gradeScope ===
        "ho"
      ) {
        return "Grades sold through H.O., ranked by quantity.";
      }

      if (
        gradeScope ===
        "steelMill"
      ) {
        return "Grades sold through Steel Mill orders, ranked by quantity.";
      }

      return "Grades sold across H.O. and Steel Mill, ranked by quantity.";
    };

  return (
    <section className="ma-grade-demand-card">
      {/* =========================================
          HEADER
      ========================================= */}

      <div className="ma-grade-demand-header">
        <div>
          <span className="ma-grade-demand-eyebrow">
            GRADE DEMAND ANALYSIS
          </span>

          <h2>
            {getScopeTitle()}
          </h2>

          <p>
            {getScopeDescription()}
          </p>
        </div>

        <div className="ma-grade-demand-header-icon">
          <BarChart3
            size={23}
          />
        </div>
      </div>


      {/* =========================================
          SCOPE SWITCH
      ========================================= */}

      <div className="ma-grade-demand-tabs">
        <button
          type="button"
          className={
            gradeScope ===
            "overall"
              ? "active"
              : ""
          }
        onClick={() => {
  setGradeScope(
    "overall"
  );
}}
        >
          <Layers3
            size={15}
          />

          Overall
        </button>

        <button
          type="button"
          className={
            gradeScope ===
            "ho"
              ? "active"
              : ""
          }
          onClick={() => {
  setGradeScope(
    "ho"
  );
}}
        >
          <Building2
            size={15}
          />

          H.O.
        </button>

        <button
          type="button"
          className={
            gradeScope ===
            "steelMill"
              ? "active"
              : ""
          }
        onClick={() => {
  setGradeScope(
    "steelMill"
  );
}}
        >
          <Factory
            size={15}
          />

          Steel Mill
        </button>
      </div>


      {/* =========================================
          MANAGEMENT SUMMARY
      ========================================= */}

      <div className="ma-grade-demand-summary">
        <div className="ma-grade-demand-summary-main">
          <span>
            TOTAL GRADE QUANTITY
          </span>

          <strong>
            {formatKG(
              totalQuantityMT
            )}
          </strong>

          <small>
            Quantity sold in selected period
          </small>
        </div>

        <div>
          <span>
            TOP DEMAND GRADE
          </span>

          <strong>
            {topGrade?.name ||
              "-"}
          </strong>

          <small>
            {topGrade
              ? formatKG(
                  topGrade.quantityMT
                )
              : "No quantity"}
          </small>
        </div>

        <div>
          <span>
            ACTIVE GRADES
          </span>

          <strong>
            {
              gradeDemandData.length
            }
          </strong>

          <small>
            Grades sold in this period
          </small>
        </div>

        <div>
          <span>
            TOP GRADE SHARE
          </span>

          <strong>
            {topGrade
              ? `${formatNumber(
                  getDemandShare(
                    topGrade.quantityMT
                  ),
                  1
                )}%`
              : "0%"}
          </strong>

          <small>
            Share of total grade demand
          </small>
        </div>
      </div>


      {/* =========================================
          CHART TITLE
      ========================================= */}

      <div className="ma-grade-demand-chart-heading">
        <div>
          <strong>
            Grade Demand Ranking
          </strong>

          <span>
            Higher quantity means stronger demand
          </span>
        </div>

        <span className="ma-grade-demand-unit">
          QUANTITY IN KG
        </span>
      </div>


      {/* =========================================
          DEMAND GRAPH
      ========================================= */}

     {/* =========================================
    GRADE QUANTITY CHART
========================================= */}

{!gradeChartData.length ? (
  <EmptyState
    text="No grade has at least 1,000 KG quantity for this selection."
  />
) : (
  <div className="ma-grade-bar-chart-shell">
    <div className="ma-grade-bar-chart-yaxis">
      {[...gradeAxisTicks]
        .reverse()
        .map(
          (tick) => (
            <span
              key={tick}
            >
              {formatNumber(
                tick
              )}
            </span>
          )
        )}
    </div>

    <div className="ma-grade-bar-chart-scroll">
      <div
        className="ma-grade-bar-chart"
        style={{
          minWidth:
            `${Math.max(
              1000,
              gradeChartData.length *
                72
            )}px`,
        }}
      >
        <div className="ma-grade-chart-grid">
          {[...gradeAxisTicks]
            .reverse()
            .map(
              (tick) => (
                <span
                  key={tick}
                  style={{
                    bottom:
                      `${
                        gradeAxisMaxKG >
                        0
                          ? (
                              tick /
                              gradeAxisMaxKG
                            ) *
                            100
                          : 0
                      }%`,
                  }}
                />
              )
            )}
        </div>

        <div className="ma-grade-chart-bars">
          {gradeChartData.map(
            (
              item,
              index
            ) => {
              const height =
                gradeAxisMaxKG >
                0
                  ? (
                      item.quantityKG /
                      gradeAxisMaxKG
                    ) *
                    100
                  : 0;

              return (
                <button
                  type="button"
                  className="ma-grade-column"
                  key={`${item.name}-${index}`}
                  onClick={() =>
                    onGrade(
                      item.name
                    )
                  }
                  title={`${item.name}: ${formatNumber(
                    item.quantityKG
                  )} KG`}
                >
                  <div className="ma-grade-column-plot">
                    <strong className="ma-grade-column-value">
                      {formatNumber(
                        item.quantityKG
                      )}
                      <small>
                        KG
                      </small>
                    </strong>

                    <div
                      className="ma-grade-column-bar"
                      style={{
                        height:
                          `${Math.max(
                            2,
                            height
                          )}%`,

                        background:
                          item.color,
                      }}
                    />
                  </div>

                  <span className="ma-grade-column-name">
                    {item.name}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  </div>
)}
    </section>
  );
}


    /* =========================================================
       MONTH COMPARISON
    ========================================================= */

    // function MonthComparison({
    //   current,
    //   previous,
    //   currentMonth,
    //   previousMonth,
    //   loading,
    // }) {
    //   const rows = [
    //     {
    //       label:
    //         "Orders Punched",

    //       current:
    //         current.newOrderMT,

    //       previous:
    //         previous.newOrderMT,

    //       reverse:
    //         false,
    //     },

    //     {
    //       label:
    //         "Dispatch Planned",

    //       current:
    //         current
    //           .dispatchTargetMT,

    //       previous:
    //         previous
    //           .dispatchTargetMT,

    //       reverse:
    //         false,
    //     },

    //     {
    //       label:
    //         "Dispatched",

    //       current:
    //         current
    //           .actualDispatchMT,

    //       previous:
    //         previous
    //           .actualDispatchMT,

    //       reverse:
    //         false,
    //     },

    //     {
    //       label:
    //         "Dispatch Left",

    //       current:
    //         current
    //           .targetPendingMT,

    //       previous:
    //         previous
    //           .targetPendingMT,

    //       reverse:
    //         true,
    //     },
    //   ];

    //   return (
    //     <section className="ma-month-compare">
    //       <div className="ma-section-heading-v2">
    //         <div>
    //           <span>
    //             MONTH COMPARISON
    //           </span>

    //           <h2>
    //             This Month vs Previous
    //           </h2>

    //           <p>
    //             Quick movement from{" "}
    //             {getMonthLabel(
    //               previousMonth
    //             )}{" "}
    //             to{" "}
    //             {getMonthLabel(
    //               currentMonth
    //             )}.
    //           </p>
    //         </div>

    //         <Activity
    //           size={21}
    //         />
    //       </div>

    //       {loading ? (
    //         <div className="ma-comparison-loading">
    //           <RefreshCw
    //             size={18}
    //             className="ma-spin"
    //           />

    //           Loading previous month
    //           comparison...
    //         </div>
    //       ) : (
    //         <div className="ma-compare-table">
    //           <div className="ma-compare-head">
    //             <span>
    //               Metric
    //             </span>

    //             <span>
    //               {getMonthLabel(
    //                 previousMonth
    //               )}
    //             </span>

    //             <span>
    //               {getMonthLabel(
    //                 currentMonth
    //               )}
    //             </span>

    //             <span>
    //               Change
    //             </span>
    //           </div>

    //           {rows.map(
    //             (row) => (
    //               <div
    //                 className="ma-compare-row"
    //                 key={
    //                   row.label
    //                 }
    //               >
    //                 <strong>
    //                   {row.label}
    //                 </strong>

    //                 <span>
    //                   {formatKG(
    //                     row.previous
    //                   )}
    //                 </span>

    //                 <span>
    //                   {formatKG(
    //                     row.current
    //                   )}
    //                 </span>

    //                 <ChangeIndicator
    //                   current={
    //                     row.current
    //                   }
    //                   previous={
    //                     row.previous
    //                   }
    //                   reverse={
    //                     row.reverse
    //                   }
    //                 />
    //               </div>
    //             )
    //           )}
    //         </div>
    //       )}
    //     </section>
    //   );
    // }


    /* =========================================================
       ORDER CARD

       USER-FRIENDLY WORDING.
       NO ORDER BALANCE.
    ========================================================= */

    function OrderCards({
      orders = [],
    }) {
      if (!orders.length) {
        return (
          <EmptyState
            text="No matching orders found for this selection."
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
                    `${getPoNumber(
                      order
                    )}-${index}`
                  }
                >
                  <div className="ma-order-top">
                    <div className="ma-order-heading">
                      <div className="ma-order-title-row">
                        <span className="ma-order-po">
                          {getPoNumber(
                            order
                          )}
                        </span>

                        <strong className="ma-order-company">
                          {getCompanyName(
                            order
                          )}
                        </strong>
                      </div>

                      <div className="ma-order-date">
                        <CalendarDays
                          size={14}
                        />

                        <span>
                          {formatDate(
                            getOrderDate(
                              order
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="ma-order-qty">
                      <span>
                        ORDER PUNCHED
                      </span>

                      <strong>
                        {formatKG(
                          getNewOrderMT(
                            order
                          )
                        )}
                      </strong>

                      <small>
                        {formatMT(
                          getNewOrderMT(
                            order
                          )
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="ma-order-metric-grid ma-order-metric-grid-three">
                    <div className="ma-order-metric-item ma-order-metric-target">
                      <div className="ma-order-metric-icon">
                        <Target
                          size={18}
                        />
                      </div>

                      <div className="ma-order-metric-copy">
                        <span>
                          Dispatch Planned
                        </span>

                        <strong>
                          {formatKG(
                            getDispatchTargetMT(
                              order
                            )
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="ma-order-metric-item ma-order-metric-dispatch">
                      <div className="ma-order-metric-icon">
                        <Truck
                          size={18}
                        />
                      </div>

                      <div className="ma-order-metric-copy">
                        <span>
                          Dispatched
                        </span>

                        <strong>
                          {formatKG(
                            getActualDispatchMT(
                              order
                            )
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="ma-order-metric-item ma-order-metric-pending">
                      <div className="ma-order-metric-icon">
                        <Clock3
                          size={18}
                        />
                      </div>

                      <div className="ma-order-metric-copy">
                        <span>
                          Dispatch Left
                        </span>

                        <strong>
                          {formatKG(
                            getTargetPendingMT(
                              order
                            )
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="ma-order-meta-grid">
                    <div className="ma-order-meta-item">
                      <span>
                        Sales Person
                      </span>

                      <strong>
                        {getSalesPerson(
                          order
                        )}
                      </strong>
                    </div>

                    <div className="ma-order-meta-item">
                      <span>
                        Order Route
                      </span>

                      <strong>
                        {type ===
                        "H.O."
                          ? "H.O."
                          : type ===
                            "N.H.O."
                          ? "Steel Mill"
                          : type}
                      </strong>
                    </div>

                    {type ===
                      "N.H.O." && (
                      <div className="ma-order-meta-item ma-meta-wide">
                        <span>
                          Steel Mill
                        </span>

                        <strong>
                          {getSteelMill(
                            order
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  {grades.length >
                    0 && (
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

                  <div className="ma-material-box">
                    <div className="ma-material-title">
                      <PackageSearch
                        size={15}
                      />

                      <span>
                        MATERIAL DETAILS
                      </span>
                    </div>

                    <p>
                      {getMaterialDetails(
                        order
                      )}
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
      /* =======================================================
         STATE
      ======================================================= */

      const [
        loading,
        setLoading,
      ] = useState(true);

      const [
        filtering,
        setFiltering,
      ] = useState(false);

      const [
        refreshing,
        setRefreshing,
      ] = useState(false);

      const [
        downloadingPdf,
        setDownloadingPdf,
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


     const [
      filters,
      setFilters,
    ] = useState(() => ({
      month:
        getCurrentMonthValue(),

      months: 1,
    }));

    const [
      appliedFilters,
      setAppliedFilters,
    ] = useState(() => ({
      month:
        getCurrentMonthValue(),

      months: 1,
    }));


      /*
       * Prevent older requests from
       * overwriting a newer filter result.
       */
      const requestIdRef =
        useRef(0);


      /* =======================================================
         USER / ACCESS
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
         LOAD CURRENT ANALYSIS
      ======================================================= */

      const loadAnalysis =
        useCallback(
          async ({
            nextFilters,
            mode =
              "initial",
          }) => {
            const requestId =
              ++requestIdRef.current;

            try {
              setError("");

              if (
                mode ===
                "initial"
              ) {
                setLoading(
                  true
                );
              }

              if (
                mode ===
                "filter"
              ) {
                setFiltering(
                  true
                );
              }

              if (
                mode ===
                "refresh"
              ) {
                setRefreshing(
                  true
                );
              }

              const safeMonth =
                nextFilters?.month ||
                getCurrentMonthValue();

              const safeMonths =
                [1, 3, 6].includes(
                  Number(nextFilters?.months)
                )
                  ? Number(nextFilters.months)
                  : 1;

              const range =
                getAnalysisRange(
                  safeMonth,
                  safeMonths
                );

              const result =
                await getManagementAnalysis({
                  from: range.from,
                  to: range.to,
                });

              if (
                requestId !==
                requestIdRef.current
              ) {
                return;
              }

              setAnalysis(
                result || {}
              );
            } catch (err) {
              if (
                requestId !==
                requestIdRef.current
              ) {
                return;
              }

              console.error(
                "Management analysis load failed:",
                err
              );

              setError(
                err?.response
                  ?.data
                  ?.message ||
                  err?.message ||
                  "Unable to load management analysis."
              );
            } finally {
              if (
                requestId ===
                requestIdRef.current
              ) {
                setLoading(
                  false
                );

                setFiltering(
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


      /* =======================================================
         INITIAL LOAD ONLY

         Filter apply manually calls loadAnalysis.
         This avoids accidental duplicate requests.
      ======================================================= */

      useEffect(() => {
        if (
          !isSuperAdmin
        ) {
          return;
        }

        loadAnalysis({
          nextFilters:
            appliedFilters,

          mode: "initial",
        });

        // Initial mount only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [
        isSuperAdmin,
      ]);


      /* =======================================================
         LOAD COMPARABLE PREVIOUS PERIOD

         1 month ending Sep -> previous Aug
         3 months ending Sep -> previous Apr-Jun
         6 months ending Sep -> previous Oct-Mar
      ======================================================= */

      // useEffect(() => {
      //   if (
      //     !isSuperAdmin ||
      //     !analysis ||
      //     !appliedFilters?.month
      //   ) {
      //     setPreviousAnalysis(null);
      //     return;
      //   }

      //   const periodMonths =
      //     [1, 3, 6].includes(
      //       Number(appliedFilters.months)
      //     )
      //       ? Number(appliedFilters.months)
      //       : 1;

      //   const previousEndMonth =
      //     getPreviousPeriodMonthValue(
      //       appliedFilters.month,
      //       periodMonths
      //     );

      //   const range =
      //     getAnalysisRange(
      //       previousEndMonth,
      //       periodMonths
      //     );

      //   let cancelled = false;

      //   const loadPrevious =
      //     async () => {
      //       try {
      //         setComparisonLoading(true);

      //         const result =
      //           await getManagementAnalysis({
      //             from: range.from,
      //             to: range.to,
      //           });

      //         if (!cancelled) {
      //           setPreviousAnalysis(
      //             result || {}
      //           );
      //         }
      //       } catch (err) {
      //         console.warn(
      //           "Previous period comparison could not be loaded:",
      //           err
      //         );

      //         if (!cancelled) {
      //           setPreviousAnalysis(null);
      //         }
      //       } finally {
      //         if (!cancelled) {
      //           setComparisonLoading(false);
      //         }
      //       }
      //     };

      //   const timer =
      //     window.setTimeout(
      //       loadPrevious,
      //       700
      //     );

      //   return () => {
      //     cancelled = true;
      //     window.clearTimeout(timer);
      //   };
      // }, [
      //   analysis,
      //   appliedFilters,
      //   isSuperAdmin,
      // ]);


      /* =======================================================
         NORMALIZED RESPONSE
      ======================================================= */

      const rawSummary =
        useMemo(
          () =>
            analysis?.summary ||
            {},
          [analysis]
        );


      const house =
        useMemo(
          () =>
            normalizeSummaryBlock(
              rawSummary?.house ||
                rawSummary?.ho ||
                {}
            ),
          [rawSummary]
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
          [rawSummary]
        );


      const monthlyCombined =
        useMemo(() => {
          const rawCombined =
            analysis?.monthlyCombined ||
            {};

          const backendCombined =
            normalizeSummaryBlock(
              rawCombined
            );

          return {
            ...backendCombined,

            newOrderMT:
              hasAnyMetricField(
                rawCombined,
                [
                  "newOrderMT",
                  "orderedMT",
                  "orderQuantityMT",
                  "orderQtyMT",
                  "quantityMT",
                  "orderTakenKG",
                  "orderedKG",
                  "orderQuantityKG",
                  "orderQtyKG",
                  "quantityKG",
                ]
              )
                ? getNewOrderMT(
                    rawCombined
                  )
                : house.newOrderMT +
                  steelMill.newOrderMT,

            dispatchTargetMT:
              hasAnyMetricField(
                rawCombined,
                [
                  "dispatchTargetMT",
                  "targetMT",
                  "dispatchTarget",
                  "dispatchTargetKG",
                  "targetKG",
                  "plannedDispatchKG",
                ]
              )
                ? getDispatchTargetMT(
                    rawCombined
                  )
                : house.dispatchTargetMT +
                  steelMill.dispatchTargetMT,

            actualDispatchMT:
              hasAnyMetricField(
                rawCombined,
                [
                  "actualDispatchMT",
                  "dispatchMT",
                  "dispatchedMT",
                  "totalDispatchKG",
                  "dispatchedKG",
                  "actualDispatchKG",
                ]
              )
                ? getActualDispatchMT(
                    rawCombined
                  )
                : house.actualDispatchMT +
                  steelMill.actualDispatchMT,

            targetPendingMT:
  Math.max(
    0,
    (
      hasAnyMetricField(
        rawCombined,
        [
          "dispatchTargetMT",
          "targetMT",
          "dispatchTarget",
          "dispatchTargetKG",
          "targetKG",
          "plannedDispatchKG",
        ]
      )
        ? getDispatchTargetMT(
            rawCombined
          )
        : house.dispatchTargetMT +
          steelMill.dispatchTargetMT
    ) -
    (
      hasAnyMetricField(
        rawCombined,
        [
          "actualDispatchMT",
          "dispatchMT",
          "dispatchedMT",
          "totalDispatchKG",
          "dispatchedKG",
          "actualDispatchKG",
        ]
      )
        ? getActualDispatchMT(
            rawCombined
          )
        : house.actualDispatchMT +
          steelMill.actualDispatchMT
    )
  ),
          };
        }, [
          analysis,
          house,
          steelMill,
        ]);


      

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
              analysis
                ?.salesOrders
            )
              ? analysis
                  .salesOrders
              : Array.isArray(
                  analysis?.orders
                )
              ? analysis.orders
              : [],
          [analysis]
        );


      /* =======================================================
         ORDER COUNTS
      ======================================================= */

      const periodOrders =
        useMemo(() => {
          const hasPeriodFlag =
            orders.some(
              (order) =>
                typeof order?.isNewOrderInPeriod ===
                "boolean"
            );

          return hasPeriodFlag
            ? orders.filter(
                (order) =>
                  order?.isNewOrderInPeriod ===
                  true
              )
            : orders;
        }, [orders]);


      const hoPeriodOrders =
        useMemo(
          () =>
            periodOrders.filter(
              (order) =>
                getTrackingType(
                  order
                ) ===
                "H.O."
            ),
          [periodOrders]
        );


      const steelMillPeriodOrders =
        useMemo(
          () =>
            periodOrders.filter(
              (order) =>
                getTrackingType(
                  order
                ) ===
                "N.H.O."
            ),
          [periodOrders]
        );


      const totalOrderCount =
        safeNumber(
          analysis?.orderCount ??
          analysis?.summary?.orderCount ??
          analysis?.monthlyCombined?.orderCount ??
          periodOrders.length
        );


      const houseOrderCount =
        safeNumber(
          rawSummary?.house?.orderCount ??
          rawSummary?.ho?.orderCount ??
          hoPeriodOrders.length
        );


      const steelMillOrderCount =
        safeNumber(
          rawSummary?.steelMill?.orderCount ??
          rawSummary?.nho?.orderCount ??
          steelMillPeriodOrders.length
        );


      /* =======================================================
         SEARCH
      ======================================================= */

      const filterOrders =
        useCallback(
          (
            sourceOrders
          ) => {
            if (
              !search.trim()
            ) {
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
         METRIC DRILLDOWN

         Removed Order Balance.
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
              type ===
              "house"
            ) {
              result =
                result.filter(
                  (order) =>
                    getTrackingType(
                      order
                    ) ===
                    "H.O."
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

            switch (
              metric
            ) {
              case "ordersPunched":
                return result.filter(
                  (order) =>
                    periodOrders.includes(
                      order
                    )
                );

              case "dispatchPlanned":
                return result.filter(
                  (order) =>
                    getDispatchTargetMT(
                      order
                    ) > 0
                );

              case "dispatched":
                return result.filter(
                  (order) =>
                    getActualDispatchMT(
                      order
                    ) > 0
                );

              case "dispatchLeft":
                return result.filter(
                  (order) =>
                    getTargetPendingMT(
                      order
                    ) > 0
                );

              default:
                return result;
            }
          },
          [
            orders,
            periodOrders,
          ]
        );


      const getMetricValue =
        useCallback(
          (
            order,
            metric
          ) => {
            switch (
              metric
            ) {
              case "ordersPunched":
                return getNewOrderMT(
                  order
                );

              case "dispatchPlanned":
                return getDispatchTargetMT(
                  order
                );

              case "dispatched":
                return getActualDispatchMT(
                  order
                );

              case "dispatchLeft":
                return getTargetPendingMT(
                  order
                );

              default:
                return 0;
            }
          },
          []
        );


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


      const drillDownTotal =
        useMemo(() => {
          if (!drillDown) {
            return 0;
          }

          return drillDownOrders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              getMetricValue(
                order,
                drillDown.metric
              ),
            0
          );
        }, [
          drillDown,
          drillDownOrders,
          getMetricValue,
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
         MILL ORDERS
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

          if (
            selectedMill
          ) {
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
          if (
            !selectedGrade
          ) {
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
         PERIOD FILTER

         Selected month is the ENDING month.
         Changes apply immediately.
      ======================================================= */

      const normalizePeriodMonths =
        useCallback(
          (value) =>
            [1, 3, 6].includes(
              Number(value)
            )
              ? Number(value)
              : 1,
          []
        );


      const applyPeriodFilter =
        useCallback(
          async (
            monthValue,
            monthsValue
          ) => {
            const nextApplied = {
              month:
                monthValue ||
                getCurrentMonthValue(),

              months:
                normalizePeriodMonths(
                  monthsValue
                ),
            };

            setFilters(
              nextApplied
            );

            setAppliedFilters(
              nextApplied
            );

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

await loadAnalysis({
  nextFilters:
    nextApplied,

  mode:
    "filter",
});
          },
          [
            loadAnalysis,
            normalizePeriodMonths,
          ]
        );


      const selectPeriod =
        useCallback(
          async (value) => {
            await applyPeriodFilter(
              filters.month,
              value
            );
          },
          [
            applyPeriodFilter,
            filters.month,
          ]
        );


      const selectMonth =
        useCallback(
          async (value) => {
            if (!value) {
              return;
            }

            await applyPeriodFilter(
              value,
              filters.months
            );
          },
          [
            applyPeriodFilter,
            filters.months,
          ]
        );


      /* =======================================================
         REFRESH
      ======================================================= */

      const handleRefresh =
  async () => {
    await loadAnalysis({
      nextFilters:
        appliedFilters,

      mode: "refresh",
    });
  };


      /* =======================================================
         DOWNLOAD PDF
      ======================================================= */

      const handleDownloadPdf =
  useCallback(
    async () => {
      if (downloadingPdf) {
        return;
      }

      let objectUrl = "";

      try {
        setDownloadingPdf(true);
        setError("");

        const configuredBase =
          String(
            process.env.REACT_APP_API_URL ||
            (
              window.location.hostname ===
                "localhost" ||
              window.location.hostname ===
                "127.0.0.1"
                ? "http://localhost:5000"
                : "https://bharatspecialsteels.bharatspecialsteels.com"
            )
          ).replace(/\/$/, "");

        const rootBase =
          configuredBase.endsWith(
            "/api"
          )
            ? configuredBase.slice(
                0,
                -4
              )
            : configuredBase;

        const token =
          localStorage.getItem(
            "token"
          ) ||
          localStorage.getItem(
            "authToken"
          ) ||
          "";

        const selectedMonth =
          appliedFilters.month ||
          getCurrentMonthValue();

        const selectedPeriod =
          [1, 3, 6].includes(
            Number(
              appliedFilters.months
            )
          )
            ? Number(
                appliedFilters.months
              )
            : 1;

        const range =
          getAnalysisRange(
            selectedMonth,
            selectedPeriod
          );

        const params =
          new URLSearchParams({
            month:
              selectedMonth,

            months:
              String(
                selectedPeriod
              ),

            period:
              String(
                selectedPeriod
              ),

            from:
              range.from,

            to:
              range.to,
          });

        const pdfUrl =
          `${rootBase}/api/steel-analytics/pdf?${params.toString()}`;

        console.log(
          "MANAGEMENT PDF REQUEST =>",
          pdfUrl
        );

        const response =
          await fetch(
            pdfUrl,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/pdf",

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },
            }
          );

        if (!response.ok) {
          let message =
            `Unable to download PDF. Server returned ${response.status}.`;

          try {
            const payload =
              await response.json();

            message =
              payload?.message ||
              payload?.error ||
              message;
          } catch {
            try {
              const responseText =
                await response.text();

              if (responseText) {
                message =
                  responseText;
              }
            } catch {
              // Keep default message.
            }
          }

          throw new Error(
            message
          );
        }

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        const blob =
          await response.blob();

        console.log(
          "MANAGEMENT PDF RESPONSE =>",
          {
            status:
              response.status,

            contentType,

            bytes:
              blob.size,
          }
        );

        if (!blob.size) {
          throw new Error(
            "PDF was generated but the downloaded file is empty."
          );
        }

        objectUrl =
          window.URL.createObjectURL(
            blob
          );

        const contentDisposition =
          response.headers.get(
            "content-disposition"
          ) || "";

        const filenameMatch =
          contentDisposition.match(
            /filename\*?=(?:UTF-8''|")?([^";]+)/i
          );

        const serverFilename =
          filenameMatch?.[1]
            ? decodeURIComponent(
                filenameMatch[1]
                  .replace(
                    /"/g,
                    ""
                  )
                  .trim()
              )
            : "";

        const filename =
          serverFilename ||
          `Management_Analysis_${selectedPeriod}M_${selectedMonth}.pdf`;

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          objectUrl;

        anchor.download =
          filename;

        anchor.style.display =
          "none";

        document.body.appendChild(
          anchor
        );

        anchor.click();

        window.setTimeout(
          () => {
            anchor.remove();

            if (objectUrl) {
              window.URL.revokeObjectURL(
                objectUrl
              );

              objectUrl = "";
            }
          },
          1500
        );
      } catch (err) {
        console.error(
          "Management analysis PDF download failed:",
          err
        );

        if (objectUrl) {
          window.URL.revokeObjectURL(
            objectUrl
          );
        }

        setError(
          err?.message ||
          "Unable to download management analysis PDF."
        );
      } finally {
        setDownloadingPdf(
          false
        );
      }
    },
    [
      appliedFilters,
      downloadingPdf,
    ]
  );


      /* =======================================================
         NAVIGATION
      ======================================================= */

      const handleBack = () => {
        if (drillDown) {
          setDrillDown(
            null
          );

          setSearch("");

          return;
        }

        if (
          selectedGrade
        ) {
          setSelectedGrade(
            ""
          );

          setSearch("");

          return;
        }

        if (
          selectedMill
        ) {
          setSelectedMill(
            ""
          );

          setSearch("");

          return;
        }

        if (
          view !==
          "overview"
        ) {
          setView(
            "overview"
          );

          setSearch("");

          return;
        }

        if (
          goDashboardHome
        ) {
          goDashboardHome();

          return;
        }

        window.location.hash =
          "dashboard";
      };


      const openMetric = (
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


      const openGrade = (
        grade
      ) => {
        setSearch("");

        if (!grade) {
          setSelectedGrade(
            ""
          );

          setView(
            "grades"
          );

          return;
        }

        setSelectedGrade(
          grade
        );

        setView(
          "grades"
        );
      };


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
         FIRST LOAD
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
                  Preparing this
                  month's insight...
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

            <div className="ma-loading-state ma-loading-state-v2">
              <div className="ma-loading-spinner" />

              <strong>
                Building Management
                Dashboard
              </strong>

              <span>
                Reading orders,
                dispatch plan and
                dispatch data.
              </span>

              <small>
                This may take some
                time. Please do not
                refresh.
              </small>
            </div>
          </div>
        );
      }


      /* =======================================================
         MAIN
      ======================================================= */

      return (
        <div className="management-analysis">
          {/* ===================================================
              HEADER
          =================================================== */}

         <header className="ma-app-header ma-app-header-compact">
  <button
    type="button"
    className="ma-header-btn"
    onClick={handleBack}
    aria-label="Back"
  >
    <ArrowLeft size={19} />
  </button>

  <div className="ma-header-title">
    <span>
      MANAGEMENT
    </span>

    <strong>
      Management Analysis
    </strong>

    <small>
      Orders & Dispatch Control
    </small>
  </div>

  <div className="ma-header-actions">
    <button
      type="button"
      className="ma-header-refresh-btn"
      disabled={
        refreshing ||
        filtering
      }
      onClick={handleRefresh}
      aria-label="Refresh"
      title="Refresh"
    >
      <RefreshCw
        size={17}
        className={
          refreshing
            ? "ma-spin"
            : ""
        }
      />
    </button>

    <button
      type="button"
      className="ma-download-pdf-btn"
      disabled={
        downloadingPdf ||
        filtering ||
        refreshing
      }
      onClick={handleDownloadPdf}
    >
      {downloadingPdf ? (
        <RefreshCw
          size={16}
          className="ma-spin"
        />
      ) : (
        <Download size={16} />
      )}

      <span>
        {downloadingPdf
          ? "Preparing..."
          : "Download PDF"}
      </span>
    </button>
  </div>
</header>


          {/* ===================================================
              FILTERING OVERLAY

              This fixes the "silent 1 minute wait".
          =================================================== */}

          {filtering && (
            <UpdatingOverlay
              periodText={
                getPeriodText(
                  appliedFilters
                )
              }
            />
          )}


          <div className="ma-scroll-area">
            {/* ===============================================
                ERROR
            =============================================== */}

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


            {/* ===============================================
                PERIOD FILTER
            =============================================== */}

            <section className="ma-date-filter ma-date-filter-v2 ma-period-filter">
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
                      filters
                    )}
                  </small>
                </div>
              </div>

              <div className="ma-date-fields ma-period-controls">
                <label className="ma-month-field">
                  <span>
                    ENDING MONTH
                  </span>

                  <input
                    type="month"
                    value={
                      filters.month
                    }
                    onChange={(
                      event
                    ) =>
                      selectMonth(
                        event.target.value
                      )
                    }
                    disabled={
                      filtering ||
                      refreshing
                    }
                  />
                </label>

                <div className="ma-period-selector">
                  <span>
                    PERIOD
                  </span>

                  <div className="ma-period-buttons">
                    {[1, 3, 6].map(
                      (months) => (
                        <button
                          key={months}
                          type="button"
                          className={
                            Number(
                              filters.months
                            ) === months
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            selectPeriod(
                              months
                            )
                          }
                          disabled={
                            filtering ||
                            refreshing
                          }
                        >
                          {months}{" "}
                          {months === 1
                            ? "Month"
                            : "Months"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>


            {/* ===============================================
                DRILL DOWN
            =============================================== */}

            {drillDown ? (
              <>
                <section className="ma-detail-hero ma-detail-hero-v2">
                  <span>
                    ORDER DETAILS
                  </span>

                  <strong>
                    {
                      drillDown.title
                    }
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
                        {formatKG(
                          drillDownTotal
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
                {/* ===========================================
                    DESKTOP UI

                    CSS:
                    display >= desktop
                =========================================== */}

                <div className="ma-desktop-only">
                  <section className="ma-command-hero">
                    <div className="ma-command-hero-copy">
                      <span>
                        CURRENT PERIOD
                      </span>

                      <h1>
                        Order & Dispatch
                        Control
                      </h1>

                      <p>
                        {getPeriodText(
                          appliedFilters
                        )}
                      </p>
                    </div>

                    <div className="ma-command-hero-main">
                      <span>
                        TOTAL ORDERS
                        PUNCHED
                      </span>

                      <strong>
                        {formatKG(
                          monthlyCombined
                            .newOrderMT
                        )}
                      </strong>

                      <small>
                        {formatMT(
                          monthlyCombined
                            .newOrderMT
                        )}{" "}
                        •{" "}
                        {
                          totalOrderCount
                        }{" "}
                        orders
                      </small>
                    </div>

                    <div className="ma-command-hero-status">
                      <Gauge
                        size={20}
                      />

                      <div>
                        <span>
                          Dispatch
                          Completion
                        </span>

                        <strong>
                          {monthlyCombined
                            .dispatchTargetMT >
                          0
                            ? `${formatNumber(
                                Math.min(
                                  100,
                                  (monthlyCombined
                                    .actualDispatchMT /
                                    monthlyCombined
                                      .dispatchTargetMT) *
                                    100
                                ),
                                1
                              )}%`
                            : "0%"}
                        </strong>
                      </div>
                    </div>
                  </section>


                  <section className="ma-desktop-kpi-grid">
                    <DesktopKpiCard
                      icon={
                        <PackageSearch
                          size={21}
                        />
                      }
                      eyebrow="THIS PERIOD"
                      label="Orders Punched"
                      value={
  monthlyCombined
    .newOrderMT
}
detail={`${totalOrderCount} orders entered`}
                      className="ma-kpi-orders"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "total",
                          "Orders Punched"
                        )
                      }
                    />

                    <DesktopKpiCard
                      icon={
                        <Building2
                          size={21}
                        />
                      }
                      eyebrow="H.O."
                      label="H.O. Orders"
                      value={
  house.newOrderMT
}
detail={`${houseOrderCount} H.O. orders`}
                      className="ma-kpi-ho"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "house",
                          "H.O. Orders"
                        )
                      }
                    />

                    <DesktopKpiCard
                      icon={
                        <Factory
                          size={21}
                        />
                      }
                      eyebrow="STEEL MILL"
                      label="Steel Mill Orders"
                      value={
  steelMill
    .newOrderMT
}
detail={`${steelMillOrderCount} mill orders`}
                      className="ma-kpi-mill"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "steelMill",
                          "Steel Mill Orders"
                        )
                      }
                    />

                    <DesktopKpiCard
                      icon={
                        <Target
                          size={21}
                        />
                      }
                      eyebrow="PLAN"
                      label="Dispatch Planned"
                      value={
  monthlyCombined
    .dispatchTargetMT
}
detail="Planned for this period"
                      className="ma-kpi-target"
                      onClick={() =>
                        openMetric(
                          "dispatchPlanned",
                          "total",
                          "Dispatch Planned"
                        )
                      }
                    />

                    <DesktopKpiCard
                      icon={
                        <CheckCircle2
                          size={21}
                        />
                      }
                      eyebrow="DONE"
                      label="Dispatched"
                      value={
  monthlyCombined
    .actualDispatchMT
}
detail="Actually dispatched"
                      className="ma-kpi-dispatched"
                      onClick={() =>
                        openMetric(
                          "dispatched",
                          "total",
                          "Dispatched"
                        )
                      }
                    />

                    <DesktopKpiCard
                      icon={
                        <Clock3
                          size={21}
                        />
                      }
                      eyebrow="PENDING"
                      label="Dispatch Left"
                      value={
  monthlyCombined
    .targetPendingMT
}
detail="Still pending from plan"
                      className="ma-kpi-left"
                      onClick={() =>
                        openMetric(
                          "dispatchLeft",
                          "total",
                          "Dispatch Left"
                        )
                      }
                    />
                  </section>


                  <section className="ma-desktop-middle-grid">
                    <DispatchProgress
                      target={
                        monthlyCombined
                          .dispatchTargetMT
                      }
                      dispatched={
                        monthlyCombined
                          .actualDispatchMT
                      }
                    />

                    <BusinessSplit
                      house={
                        house
                      }
                      steelMill={
                        steelMill
                      }
                      onHouse={() =>
                        setView(
                          "house"
                        )
                      }
                      onSteelMill={() =>
                        setView(
                          "mills"
                        )
                      }
                    />
                  </section>


                 <section className="ma-grade-demand-full-width">
  <GradePerformance
    grades={
      grades
    }
    orders={
      orders
    }
    onGrade={
      openGrade
    }
  />
</section>


                  <section className="ma-quick-navigation">
                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "house"
                        )
                      }
                    >
                      <Building2
                        size={20}
                      />

                      <span>
                        <strong>
                          H.O. Orders
                        </strong>

                        <small>
                          View all H.O.
                          order details
                        </small>
                      </span>

                      <ChevronRight
                        size={18}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "mills"
                        )
                      }
                    >
                      <Factory
                        size={20}
                      />

                      <span>
                        <strong>
                          Steel Mills
                        </strong>

                        <small>
                          Mill-wise
                          order insight
                        </small>
                      </span>

                      <ChevronRight
                        size={18}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "grades"
                        )
                      }
                    >
                      <Layers3
                        size={20}
                      />

                      <span>
                        <strong>
                          All Grades
                        </strong>

                        <small>
                          Grade-wise
                          analysis
                        </small>
                      </span>

                      <ChevronRight
                        size={18}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "orders"
                        )
                      }
                    >
                      <Boxes
                        size={20}
                      />

                      <span>
                        <strong>
                          All Orders
                        </strong>

                        <small>
                          Search complete
                          order list
                        </small>
                      </span>

                      <ChevronRight
                        size={18}
                      />
                    </button>
                  </section>
                </div>


                {/* ===========================================
                    MOBILE UI

                    Completely separate hierarchy.
                =========================================== */}

                <div className="ma-mobile-only">
                  <section className="ma-mobile-hero">
                    <div className="ma-mobile-hero-top">
                      <div>
                        <span>
                          THIS PERIOD
                        </span>

                        <strong>
                          Orders Punched
                        </strong>
                      </div>

                      <PackageSearch
                        size={22}
                      />
                    </div>

                    <b>
                      {formatKG(
                        monthlyCombined
                          .newOrderMT
                      )}
                    </b>

                    <small>
                      {
                        totalOrderCount
                      }{" "}
                      orders •{" "}
                      {formatMT(
                        monthlyCombined
                          .newOrderMT
                      )}
                    </small>

                    <button
                      type="button"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "total",
                          "Orders Punched"
                        )
                      }
                    >
                      View Orders

                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </section>


                  <section className="ma-mobile-source-grid">
                    <MobileKpiCard
                      icon={
                        <Building2
                          size={19}
                        />
                      }
                      label="H.O. Orders"
                      value={
                        house.newOrderMT
                      }
                      helper={`${houseOrderCount} orders`}
                      className="ma-mobile-ho"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "house",
                          "H.O. Orders"
                        )
                      }
                    />

                    <MobileKpiCard
                      icon={
                        <Factory
                          size={19}
                        />
                      }
                      label="Steel Mill"
                      value={
                        steelMill
                          .newOrderMT
                      }
                      helper={`${steelMillOrderCount} orders`}
                      className="ma-mobile-mill"
                      onClick={() =>
                        openMetric(
                          "ordersPunched",
                          "steelMill",
                          "Steel Mill Orders"
                        )
                      }
                    />
                  </section>


                  <section className="ma-mobile-dispatch-card">
                    <div className="ma-mobile-section-title">
                      <div>
                        <span>
                          DISPATCH
                        </span>

                        <strong>
                          Dispatch Status
                        </strong>
                      </div>

                      <Truck
                        size={20}
                      />
                    </div>

                    <div className="ma-mobile-dispatch-grid">
                      <button
                        type="button"
                        onClick={() =>
                          openMetric(
                            "dispatchPlanned",
                            "total",
                            "Dispatch Planned"
                          )
                        }
                      >
                        <Target
                          size={18}
                        />

                        <span>
                          Planned
                        </span>

                        <strong>
                          {formatCompactKG(
                            monthlyCombined
                              .dispatchTargetMT
                          )}
                        </strong>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openMetric(
                            "dispatched",
                            "total",
                            "Dispatched"
                          )
                        }
                      >
                        <CheckCircle2
                          size={18}
                        />

                        <span>
                          Dispatched
                        </span>

                        <strong>
                          {formatCompactKG(
                            monthlyCombined
                              .actualDispatchMT
                          )}
                        </strong>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openMetric(
                            "dispatchLeft",
                            "total",
                            "Dispatch Left"
                          )
                        }
                      >
                        <Clock3
                          size={18}
                        />

                        <span>
                          Left
                        </span>

                        <strong>
                          {formatCompactKG(
                            monthlyCombined
                              .targetPendingMT
                          )}
                        </strong>
                      </button>
                    </div>

                    <DispatchProgress
                      target={
                        monthlyCombined
                          .dispatchTargetMT
                      }
                      dispatched={
                        monthlyCombined
                          .actualDispatchMT
                      }
                    />
                  </section>


                 <GradePerformance
  grades={
    grades
  }
  orders={
    orders
  }
  onGrade={
    openGrade
  }
/>


                 

                  <section className="ma-mobile-nav">
                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "mills"
                        )
                      }
                    >
                      <Factory
                        size={19}
                      />

                      <span>
                        Steel Mills
                      </span>

                      <ChevronRight
                        size={17}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "grades"
                        )
                      }
                    >
                      <Layers3
                        size={19}
                      />

                      <span>
                        All Grades
                      </span>

                      <ChevronRight
                        size={17}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          "orders"
                        )
                      }
                    >
                      <Boxes
                        size={19}
                      />

                      <span>
                        All Orders
                      </span>

                      <ChevronRight
                        size={17}
                      />
                    </button>
                  </section>
                </div>
              </>
            ) : view ===
              "house" ? (
              <>
                <section className="ma-detail-hero ho">
                  <span>
                    H.O. ORDERS
                  </span>

                  <strong>
                    {formatKG(
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
                          houseOrderCount
                        }
                      </b>
                    </div>

                    <div>
                      <small>
                        Dispatch Planned
                      </small>

                      <b>
                        {formatKG(
                          house
                            .dispatchTargetMT
                        )}
                      </b>
                    </div>

                    <div>
                      <small>
                        Dispatched
                      </small>

                      <b>
                        {formatKG(
                          house
                            .actualDispatchMT
                        )}
                      </b>
                    </div>

                    <div>
                      <small>
                        Dispatch Left
                      </small>

                      <b>
                        {formatKG(
                          house
                            .targetPendingMT
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
              "mills" ? (
              <>
                {!selectedMill && (
                  <section className="ma-section">
                    <div className="ma-section-heading-v2">
                      <div>
                        <span>
                          STEEL MILL
                        </span>

                        <h2>
                          Mill-wise
                          Orders
                        </h2>

                        <p>
                          Tap any mill
                          to see its
                          orders.
                        </p>
                      </div>

                      <Factory
                        size={21}
                      />
                    </div>

                    {mills.length ? (
                      <div className="ma-mill-list">
                        {mills.map(
                          (
                            mill,
                            index
                          ) => {
                            const name =
                              mill
                                ?.name ||
                              mill
                                ?.mill ||
                              mill
                                ?.steelMill ||
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
                                    {formatKG(
                                      getNewOrderMT(
                                        mill
                                      )
                                    )}
                                  </span>

                                  <small>
                                    {safeNumber(
                                      mill
                                        ?.orderCount ??
                                        mill
                                          ?.orders
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
                    ) : (
                      <EmptyState
                        text="No steel mill data is available for this period."
                      />
                    )}
                  </section>
                )}

                {selectedMill && (
                  <section className="ma-detail-hero mill">
                    <span>
                      STEEL MILL
                    </span>

                    <strong>
                      {
                        selectedMill
                      }
                    </strong>

                    <div className="ma-detail-hero-grid">
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
                          Order Qty
                        </small>

                        <b>
                          {formatKG(
                            millOrders.reduce(
                              (
                                total,
                                order
                              ) =>
                                total +
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
                          Dispatch Left
                        </small>

                        <b>
                          {formatKG(
                            millOrders.reduce(
                              (
                                total,
                                order
                              ) =>
                                total +
                                getTargetPendingMT(
                                  order
                                ),
                              0
                            )
                          )}
                        </b>
                      </div>
                    </div>
                  </section>
                )}

                {selectedMill && (
                  <OrderSearch
                    value={search}
                    onChange={
                      setSearch
                    }
                  />
                )}

                {selectedMill && (
                  <OrderCards
                    orders={
                      millOrders
                    }
                  />
                )}
              </>
            ) : view ===
              "grades" ? (
              <>
                {!selectedGrade ? (
                  <section className="ma-section">
                    <div className="ma-section-heading-v2">
                      <div>
                        <span>
                          GRADE WISE
                        </span>

                        <h2>
                          Grade Analysis
                        </h2>

                        <p>
                          Order and
                          dispatch
                          movement by
                          grade.
                        </p>
                      </div>

                      <Layers3
                        size={21}
                      />
                    </div>

                    <GradePerformance
                      grades={
                        grades
                      }
                      onGrade={
                        openGrade
                      }
                    />
                  </section>
                ) : (
                  <>
                    <section className="ma-detail-hero grade">
                      <span>
                        GRADE
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
                            Order Qty
                          </small>

                          <b>
                            {formatKG(
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
                            Dispatched
                          </small>

                          <b>
                            {formatKG(
                              gradeOrders.reduce(
                                (
                                  sum,
                                  order
                                ) =>
                                  sum +
                                  getActualDispatchMT(
                                    order
                                  ),
                                0
                              )
                            )}
                          </b>
                        </div>

                        <div>
                          <small>
                            Dispatch Left
                          </small>

                          <b>
                            {formatKG(
                              gradeOrders.reduce(
                                (
                                  sum,
                                  order
                                ) =>
                                  sum +
                                  getTargetPendingMT(
                                    order
                                  ),
                                0
                              )
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
                  <div className="ma-section-heading-v2">
                    <div>
                      <span>
                        ORDER DATABASE
                      </span>

                      <h2>
                        All Orders
                      </h2>

                      <p>
                        {
                          searchedOrders.length
                        }{" "}
                        orders in this
                        selection.
                      </p>
                    </div>

                    <Boxes
                      size={21}
                    />
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
