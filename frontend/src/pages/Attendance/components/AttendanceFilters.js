import React, {
  useMemo,
} from "react";

import {
  MONTHS,
} from "../utils/attendanceHelpers";

const AttendanceFilters = ({
  filters,
  setFilters,
  employees = [],
  canManageUsers,
}) => {
  /* =========================================================
     CURRENT YEAR
  ========================================================= */

  const currentYear =
    new Date().getFullYear();

  /* =========================================================
     YEAR OPTIONS

     Keep current year + previous 4 years.
  ========================================================= */

  const yearOptions =
    useMemo(() => {
      return Array.from(
        {
          length: 5,
        },
        (
          _,
          index
        ) =>
          currentYear -
          index
      );
    }, [
      currentYear,
    ]);

  /* =========================================================
     SAFE FILTER VALUES
  ========================================================= */

  const selectedMonth =
    Number(
      filters?.month ??
      0
    );

  const selectedYear =
    Number(
      filters?.year ||
      currentYear
    );

  const selectedEmployeeId =
    filters?.employeeId ||
    "";

  /* =========================================================
     UPDATE HELPERS
  ========================================================= */

  const updateFilter = (
    field,
    value
  ) => {
    if (
      typeof setFilters !==
      "function"
    ) {
      return;
    }

    setFilters(
      (
        previous
      ) => ({
        ...previous,
        [field]:
          value,
      })
    );
  };

  /* =========================================================
     EMPLOYEE LIST

     Preserve existing employee values.
     Only filter invalid/null entries.
  ========================================================= */

  const employeeOptions =
    useMemo(() => {
      if (
        !Array.isArray(
          employees
        )
      ) {
        return [];
      }

      return employees.filter(
        Boolean
      );
    }, [
      employees,
    ]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="timesheet-filter-card">
      {/* =====================================================
          TITLE
      ====================================================== */}

      <div className="filter-title">
        <span className="attendance-eyebrow">
          FILTERS
        </span>

        <h3>
          Attendance Filters
        </h3>

        <p>
          Filter attendance by
          month, year and
          employee.
        </p>
      </div>

      {/* =====================================================
          FILTER GRID
      ====================================================== */}

      <div className="timesheet-filter-grid">
        {/* MONTH */}

        <div className="filter-field">
          <label
            htmlFor="attendance-month-filter"
          >
            Month
          </label>

          <select
            id="attendance-month-filter"
            value={
              selectedMonth
            }
            onChange={(
              event
            ) =>
              updateFilter(
                "month",
                Number(
                  event
                    .target
                    .value
                )
              )
            }
          >
            {MONTHS.map(
              (
                month,
                index
              ) => (
                <option
                  value={
                    index
                  }
                  key={
                    month
                  }
                >
                  {month}
                </option>
              )
            )}
          </select>
        </div>

        {/* YEAR */}

        <div className="filter-field">
          <label
            htmlFor="attendance-year-filter"
          >
            Year
          </label>

          <select
            id="attendance-year-filter"
            value={
              selectedYear
            }
            onChange={(
              event
            ) =>
              updateFilter(
                "year",
                Number(
                  event
                    .target
                    .value
                )
              )
            }
          >
            {yearOptions.map(
              (
                year
              ) => (
                <option
                  key={
                    year
                  }
                  value={
                    year
                  }
                >
                  {year}
                </option>
              )
            )}
          </select>
        </div>

        {/* EMPLOYEE
            Only Admin / Super Admin sees this.
        */}

        {canManageUsers ? (
          <div className="filter-field">
            <label
              htmlFor="attendance-employee-filter"
            >
              Employee
            </label>

            <select
              id="attendance-employee-filter"
              value={
                selectedEmployeeId
              }
              onChange={(
                event
              ) =>
                updateFilter(
                  "employeeId",
                  event
                    .target
                    .value
                )
              }
            >
              <option value="">
                All Employees
              </option>

              {employeeOptions.map(
                (
                  employee
                ) => {
                  const employeeId =
                    employee?._id ||
                    employee?.id ||
                    "";

                  const employeeName =
                    employee?.name ||
                    employee?.employeeName ||
                    employee?.email ||
                    "Employee";

                  return (
                    <option
                      key={
                        employeeId ||
                        employeeName
                      }
                      value={
                        employeeId
                      }
                    >
                      {
                        employeeName
                      }
                    </option>
                  );
                }
              )}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AttendanceFilters;