export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const INDIA_TZ =
  "Asia/Kolkata";

export const REQUIRED_WORK_MINUTES =
  9 * 60;

/* =========================================================
   INDIA DATE HELPERS
========================================================= */

export const getIndiaParts = (
  value = new Date()
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {};
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          INDIA_TZ,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const getPart = (
    type
  ) =>
    parts.find(
      (part) =>
        part.type ===
        type
    )?.value || "";

  return {
    year:
      getPart(
        "year"
      ),

    month:
      getPart(
        "month"
      ),

    day:
      getPart(
        "day"
      ),
  };
};

/* =========================================================
   DATE KEY

   Output:
   YYYY-MM-DD

   IMPORTANT:
   If already given a clean dateKey,
   return it unchanged.
========================================================= */

export const getDateKey = (
  value = new Date()
) => {
  if (
    typeof value ===
      "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    return value.trim();
  }

  const parts =
    getIndiaParts(
      value
    );

  if (!parts.year) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const makeDateKey = (
  year,
  monthIndex,
  day
) => {
  return `${year}-${String(
    monthIndex + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
};

export const parseDateKey = (
  key
) => {
  const match =
    String(
      key || ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  return {
    year:
      Number(
        match[1]
      ),

    monthIndex:
      Number(
        match[2]
      ) - 1,

    day:
      Number(
        match[3]
      ),
  };
};

/* =========================================================
   SUNDAY CHECK
========================================================= */

export const isSunday = (
  key
) => {
  const parsed =
    parseDateKey(
      key
    );

  if (!parsed) {
    return false;
  }

  return (
    new Date(
      Date.UTC(
        parsed.year,
        parsed.monthIndex,
        parsed.day
      )
    ).getUTCDay() ===
    0
  );
};

/* =========================================================
   DATE / TIME FORMATTERS
========================================================= */

export const formatTime = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      timeZone:
        INDIA_TZ,

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,
    }
  );
};

export const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      timeZone:
        INDIA_TZ,

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  );
};

/* =========================================================
   READABLE DATE KEY

   Example:
   2026-08-19
   ->
   Wednesday, 19 August 2026
========================================================= */

export const readableDate = (
  key
) => {
  const parsed =
    parseDateKey(
      key
    );

  if (!parsed) {
    return "-";
  }

  const date =
    new Date(
      `${key}T00:00:00+05:30`
    );

  return date.toLocaleDateString(
    "en-IN",
    {
      timeZone:
        INDIA_TZ,

      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  );
};

/* =========================================================
   STATUS FORMATTER
========================================================= */

export const formatStatus = (
  value
) => {
  return String(
    value || "-"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};

/* =========================================================
   WORKING MINUTES
========================================================= */

export const formatMinutes = (
  minutes
) => {
  const total =
    Number(
      minutes || 0
    );

  if (
    !Number.isFinite(
      total
    ) ||
    total <= 0
  ) {
    return "-";
  }

  const hours =
    Math.floor(
      total / 60
    );

  const remainingMinutes =
    total % 60;

  return [
    hours
      ? `${hours}h`
      : "",

    remainingMinutes
      ? `${remainingMinutes}m`
      : "",
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );
};

/* =========================================================
   TIME INPUT VALUE

   Converts stored Date into:
   HH:mm

   Used by unified regularization.
========================================================= */

export const clockValue = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        INDIA_TZ,

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    }
  ).format(
    date
  );
};

/* =========================================================
   EMPLOYEE HELPERS
========================================================= */

export const employeeIdOf = (
  value
) => {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  return (
    value?._id ||
    value?.id ||
    ""
  );
};

export const sameEmployee = (
  record,
  user
) => {
  const userId =
    user?._id ||
    user?.id ||
    "";

  const recordId =
    employeeIdOf(
      record?.employeeId
    ) ||
    record?._id ||
    record?.id ||
    "";

  if (
    String(
      userId
    ) ===
    String(
      recordId
    )
  ) {
    return true;
  }

  const recordEmail =
    String(
      record?.employeeEmail ||
        record?.email ||
        ""
    )
      .trim()
      .toLowerCase();

  const userEmail =
    String(
      user?.email ||
        ""
    )
      .trim()
      .toLowerCase();

  return Boolean(
    recordEmail &&
    userEmail &&
    recordEmail ===
      userEmail
  );
};

/* =========================================================
   LEADERSHIP FILTER
========================================================= */

export const isLeadership = (
  item = {}
) => {
  const role =
    String(
      item.role ||
      item.employeeRole ||
      item.employeeId?.role ||
      ""
    ).toLowerCase();

  const name =
    String(
      item.name ||
      item.employeeName ||
      item.employeeId?.name ||
      ""
    ).toLowerCase();

  const email =
    String(
      item.email ||
      item.employeeEmail ||
      item.employeeId?.email ||
      ""
    ).toLowerCase();

  return (
    role ===
      "super_admin" ||
    name.includes(
      "nilesh"
    ) ||
    email.includes(
      "nilesh"
    )
  );
};

/* =========================================================
   DISPLAY CHECK IN

   If regularization is approved,
   use approved requested time.
========================================================= */

export const displayCheckIn = (
  attendance
) => {
  if (
    attendance
      ?.regularization
      ?.status ===
      "approved" &&
    attendance
      ?.regularization
      ?.requestedCheckIn
  ) {
    return formatTime(
      attendance
        .regularization
        .requestedCheckIn
    );
  }

  return formatTime(
    attendance
      ?.checkIn
      ?.time
  );
};

/* =========================================================
   DISPLAY CHECK OUT
========================================================= */

export const displayCheckOut = (
  attendance
) => {
  if (
    attendance
      ?.regularization
      ?.status ===
      "approved" &&
    attendance
      ?.regularization
      ?.requestedCheckOut
  ) {
    return formatTime(
      attendance
        .regularization
        .requestedCheckOut
    );
  }

  return formatTime(
    attendance
      ?.checkOut
      ?.time
  );
};

/* =========================================================
   LEAVE LABELS
========================================================= */

export const leaveTypeLabel = (
  value
) => {
  if (
    value ===
    "paid_leave"
  ) {
    return "Paid Leave";
  }

  if (
    value ===
    "loss_of_pay"
  ) {
    return "Loss of Pay";
  }

  return formatStatus(
    value
  );
};

export const leaveDurationLabel = (
  value
) => {
  if (
    value ===
    "full_day"
  ) {
    return "Full Day";
  }

  if (
    value ===
    "first_half"
  ) {
    return "First Half";
  }

  if (
    value ===
    "second_half"
  ) {
    return "Second Half";
  }

  return formatStatus(
    value
  );
};

/* =========================================================
   LOCATION HISTORY
========================================================= */

export const pointTime = (
  point
) => {
  return (
    point?.capturedAt ||
    point?.createdAt ||
    point?.timestamp ||
    point?.time ||
    null
  );
};

export const pointLabel = (p) => {
  const savedAddress =
    p?.locationAddress ||
    p?.address ||
    p?.locationName ||
    p?.label ||
    "";

  if (savedAddress) {
    return savedAddress;
  }

  const latitude =
    Number(p?.latitude);

  const longitude =
    Number(p?.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  return "Location captured";
};

export const pointMap = (
  point
) => {
  if (
    point?.googleMapLink
  ) {
    return point.googleMapLink;
  }

  const latitude =
    Number(
      point?.latitude
    );

  const longitude =
    Number(
      point?.longitude
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return "";
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/* =========================================================
   NORMALIZE LOCATION HISTORY

   Important:

   History is ALWAYS sorted:
   oldest -> newest

   Example:
   10:00
   10:30
   11:00

   Last item becomes latest/current location.
========================================================= */

export const normalizeHistory = (
  response
) => {
  const raw =
    response?.data?.history ||
    response?.data?.checkpoints ||
    response?.history ||
    response?.checkpoints ||
    response?.data ||
    [];

  if (
    !Array.isArray(
      raw
    )
  ) {
    return [];
  }

  return [...raw]
    .filter(
      Boolean
    )
    .sort(
      (
        first,
        second
      ) => {
        const firstTimestamp =
          new Date(
            pointTime(
              first
            ) || 0
          ).getTime();

        const secondTimestamp =
          new Date(
            pointTime(
              second
            ) || 0
          ).getTime();

        return (
          firstTimestamp -
          secondTimestamp
        );
      }
    );
};

/* =========================================================
   LATEST LOCATION

   Convenience helper.

   Never falls back to check-in location.

   Latest = last tracking checkpoint.
========================================================= */

export const getLatestLocationPoint = (
  history = []
) => {
  if (
    !Array.isArray(
      history
    ) ||
    history.length ===
      0
  ) {
    return null;
  }

  const sorted =
    [...history].sort(
      (
        first,
        second
      ) => {
        const firstTimestamp =
          new Date(
            pointTime(
              first
            ) || 0
          ).getTime();

        const secondTimestamp =
          new Date(
            pointTime(
              second
            ) || 0
          ).getTime();

        return (
          firstTimestamp -
          secondTimestamp
        );
      }
    );

  return (
    sorted[
      sorted.length - 1
    ] ||
    null
  );
};

/* =========================================================
   ATTENDANCE HEALTH
========================================================= */

export const getHealth = (
  attendance,
  dateKey,
  todayKey
) => {
  if (
    isSunday(
      dateKey
    )
  ) {
    return {
      label:
        "Sunday",

      className:
        "off",
    };
  }

  if (
    attendance
      ?.attendanceStatus ===
    "on_leave"
  ) {
    return {
      label:
        "Paid Leave",

      className:
        "leave",
    };
  }

  if (
    attendance
      ?.attendanceStatus ===
    "loss_of_pay"
  ) {
    return {
      label:
        "Loss of Pay",

      className:
        "lop",
    };
  }

  if (!attendance) {
    return (
      dateKey >
      todayKey
        ? {
            label:
              "Future",

            className:
              "future",
          }
        : {
            label:
              "No Record",

            className:
              "missing",
          }
    );
  }

  if (
    attendance
      ?.regularization
      ?.status ===
    "pending"
  ) {
    return {
      label:
        "Regularization Pending",

      className:
        "pending",
    };
  }

  if (
    attendance
      ?.checkIn
      ?.time &&
    !attendance
      ?.checkOut
      ?.time
  ) {
    return {
      label:
        "Missing Checkout",

      className:
        "missing",
    };
  }

  if (
    Number(
      attendance
        ?.totalWorkingMinutes ||
        0
    ) <
      REQUIRED_WORK_MINUTES &&
    attendance
      ?.checkOut
      ?.time
  ) {
    return {
      label:
        "Short Hours",

      className:
        "short",
    };
  }

  if (
    attendance
      ?.checkIn
      ?.time &&
    attendance
      ?.checkOut
      ?.time
  ) {
    return {
      label:
        "Present",

      className:
        "complete",
    };
  }

  return {
    label:
      formatStatus(
        attendance
          ?.attendanceStatus
      ),

    className:
      "pending",
  };
};

/* =========================================================
   BROWSER LOCATION

   Used for:
   check-in
   check-out
   30-minute tracking
   foreground tracking
========================================================= */

export const getBrowserLocation =
  () =>
    new Promise(
      (
        resolve,
        reject
      ) => {
        if (
          !navigator.geolocation
        ) {
          reject(
            new Error(
              "Geolocation is not supported by this device."
            )
          );

          return;
        }

        navigator.geolocation.getCurrentPosition(
          (
            position
          ) => {
            resolve(
              position
            );
          },

          (
            error
          ) => {
            reject(
              error
            );
          },

          {
            enableHighAccuracy:
              true,

            timeout:
              15000,

            maximumAge:
              60000,
          }
        );
      }
    );