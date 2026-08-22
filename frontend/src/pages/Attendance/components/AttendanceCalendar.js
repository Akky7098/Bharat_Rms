import React, {
  useMemo,
} from "react";

import {
  getHealth,
  makeDateKey,
} from "../utils/attendanceHelpers";

const WEEK_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const AttendanceCalendar = ({
  year,
  month,
  daysInMonth,
  attendanceForDate,
  selectedDay,
  setSelectedDay,
  todayKey,
}) => {
  /* =========================================================
     BUILD CALENDAR CELLS
  ========================================================= */

  const calendarCells =
    useMemo(() => {
      const firstDayIndex =
        new Date(
          Date.UTC(
            year,
            month,
            1
          )
        ).getUTCDay();

      const emptyCells =
        Array(
          firstDayIndex
        ).fill(
          null
        );

      const dateCells =
        Array.from(
          {
            length:
              daysInMonth,
          },
          (
            _,
            index
          ) =>
            index + 1
        );

      return [
        ...emptyCells,
        ...dateCells,
      ];
    }, [
      year,
      month,
      daysInMonth,
    ]);

  /* =========================================================
     DATE CLICK

     IMPORTANT:

     This component only sets the selected day.

     Example:

     click 19 August
          ↓
     setSelectedDay(19)
          ↓
     AttendancePage creates:

     selectedDateKey =
       2026-08-19

          ↓
     existing DAILY DETAIL popup opens.

     History then uses that selectedDateKey.
  ========================================================= */

  const handleDayClick = (
    day
  ) => {
    if (
      !day ||
      typeof setSelectedDay !==
        "function"
    ) {
      return;
    }

    setSelectedDay(
      day
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="calendar-card">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-heading">
        <div>
          <span className="attendance-eyebrow">
            CALENDAR
          </span>

          <h3>
            Select any saved
            date
          </h3>
        </div>

        <span>
          Attendance +
          Location History
        </span>
      </div>

      {/* =====================================================
          CALENDAR
      ====================================================== */}

      <div className="calendar-grid">
        {/* ===================================================
            WEEK HEADER
        =================================================== */}

        {WEEK_DAYS.map(
          (weekDay) => (
            <div
              className="week-name"
              key={
                weekDay
              }
            >
              {weekDay}
            </div>
          )
        )}

        {/* ===================================================
            DATE CELLS
        =================================================== */}

        {calendarCells.map(
          (
            day,
            index
          ) => {
            if (!day) {
              return (
                <div
                  className="empty-day"
                  key={`empty-${index}`}
                />
              );
            }

            const dateKey =
              makeDateKey(
                year,
                month,
                day
              );

            const attendance =
              typeof attendanceForDate ===
              "function"
                ? attendanceForDate(
                    dateKey
                  )
                : null;

            const health =
              getHealth(
                attendance,
                dateKey,
                todayKey
              );

            const isSelected =
              selectedDay ===
              day;

            const isToday =
              dateKey ===
              todayKey;

            const isFuture =
              dateKey >
              todayKey;

            return (
              <button
                type="button"
                key={
                  dateKey
                }
                className={[
                  "calendar-day",
                  health
                    ?.className ||
                    "",
                  isSelected
                    ? "selected"
                    : "",
                  isToday
                    ? "today"
                    : "",
                  isFuture
                    ? "future-date"
                    : "",
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  )}
                onClick={() =>
                  handleDayClick(
                    day
                  )
                }
                title={
                  health
                    ?.label ||
                  dateKey
                }
                aria-label={`Open attendance details for ${dateKey}`}
                aria-pressed={
                  isSelected
                }
              >
                <strong>
                  {day}
                </strong>

                {/* ===========================================
                    STATUS DOT

                    CSS can style this according to health.
                =========================================== */}

                <span
                  className="calendar-day-status-dot"
                  aria-hidden="true"
                />

                {/* ===========================================
                    TODAY MARKER
                =========================================== */}

                {isToday ? (
                  <small className="calendar-today-label">
                    Today
                  </small>
                ) : null}
              </button>
            );
          }
        )}
      </div>
    </section>
  );
};

export default AttendanceCalendar;