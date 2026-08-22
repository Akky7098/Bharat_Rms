/* =========================================================
   BHARAT INTELLIGENCE
   CONVERSATION STATE

   This is lightweight structured memory.

   It is NOT:
   - raw database data
   - tool payload storage
   - permanent memory
========================================================= */

const EMPTY_CONTEXT =
  Object.freeze({
    subject: null,
    subjectType: null,

    domain: null,
    domains: [],

    intent: null,

    period: null,

    detailLevel: null,

    filters: {},

    pendingClarification:
      null,

    pendingBaseMessage:
      null,

    lastTool: null,

    lastResultType:
      null,
  });

const createEmptyContext =
  () => ({
    ...EMPTY_CONTEXT,
    domains: [],
    filters: {},
  });

/* =========================================================
   SANITIZE
========================================================= */

const sanitizeContext =
  (
    context
  ) => {
    if (
      !context ||
      typeof context !==
        "object"
    ) {
      return createEmptyContext();
    }

    return {
      subject:
        context.subject ||
        null,

      subjectType:
        context.subjectType ||
        null,

      domain:
        context.domain ||
        null,

      domains:
        Array.isArray(
          context.domains
        )
          ? context.domains.slice(
              0,
              10
            )
          : [],

      intent:
        context.intent ||
        null,

      period:
        context.period &&
        typeof context.period ===
          "object"
          ? {
              key:
                context.period
                  .key ||
                null,

              label:
                context.period
                  .label ||
                null,

              dateFrom:
                context.period
                  .dateFrom ||
                null,

              dateTo:
                context.period
                  .dateTo ||
                null,
            }
          : null,

      detailLevel:
        context.detailLevel ||
        null,

      filters:
        context.filters &&
        typeof context.filters ===
          "object"
          ? {
              ...context.filters,
            }
          : {},

      pendingClarification:
        context
          .pendingClarification ||
        null,

      pendingBaseMessage:
        context
          .pendingBaseMessage ||
        null,

      lastTool:
        context.lastTool ||
        null,

      lastResultType:
        context
          .lastResultType ||
        null,
    };
  };

/* =========================================================
   MERGE

   New explicitly resolved values override old values.
   Missing new values preserve previous context.
========================================================= */

const mergeContext =
  (
    previous,
    next
  ) => {
    const oldContext =
      sanitizeContext(
        previous
      );

    const newContext =
      sanitizeContext(
        next
      );

    return sanitizeContext({
      subject:
        newContext.subject ??
        oldContext.subject,

      subjectType:
        newContext.subjectType ??
        oldContext.subjectType,

      domain:
        newContext.domain ??
        oldContext.domain,

      domains:
        newContext.domains
          ?.length
          ? newContext.domains
          : oldContext.domains,

      intent:
        newContext.intent ??
        oldContext.intent,

      period:
        newContext.period ??
        oldContext.period,

      detailLevel:
        newContext.detailLevel ??
        oldContext.detailLevel,

      filters: {
        ...oldContext.filters,
        ...newContext.filters,
      },

      pendingClarification:
        newContext
          .pendingClarification,

      pendingBaseMessage:
        newContext
          .pendingBaseMessage,

      lastTool:
        newContext.lastTool ??
        oldContext.lastTool,

      lastResultType:
        newContext
          .lastResultType ??
        oldContext
          .lastResultType,
    });
  };

module.exports = {
  createEmptyContext,
  sanitizeContext,
  mergeContext,
};