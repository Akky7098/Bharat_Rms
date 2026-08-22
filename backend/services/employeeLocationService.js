const mongoose = require("mongoose");

const Attendance =
  require("../model/attendanceModel");

const User =
  require("../model/userModel");

const EmployeeLocationLog =
  require("../model/EmployeeLocationLog");

/* =====================================================
   CONFIGURATION

   IMPORTANT:
   Prefer environment variables in production.

   Example .env:

   OFFICE_LATITUDE=28.4089
   OFFICE_LONGITUDE=77.3178
   OFFICE_RADIUS_METERS=150

===================================================== */

const OFFICE_LATITUDE =
  Number(
    process.env.OFFICE_LATITUDE
  );

const OFFICE_LONGITUDE =
  Number(
    process.env.OFFICE_LONGITUDE
  );

const OFFICE_RADIUS_METERS =
  Number(
    process.env.OFFICE_RADIUS_METERS ||
      150
  );

const LOCATION_INTERVAL_MINUTES =
  30;

/*
 * Prevent duplicate checkpoints when the frontend
 * retries because of poor internet.
 *
 * A periodic request arriving within this number of
 * minutes of the previous periodic checkpoint will
 * normally be ignored.
 */
const MIN_PERIODIC_GAP_MINUTES =
  20;

/*
 * Ignore extremely inaccurate GPS points for
 * management classification.
 *
 * The point can still be stored, but its status
 * becomes unknown.
 */
const MAX_RELIABLE_ACCURACY_METERS =
  500;

/* =====================================================
   ERROR HELPER
===================================================== */

const createError = (
  message,
  statusCode = 400
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/* =====================================================
   ROLE HELPERS
===================================================== */

const getRole = (user) =>
  String(
    user?.role || ""
  )
    .trim()
    .toLowerCase();

const requireSuperAdmin = (
  user
) => {
  if (
    getRole(user) !==
    "super_admin"
  ) {
    throw createError(
      "Only super admin can view employee location history.",
      403
    );
  }
};

/* =====================================================
   DATE HELPERS
===================================================== */

const getIndiaDateParts = (
  date = new Date()
) => {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const map = {};

  parts.forEach(
    (part) => {
      if (
        part.type !==
        "literal"
      ) {
        map[part.type] =
          part.value;
      }
    }
  );

  return {
    year:
      Number(map.year),

    month:
      Number(map.month),

    day:
      Number(map.day),
  };
};

/*
 * Attendance already uses a stable UTC midnight
 * date-key.
 *
 * This generates:
 *
 * 2026-08-21T00:00:00.000Z
 *
 * for 21 Aug in India.
 */
const getAttendanceDateKey = (
  date = new Date()
) => {
  const {
    year,
    month,
    day,
  } =
    getIndiaDateParts(
      date
    );

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    )
  );
};

const parseHistoryDate = (
  value
) => {
  if (!value) {
    return getAttendanceDateKey();
  }

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    throw createError(
      "Date must be in YYYY-MM-DD format."
    );
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createError(
      "Invalid history date."
    );
  }

  return date;
};

/* =====================================================
   DEVICE HELPER
===================================================== */

const detectDeviceType = (
  userAgent = ""
) => {
  const value =
    String(userAgent);

  if (
    /ipad|tablet/i.test(
      value
    )
  ) {
    return "tablet";
  }

  if (
    /mobile|android|iphone/i.test(
      value
    )
  ) {
    return "mobile";
  }

  if (value) {
    return "desktop";
  }

  return "unknown";
};

/* =====================================================
   GPS HELPERS
===================================================== */

const toRadians = (
  degrees
) =>
  (degrees * Math.PI) /
  180;

const calculateDistanceMeters = (
  latitude1,
  longitude1,
  latitude2,
  longitude2
) => {
  const earthRadius =
    6371000;

  const lat1 =
    toRadians(
      latitude1
    );

  const lat2 =
    toRadians(
      latitude2
    );

  const deltaLat =
    toRadians(
      latitude2 -
        latitude1
    );

  const deltaLng =
    toRadians(
      longitude2 -
        longitude1
    );

  const a =
    Math.sin(
      deltaLat / 2
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLng / 2
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Math.round(
    earthRadius * c
  );
};

const officeCoordinatesAvailable =
  () =>
    Number.isFinite(
      OFFICE_LATITUDE
    ) &&
    Number.isFinite(
      OFFICE_LONGITUDE
    );

const buildGoogleMapLink = (
  latitude,
  longitude
) => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};



/* =====================================================
   REVERSE GEOCODING

   Converts:

   28.45860, 77.30626

   into something like:

   Sector 27A, Old Faridabad,
   Faridabad, Haryana, 121001

   IMPORTANT:
   - Never blocks attendance/location tracking permanently.
   - If reverse geocoding fails, checkpoint still saves.
   - Uses timeout so external API cannot hang backend.
===================================================== */

const reverseGeocodeLocation =
  async (
    latitude,
    longitude
  ) => {
    let timeoutId;

    try {
      const controller =
        new AbortController();

      timeoutId =
        setTimeout(
          () =>
            controller.abort(),
          5000
        );

      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${encodeURIComponent(latitude)}` +
        `&lon=${encodeURIComponent(longitude)}` +
        `&zoom=18` +
        `&addressdetails=1`;

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              "User-Agent":
                "BharatSpecialSteels-RMS/1.0",

              Accept:
                "application/json",
            },

            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        console.warn(
          "LOCATION REVERSE GEOCODING FAILED =>",
          response.status
        );

        return "";
      }

      const data =
        await response.json();

      return String(
        data?.display_name ||
        ""
      ).trim();
    } catch (error) {
      console.warn(
        "LOCATION REVERSE GEOCODING ERROR =>",
        error?.message ||
        error
      );

      return "";
    } finally {
      if (timeoutId) {
        clearTimeout(
          timeoutId
        );
      }
    }
  };


/* =====================================================
   ACTIVE ATTENDANCE
===================================================== */

const getActiveAttendanceForUser =
  async (user) => {
    if (!user?._id) {
      throw createError(
        "Authenticated user not found.",
        401
      );
    }

    const attendanceDate =
      getAttendanceDateKey();

    const attendance =
      await Attendance.findOne({
        employeeId:
          user._id,

        attendanceDate,
      });

    if (!attendance) {
      throw createError(
        "You must check in before workday location can be recorded.",
        409
      );
    }

    /*
     * checked_out means tracking is over.
     */
    if (
      attendance.attendanceStatus ===
      "checked_out"
    ) {
      throw createError(
        "Workday tracking has ended because you have already checked out.",
        409
      );
    }

    if (
      !attendance.checkIn?.time
    ) {
      throw createError(
        "Active check-in was not found.",
        409
      );
    }

    return attendance;
};

/* =====================================================
   CLASSIFY LOCATION
===================================================== */

const classifyLocation =
  async ({
    latitude,
    longitude,
    accuracy,
    attendance,
    employee,
  }) => {
    let distanceFromOfficeMeters =
      null;

    let isWithinOffice =
      false;

    let distanceFromHomeMeters =
      null;

    let isWithinHome =
      false;

    let locationStatus =
      "unknown";

    /*
     * GPS is too inaccurate.
     *
     * Store the point, but don't make a strong
     * management classification.
     */
    if (
      Number.isFinite(
        accuracy
      ) &&
      accuracy >
        MAX_RELIABLE_ACCURACY_METERS
    ) {
      return {
        distanceFromOfficeMeters,
        isWithinOffice,
        distanceFromHomeMeters,
        isWithinHome,
        locationStatus,
      };
    }

    if (
      officeCoordinatesAvailable()
    ) {
      distanceFromOfficeMeters =
        calculateDistanceMeters(
          latitude,
          longitude,
          OFFICE_LATITUDE,
          OFFICE_LONGITUDE
        );

      isWithinOffice =
        distanceFromOfficeMeters <=
        OFFICE_RADIUS_METERS;
    }

    const homeLatitude =
      Number(
        employee
          ?.homeLocation
          ?.latitude
      );

    const homeLongitude =
      Number(
        employee
          ?.homeLocation
          ?.longitude
      );

    const homeRadius =
      Number(
        employee
          ?.homeLocation
          ?.radiusMeters ||
          100
      );

    if (
      Number.isFinite(
        homeLatitude
      ) &&
      Number.isFinite(
        homeLongitude
      )
    ) {
      distanceFromHomeMeters =
        calculateDistanceMeters(
          latitude,
          longitude,
          homeLatitude,
          homeLongitude
        );

      isWithinHome =
        distanceFromHomeMeters <=
        homeRadius;
    }

    if (isWithinOffice) {
      locationStatus =
        "office";
    } else if (
      attendance.workMode ===
        "work_from_home" &&
      isWithinHome
    ) {
      locationStatus =
        "home";
    } else if (
      attendance.workMode ===
      "work_from_home"
    ) {
      locationStatus =
        "remote";
    } else if (
      officeCoordinatesAvailable()
    ) {
      locationStatus =
        "outside_office";
    }

    return {
      distanceFromOfficeMeters,
      isWithinOffice,
      distanceFromHomeMeters,
      isWithinHome,
      locationStatus,
    };
  };

/* =====================================================
   CREATE CHECKPOINT

   Called by logged-in employee's frontend.

   It NEVER accepts employeeId from frontend.
   Employee identity comes from req.user.
===================================================== */

const createCheckpoint =
  async (
    payload = {},
    user
  ) => {
    const latitude =
      Number(
        payload.latitude
      );

    const longitude =
      Number(
        payload.longitude
      );

    const accuracy =
      payload.accuracy ===
        undefined ||
      payload.accuracy ===
        null ||
      payload.accuracy ===
        ""
        ? null
        : Number(
            payload.accuracy
          );

    if (
      !Number.isFinite(
        latitude
      ) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw createError(
        "Valid latitude is required."
      );
    }

    if (
      !Number.isFinite(
        longitude
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw createError(
        "Valid longitude is required."
      );
    }

    if (
      accuracy !== null &&
      (!Number.isFinite(
        accuracy
      ) ||
        accuracy < 0)
    ) {
      throw createError(
        "Invalid location accuracy."
      );
    }

    const allowedSources =
      [
        "periodic",
        "app_open",
        "manual_refresh",
      ];

    const source =
      allowedSources.includes(
        payload.source
      )
        ? payload.source
        : "periodic";

    const attendance =
      await getActiveAttendanceForUser(
        user
      );

    /*
     * Avoid unnecessary duplicate periodic records.
     */
    if (
      source ===
      "periodic"
    ) {
      const duplicateThreshold =
        new Date(
          Date.now() -
            MIN_PERIODIC_GAP_MINUTES *
              60 *
              1000
        );

      const recent =
        await EmployeeLocationLog.findOne(
          {
            employeeId:
              user._id,

            attendanceId:
              attendance._id,

            source:
              "periodic",

            capturedAt: {
              $gte:
                duplicateThreshold,
            },
          }
        )
          .sort({
            capturedAt: -1,
          })
          .lean();

      if (recent) {
        return {
          recorded: false,
          skipped: true,
          reason:
            "Recent periodic checkpoint already exists.",
          checkpoint:
            recent,
          nextIntervalMinutes:
            LOCATION_INTERVAL_MINUTES,
        };
      }
    }

    const employee =
      await User.findById(
        user._id
      )
        .select(
          "name email attendanceMode homeLocation"
        )
        .lean();

    const classification =
  await classifyLocation(
    {
      latitude,
      longitude,
      accuracy,
      attendance,
      employee,
    }
  );

/* =====================================================
   GET READABLE ADDRESS

   Do this before saving checkpoint.

   If reverse geocoding fails:
   locationAddress = ""

   Checkpoint still saves normally.
===================================================== */

const locationAddress =
  await reverseGeocodeLocation(
    latitude,
    longitude
  );

const checkpoint =
  await EmployeeLocationLog.create(
        {
          employeeId:
            user._id,

          attendanceId:
            attendance._id,

          attendanceDate:
            attendance.attendanceDate,

          capturedAt:
            new Date(),

          latitude,
          longitude,
          accuracy,

          distanceFromOfficeMeters:
            classification.distanceFromOfficeMeters,

          isWithinOffice:
            classification.isWithinOffice,

          workMode:
            attendance.workMode,

          locationStatus:
            classification.locationStatus,

          distanceFromHomeMeters:
            classification.distanceFromHomeMeters,

          isWithinHome:
            classification.isWithinHome,

          source,
           
          locationAddress:
  locationAddress ||
  "",

          ipAddress:
            payload.ipAddress ||
            "",

          userAgent:
            payload.userAgent ||
            "",

          deviceType:
            detectDeviceType(
              payload.userAgent
            ),

          googleMapLink:
            buildGoogleMapLink(
              latitude,
              longitude
            ),
        }
      );

    return {
      recorded: true,
      skipped: false,
      checkpoint,
      nextIntervalMinutes:
        LOCATION_INTERVAL_MINUTES,
    };
  };

/* =====================================================
   TRACKING STATUS

   Frontend can call this when attendance page/PWA opens.

   This does NOT reveal history to the employee.
===================================================== */

const getMyTrackingStatus =
  async (user) => {
    if (!user?._id) {
      throw createError(
        "Authenticated user not found.",
        401
      );
    }

    const attendanceDate =
      getAttendanceDateKey();

    const attendance =
      await Attendance.findOne({
        employeeId:
          user._id,

        attendanceDate,
      })
        .select(
          "_id attendanceDate attendanceStatus workMode checkIn.time checkOut.time"
        )
        .lean();

    if (
      !attendance ||
      !attendance.checkIn?.time
    ) {
      return {
        active: false,
        reason:
          "not_checked_in",
        intervalMinutes:
          LOCATION_INTERVAL_MINUTES,
      };
    }

    if (
      attendance.checkOut
        ?.time ||
      attendance.attendanceStatus ===
        "checked_out"
    ) {
      return {
        active: false,
        reason:
          "checked_out",
        intervalMinutes:
          LOCATION_INTERVAL_MINUTES,
      };
    }

    const lastCheckpoint =
      await EmployeeLocationLog.findOne(
        {
          employeeId:
            user._id,

          attendanceId:
            attendance._id,
        }
      )
        .sort({
          capturedAt: -1,
        })
        .lean();

    return {
      active: true,

      attendanceId:
        attendance._id,

      attendanceStatus:
        attendance.attendanceStatus,

      workMode:
        attendance.workMode,

      checkedInAt:
        attendance.checkIn
          ?.time ||
        null,

      lastCheckpointAt:
        lastCheckpoint
          ?.capturedAt ||
        null,

      intervalMinutes:
        LOCATION_INTERVAL_MINUTES,
    };
  };

/* =====================================================
   HISTORY HELPERS
===================================================== */

const normalizeAttendancePoint =
  (
    audit,
    source
  ) => {
    if (
      !audit?.time ||
      !Number.isFinite(
        Number(
          audit.latitude
        )
      ) ||
      !Number.isFinite(
        Number(
          audit.longitude
        )
      )
    ) {
      return null;
    }

    return {
      _id: null,

      capturedAt:
        audit.time,

      latitude:
        audit.latitude,

      longitude:
        audit.longitude,

      accuracy:
        audit.accuracy ??
        null,

      distanceFromOfficeMeters:
        audit.distanceFromOfficeMeters ??
        null,

      isWithinOffice:
        Boolean(
          audit.isWithinOffice
        ),

      locationStatus:
        audit.isWithinOffice
          ? "office"
          : "outside_office",

      source,

      locationAddress:
        audit.locationAddress ||
        "",

      googleMapLink:
        audit.googleMapLink ||
        buildGoogleMapLink(
          audit.latitude,
          audit.longitude
        ),
    };
  };

const calculateMinutes = (
  start,
  end
) => {
  if (!start || !end) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (new Date(end) -
        new Date(start)) /
        60000
    )
  );
};

/* =====================================================
   GET EMPLOYEE DAY HISTORY

   SUPER ADMIN ONLY
===================================================== */

const getEmployeeHistory =
  async (
    employeeId,
    query = {},
    user
  ) => {
    requireSuperAdmin(
      user
    );

    if (
      !mongoose.Types.ObjectId.isValid(
        employeeId
      )
    ) {
      throw createError(
        "Invalid employee ID."
      );
    }

    const attendanceDate =
      parseHistoryDate(
        query.date
      );

    const [
      employee,
      attendance,
    ] =
      await Promise.all([
        User.findById(
          employeeId
        )
          .select(
            "name email role attendanceMode"
          )
          .lean(),

        Attendance.findOne({
          employeeId,
          attendanceDate,
        }).lean(),
      ]);

    if (!employee) {
      throw createError(
        "Employee not found.",
        404
      );
    }

    if (!attendance) {
      return {
        employee,

        attendanceDate,

        attendance: null,

        summary: {
          totalCheckpoints:
            0,

          officeCheckpoints:
            0,

          outsideCheckpoints:
            0,

          homeCheckpoints:
            0,

          remoteCheckpoints:
            0,

          unknownCheckpoints:
            0,

          workdayMinutes:
            0,

          gpsCoveragePercent:
            0,

          expectedPeriodicCheckpoints:
            0,
        },

        history: [],
      };
    }

    const locationLogs =
      await EmployeeLocationLog.find(
        {
          employeeId,
          attendanceId:
            attendance._id,
        }
      )
        .sort({
          capturedAt: 1,
        })
        .lean();

    const history = [];

    const checkInPoint =
      normalizeAttendancePoint(
        attendance.checkIn,
        "check_in"
      );

    if (checkInPoint) {
      history.push(
        checkInPoint
      );
    }

    locationLogs.forEach(
      (item) => {
        history.push({
          ...item,

          source:
            item.source ||
            "periodic",
        });
      }
    );

    const checkOutPoint =
      normalizeAttendancePoint(
        attendance.checkOut,
        "check_out"
      );

    if (checkOutPoint) {
      history.push(
        checkOutPoint
      );
    }

    history.sort(
      (a, b) =>
        new Date(
          a.capturedAt
        ) -
        new Date(
          b.capturedAt
        )
    );

    const workdayEnd =
      attendance.checkOut
        ?.time ||
      new Date();

    const workdayMinutes =
      calculateMinutes(
        attendance.checkIn
          ?.time,
        workdayEnd
      );

    const expectedPeriodicCheckpoints =
      attendance.checkIn
        ?.time
        ? Math.floor(
            workdayMinutes /
              LOCATION_INTERVAL_MINUTES
          )
        : 0;

    const periodicLogs =
      locationLogs.filter(
        (item) =>
          item.source ===
          "periodic"
      );

    const gpsCoveragePercent =
      expectedPeriodicCheckpoints >
      0
        ? Math.min(
            100,
            Math.round(
              (periodicLogs.length /
                expectedPeriodicCheckpoints) *
                100
            )
          )
        : 0;

    const countStatus = (
      status
    ) =>
      history.filter(
        (item) =>
          item.locationStatus ===
          status
      ).length;

    return {
      employee,

      attendanceDate,

      attendance: {
        _id:
          attendance._id,

        workMode:
          attendance.workMode,

        attendanceStatus:
          attendance.attendanceStatus,

        checkIn:
          attendance.checkIn ||
          null,

        checkOut:
          attendance.checkOut ||
          null,

        totalWorkingMinutes:
          attendance.totalWorkingMinutes ||
          workdayMinutes,
      },

      summary: {
        totalCheckpoints:
          history.length,

        periodicCheckpoints:
          periodicLogs.length,

        officeCheckpoints:
          countStatus(
            "office"
          ),

        outsideCheckpoints:
          countStatus(
            "outside_office"
          ),

        homeCheckpoints:
          countStatus(
            "home"
          ),

        remoteCheckpoints:
          countStatus(
            "remote"
          ),

        unknownCheckpoints:
          countStatus(
            "unknown"
          ),

        workdayMinutes,

        expectedPeriodicCheckpoints,

        gpsCoveragePercent,
      },

      history,
    };
  };

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  createCheckpoint,
  getMyTrackingStatus,
  getEmployeeHistory,
};