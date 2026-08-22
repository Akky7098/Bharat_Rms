const {
  normalizeHinglish,
  refersToSelf,
  detectDetailLevel,
} = require(
  "../context/hinglishNormalizer"
);

const {
  resolveDateContext,
} = require(
  "../context/dateResolver"
);

const {
  mergeContext,
  createEmptyContext,
} = require(
  "./conversationStateService"
);

/* =========================================================
   BUSINESS DOMAINS
========================================================= */

const detectDomains = (
  text
) => {
  const domains = [];

  if (
    /\b(sales order|sales|order value|top customer)\b/.test(
      text
    )
  ) {
    domains.push(
      "sales"
    );
  }

  if (
    /\b(enquiry|conversion|lost enquiry|won enquiry)\b/.test(
      text
    )
  ) {
    domains.push(
      "enquiry"
    );
  }

  if (
    /\b(receivable|pending payment|overdue|payment due)\b/.test(
      text
    )
  ) {
    domains.push(
      "receivable"
    );
  }

  if (
    /\b(dispatch|invoice|dispatch quantity)\b/.test(
      text
    )
  ) {
    domains.push(
      "dispatch"
    );
  }

  if (
    /\b(order tracking|delayed order|eta|rolling|forging)\b/.test(
      text
    )
  ) {
    domains.push(
      "tracking"
    );
  }

  if (
    /\b(attendance|present|absent|check in|check out|leave|wfh|work from home)\b/.test(
      text
    )
  ) {
    domains.push(
      "attendance"
    );
  }

  if (
    /\b(timesheet|work summary|next day plan)\b/.test(
      text
    )
  ) {
    domains.push(
      "timesheet"
    );
  }

  if (
    /\b(cold call|visit|calling|customer activity)\b/.test(
      text
    )
  ) {
    domains.push(
      "activity"
    );
  }

  return [
    ...new Set(
      domains
    ),
  ];
};

/* =========================================================
   DAILY ACTIVITY

   "aaj maine kya kiya"
   "aaj Shalu ne kya kiya"
========================================================= */

const isDailyActivityIntent =
  (
    original,
    normalized
  ) => {
    const raw =
      String(
        original || ""
      ).toLowerCase();

    const hasWorkQuestion =
      /\b(kya kiya|kya kia|what did .* do|what did i do|what work|work done)\b/.test(
        raw
      ) ||
      /\bwhat did do\b/.test(
        normalized
      );

    const hasDate =
      resolveDateContext(
        original
      ).matched;

    return (
      hasWorkQuestion &&
      hasDate
    );
  };

/* =========================================================
   INTENT
========================================================= */

const detectIntent = ({
  original,
  normalized,
}) => {
  if (
    isDailyActivityIntent(
      original,
      normalized
    )
  ) {
    return "daily_activity";
  }

  if (
    /\bhow many\b/.test(
      normalized
    )
  ) {
    return "count";
  }

  if (
    /\b(total value|value total|order value)\b/.test(
      normalized
    )
  ) {
    return "total_value";
  }

  if (
    /\b(full detail|detail|show all)\b/.test(
      normalized
    )
  ) {
    return "details";
  }

  if (
    /\b(compare|comparison|versus| vs )\b/.test(
      normalized
    )
  ) {
    return "comparison";
  }

  if (
    /\bwhy\b/.test(
      normalized
    )
  ) {
    return "explanation";
  }

  return "summary";
};

/* =========================================================
   FILTERS
========================================================= */

const detectFilters = (
  normalized
) => {
  const filters = {};

  if (
    /\bpending only\b/.test(
      normalized
    )
  ) {
    filters.pendingOnly =
      true;
  }

  if (
    /\boverdue\b/.test(
      normalized
    )
  ) {
    filters.overdueOnly =
      true;
  }

  if (
    /\bapproved only\b/.test(
      normalized
    )
  ) {
    filters.approvedOnly =
      true;
  }

  return filters;
};

/* =========================================================
   SUBJECT EXTRACTION

   Generic employee name extraction.

   We are NOT hard-coding Shalu/Renu/Naman.
========================================================= */

const extractSubject = ({
  original,
  normalized,
  previousContext,
}) => {
  if (
    refersToSelf(
      original
    )
  ) {
    return {
      subject: "self",
      subjectType:
        "employee",
    };
  }

  const raw =
    String(
      original || ""
    )
      .trim();

  /* =======================================================
     "what about Renu?"
     "aur Renu?"
  ======================================================= */

  const followUp =
    raw.match(
      /^(?:aur|and|what about)\s+([a-zA-Z][a-zA-Z .'-]{1,50})\??$/i
    );

  if (
    followUp?.[1]
  ) {
    return {
      subject:
        followUp[1].trim(),

      subjectType:
        "employee",
    };
  }

  /* =======================================================
     "aaj Shalu ne..."
     "Shalu ka sales order..."
  ======================================================= */

  const nameBeforeParticle =
    raw.match(
      /(?:^|\b(?:aaj|aj|today|kal|yesterday)\s+)([a-zA-Z][a-zA-Z .'-]{1,40})\s+(?:ne|ka|ki|ke)\b/i
    );

  if (
    nameBeforeParticle?.[1]
  ) {
    return {
      subject:
        nameBeforeParticle[1]
          .trim(),

      subjectType:
        "employee",
    };
  }

  /* =======================================================
     Preserve previous subject for follow-up.
  ======================================================= */

  if (
    previousContext
      ?.subject
  ) {
    return {
      subject:
        previousContext.subject,

      subjectType:
        previousContext
          .subjectType ||
        "employee",
    };
  }

  return {
    subject: null,
    subjectType: null,
  };
};

/* =========================================================
   SHORT FOLLOW-UP
========================================================= */

const isShortFollowUp = (
  normalized
) => {
  const words =
    String(
      normalized || ""
    )
      .split(/\s+/)
      .filter(Boolean);

  return (
    words.length <= 5
  );
};

/* =========================================================
   PERIOD REQUIRED?

   Current-state modules do NOT always need period.
========================================================= */

const requiresPeriod = ({
  domain,
  intent,
  normalized,
}) => {
  if (
    intent ===
    "daily_activity"
  ) {
    return true;
  }

  if (
    domain ===
      "receivable" &&
    /\b(overdue|pending payment|receivable)\b/.test(
      normalized
    )
  ) {
    return false;
  }

  if (
    domain ===
      "tracking" &&
    /\b(delayed|current|status|eta)\b/.test(
      normalized
    )
  ) {
    return false;
  }

  return [
    "sales",
    "enquiry",
    "attendance",
    "timesheet",
    "activity",
    "dispatch",
  ].includes(
    domain
  );
};

/* =========================================================
   CANONICAL MESSAGE

   This message goes to router/Gemini tools.

   User still sees original text.
========================================================= */

const buildCanonicalMessage = ({
  original,
  context,
}) => {
  const parts = [];

  parts.push(
    `User request: ${original}`
  );

  if (
    context.subject
  ) {
    parts.push(
      `Employee/subject: ${context.subject}`
    );
  }

  if (
    context.domain
  ) {
    parts.push(
      `Business domain: ${context.domain}`
    );
  }

  if (
    context.intent
  ) {
    parts.push(
      `Intent: ${context.intent}`
    );
  }

  if (
    context.period
      ?.dateFrom
  ) {
    parts.push(
      `Resolved period: ${context.period.label} (${context.period.dateFrom} to ${context.period.dateTo})`
    );
  }

  if (
    context.detailLevel
  ) {
    parts.push(
      `Detail level: ${context.detailLevel}`
    );
  }

  if (
    context.filters
      ?.pendingOnly
  ) {
    parts.push(
      "Filter: pending only"
    );
  }

  if (
    context.intent ===
    "daily_activity"
  ) {
    parts.push(
      "This is a cross-module employee daily activity summary. Do not ask which activity type. Use the authorized daily activity tool."
    );
  }

  return parts.join(
    "\n"
  );
};

/* =========================================================
   MAIN RESOLVER
========================================================= */

const resolveConversationContext =
  ({
    message,
    previousContext,
  }) => {
    const oldContext =
      previousContext ||
      createEmptyContext();

    const normalized =
      normalizeHinglish(
        message
      );

    const currentPeriod =
      resolveDateContext(
        message
      );

    const currentDomains =
      detectDomains(
        normalized
      );

    const currentIntent =
      detectIntent({
        original:
          message,

        normalized,
      });

    const currentDetailLevel =
      detectDetailLevel(
        message
      );

    const currentFilters =
      detectFilters(
        normalized
      );

    const subjectResult =
      extractSubject({
        original:
          message,

        normalized,

        previousContext:
          oldContext,
      });

    const shortFollowUp =
      isShortFollowUp(
        normalized
      );

    /* =====================================================
       DOMAIN

       Short follow-up preserves old domain.
    ===================================================== */

    let domain =
      currentDomains[0] ||
      null;

    let domains =
      currentDomains;

    if (
      !domain &&
      shortFollowUp &&
      oldContext.domain
    ) {
      domain =
        oldContext.domain;

      domains =
        oldContext.domains
          ?.length
          ? oldContext.domains
          : [
              oldContext.domain,
            ];
    }

    /* =====================================================
       DAILY ACTIVITY
    ===================================================== */

    if (
      currentIntent ===
      "daily_activity"
    ) {
      domain =
        "daily_activity";

      domains = [
        "sales",
        "enquiry",
        "activity",
        "timesheet",
        "attendance",
        "dispatch",
      ];
    }

    /* =====================================================
       PERIOD

       Explicit current period overrides previous.
       Otherwise short follow-up retains old period.
    ===================================================== */

    let period =
      currentPeriod.matched
        ? currentPeriod
        : null;

    if (
      !period &&
      shortFollowUp &&
      oldContext.period
    ) {
      period =
        oldContext.period;
    }

    /* =====================================================
       INTENT

       "today" alone should preserve old intent.
    ===================================================== */

    let intent =
      currentIntent;

    if (
      shortFollowUp &&
      currentPeriod.matched &&
      !currentDomains.length &&
      oldContext.intent
    ) {
      intent =
        oldContext.intent;
    }

    /* =====================================================
       DETAIL LEVEL
    ===================================================== */

    const detailLevel =
      currentDetailLevel ||
      (
        shortFollowUp
          ? oldContext
              .detailLevel
          : null
      );

    /* =====================================================
       SUBJECT
    ===================================================== */

    const subject =
      subjectResult
        .subject ||
      (
        shortFollowUp
          ? oldContext.subject
          : null
      );

    const subjectType =
      subjectResult
        .subjectType ||
      (
        shortFollowUp
          ? oldContext
              .subjectType
          : null
      );

    /* =====================================================
       MERGED CONTEXT
    ===================================================== */

    let nextContext =
      mergeContext(
        oldContext,
        {
          subject,

          subjectType,

          domain,

          domains,

          intent,

          period,

          detailLevel,

          filters:
            currentFilters,

          pendingClarification:
            null,

          pendingBaseMessage:
            null,
        }
      );

    /* =====================================================
       CLARIFICATION

       Ask ONLY when genuinely required.
    ===================================================== */

    const needsPeriod =
      requiresPeriod({
        domain:
          nextContext.domain,

        intent:
          nextContext.intent,

        normalized,
      });

    let needsClarification =
      false;

    let clarification =
      null;

    if (
      needsPeriod &&
      !nextContext.period
    ) {
      needsClarification =
        true;

      clarification = {
        type: "period",
        answer:
          "Which period would you like me to check?",

        suggestions: [
          "Today",
          "This week",
          "This month",
          "Last month",
        ],
      };

      nextContext =
        mergeContext(
          nextContext,
          {
            pendingClarification:
              "period",

            pendingBaseMessage:
              message,
          }
        );
    }

    /* =====================================================
       ROUTE HINT
    ===================================================== */

    const routeHint =
      nextContext.domain ===
      "daily_activity"
        ? "BUSINESS"
        : nextContext.domain
          ? "BUSINESS"
          : null;

    const canonicalMessage =
      buildCanonicalMessage({
        original:
          message,

        context:
          nextContext,
      });

    return {
      normalized,

      context:
        nextContext,

      canonicalMessage,

      needsClarification,

      clarification,

      routeHint,
    };
  };

module.exports = {
  resolveConversationContext,
};