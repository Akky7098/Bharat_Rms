const {
  SalesOrder,
  Enquiry,
  ColdCall,
  User,
} = require(
  "../modelRegistry"
);

const {
  assertManagement,
} = require(
  "../security/aiAccess"
);

const {
  buildMongoDateRangeIST,
  shiftYmd,
} = require(
  "../utils/businessTime"
);

/* =========================================================
   TEAM PERFORMANCE
========================================================= */

const getTeamSalesPerformance =
  async ({
    requestingUser,
    dateFrom,
    dateTo,
  }) => {
    assertManagement(
      requestingUser
    );

    if (
      !dateFrom ||
      !dateTo
    ) {
      throw new Error(
        "dateFrom and dateTo are required."
      );
    }

    const range =
      buildMongoDateRangeIST(
        dateFrom,
        dateTo
      );

    /*
     * Identify sales users from
     * recent sales activity history.
     */

    const rosterFrom =
      shiftYmd(
        dateFrom,
        -180
      );

    const rosterRange =
      buildMongoDateRangeIST(
        rosterFrom,
        dateTo
      );

    const [
      salesIds,
      enquiryIds,
      activityIds,
    ] =
      await Promise.all([
        SalesOrder.distinct(
          "salesPersonId",
          {
            orderDate:
              rosterRange,
          }
        ),

        Enquiry.distinct(
          "salesPersonId",
          {
            enquiryDate:
              rosterRange,
          }
        ),

        ColdCall.distinct(
          "salesPersonId",
          {
            date:
              rosterRange,
          }
        ),
      ]);

    const ids = [
      ...new Set(
        [
          ...salesIds,
          ...enquiryIds,
          ...activityIds,
        ]
          .filter(
            Boolean
          )
          .map(
            String
          )
      ),
    ];

    const users =
      await User.find({
        _id: {
          $in:
            ids,
        },
      })
        .select(
          "_id name email"
        )
        .lean();

    if (
      users.length ===
      0
    ) {
      return {
        count:
          0,

        salespeople:
          [],
      };
    }

    const userIds =
      users.map(
        (
          user
        ) =>
          user._id
      );

    const [
      sales,
      enquiries,
      activity,
    ] =
      await Promise.all([
        SalesOrder.aggregate([
          {
            $match: {
              salesPersonId: {
                $in:
                  userIds,
              },

              orderDate:
                range,

              approvalStatus:
                "approved",

              isActive: {
                $ne:
                  false,
              },
            },
          },

          {
            $group: {
              _id:
                "$salesPersonId",

              totalSales: {
                $sum:
                  "$orderValue",
              },

              orders: {
                $sum:
                  1,
              },
            },
          },
        ]),

        Enquiry.aggregate([
          {
            $match: {
              salesPersonId: {
                $in:
                  userIds,
              },

              enquiryDate:
                range,
            },
          },

          {
            $group: {
              _id:
                "$salesPersonId",

              enquiries: {
                $sum:
                  1,
              },

              won: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$closure.status",
                        "won",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              lost: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$closure.status",
                        "lost",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },
            },
          },
        ]),

        ColdCall.aggregate([
          {
            $match: {
              salesPersonId: {
                $in:
                  userIds,
              },

              date:
                range,
            },
          },

          {
            $group: {
              _id:
                "$salesPersonId",

              totalActivities: {
                $sum:
                  1,
              },

              calls: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$activityType",
                        "calling",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              visits: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$activityType",
                        "visit",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              emails: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$activityType",
                        "email",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const makeMap =
      (
        rows
      ) =>
        new Map(
          rows.map(
            (
              row
            ) => [
              String(
                row._id
              ),

              row,
            ]
          )
        );

    const salesMap =
      makeMap(
        sales
      );

    const enquiryMap =
      makeMap(
        enquiries
      );

    const activityMap =
      makeMap(
        activity
      );

    const salespeople =
      users.map(
        (
          user
        ) => {
          const id =
            String(
              user._id
            );

          const salesRow =
            salesMap.get(
              id
            ) ||
            {};

          const enquiryRow =
            enquiryMap.get(
              id
            ) ||
            {};

          const activityRow =
            activityMap.get(
              id
            ) ||
            {};

          const enquiriesCount =
            Number(
              enquiryRow
                .enquiries ||
                0
            );

          const won =
            Number(
              enquiryRow
                .won ||
                0
            );

          return {
            salesPersonId:
              user._id,

            name:
              user.name,

            totalSales:
              Number(
                salesRow
                  .totalSales ||
                  0
              ),

            orders:
              Number(
                salesRow
                  .orders ||
                  0
              ),

            enquiries:
              enquiriesCount,

            wonEnquiries:
              won,

            lostEnquiries:
              Number(
                enquiryRow
                  .lost ||
                  0
              ),

            conversionRate:
              enquiriesCount >
              0
                ? Number(
                    (
                      (
                        won /
                        enquiriesCount
                      ) *
                      100
                    ).toFixed(
                      2
                    )
                  )
                : 0,

            activities:
              Number(
                activityRow
                  .totalActivities ||
                  0
              ),

            calls:
              Number(
                activityRow
                  .calls ||
                  0
              ),

            visits:
              Number(
                activityRow
                  .visits ||
                  0
              ),

            emails:
              Number(
                activityRow
                  .emails ||
                  0
              ),
          };
        }
      );

    return {
      period: {
        dateFrom,
        dateTo,
      },

      count:
        salespeople.length,

      salespeople,

      note:
        "This comparison reflects measurable sales, enquiry and activity data for the selected period. It should be used as an operational indicator rather than a judgment of an employee's overall value.",
    };
  };

module.exports = {
  getTeamSalesPerformance,
};