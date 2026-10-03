// backend/services/steelAnalyticsPdfService.js

const fs =
  require("fs");

const puppeteer =
  require("puppeteer");

const ensureChromium =
  require(
    "../util/ensureChromium"
  );

const runWithChromiumLock =
  require(
    "../util/chromiumLock"
  );

const steelAnalyticsService =
  require(
    "./steelAnalyticsService"
  );

const steelAnalyticsTemplate =
  require(
    "../templates/steelAnalyticstemplate"
  );

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_PERIODS = [
  1,
  3,
  6,
];

/*
 * Management analytics officially starts
 * from 13 August 2026.
 */
const ANALYTICS_START_DATE =
  "2026-08-13";

/* =========================================================
   NUMBER HELPERS
========================================================= */

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const roundKg = (
  value
) => {
  return Math.round(
    (
      toNumber(value) +
      Number.EPSILON
    ) *
      100
  ) / 100;
};

/* =========================================================
   DATE HELPERS
========================================================= */

const pad2 = (
  value
) => {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
};

const parseMonth = (
  month
) => {
  const cleanMonth =
    String(
      month || ""
    ).trim();

  if (
    !/^\d{4}-\d{2}$/.test(
      cleanMonth
    )
  ) {
    throw new Error(
      "month is required in YYYY-MM format."
    );
  }

  const [
    year,
    monthNumber,
  ] = cleanMonth
    .split("-")
    .map(Number);

  if (
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error(
      "Invalid month."
    );
  }

  return new Date(
    year,
    monthNumber - 1,
    1
  );
};

const formatApiDate = (
  date
) => {
  return [
    date.getFullYear(),
    pad2(
      date.getMonth() + 1
    ),
    pad2(
      date.getDate()
    ),
  ].join("-");
};

const formatDisplayDate = (
  value
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
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

const formatMonthLabel = (
  date
) => {
  return date.toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "numeric",
    }
  );
};

const maxDateString = (
  first,
  second
) => {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return first > second
    ? first
    : second;
};

/* =========================================================
   BUILD MONTHS

   selected September:

   1M:
   September

   3M:
   July, August, September

   6M:
   April ... September

   But because analytics starts 13-Aug-2026,
   periods before this date are clamped/skipped.
========================================================= */

const buildMonths = (
  selectedMonth,
  period
) => {
  const selected =
    parseMonth(
      selectedMonth
    );

  const months = [];

  for (
    let offset =
      period - 1;
    offset >= 0;
    offset -= 1
  ) {
    const date =
      new Date(
        selected.getFullYear(),
        selected.getMonth() -
          offset,
        1
      );

    const monthStart =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      );

    const monthEnd =
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      );

    const rawFrom =
      formatApiDate(
        monthStart
      );

    const to =
      formatApiDate(
        monthEnd
      );

    /*
     * Completely before analytics
     * start date -> do not query it.
     */
    if (
      to <
      ANALYTICS_START_DATE
    ) {
      continue;
    }

    const from =
      maxDateString(
        rawFrom,
        ANALYTICS_START_DATE
      );

    months.push({
      key:
        `${date.getFullYear()}-${pad2(
          date.getMonth() + 1
        )}`,

      label:
        formatMonthLabel(
          date
        ),

      from,
      to,
    });
  }

  if (!months.length) {
    throw new Error(
      "Selected period is before the Management Analysis start date."
    );
  }

  return months;
};

/* =========================================================
   METRIC NORMALIZER

   Preferred backend fields are KG.

   MT fallbacks exist only so old analytics data
   does not break PDF generation.
========================================================= */

const readKg = (
  source = {},
  kgFields = [],
  mtFields = []
) => {
  for (
    const field of
    kgFields
  ) {
    if (
      source?.[field] !==
        undefined &&
      source?.[field] !==
        null &&
      source?.[field] !== ""
    ) {
      return roundKg(
        source[field]
      );
    }
  }

  for (
    const field of
    mtFields
  ) {
    if (
      source?.[field] !==
        undefined &&
      source?.[field] !==
        null &&
      source?.[field] !== ""
    ) {
      return roundKg(
        toNumber(
          source[field]
        ) * 1000
      );
    }
  }

  return 0;
};

const normalizeMetricBlock = (
  source = {}
) => {
  const newOrderKg =
    readKg(
      source,
      [
        "newOrderKg",
        "orderedKg",
        "orderQuantityKg",
        "orderQtyKg",
        "quantityKg",
      ],
      [
        "newOrderMT",
        "orderedMT",
        "orderQuantityMT",
        "orderQtyMT",
        "quantityMT",
      ]
    );

  const dispatchTargetKg =
    readKg(
      source,
      [
        "dispatchTargetKg",
        "targetKg",
        "targetQuantityKg",
      ],
      [
        "dispatchTargetMT",
        "targetMT",
        "targetQuantityMT",
      ]
    );

  const actualDispatchKg =
    readKg(
      source,
      [
        "actualDispatchKg",
        "dispatchKg",
        "dispatchedKg",
      ],
      [
        "actualDispatchMT",
        "dispatchMT",
        "dispatchedMT",
      ]
    );

  let dispatchLeftKg =
    readKg(
      source,
      [
        "dispatchLeftKg",
        "dispatchPendingKg",
        "targetPendingKg",
        "pendingDispatchKg",
      ],
      [
        "dispatchLeftMT",
        "dispatchPendingMT",
        "targetPendingMT",
        "pendingDispatchMT",
      ]
    );

  /*
   * IMPORTANT:
   *
   * Target pending must preferably come
   * from backend order-by-order calculation.
   *
   * We only subtract target - dispatch
   * when backend has not supplied a pending field.
   */
  const hasExplicitPending =
    [
      "dispatchLeftKg",
      "dispatchPendingKg",
      "targetPendingKg",
      "pendingDispatchKg",
      "dispatchLeftMT",
      "dispatchPendingMT",
      "targetPendingMT",
      "pendingDispatchMT",
    ].some(
      (field) =>
        source?.[field] !==
          undefined &&
        source?.[field] !==
          null
    );

  if (
    !hasExplicitPending
  ) {
    dispatchLeftKg =
      Math.max(
        dispatchTargetKg -
          actualDispatchKg,
        0
      );
  }

  return {
    newOrderKg,

    dispatchTargetKg,

    actualDispatchKg,

    dispatchLeftKg:
      roundKg(
        dispatchLeftKg
      ),
  };
};

/* =========================================================
   SUMMARY NORMALIZATION
========================================================= */

const getSummaryRoot = (
  data = {}
) => {
  return (
    data.summary ||
    data
  );
};

const normalizeAnalytics = (
  data = {}
) => {
  const summary =
    getSummaryRoot(
      data
    );

  const houseRaw =
    summary.house ||
    summary.ho ||
    data.house ||
    data.ho ||
    {};

  const steelMillRaw =
    summary.steelMill ||
    summary.nho ||
    data.steelMill ||
    data.nho ||
    {};

  const house =
    normalizeMetricBlock(
      houseRaw
    );

  const steelMill =
    normalizeMetricBlock(
      steelMillRaw
    );

  return {
    house,

    steelMill,

    combined: {
      newOrderKg:
        roundKg(
          house.newOrderKg +
            steelMill.newOrderKg
        ),

      dispatchTargetKg:
        roundKg(
          house.dispatchTargetKg +
            steelMill.dispatchTargetKg
        ),

      actualDispatchKg:
        roundKg(
          house.actualDispatchKg +
            steelMill.actualDispatchKg
        ),

      dispatchLeftKg:
        roundKg(
          house.dispatchLeftKg +
            steelMill.dispatchLeftKg
        ),
    },
  };
};

/* =========================================================
   GRADE NORMALIZATION
========================================================= */

const getGradeArray = (
  data = {}
) => {
  if (
    Array.isArray(
      data.grades
    )
  ) {
    return data.grades;
  }

  if (
    Array.isArray(
      data.gradeAnalysis
    )
  ) {
    return data.gradeAnalysis;
  }

  if (
    Array.isArray(
      data.gradeWise
    )
  ) {
    return data.gradeWise;
  }

  return [];
};

const normalizeGrade = (
  grade = {}
) => {
  const metrics =
    normalizeMetricBlock(
      grade
    );

  return {
    grade:
      String(
        grade.grade ||
        grade.gradeName ||
        grade.name ||
        grade.materialGrade ||
        "UNIDENTIFIED"
      ).trim(),

    ...metrics,

    orderCount:
      toNumber(
        grade.orderCount ??
        grade.totalOrders ??
        0
      ),
  };
};

/* =========================================================
   MERGE GRADE DATA ACROSS PERIOD
========================================================= */

const mergeGrades = (
  monthlyData
) => {
  const map =
    new Map();

  monthlyData.forEach(
    (month) => {
      getGradeArray(
        month.rawData
      ).forEach(
        (rawGrade) => {
          const grade =
            normalizeGrade(
              rawGrade
            );

          const key =
            grade.grade
              .toUpperCase();

          if (
            !map.has(key)
          ) {
            map.set(
              key,
              {
                grade:
                  grade.grade,

                newOrderKg: 0,

                dispatchTargetKg:
                  0,

                actualDispatchKg:
                  0,

                dispatchLeftKg:
                  0,

                orderCount: 0,
              }
            );
          }

          const current =
            map.get(key);

          current.newOrderKg +=
            grade.newOrderKg;

          current.dispatchTargetKg +=
            grade.dispatchTargetKg;

          current.actualDispatchKg +=
            grade.actualDispatchKg;

          current.dispatchLeftKg +=
            grade.dispatchLeftKg;

          current.orderCount +=
            grade.orderCount;
        }
      );
    }
  );

  return Array.from(
    map.values()
  )
    .map(
      (grade) => ({
        ...grade,

        newOrderKg:
          roundKg(
            grade.newOrderKg
          ),

        dispatchTargetKg:
          roundKg(
            grade.dispatchTargetKg
          ),

        actualDispatchKg:
          roundKg(
            grade.actualDispatchKg
          ),

        dispatchLeftKg:
          roundKg(
            grade.dispatchLeftKg
          ),
      })
    )
    .sort(
      (a, b) =>
        b.newOrderKg -
        a.newOrderKg
    );
};

/* =========================================================
   ADD METRICS
========================================================= */

const emptyMetricBlock =
  () => ({
    newOrderKg: 0,

    dispatchTargetKg: 0,

    actualDispatchKg: 0,

    dispatchLeftKg: 0,
  });

const addMetricBlock = (
  target,
  source
) => {
  target.newOrderKg +=
    toNumber(
      source.newOrderKg
    );

  target.dispatchTargetKg +=
    toNumber(
      source.dispatchTargetKg
    );

  target.actualDispatchKg +=
    toNumber(
      source.actualDispatchKg
    );

  target.dispatchLeftKg +=
    toNumber(
      source.dispatchLeftKg
    );
};

const roundMetricBlock = (
  block
) => {
  Object.keys(
    block
  ).forEach(
    (key) => {
      block[key] =
        roundKg(
          block[key]
        );
    }
  );

  return block;
};

/* =========================================================
   FETCH ONE MONTH

   IMPORTANT:
   This calls your EXISTING analytics service.
   The PDF does not independently query MongoDB.
========================================================= */

const fetchOneMonth =
  async (
    month,
    extraFilters
  ) => {
    const filters = {
      ...extraFilters,

      from:
        month.from,

      to:
        month.to,
    };

    const rawData =
      await steelAnalyticsService
        .getSteelAnalytics(
          filters
        );

    const normalized =
      normalizeAnalytics(
        rawData
      );

    return {
      ...month,

      rawData,

      house:
        normalized.house,

      steelMill:
        normalized.steelMill,

      combined:
        normalized.combined,
    };
  };

/* =========================================================
   BUILD REPORT DATA

   1 month:
   selected month.

   3 month:
   previous 2 + selected month.

   6 month:
   previous 5 + selected month.

   Each month is fetched independently so monthly
   comparison is genuine month-by-month data.
========================================================= */

const buildReportData =
  async ({
    month,
    period = 1,
    trackingOrderType,
    steelMill,
    grade,
  }) => {
    const periodNumber =
      Number(period);

    if (
      !VALID_PERIODS.includes(
        periodNumber
      )
    ) {
      throw new Error(
        "period must be 1, 3 or 6."
      );
    }

    const months =
      buildMonths(
        month,
        periodNumber
      );

    const extraFilters =
      {};

    if (
      trackingOrderType
    ) {
      extraFilters
        .trackingOrderType =
        trackingOrderType;
    }

    if (steelMill) {
      extraFilters
        .steelMill =
        steelMill;
    }

    if (grade) {
      extraFilters.grade =
        grade;
    }

    /*
     * Sequential intentionally.
     *
     * On Hostinger shared hosting we do not
     * want six heavy analytics DB calls
     * firing simultaneously.
     */
    const monthlyData =
      [];

    for (
      const monthItem of
      months
    ) {
      const result =
        await fetchOneMonth(
          monthItem,
          extraFilters
        );

      monthlyData.push(
        result
      );
    }

    const total = {
      house:
        emptyMetricBlock(),

      steelMill:
        emptyMetricBlock(),

      combined:
        emptyMetricBlock(),
    };

    monthlyData.forEach(
      (item) => {
        addMetricBlock(
          total.house,
          item.house
        );

        addMetricBlock(
          total.steelMill,
          item.steelMill
        );

        addMetricBlock(
          total.combined,
          item.combined
        );
      }
    );

    roundMetricBlock(
      total.house
    );

    roundMetricBlock(
      total.steelMill
    );

    roundMetricBlock(
      total.combined
    );

    const grades =
      mergeGrades(
        monthlyData
      );

    const firstMonth =
      monthlyData[0];

    const lastMonth =
      monthlyData[
        monthlyData.length -
          1
      ];

    return {
      generatedAt:
        new Date(),

      selectedMonth:
        month,

      requestedPeriod:
        periodNumber,

      periodLabel:
        periodNumber === 1
          ? "1 Month"
          : `${periodNumber} Months`,

      dateRange: {
        from:
          firstMonth.from,

        to:
          lastMonth.to,

        display:
          `${formatDisplayDate(
            firstMonth.from
          )} - ${formatDisplayDate(
            lastMonth.to
          )}`,
      },

      filters:
        extraFilters,

      total,

      months:
        monthlyData.map(
          (item) => ({
            key:
              item.key,

            label:
              item.label,

            from:
              item.from,

            to:
              item.to,

            house:
              item.house,

            steelMill:
              item.steelMill,

            combined:
              item.combined,
          })
        ),

      grades,
    };
  };

/* =========================================================
   GENERATE PDF BUFFER

   CRITICAL HOSTINGER RULE:

   Use the SAME runWithChromiumLock used by
   Sales Order PDF.

   Therefore:

   Sales Order PDF running
        ↓
   Analytics waits

   Analytics PDF running
        ↓
   Sales Order waits

   Never two temporary Chromium PDF processes
   at the same time.
========================================================= */

const generateSteelAnalyticsPdf =
  async (options) => {
    /*
     * Build analytics data BEFORE taking Chromium lock.
     *
     * This is important:
     * database calculation does not occupy the
     * scarce Chromium lock.
     */
    const report =
      await buildReportData(
        options
      );

    return runWithChromiumLock(
      "STEEL_ANALYTICS_PDF",

      async () => {
        const html =
          steelAnalyticsTemplate(
            report
          );

        let browser = null;
        let page = null;

        try {
          /*
           * EXACT SAME CHROMIUM RESOLUTION
           * AS SALES ORDER PDF.
           */
          const executablePath =
            await ensureChromium();

          if (
            !executablePath ||
            !fs.existsSync(
              executablePath
            )
          ) {
            throw new Error(
              "PDF Chromium executable is unavailable."
            );
          }

          console.log(
            "STEEL ANALYTICS PDF CHROMIUM START =>",
            executablePath
          );

          /*
           * IMPORTANT:
           *
           * pipe:true is required for the
           * working Hostinger setup.
           *
           * Do NOT replace this with a
           * localhost DevTools port.
           */
          browser =
            await puppeteer.launch({
              executablePath,

              pipe: true,

              headless: true,

              args: [
                "--no-sandbox",

                "--disable-setuid-sandbox",

                "--disable-dev-shm-usage",

                "--disable-gpu",

                "--disable-extensions",

                "--disable-background-networking",

                "--disable-background-timer-throttling",

                "--disable-renderer-backgrounding",

                "--disable-features=TranslateUI",

                "--disable-ipc-flooding-protection",

                /*
                 * Low-process mode for
                 * Hostinger shared hosting.
                 */
                "--single-process",

                "--no-zygote",

                "--no-first-run",
              ],
            });

          if (
            !browser ||
            !browser.isConnected()
          ) {
            throw new Error(
              "Steel Analytics PDF Chromium failed to start."
            );
          }

          page =
            await browser.newPage();

          await page.setContent(
            html,
            {
              waitUntil:
                "domcontentloaded",

              timeout:
                120000,
            }
          );

          await page
            .emulateMediaType(
              "screen"
            );

          /*
           * Embedded Roboto must finish loading
           * before Chromium prints.
           */
          try {
            await page.evaluateHandle(
              "document.fonts.ready"
            );
          } catch (
            error
          ) {
            console.log(
              "STEEL ANALYTICS PDF FONT WAIT SKIPPED =>",
              error.message
            );
          }

          /*
           * Same small stabilization delay
           * used by the working Sales Order PDF.
           */
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                500
              )
          );

          const pdfBuffer =
            await page.pdf({
              format:
                "A4",

              printBackground:
                true,

              preferCSSPageSize:
                true,

              margin: {
                top:
                  "8mm",

                right:
                  "8mm",

                bottom:
                  "8mm",

                left:
                  "8mm",
              },
            });

          if (
            !pdfBuffer ||
            pdfBuffer.length ===
              0
          ) {
            throw new Error(
              "Steel Analytics PDF generation returned an empty file."
            );
          }

          console.log(
            "STEEL ANALYTICS PDF GENERATED SUCCESSFULLY =>",
            pdfBuffer.length,
            "bytes"
          );

          const safeMonth =
            String(
              options.month
            ).replace(
              /[^0-9-]/g,
              ""
            );

          return {
            buffer:
              pdfBuffer,

            report,

            filename:
              `Management_Analysis_${options.period || 1}M_${safeMonth}.pdf`,
          };
        } catch (
          error
        ) {
          console.log(
            "STEEL ANALYTICS PDF FAILED =>",
            error.message
          );

          throw error;
        } finally {
          /*
           * ALWAYS close page first.
           */
          if (page) {
            await page
              .close()
              .catch(
                () => {}
              );
          }

          /*
           * ALWAYS close temporary Chromium.
           *
           * This is critical on Hostinger.
           */
          if (browser) {
            await browser
              .close()
              .catch(
                () => {}
              );

            console.log(
              "STEEL ANALYTICS PDF CHROMIUM CLOSED"
            );
          }
        }
      }
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateSteelAnalyticsPdf,

  buildReportData,
};