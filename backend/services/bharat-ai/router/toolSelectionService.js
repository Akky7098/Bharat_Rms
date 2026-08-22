const DOMAIN_GROUPS = {
  sales: [
    "sales",
    "user",
  ],

  enquiry: [
    "enquiry",
    "user",
  ],

  dispatch: [
    "dispatch",
    "user",
  ],

  receivable: [
    "receivable",
    "user",
  ],

  tracking: [
    "tracking",
    "user",
  ],

  attendance: [
    "attendance",
    "user",
  ],

  timesheet: [
    "timesheet",
    "user",
  ],

  activity: [
    "activity",
    "user",
  ],

  team: [
    "team",
    "sales",
    "enquiry",
    "activity",
    "user",
  ],
};

const selectToolGroups =
  (
    routeInfo
  ) => {
    const groups =
      new Set();

    for (
      const domain of
      routeInfo.domains ||
      []
    ) {
      for (
        const group of
        DOMAIN_GROUPS[
          domain
        ] ||
        []
      ) {
        groups.add(
          group
        );
      }
    }

    return [
      ...groups,
    ];
  };

module.exports = {
  selectToolGroups,
};