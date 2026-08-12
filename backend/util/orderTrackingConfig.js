/* =========================================================
   ORDER TRACKING CONFIGURATION

   IMPORTANT:
   All "day" values are counted from the Sales Order
   approval date.

   Example:

   approvedAt = 08/08/2026
   stage.day  = 10

   estimatedDate = 18/08/2026

   The service is responsible for calculating the
   actual estimated Date objects.
========================================================= */

/* =========================================================
   PROCESS TYPES
========================================================= */

const PROCESS_TYPES = {
  AS_ROLLED:
    "AS_ROLLED",

  AS_FORGED:
    "AS_FORGED",

  /*
   * Annealed and Normalised use the same lead-time flow.
   *
   * Examples:
   *
   * as_rolled_annealed
   * as_rolled_normalised
   *
   * BOTH resolve to:
   *
   * AS_ROLLED_ANNEALED_NORMALIZED
   */
  AS_ROLLED_ANNEALED_NORMALIZED:
    "AS_ROLLED_ANNEALED_NORMALIZED",

  AS_FORGED_ANNEALED_NORMALIZED:
    "AS_FORGED_ANNEALED_NORMALIZED",

  AS_ROLLED_QT:
    "AS_ROLLED_QT",

  AS_FORGED_QT:
    "AS_FORGED_QT",

  /*
   * H.O.
   *
   * Cutting + machining route.
   */
  H_O:
    "H_O",
};

/* =========================================================
   COMMON N.H.O. LOGISTICS

   Requirement:

   Ready for Dispatch
          ↓
       2 days
          ↓
       Loading
          ↓
       1 day
          ↓
       Shipped
          ↓
   3 days transit
          ↓
      Delivered

   To make Out for Delivery meaningful:

   Shipped
      ↓ +2 days
   Out for Delivery
      ↓ +1 day
   Delivered

========================================================= */

const addLogisticsStages = (
  readyDay
) => {
  const loadingDay =
    readyDay + 2;

  const shippedDay =
    loadingDay + 1;

  const outForDeliveryDay =
    shippedDay + 2;

  const deliveredDay =
    shippedDay + 3;

  return [
    {
      code:
        "ready_for_dispatch",

      label:
        "Ready for Dispatch",

      day:
        readyDay,
    },

    {
      code:
        "loading",

      label:
        "Loading",

      day:
        loadingDay,
    },

    {
      code:
        "shipped",

      label:
        "Shipped",

      day:
        shippedDay,
    },

    {
      code:
        "out_for_delivery",

      label:
        "Out for Delivery",

      day:
        outForDeliveryDay,
    },

    {
      code:
        "delivered",

      label:
        "Delivered",

      day:
        deliveredDay,
    },
  ];
};

/* =========================================================
   PROCESS FLOWS
========================================================= */

const PROCESS_FLOWS = {
  /* =======================================================
     1. AS ROLLED

     Planning
     Day 02

     Under Casting
     Day 08-10
     -> target completion Day 10

     Rolling Planning
     Day 11-14
     -> target completion Day 14

     Rolling
     Day 15-20
     -> target completion Day 20

     Pit Cooling
     Day 26

     End Cutting & Inspection Mill
     Day 27

     Bharat Inspection
     Day 29

     Ready
     Day 30
  ======================================================= */

  [PROCESS_TYPES.AS_ROLLED]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "rolling_planning",

      label:
        "Rolling Planning",

      day:
        14,
    },

    {
      code:
        "rolling",

      label:
        "Rolling",

      day:
        20,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        26,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        27,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection (Bharat)",

      day:
        29,
    },

    ...addLogisticsStages(
      30
    ),
  ],

  /* =======================================================
     2. AS FORGED

     Planning
     Day 02

     Under Casting
     Day 08-10

     Forging Planning
     Day 11-20

     Forging
     Day 21-25

     Pit Cooling
     Day 26

     End Cutting + Mill Inspection
     Day 27

     Bharat Inspection
     Day 29

     Ready
     Day 30
  ======================================================= */

  [PROCESS_TYPES.AS_FORGED]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "forging_planning",

      label:
        "Forging Planning",

      day:
        20,
    },

    {
      code:
        "forging",

      label:
        "Forging",

      day:
        25,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        26,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        27,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection (Bharat)",

      day:
        29,
    },

    ...addLogisticsStages(
      30
    ),
  ],

  /* =======================================================
     3. AS ROLLED + ANNEALED / NORMALISED

     IMPORTANT:

     These Sales Order conditions use this SAME flow:

     as_rolled_annealed
     as_rolled_normalised

     Planning               Day 02
     Under Casting          Day 08-10
     Rolling Planning       Day 11-14
     Rolling                Day 15-25
     Pit Cooling            Day 26
     Inspection             Day 27
     Annealing/Normalising  Day 28-34
     Mill Inspection        Day 35-36
     Bharat Inspection      Day 37-38
     Ready                  Day 39
  ======================================================= */

  [PROCESS_TYPES
    .AS_ROLLED_ANNEALED_NORMALIZED]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "rolling_planning",

      label:
        "Rolling Planning",

      day:
        14,
    },

    {
      code:
        "rolling",

      label:
        "Rolling",

      day:
        25,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        26,
    },

    {
      code:
        "inspection",

      label:
        "Inspection",

      day:
        27,
    },

    /*
     * Same lead time for:
     *
     * Annealing
     * OR
     * Normalising
     *
     * Therefore generic label is used here.
     *
     * Frontend can display exact Sales Order
     * supplyCondition separately.
     */
    {
      code:
        "annealing",

      label:
        "Annealing / Normalising",

      day:
        34,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        36,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection by Bharat",

      day:
        38,
    },

    ...addLogisticsStages(
      39
    ),
  ],

  /* =======================================================
     4. AS FORGED + ANNEALED / NORMALISED

     Planning               Day 02
     Under Casting          Day 08-10
     Forging Planning       Day 11-20
     Forging                Day 21-30
     Pit Cooling            Day 31
     Inspection             Day 32
     Annealing/Normalising  Day 33-40
     Mill Inspection        Day 41-42
     Bharat Inspection      Day 43-44
     Ready                  Day 45
  ======================================================= */

  [PROCESS_TYPES
    .AS_FORGED_ANNEALED_NORMALIZED]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "forging_planning",

      label:
        "Forging Planning",

      day:
        20,
    },

    {
      code:
        "forging",

      label:
        "Forging",

      day:
        30,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        31,
    },

    {
      code:
        "inspection",

      label:
        "Inspection",

      day:
        32,
    },

    {
      code:
        "annealing",

      label:
        "Annealing / Normalising",

      day:
        40,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        42,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection by Bharat",

      day:
        44,
    },

    ...addLogisticsStages(
      45
    ),
  ],

  /* =======================================================
     5. AS ROLLED + Q&T

     Planning            Day 02
     Under Casting       Day 08-10
     Rolling Planning    Day 11-14
     Rolling             Day 15-25
     Pit Cooling         Day 26
     Inspection          Day 27
     Annealing           Day 28-34
     Quenching           Day 35-42
     Tempering           Day 43-47
     Mill Inspection     Day 48-49
     Bharat Inspection   Day 50-51
     Ready               Day 52
  ======================================================= */

  [PROCESS_TYPES.AS_ROLLED_QT]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "rolling_planning",

      label:
        "Rolling Planning",

      day:
        14,
    },

    {
      code:
        "rolling",

      label:
        "Rolling",

      day:
        25,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        26,
    },

    {
      code:
        "inspection",

      label:
        "Inspection",

      day:
        27,
    },

    {
      code:
        "annealing",

      label:
        "Annealing",

      day:
        34,
    },

    {
      code:
        "quenching",

      label:
        "Quenching",

      day:
        42,
    },

    {
      code:
        "tempering",

      label:
        "Tempering",

      day:
        47,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        49,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection by Bharat",

      day:
        51,
    },

    ...addLogisticsStages(
      52
    ),
  ],

  /* =======================================================
     6. AS FORGED + Q&T

     Planning            Day 02
     Under Casting       Day 08-10
     Forging Planning    Day 11-20
     Forging             Day 21-30
     Pit Cooling         Day 31
     Inspection          Day 32
     Annealing           Day 33-40
     Quenching           Day 41-49
     Tempering           Day 50-53
     Mill Inspection     Day 54-55
     Bharat Inspection   Day 56-57
     Ready               Day 58
  ======================================================= */

  [PROCESS_TYPES.AS_FORGED_QT]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        2,
    },

    {
      code:
        "under_casting",

      label:
        "Under Casting",

      day:
        10,
    },

    {
      code:
        "forging_planning",

      label:
        "Forging Planning",

      day:
        20,
    },

    {
      code:
        "forging",

      label:
        "Forging",

      day:
        30,
    },

    {
      code:
        "pit_cooling",

      label:
        "Pit Cooling",

      day:
        31,
    },

    {
      code:
        "inspection",

      label:
        "Inspection",

      day:
        32,
    },

    {
      code:
        "annealing",

      label:
        "Annealing",

      day:
        40,
    },

    {
      code:
        "quenching",

      label:
        "Quenching",

      day:
        49,
    },

    {
      code:
        "tempering",

      label:
        "Tempering",

      day:
        53,
    },

    {
      code:
        "end_cutting_mill_inspection",

      label:
        "End Cutting & Inspection (Mill)",

      day:
        55,
    },

    {
      code:
        "bharat_inspection",

      label:
        "Inspection by Bharat",

      day:
        57,
    },

    ...addLogisticsStages(
      58
    ),
  ],

  /* =======================================================
     7. H.O.

     H.O. does NOT follow casting/rolling/forging.

     Requirement:

     Cutting       2 Days
     Machining     2 Days
     Loading       1 Day
     Dispatch      1 Day
     Transit       3 Days

     Approval      Day 0
     Cutting       Day 2
     Machining     Day 4
     Ready         Day 4
     Loading       Day 5
     Shipped       Day 6
     Out Delivery  Day 8
     Delivered     Day 9
  ======================================================= */

  [PROCESS_TYPES.H_O]: [
    {
      code:
        "planning",

      label:
        "Planning",

      day:
        0,
    },

    {
      code:
        "cutting",

      label:
        "Cutting",

      day:
        2,
    },

    {
      code:
        "machining",

      label:
        "Machining",

      day:
        4,
    },

    {
      code:
        "ready_for_dispatch",

      label:
        "Ready for Dispatch",

      day:
        4,
    },

    {
      code:
        "loading",

      label:
        "Loading",

      day:
        5,
    },

    {
      code:
        "shipped",

      label:
        "Shipped",

      day:
        6,
    },

    {
      code:
        "out_for_delivery",

      label:
        "Out for Delivery",

      day:
        8,
    },

    {
      code:
        "delivered",

      label:
        "Delivered",

      day:
        9,
    },
  ],
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  PROCESS_TYPES,
  PROCESS_FLOWS,
};