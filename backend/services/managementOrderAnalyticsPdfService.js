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

const managementOrderAnalysisService =
  require(
    "./managementOrderAnalyticsService"
  );

const managementOrderAnalyticsPdfTemplate =
  require(
    "../templates/managementOrderAnalyticsPdfTemplate"
  );

const {
  buildSteelMillOrderAnalysisPdfHtml,
} = require(
  "../templates/steelMillOrderAnalysisPdfTemplate"
);
/* =========================================================
   SAFE NUMBER
========================================================= */

const safeNumber = (
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


/* =========================================================
   NORMALIZE ARRAY
========================================================= */

const safeArray = (
  value
) =>
  Array.isArray(value)
    ? value
    : [];


/* =========================================================
   EXTRACT SUMMARY
========================================================= */

const getHouseSummary = (
  analytics = {}
) =>
  analytics.house ||
  analytics.ho ||
  analytics.headOffice ||
  analytics.summary?.house ||
  analytics.summary?.ho ||
  analytics.summary?.headOffice ||
  analytics.summary ||
  {};


/* =========================================================
   EXTRACT ORDERS
========================================================= */

const getOrders = (
  analytics = {}
) =>
  safeArray(
    analytics.orders ||
    analytics.salesOrders ||
    analytics.orderDetails ||
    analytics.houseOrders ||
    analytics.hoOrders ||
    analytics.data?.orders
  );


/* =========================================================
   EXTRACT GRADES
========================================================= */

const getGrades = (
  analytics = {}
) =>
  safeArray(
    analytics.grades ||
    analytics.gradeAnalysis ||
    analytics.gradeWise ||
    analytics.summary?.grades
  );


/* =========================================================
   ORDER QUANTITY
========================================================= */

const getOrderQuantity = (
  order = {}
) =>
  safeNumber(
    order.quantityKG ??
    order.orderQuantityKG ??
    order.orderedKG ??
    order.orderTakenKG ??
    order.totalQuantityKG ??
    order.quantity ??
    0
  );


/* =========================================================
   BUILD PERIOD
========================================================= */

const getPeriod = (
  analytics,
  filters
) =>
  analytics?.period || {
    month:
      filters.month ||
      "",

    months:
      Number(
        filters.months ||
        1
      ),

    from:
      analytics?.from ||
      null,

    to:
      analytics?.to ||
      null,

    label:
      analytics?.periodLabel ||
      "",
  };


/* =========================================================
   LOAD H.O. ANALYTICS

   IMPORTANT:

   Use the EXISTING H.O. detail method from
   managementOrderAnalyticsService.

   This keeps:

   - Management Order Analysis as source of truth
   - H.O. only
   - Sales Order collection only
   - NO dispatch
   - NO logistics
   - Full order details for PDF
========================================================= */

const loadHouseAnalytics =
  async (
    filters = {}
  ) => {
    if (
      typeof managementOrderAnalysisService
        .getHouseOrderDetails !==
      "function"
    ) {
      throw new Error(
        "Management Order Analytics service does not expose getHouseOrderDetails."
      );
    }

    return managementOrderAnalysisService
      .getHouseOrderDetails({
        month:
          filters.month,

        months:
          Number(
            filters.months ||
            1
          ),
      });
  };


  /* =========================================================
   EXTRACT STEEL MILL SUMMARY
========================================================= */

const getSteelMillSummary = (
  analytics = {}
) =>
  analytics.summary ||
  analytics.mill ||
  analytics.steelMill ||
  analytics.millSummary ||
  {};


/* =========================================================
   LOAD STEEL MILL ANALYTICS

   IMPORTANT:

   Uses the EXISTING Management Order Analysis
   steel-mill detail method.

   - N.H.O. / Steel Mill only
   - Full order details
   - NO logistics
   - NO dispatch
========================================================= */

const loadSteelMillAnalytics =
  async (
    filters = {}
  ) => {
    if (
      typeof managementOrderAnalysisService
        .getSteelMillOrderDetails !==
      "function"
    ) {
      throw new Error(
        "Management Order Analytics service does not expose getSteelMillOrderDetails."
      );
    }

    if (
      !filters.steelMill
    ) {
      throw new Error(
        "steelMill is required for Steel Mill PDF."
      );
    }

    return managementOrderAnalysisService
      .getSteelMillOrderDetails({
        month:
          filters.month,

        months:
          Number(
            filters.months ||
            1
          ),

        steelMill:
          filters.steelMill,

        supplyCondition:
          filters.supplyCondition,

        trackingOrderType:
          "N.H.O.",
      });
  };


/* =========================================================
   GENERATE H.O. PDF
========================================================= */

const generateHouseOrderAnalysisPdf =
  async (
    filters = {}
  ) =>
    runWithChromiumLock(
      "HO_ORDER_ANALYSIS_PDF",
      async () => {
        let browser =
          null;

        try {
          console.log(
            "[HO ORDER PDF] Loading analytics..."
          );

          /*
           * Keep Management Order Analysis
           * as the source of truth.
           */
          const analytics =
            await loadHouseAnalytics({
              ...filters,

              trackingOrderType:
                "H.O.",
            });

          const orders =
            getOrders(
              analytics
            );

          const grades =
            getGrades(
              analytics
            );

          const summary =
            getHouseSummary(
              analytics
            );

          /*
           * Fallback quantity calculation.
           *
           * If summary quantity is missing,
           * calculate from the order rows.
           */
          const calculatedQuantityKG =
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

          const normalizedSummary = {
            ...summary,

            quantityKG:
              safeNumber(
                summary.quantityKG ??
                  summary.orderQuantityKG ??
                  summary.orderedKG ??
                  summary.orderTakenKG ??
                  summary.totalQuantityKG
              ) ||
              calculatedQuantityKG,

            orderCount:
              safeNumber(
                summary.orderCount ??
                  summary.totalOrders ??
                  summary.orders
              ) ||
              orders.length,
          };

          /*
           * Build HTML before opening Chromium.
           */
          const html =
            managementOrderAnalyticsPdfTemplate({
              generatedAt:
                new Date(),

              period:
                getPeriod(
                  analytics,
                  filters
                ),

              summary:
                normalizedSummary,

              grades,

              orders,
            });

          if (
            !html ||
            typeof html !==
              "string"
          ) {
            throw new Error(
              "Management Order Analysis PDF template returned invalid HTML."
            );
          }

          console.log(
            "[HO ORDER PDF] Ensuring Chromium..."
          );

          /*
           * Use the existing Bharat RMS
           * Chromium installer/check.
           */
          const chromium =
            await ensureChromium();

          /*
           * Support both current and older
           * ensureChromium implementations.
           */
          let executablePath =
            null;

          if (
            typeof chromium ===
            "string"
          ) {
            executablePath =
              chromium;
          } else if (
            chromium &&
            typeof chromium ===
              "object"
          ) {
            executablePath =
              chromium.executablePath ||
              chromium.path ||
              chromium.browserPath ||
              null;
          }

          /*
           * Older ensureChromium versions
           * may only prepare Puppeteer's
           * browser and return nothing.
           *
           * In that case let Puppeteer use
           * its configured executable.
           */
          const launchOptions = {
            headless:
              true,

            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
            ],
          };

          if (
            executablePath
          ) {
            launchOptions
              .executablePath =
              executablePath;
          }

          console.log(
            "[HO ORDER PDF] Launching Chromium...",
            executablePath
              ? executablePath
              : "Puppeteer default executable"
          );

          browser =
            await puppeteer.launch(
              launchOptions
            );

          const page =
            await browser
              .newPage();

          /*
           * Keep the PDF deterministic.
           */
          await page
            .setViewport({
              width: 1440,
              height: 900,
              deviceScaleFactor: 1,
            });

          await page
            .setContent(
              html,
              {
                waitUntil:
                  "networkidle0",

                timeout:
                  60000,
              }
            );

          await page
            .emulateMediaType(
              "print"
            );

          /*
           * Wait for fonts before PDF.
           */
          await page.evaluate(
            async () => {
              if (
                document.fonts &&
                document.fonts.ready
              ) {
                await document
                  .fonts.ready;
              }
            }
          );

          const pdfBuffer =
            await page.pdf({
              format:
                "A4",

              landscape:
                true,

              printBackground:
                true,

              preferCSSPageSize:
                true,

              margin: {
                top:
                  "10mm",

                right:
                  "10mm",

                bottom:
                  "12mm",

                left:
                  "10mm",
              },
            });

          if (
            !pdfBuffer ||
            !pdfBuffer.length
          ) {
            throw new Error(
              "Generated H.O. Order Analysis PDF is empty."
            );
          }

          console.log(
            `[HO ORDER PDF] Generated successfully: ${pdfBuffer.length} bytes`
          );

          return {
            buffer:
              pdfBuffer,

            filename:
              buildFilename(
                filters
              ),

            analytics: {
              orderCount:
                normalizedSummary
                  .orderCount,

              quantityKG:
                normalizedSummary
                  .quantityKG,
            },
          };
        } catch (error) {
          console.error(
            "[HO ORDER PDF] Generation failed:",
            error
          );

          throw error;
        } finally {
          if (browser) {
            try {
              await browser
                .close();

              console.log(
                "[HO ORDER PDF] Chromium closed."
              );
            } catch (
              closeError
            ) {
              console.error(
                "[HO ORDER PDF] Chromium close error:",
                closeError
              );
            }
          }
        }
      }
    );


    /* =========================================================
   GENERATE STEEL MILL ORDER ANALYSIS PDF

   PDF CONTAINS:

   - Bharat Special Steels header
   - Selected steel mill
   - Selected period
   - Selected supply condition
   - Total sales orders
   - Total order quantity
   - Complete mill order register

   OPTIONAL:
   - Customer column

   DOES NOT CONTAIN:
   - Grade analysis
   - Dispatch
   - Pending
   - Logistics
   - Current status
   - Tentative schedule
========================================================= */

const generateSteelMillOrderAnalysisPdf =
  async (
    filters = {}
  ) =>
    runWithChromiumLock(
      "STEEL_MILL_ORDER_ANALYSIS_PDF",
      async () => {
        let browser =
          null;

        try {
          /* =============================================
             VALIDATE
          ============================================= */

          const steelMill =
            String(
              filters.steelMill ||
              ""
            ).trim();

          if (
            !steelMill
          ) {
            throw new Error(
              "steelMill is required for Steel Mill PDF."
            );
          }


          const includeCustomerName =
            !(
              filters.includeCustomerName ===
                false ||
              filters.includeCustomerName ===
                "false" ||
              filters.includeCustomerName ===
                0 ||
              filters.includeCustomerName ===
                "0"
            );


          const supplyCondition =
            String(
              filters.supplyCondition ||
              ""
            ).trim();


          console.log(
            "[STEEL MILL ORDER PDF] Loading analytics...",
            {
              steelMill,
              month:
                filters.month,
              months:
                filters.months,
              supplyCondition:
                supplyCondition ||
                "ALL",
              includeCustomerName,
            }
          );


          /* =============================================
             LOAD MANAGEMENT ORDER DATA
          ============================================= */

          const analytics =
            await loadSteelMillAnalytics({
              ...filters,

              steelMill,

              trackingOrderType:
                "N.H.O.",
            });


          /* =============================================
             EXTRACT ORDERS
          ============================================= */

          const orders =
            getOrders(
              analytics
            );


          const summary =
            getSteelMillSummary(
              analytics
            );


          /* =============================================
             CALCULATE QUANTITY FALLBACK
          ============================================= */

          const calculatedQuantityKG =
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


          const normalizedSummary = {
            ...summary,

            quantityKG:
              safeNumber(
                summary.quantityKG ??
                  summary.orderQuantityKG ??
                  summary.orderedKG ??
                  summary.orderTakenKG ??
                  summary.totalQuantityKG
              ) ||
              calculatedQuantityKG,

            orderCount:
              safeNumber(
                summary.orderCount ??
                  summary.totalOrders
              ) ||
              orders.length,
          };


          console.log(
            "[STEEL MILL ORDER PDF] Analytics loaded:",
            {
              steelMill,

              orders:
                orders.length,

              quantityKG:
                normalizedSummary
                  .quantityKG,
            }
          );


          /* =============================================
             BUILD PDF HTML
          ============================================= */

          const html =
            buildSteelMillOrderAnalysisPdfHtml({
              mill:
                steelMill,

              generatedAt:
                new Date(),

              period:
                getPeriod(
                  analytics,
                  filters
                ),

              supplyCondition:
                supplyCondition ||
                "All Conditions",

              summary:
                normalizedSummary,

              orders,

              includeCustomerName,
            });


          if (
            !html ||
            typeof html !==
              "string"
          ) {
            throw new Error(
              "Steel Mill Order Analysis PDF template returned invalid HTML."
            );
          }


          /* =============================================
             ENSURE CHROMIUM
          ============================================= */

          console.log(
            "[STEEL MILL ORDER PDF] Ensuring Chromium..."
          );


          const chromium =
            await ensureChromium();


          let executablePath =
            null;


          if (
            typeof chromium ===
            "string"
          ) {
            executablePath =
              chromium;
          } else if (
            chromium &&
            typeof chromium ===
              "object"
          ) {
            executablePath =
              chromium.executablePath ||
              chromium.path ||
              chromium.browserPath ||
              null;
          }


          /* =============================================
             PUPPETEER OPTIONS

             Same safe production pattern as H.O.
          ============================================= */

          const launchOptions = {
            headless:
              true,

            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
            ],
          };


          if (
            executablePath
          ) {
            launchOptions
              .executablePath =
              executablePath;
          }


          console.log(
            "[STEEL MILL ORDER PDF] Launching Chromium...",
            executablePath
              ? executablePath
              : "Puppeteer default executable"
          );


          /* =============================================
             OPEN BROWSER
          ============================================= */

          browser =
            await puppeteer.launch(
              launchOptions
            );


          const page =
            await browser
              .newPage();


          await page
            .setViewport({
              width:
                1440,

              height:
                900,

              deviceScaleFactor:
                1,
            });


          /* =============================================
             LOAD TEMPLATE
          ============================================= */

          await page
            .setContent(
              html,
              {
                waitUntil:
                  "networkidle0",

                timeout:
                  60000,
              }
            );


          await page
            .emulateMediaType(
              "print"
            );


          /* =============================================
             WAIT FOR FONTS
          ============================================= */

          await page.evaluate(
            async () => {
              if (
                document.fonts &&
                document.fonts.ready
              ) {
                await document
                  .fonts.ready;
              }
            }
          );


          /* =============================================
             GENERATE PDF
          ============================================= */

          const pdfBuffer =
            await page.pdf({
              format:
                "A4",

              landscape:
                true,

              printBackground:
                true,

              preferCSSPageSize:
                true,

              margin: {
                top:
                  "10mm",

                right:
                  "10mm",

                bottom:
                  "12mm",

                left:
                  "10mm",
              },
            });


          if (
            !pdfBuffer ||
            !pdfBuffer.length
          ) {
            throw new Error(
              "Generated Steel Mill Order Analysis PDF is empty."
            );
          }


          console.log(
            `[STEEL MILL ORDER PDF] Generated successfully: ${pdfBuffer.length} bytes`
          );


          /* =============================================
             RETURN
          ============================================= */

          return {
            buffer:
              pdfBuffer,

            filename:
              buildSteelMillFilename(
                filters
              ),

            analytics: {
              steelMill,

              orderCount:
                normalizedSummary
                  .orderCount,

              quantityKG:
                normalizedSummary
                  .quantityKG,

              includeCustomerName,
            },
          };
        } catch (
          error
        ) {
          console.error(
            "[STEEL MILL ORDER PDF] Generation failed:",
            error
          );

          throw error;
        } finally {
          if (
            browser
          ) {
            try {
              await browser
                .close();

              console.log(
                "[STEEL MILL ORDER PDF] Chromium closed."
              );
            } catch (
              closeError
            ) {
              console.error(
                "[STEEL MILL ORDER PDF] Chromium close error:",
                closeError
              );
            }
          }
        }
      }
    );


/* =========================================================
   FILE NAME
========================================================= */

const buildFilename = (
  filters = {}
) => {
  const month =
    String(
      filters.month ||
      "analysis"
    ).replace(
      /[^0-9A-Za-z_-]/g,
      "-"
    );

  const months =
    [1, 3, 6].includes(
      Number(
        filters.months
      )
    )
      ? Number(
          filters.months
        )
      : 1;

  return (
    `HO_Order_Analysis_` +
    `${month}_${months}M.pdf`
  );
};

/* =========================================================
   STEEL MILL PDF FILE NAME
========================================================= */

const buildSteelMillFilename = (
  filters = {}
) => {
  const month =
    String(
      filters.month ||
      "analysis"
    ).replace(
      /[^0-9A-Za-z_-]/g,
      "-"
    );


  const months =
    [1, 3, 6].includes(
      Number(
        filters.months
      )
    )
      ? Number(
          filters.months
        )
      : 1;


  const steelMill =
    String(
      filters.steelMill ||
      "Steel_Mill"
    )
      .trim()
      .replace(
        /[^0-9A-Za-z_-]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );


  return (
    `Steel_Mill_Order_Analysis_` +
    `${steelMill}_` +
    `${month}_${months}M.pdf`
  );
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  generateHouseOrderAnalysisPdf,
  generateSteelMillOrderAnalysisPdf,
};