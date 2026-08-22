/* =========================================================
   BHARAT INTELLIGENCE
   CONTEXTUAL SUGGESTION SERVICE

   PURPOSE

   Generate relevant follow-up suggestions based on:
   - current user question
   - routed domain
   - tools actually used
   - documents returned

   IMPORTANT

   This service:
   - does NOT call Gemini
   - does NOT query MongoDB
   - does NOT use Redis
   - costs zero AI tokens

   It provides a deterministic fallback suggestion layer.

   Later, Gemini can optionally return its own suggestions.
   If it does, those can take priority.
========================================================= */

/* =========================================================
   HELPERS
========================================================= */

const normalize =
  (
    value
  ) => {
    return String(
      value || ""
    )
      .trim()
      .toLowerCase();
  };

/* =========================================================
   UNIQUE + LIMIT
========================================================= */

const uniqueSuggestions =
  (
    suggestions,
    limit = 4
  ) => {
    const seen =
      new Set();

    const result =
      [];

    for (
      const suggestion of
      suggestions || []
    ) {
      const clean =
        String(
          suggestion || ""
        ).trim();

      if (!clean) {
        continue;
      }

      const key =
        clean.toLowerCase();

      if (
        seen.has(
          key
        )
      ) {
        continue;
      }

      seen.add(
        key
      );

      result.push(
        clean
      );

      if (
        result.length >=
        limit
      ) {
        break;
      }
    }

    return result;
  };

/* =========================================================
   TOOL NAMES
========================================================= */

const getToolNames =
  (
    toolsUsed
  ) => {
    return (
      toolsUsed || []
    )
      .map(
        (
          tool
        ) => {
          if (
            typeof tool ===
            "string"
          ) {
            return tool;
          }

          return tool?.name;
        }
      )
      .filter(
        Boolean
      );
  };

/* =========================================================
   DOMAIN CHECK
========================================================= */

const hasDomain =
  (
    routeInfo,
    domain
  ) => {
    return Boolean(
      routeInfo
        ?.domains
        ?.includes(
          domain
        )
    );
  };

/* =========================================================
   BUSINESS PERIOD FOLLOW-UP
========================================================= */

const addPeriodSuggestions =
  (
    suggestions,
    routeInfo
  ) => {
    const period =
      routeInfo
        ?.period
        ?.key;

    if (
      period ===
      "today"
    ) {
      suggestions.push(
        "Compare with yesterday",
        "Show this week"
      );
    }

    if (
      period ===
      "this_week"
    ) {
      suggestions.push(
        "Compare with last week"
      );
    }

    if (
      period ===
      "this_month"
    ) {
      suggestions.push(
        "Compare with last month"
      );
    }

    if (
      period ===
      "last_month"
    ) {
      suggestions.push(
        "Compare with this month"
      );
    }
  };

/* =========================================================
   SALES SUGGESTIONS
========================================================= */

const addSalesSuggestions =
  (
    suggestions,
    text
  ) => {
    suggestions.push(
      "Show top customers",
      "Which customers need follow-up?"
    );

    if (
      /\bdecline|down|drop|lower|less\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Show customers driving the decline"
      );
    }
  };

/* =========================================================
   ENQUIRY SUGGESTIONS
========================================================= */

const addEnquirySuggestions =
  (
    suggestions,
    text
  ) => {
    suggestions.push(
      "Show lost enquiry reasons",
      "Show enquiry conversion rate"
    );

    if (
      /\blost\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Which lost enquiries need another follow-up?"
      );
    }

    if (
      /\bwon\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Show customers from won enquiries"
      );
    }
  };

/* =========================================================
   RECEIVABLE SUGGESTIONS
========================================================= */

const addReceivableSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Show highest overdue customers",
      "Which payments need follow-up first?",
      "Show customer-wise pending amounts"
    );
  };

/* =========================================================
   DISPATCH SUGGESTIONS
========================================================= */

const addDispatchSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Show pending dispatches",
      "Which dispatches need attention?"
    );
  };

/* =========================================================
   ORDER TRACKING
========================================================= */

const addTrackingSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Show delayed orders",
      "Which orders need immediate attention?",
      "Show customer-wise order status"
    );
  };

/* =========================================================
   ATTENDANCE
========================================================= */

const addAttendanceSuggestions =
  (
    suggestions,
    text
  ) => {
    suggestions.push(
      "Show this month's attendance",
      "Show missing checkouts"
    );

    if (
      /\babsent\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Show absence details"
      );
    }

    if (
      /\bleave\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Show leave attendance"
      );
    }
  };

/* =========================================================
   TIMESHEET
========================================================= */

const addTimesheetSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Show this week's timesheets",
      "Show challenges mentioned in timesheets"
    );
  };

/* =========================================================
   ACTIVITY
========================================================= */

const addActivitySuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Show calling activity",
      "Show customer visits",
      "Compare sales activity with sales"
    );
  };

/* =========================================================
   TEAM / SALESPERSON
========================================================= */

const addTeamSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "Compare the bottom performers",
      "Show why their performance differs",
      "Which customers should they follow up with?"
    );
  };

/* =========================================================
   MANAGEMENT
========================================================= */

const addManagementSuggestions =
  (
    suggestions
  ) => {
    suggestions.push(
      "What needs immediate attention?",
      "Show the biggest business risks",
      "Show the strongest opportunities"
    );
  };

/* =========================================================
   GENERAL TECHNICAL KNOWLEDGE
========================================================= */

const addGeneralSuggestions =
  (
    suggestions,
    text
  ) => {
    if (
      /\bdb6\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Compare DB6 with H13",
        "Why is ESR used for DB6?",
        "What affects DB6 price?"
      );

      return;
    }

    if (
      /\besr\b/.test(
        text
      )
    ) {
      suggestions.push(
        "What defects does ESR reduce?",
        "When is ESR worth the extra cost?",
        "Compare ESR and conventional steel"
      );

      return;
    }

    if (
      /\bmolybdenum\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Why does molybdenum increase steel cost?",
        "Which steel grades use more molybdenum?"
      );

      return;
    }

    if (
      /\bchemical composition|chemistry\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Explain the role of each alloying element",
        "Compare this chemistry with another grade"
      );

      return;
    }

    if (
      /\bheat treatment\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Explain the heat-treatment stages",
        "What properties change after heat treatment?"
      );

      return;
    }

    suggestions.push(
      "Explain this with an example",
      "Give me a practical steel-industry example"
    );
  };

/* =========================================================
   LIVE RESEARCH
========================================================= */

const addLiveResearchSuggestions =
  (
    suggestions,
    text
  ) => {
    if (
      /\bprice\b/.test(
        text
      )
    ) {
      suggestions.push(
        "What is driving this price?",
        "How could this affect alloy steel prices?"
      );
    }

    suggestions.push(
      "Summarize the business impact",
      "What should we watch next?"
    );
  };

/* =========================================================
   DOCUMENTS
========================================================= */

const addDocumentSuggestions =
  (
    suggestions,
    documents
  ) => {
    const first =
      documents?.[0];

    if (
      first?.title
    ) {
      suggestions.push(
        `Summarize ${first.title}`,
        `Explain the important points in ${first.title}`
      );

      return;
    }

    suggestions.push(
      "Show available brochures",
      "Search technical documents"
    );
  };

/* =========================================================
   LOCAL MATH
========================================================= */

const addMathSuggestions =
  (
    suggestions,
    text
  ) => {
    if (
      /\bweight\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Calculate total weight for multiple pieces",
        "Calculate pieces from total weight"
      );

      return;
    }

    if (
      /\bforging ratio|reduction ratio\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Explain why forging ratio matters"
      );

      return;
    }

    if (
      /\brecovery|yield\b/.test(
        text
      )
    ) {
      suggestions.push(
        "Calculate process loss",
        "Calculate required input weight"
      );

      return;
    }

    suggestions.push(
      "Do another calculation"
    );
  };

/* =========================================================
   MAIN BUILDER
========================================================= */

const buildSuggestions =
  ({
    message,
    routeInfo,
    toolsUsed = [],
    documents = [],
  }) => {
    const text =
      normalize(
        message
      );

    const suggestions =
      [];

    const toolNames =
      getToolNames(
        toolsUsed
      );

    const route =
      routeInfo
        ?.route ||
      "";

    /* =====================================================
       DOCUMENT
    ===================================================== */

    if (
      route ===
      "DOCUMENT"
    ) {
      addDocumentSuggestions(
        suggestions,
        documents
      );

      return uniqueSuggestions(
        suggestions
      );
    }

    /* =====================================================
       MATH
    ===================================================== */

    if (
      route ===
      "MATH_OR_CONVERSION"
    ) {
      addMathSuggestions(
        suggestions,
        text
      );

      return uniqueSuggestions(
        suggestions
      );
    }

    /* =====================================================
       GENERAL KNOWLEDGE
    ===================================================== */

    if (
      route ===
      "GENERAL_KNOWLEDGE"
    ) {
      addGeneralSuggestions(
        suggestions,
        text
      );

      return uniqueSuggestions(
        suggestions
      );
    }

    /* =====================================================
       LIVE WEB
    ===================================================== */

    if (
      route ===
      "LIVE_RESEARCH"
    ) {
      addLiveResearchSuggestions(
        suggestions,
        text
      );

      return uniqueSuggestions(
        suggestions
      );
    }

    /* =====================================================
       BUSINESS / HYBRID
    ===================================================== */

    if (
      hasDomain(
        routeInfo,
        "team"
      ) ||
      toolNames.includes(
        "get_team_sales_performance"
      ) ||
      toolNames.includes(
        "get_salesperson_performance"
      )
    ) {
      addTeamSuggestions(
        suggestions
      );
    }

    if (
      hasDomain(
        routeInfo,
        "sales"
      ) ||
      toolNames.includes(
        "get_sales_summary"
      ) ||
      toolNames.includes(
        "get_sales_orders"
      )
    ) {
      addSalesSuggestions(
        suggestions,
        text
      );
    }

    if (
      hasDomain(
        routeInfo,
        "enquiry"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "enquiry"
          )
      )
    ) {
      addEnquirySuggestions(
        suggestions,
        text
      );
    }

    if (
      hasDomain(
        routeInfo,
        "receivable"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "receivable"
          ) ||
          name.includes(
            "overdue"
          )
      )
    ) {
      addReceivableSuggestions(
        suggestions
      );
    }

    if (
      hasDomain(
        routeInfo,
        "dispatch"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "dispatch"
          )
      )
    ) {
      addDispatchSuggestions(
        suggestions
      );
    }

    if (
      hasDomain(
        routeInfo,
        "tracking"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "tracking"
          ) ||
          name.includes(
            "delayed_order"
          )
      )
    ) {
      addTrackingSuggestions(
        suggestions
      );
    }

    if (
      hasDomain(
        routeInfo,
        "attendance"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "attendance"
          )
      )
    ) {
      addAttendanceSuggestions(
        suggestions,
        text
      );
    }

    if (
      hasDomain(
        routeInfo,
        "timesheet"
      ) ||
      toolNames.some(
        (
          name
        ) =>
          name.includes(
            "timesheet"
          )
      )
    ) {
      addTimesheetSuggestions(
        suggestions
      );
    }

    if (
      hasDomain(
        routeInfo,
        "activity"
      ) ||
      toolNames.includes(
        "get_cold_call_summary"
      )
    ) {
      addActivitySuggestions(
        suggestions
      );
    }

    if (
      toolNames.includes(
        "get_executive_summary"
      ) ||
      /\b(overall|executive|business performance|how is bharat|biggest problem|needs attention)\b/.test(
        text
      )
    ) {
      addManagementSuggestions(
        suggestions
      );
    }

    /* =====================================================
       HYBRID TECHNICAL PART
    ===================================================== */

    if (
      route ===
      "HYBRID" &&
      /\b(db6|h13|esr|molybdenum|steel grade|chemical composition)\b/.test(
        text
      )
    ) {
      addGeneralSuggestions(
        suggestions,
        text
      );
    }

    /* =====================================================
       PERIOD COMPARISON

       Add only after domain suggestions so it doesn't
       dominate the suggestions.
    ===================================================== */

    addPeriodSuggestions(
      suggestions,
      routeInfo
    );

    /* =====================================================
       FALLBACK

       Keep relevant to the current business question.
    ===================================================== */

    if (
      suggestions.length ===
      0
    ) {
      suggestions.push(
        "Show more detail",
        "Compare with the previous period"
      );
    }

    return uniqueSuggestions(
      suggestions,
      4
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  buildSuggestions,
};