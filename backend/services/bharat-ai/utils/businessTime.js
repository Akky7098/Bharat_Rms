const BUSINESS_TIMEZONE =
  "Asia/Kolkata";

const IST_OFFSET =
  "+05:30";

const pad2 = (value) =>
  String(value).padStart(
    2,
    "0"
  );

/* =========================================================
   CURRENT INDIA DATE / TIME
========================================================= */

const getISTParts = (
  date = new Date()
) => {
  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          BUSINESS_TIMEZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    );

  const output = {};

  for (
    const part of
    formatter.formatToParts(
      date
    )
  ) {
    if (
      part.type !==
      "literal"
    ) {
      output[
        part.type
      ] = part.value;
    }
  }

  return {
    year:
      Number(
        output.year
      ),

    month:
      Number(
        output.month
      ),

    day:
      Number(
        output.day
      ),

    hour:
      Number(
        output.hour
      ),

    minute:
      Number(
        output.minute
      ),

    second:
      Number(
        output.second
      ),
  };
};

const toYmd = ({
  year,
  month,
  day,
}) => {
  return `${year}-${pad2(
    month
  )}-${pad2(day)}`;
};

const getTodayIST =
  () => {
    return toYmd(
      getISTParts()
    );
  };

/* =========================================================
   SAFE DATE SHIFT

   Operates only on YYYY-MM-DD values.
========================================================= */

const ymdToUtcKey = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    throw new Error(
      `Invalid date ${value}. Expected YYYY-MM-DD.`
    );
  }

  return new Date(
    Date.UTC(
      Number(
        match[1]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[3]
      )
    )
  );
};

const shiftYmd = (
  value,
  days
) => {
  const date =
    ymdToUtcKey(
      value
    );

  date.setUTCDate(
    date.getUTCDate() +
      Number(
        days || 0
      )
  );

  return `${date.getUTCFullYear()}-${pad2(
    date.getUTCMonth() +
      1
  )}-${pad2(
    date.getUTCDate()
  )}`;
};

/* =========================================================
   MONGO RANGE USING INDIA TIME
========================================================= */

const startOfISTDay = (
  value
) => {
  return new Date(
    `${value}T00:00:00${IST_OFFSET}`
  );
};

const endOfISTDay = (
  value
) => {
  return new Date(
    `${value}T23:59:59.999${IST_OFFSET}`
  );
};

const buildMongoDateRangeIST =
  (
    dateFrom,
    dateTo
  ) => {
    const range = {};

    if (dateFrom) {
      range.$gte =
        startOfISTDay(
          dateFrom
        );
    }

    if (dateTo) {
      range.$lte =
        endOfISTDay(
          dateTo
        );
    }

    return Object.keys(
      range
    ).length
      ? range
      : undefined;
  };

/* =========================================================
   MONTH
========================================================= */

const startOfMonth = (
  value
) => {
  const [
    year,
    month,
  ] =
    value.split("-");

  return `${year}-${month}-01`;
};

const endOfMonth = (
  value
) => {
  const [
    year,
    month,
  ] =
    value
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month,
        1
      )
    );

  date.setUTCDate(0);

  return `${date.getUTCFullYear()}-${pad2(
    date.getUTCMonth() +
      1
  )}-${pad2(
    date.getUTCDate()
  )}`;
};

/* =========================================================
   MONDAY WEEK
========================================================= */

const getMonday = (
  value
) => {
  const date =
    ymdToUtcKey(
      value
    );

  const day =
    date.getUTCDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  return shiftYmd(
    value,
    difference
  );
};

/* =========================================================
   NATURAL PERIOD RESOLUTION

   This prevents Gemini from guessing what
   "today", "last week", etc mean.
========================================================= */

const resolveRelativePeriod =
  (
    message
  ) => {
    const text =
      String(
        message || ""
      ).toLowerCase();

    const today =
      getTodayIST();

    /* TODAY */

    if (
      /\b(today|aaj)\b/.test(
        text
      )
    ) {
      return {
        matched:
          true,

        key:
          "today",

        label:
          "today",

        dateFrom:
          today,

        dateTo:
          today,
      };
    }

    /* YESTERDAY */

    if (
      /\byesterday\b/.test(
        text
      )
    ) {
      const yesterday =
        shiftYmd(
          today,
          -1
        );

      return {
        matched:
          true,

        key:
          "yesterday",

        label:
          "yesterday",

        dateFrom:
          yesterday,

        dateTo:
          yesterday,
      };
    }

    /* LAST 7 DAYS */

    if (
      /\b(last|past)\s*7\s*days?\b/.test(
        text
      )
    ) {
      return {
        matched:
          true,

        key:
          "last_7_days",

        label:
          "last 7 days",

        dateFrom:
          shiftYmd(
            today,
            -6
          ),

        dateTo:
          today,
      };
    }

    /* THIS WEEK */

    if (
      /\b(this|current)\s*week\b/.test(
        text
      )
    ) {
      return {
        matched:
          true,

        key:
          "this_week",

        label:
          "this week",

        dateFrom:
          getMonday(
            today
          ),

        dateTo:
          today,
      };
    }

    /* LAST WEEK */

    if (
      /\b(last|previous)\s*week\b/.test(
        text
      )
    ) {
      const thisMonday =
        getMonday(
          today
        );

      return {
        matched:
          true,

        key:
          "last_week",

        label:
          "last week",

        dateFrom:
          shiftYmd(
            thisMonday,
            -7
          ),

        dateTo:
          shiftYmd(
            thisMonday,
            -1
          ),
      };
    }

    /* THIS MONTH */

    if (
      /\b(this|current)\s*month\b/.test(
        text
      )
    ) {
      return {
        matched:
          true,

        key:
          "this_month",

        label:
          "this month",

        dateFrom:
          startOfMonth(
            today
          ),

        dateTo:
          today,
      };
    }

    /* LAST MONTH */

    if (
      /\b(last|previous)\s*month\b/.test(
        text
      )
    ) {
      const currentStart =
        startOfMonth(
          today
        );

      const previousEnd =
        shiftYmd(
          currentStart,
          -1
        );

      return {
        matched:
          true,

        key:
          "last_month",

        label:
          "last month",

        dateFrom:
          startOfMonth(
            previousEnd
          ),

        dateTo:
          previousEnd,
      };
    }

    return {
      matched:
        false,

      key:
        null,

      label:
        null,

      dateFrom:
        null,

      dateTo:
        null,
    };
  };

/* =========================================================
   CONTEXT FOR GEMINI
========================================================= */

const getBusinessClockContext =
  () => {
    const parts =
      getISTParts();

    return {
      timezone:
        BUSINESS_TIMEZONE,

      today:
        toYmd(
          parts
        ),

      currentTime:
        `${pad2(
          parts.hour
        )}:${pad2(
          parts.minute
        )}:${pad2(
          parts.second
        )}`,
    };
  };

module.exports = {
  BUSINESS_TIMEZONE,
  IST_OFFSET,

  getISTParts,
  getTodayIST,

  shiftYmd,

  startOfISTDay,
  endOfISTDay,

  buildMongoDateRangeIST,

  resolveRelativePeriod,

  getBusinessClockContext,
};