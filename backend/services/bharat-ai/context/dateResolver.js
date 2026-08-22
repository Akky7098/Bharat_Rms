const {
  normalizeHinglish,
} = require("./hinglishNormalizer");

const TIMEZONE = "Asia/Kolkata";

/* =========================================================
   INDIA DATE PARTS
========================================================= */

const getIndiaDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  const parts = formatter.formatToParts(date);

  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
};

const toDateOnly = ({
  year,
  month,
  day,
}) => {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
};

const toYmd = (date) => {
  return date
    .toISOString()
    .slice(0, 10);
};

const addDays = (
  date,
  days
) => {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
      days
  );

  return result;
};

const startOfMonth = (date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );

const endOfMonth = (date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0
    )
  );

/* =========================================================
   MONDAY START OF WEEK
========================================================= */

const startOfWeek = (date) => {
  const day =
    date.getUTCDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  return addDays(
    date,
    diff
  );
};

const endOfWeek = (date) =>
  addDays(
    startOfWeek(date),
    6
  );

/* =========================================================
   EXPLICIT YYYY-MM-DD
========================================================= */

const detectExplicitDate = (
  text
) => {
  const match =
    String(text || "").match(
      /\b(20\d{2})-(\d{2})-(\d{2})\b/
    );

  if (!match) {
    return null;
  }

  const date =
    `${match[1]}-${match[2]}-${match[3]}`;

  return {
    matched: true,
    key: "explicit_date",
    label: date,
    dateFrom: date,
    dateTo: date,
  };
};

/* =========================================================
   MAIN DATE RESOLVER
========================================================= */

const resolveDateContext = (
  message,
  now = new Date()
) => {
  const text =
    normalizeHinglish(
      message
    );

  const explicit =
    detectExplicitDate(
      text
    );

  if (explicit) {
    return explicit;
  }

  const parts =
    getIndiaDateParts(
      now
    );

  const today =
    toDateOnly(parts);

  /* =======================================================
     TODAY
  ======================================================= */

  if (
    /\btoday\b/.test(
      text
    )
  ) {
    const value =
      toYmd(today);

    return {
      matched: true,
      key: "today",
      label: "Today",
      dateFrom: value,
      dateTo: value,
    };
  }

  /* =======================================================
     TOMORROW

     Explicit future language wins over "kal".
  ======================================================= */

  if (
    /\b(tomorrow|kal ka plan|kal ki planning|kal plan)\b/.test(
      String(message || "")
        .toLowerCase()
    )
  ) {
    const tomorrow =
      addDays(
        today,
        1
      );

    const value =
      toYmd(tomorrow);

    return {
      matched: true,
      key: "tomorrow",
      label: "Tomorrow",
      dateFrom: value,
      dateTo: value,
    };
  }

  /* =======================================================
     YESTERDAY / KAL

     For business reporting a bare "kal?" after a result
     means previous business day/date.
  ======================================================= */

  if (
    /\byesterday\b/.test(
      text
    ) ||
    /\bkal\b/.test(
      String(
        message || ""
      ).toLowerCase()
    )
  ) {
    const yesterday =
      addDays(
        today,
        -1
      );

    const value =
      toYmd(yesterday);

    return {
      matched: true,
      key: "yesterday",
      label: "Yesterday",
      dateFrom: value,
      dateTo: value,
    };
  }

  /* =======================================================
     THIS WEEK
  ======================================================= */

  if (
    /\bthis week\b/.test(
      text
    )
  ) {
    return {
      matched: true,
      key: "this_week",
      label: "This week",
      dateFrom:
        toYmd(
          startOfWeek(
            today
          )
        ),
      dateTo:
        toYmd(today),
    };
  }

  /* =======================================================
     LAST WEEK
  ======================================================= */

  if (
    /\blast week\b/.test(
      text
    )
  ) {
    const previous =
      addDays(
        today,
        -7
      );

    return {
      matched: true,
      key: "last_week",
      label: "Last week",
      dateFrom:
        toYmd(
          startOfWeek(
            previous
          )
        ),
      dateTo:
        toYmd(
          endOfWeek(
            previous
          )
        ),
    };
  }

  /* =======================================================
     THIS MONTH
  ======================================================= */

  if (
    /\bthis month\b/.test(
      text
    )
  ) {
    return {
      matched: true,
      key: "this_month",
      label: "This month",
      dateFrom:
        toYmd(
          startOfMonth(
            today
          )
        ),
      dateTo:
        toYmd(today),
    };
  }

  /* =======================================================
     LAST MONTH
  ======================================================= */

  if (
    /\blast month\b/.test(
      text
    )
  ) {
    const previousMonth =
      new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth() -
            1,
          1
        )
      );

    return {
      matched: true,
      key: "last_month",
      label: "Last month",
      dateFrom:
        toYmd(
          startOfMonth(
            previousMonth
          )
        ),
      dateTo:
        toYmd(
          endOfMonth(
            previousMonth
          )
        ),
    };
  }

  return {
    matched: false,
    key: null,
    label: null,
    dateFrom: null,
    dateTo: null,
  };
};

/* =========================================================
   MONGOOSE DATE RANGE

   Business date key → UTC range.

   Your existing tools may already have their own
   IST conversion. Use this mainly in dailyActivityTools.
========================================================= */

const dateRangeToUtc = ({
  dateFrom,
  dateTo,
}) => {
  if (
    !dateFrom ||
    !dateTo
  ) {
    return null;
  }

  const start =
    new Date(
      `${dateFrom}T00:00:00+05:30`
    );

  const end =
    new Date(
      `${dateTo}T23:59:59.999+05:30`
    );

  return {
    start,
    end,
  };
};

module.exports = {
  TIMEZONE,
  resolveDateContext,
  dateRangeToUtc,
  getIndiaDateParts,
};