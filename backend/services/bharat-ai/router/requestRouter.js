const {
  resolveRelativePeriod,
} = require(
  "../utils/businessTime"
);

const ROUTES =
  Object.freeze({
    BUSINESS:
      "BUSINESS_DATA",

    GENERAL:
      "GENERAL_KNOWLEDGE",

    WEB:
      "LIVE_RESEARCH",

    DOCUMENT:
      "DOCUMENT",

    MATH:
      "MATH_OR_CONVERSION",

    HYBRID:
      "HYBRID",
  });

/* =========================================================
   BUSINESS
========================================================= */

const BUSINESS_PATTERNS = [
  /\bsales?\b/i,
  /\benquir(y|ies)\b/i,
  /\border(s)?\b/i,
  /\bdispatch(es)?\b/i,
  /\breceivable(s)?\b/i,
  /\boverdue\b/i,
  /\bpending payment/i,
  /\battendance\b/i,
  /\btimesheet/i,
  /\bcold call/i,
  /\bcustomer/i,
  /\bsalesperson\b/i,
  /\bsales person\b/i,
  /\bconversion\b/i,
  /\bdelayed order/i,
  /\bproductiv/i,
  /\bperformance\b/i,
];

/* =========================================================
   DOCUMENT
========================================================= */

const DOCUMENT_PATTERNS = [
  /\bbrochure\b/i,
  /\bbroucher\b/i,
  /\bcatalogue\b/i,
  /\bcatalog\b/i,
  /\bdocument\b/i,
  /\bpdf\b/i,
  /\bmtc\b/i,
  /\bcertificate\b/i,
  /\bspecification sheet\b/i,
];

/* =========================================================
   LIVE / CURRENT WEB
========================================================= */

const LIVE_PATTERNS = [
  /\blatest\b/i,
  /\bmarket news\b/i,
  /\bcurrent market\b/i,
  /\bmarket price\b/i,
  /\bspot price\b/i,
  /\bprice today\b/i,
  /\bnews\b/i,
];

/* =========================================================
   TECHNICAL KNOWLEDGE
========================================================= */

const TECHNICAL_PATTERNS = [
  /\bdb6\b/i,
  /\bh13\b/i,
  /\ben19\b/i,
  /\ben24\b/i,
  /\b4130\b/i,
  /\b4140\b/i,
  /\besr\b/i,
  /\bmolybdenum\b/i,
  /\bnickel\b/i,
  /\bchromium\b/i,
  /\bchrome\b/i,
  /\bchemical composition\b/i,
  /\bheat treatment\b/i,
  /\bhardness\b/i,
  /\bforging\b/i,
  /\brolling\b/i,
  /\but testing\b/i,
  /\bultrasonic\b/i,
];

/* =========================================================
   MATH
========================================================= */

const looksLikeMath =
  (
    message
  ) => {
    const text =
      String(
        message || ""
      ).toLowerCase();

    return (
      /\bconvert\b/.test(
        text
      ) ||

      /\d+(?:\.\d+)?\s*(kg|g|mt|mm|cm|m|inch|ft)\s+(to|in)\s+(kg|g|mt|mm|cm|m|inch|ft)/.test(
        text
      ) ||

      /\d+(?:\.\d+)?\s*%\s*of\s*\d+/.test(
        text
      )
    );
  };

/* =========================================================
   BUSINESS DOMAIN IDENTIFICATION

   Used to send only relevant tools.
========================================================= */

const detectDomains =
  (
    message
  ) => {
    const text =
      String(
        message || ""
      );

    const result = [];

    const add =
      (
        name,
        regex
      ) => {
        if (
          regex.test(
            text
          ) &&
          !result.includes(
            name
          )
        ) {
          result.push(
            name
          );
        }
      };

    add(
      "sales",
      /\bsales?\b|\border value\b/i
    );

    add(
      "enquiry",
      /\benquir(y|ies)\b|\bconversion\b/i
    );

    add(
      "dispatch",
      /\bdispatch/i
    );

    add(
      "receivable",
      /\breceivable|\boverdue|\bpending payment/i
    );

    add(
      "tracking",
      /\bdelayed order|\border tracking/i
    );

    add(
      "attendance",
      /\battendance|\bcheck.?in|\bcheck.?out|\bleave\b/i
    );

    add(
      "timesheet",
      /\btimesheet\b/i
    );

    add(
      "activity",
      /\bcold call|\bvisit\b/i
    );

    add(
      "team",
      /\bsalesperson|\bsales person|\bteam|\bproductiv/i
    );

    return result;
  };

/* =========================================================
   ROUTER
========================================================= */

const routeRequest =
  (
    message
  ) => {
    const text =
      String(
        message || ""
      );

    const business =
      BUSINESS_PATTERNS.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      );

    const technical =
      TECHNICAL_PATTERNS.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      );

    const live =
      LIVE_PATTERNS.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      );

    const document =
      DOCUMENT_PATTERNS.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      );

    const period =
      resolveRelativePeriod(
        text
      );

    if (
      looksLikeMath(
        text
      )
    ) {
      return {
        route:
          ROUTES.MATH,

        domains:
          [],

        period,
      };
    }

    if (
      document &&
      !business
    ) {
      return {
        route:
          ROUTES.DOCUMENT,

        domains: [
          "document",
        ],

        period,
      };
    }

    if (
      business &&
      (
        technical ||
        live ||
        document
      )
    ) {
      return {
        route:
          ROUTES.HYBRID,

        domains:
          detectDomains(
            text
          ),

        period,

        needsWeb:
          live,

        needsDocument:
          document,
      };
    }

    if (business) {
      return {
        route:
          ROUTES.BUSINESS,

        domains:
          detectDomains(
            text
          ),

        period,
      };
    }

    if (live) {
      return {
        route:
          ROUTES.WEB,

        domains:
          [],

        period,
      };
    }

    return {
      route:
        ROUTES.GENERAL,

      domains:
        [],

      period,
    };
  };

module.exports = {
  ROUTES,
  routeRequest,
};