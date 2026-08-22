const {
  normalizeHinglish,
} = require(
  "../context/hinglishNormalizer"
);

const {
  resolveDateContext,
} = require(
  "../context/dateResolver"
);

/* =========================================================
   ANALYTICS CLASSIFIER

   Execution is ultimately controlled by the router/context
   resolver. This is still useful for audit + cost reporting.
========================================================= */

const classifyRequest = (
  message
) => {
  const text =
    normalizeHinglish(
      message
    );

  if (!text) {
    return "unknown";
  }

  /* =======================================================
     DAILY ACTIVITY
  ======================================================= */

  if (
    (
      /\bwhat did do\b/.test(
        text
      ) ||
      /\bwhat did i do\b/.test(
        text
      ) ||
      /\bwhat work\b/.test(
        text
      )
    ) &&
    resolveDateContext(
      message
    ).matched
  ) {
    return "daily_activity";
  }

  /* =======================================================
     DOCUMENT
  ======================================================= */

  if (
    /\b(brochure|catalogue|catalog|document|pdf|mtc|certificate|datasheet)\b/.test(
      text
    )
  ) {
    return "document";
  }

  /* =======================================================
     LIVE
  ======================================================= */

  if (
    /\b(latest|current market|market news|spot price|price today|latest news)\b/.test(
      text
    )
  ) {
    return "live_research";
  }

  /* =======================================================
     MATH
  ======================================================= */

  if (
    /\b(convert|calculate|theoretical weight|weight per meter|forging ratio|reduction ratio|recovery|yield|carbon equivalent|cev|margin|markup|discount|gst)\b/.test(
      text
    ) ||
    /\d+(?:\.\d+)?\s*%\s*of\s*\d+/.test(
      text
    )
  ) {
    return "calculation";
  }

  if (
    /\b(attendance|present|absent|check in|check out|leave|work from home|wfh)\b/.test(
      text
    )
  ) {
    return "attendance";
  }

  if (
    /\b(timesheet|work summary|next day plan)\b/.test(
      text
    )
  ) {
    return "timesheet";
  }

  if (
    /\b(receivable|pending payment|overdue|payment due)\b/.test(
      text
    )
  ) {
    return "receivable";
  }

  if (
    /\b(dispatch|invoice value|dispatch quantity)\b/.test(
      text
    )
  ) {
    return "dispatch";
  }

  if (
    /\b(order tracking|delayed order|eta|rolling status|forging status)\b/.test(
      text
    )
  ) {
    return "order_tracking";
  }

  if (
    /\b(enquiry|conversion rate|lost enquiry|won enquiry)\b/.test(
      text
    )
  ) {
    return "enquiry";
  }

  if (
    /\b(sales order|sales|order value|top customer|inactive customer)\b/.test(
      text
    )
  ) {
    return "sales";
  }

  if (
    /\b(cold call|customer visit|calling|sales activity)\b/.test(
      text
    )
  ) {
    return "sales_activity";
  }

  if (
    /\b(salesperson|sales person|team performance|lowest performer|productive|productivity)\b/.test(
      text
    )
  ) {
    return "team_performance";
  }

  if (
    /\b(executive summary|how is bharat|overall performance|business summary|what needs attention)\b/.test(
      text
    )
  ) {
    return "management";
  }

  if (
    /\b(db6|h13|en19|en24|4130|4140|esr|var|molybdenum|nickel|chromium|chemical composition|heat treatment|steel grade|metallurgy|ultrasonic testing)\b/.test(
      text
    )
  ) {
    return "technical_knowledge";
  }

  return "general_knowledge";
};

module.exports = {
  classifyRequest,
};