const PERIOD_REQUIRED = [
  /\benquir(y|ies)\b/i,
  /\bsales\b/i,
  /\bperformance\b/i,
  /\bproductiv/i,
  /\bcold calls?\b/i,
  /\bvisits?\b/i,
  /\bconversion\b/i,
];

const CURRENT_STATE = [
  /\bpending\b/i,
  /\boverdue\b/i,
  /\bdelayed\b/i,
  /\bcurrent status\b/i,
  /\breceivable\b/i,
  /\bwhat needs attention\b/i,
];

const getClarification =
  ({
    message,
    routeInfo,
  }) => {
    if (
      ![
        "BUSINESS_DATA",
        "HYBRID",
      ].includes(
        routeInfo.route
      )
    ) {
      return null;
    }

    /*
     * "today enquiries"
     * already has exact period.
     *
     * DO NOT ask clarification.
     */

    if (
      routeInfo
        .period
        ?.matched
    ) {
      return null;
    }

    const text =
      String(
        message || ""
      );

    /*
     * Pending / overdue / delayed
     * naturally means current state.
     */

    if (
      CURRENT_STATE.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      )
    ) {
      return null;
    }

    if (
      !PERIOD_REQUIRED.some(
        (
          regex
        ) =>
          regex.test(
            text
          )
      )
    ) {
      return null;
    }

    return {
      answer:
        "Which period would you like me to check?",

      suggestions: [
        "Today",
        "This week",
        "This month",
        "Last month",
      ],

      clarification: {
        type:
          "PERIOD",

        required:
          true,
      },
    };
  };

module.exports = {
  getClarification,
};