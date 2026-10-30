/**
 * Mainland China statutory holidays (the days that are OFF work), keyed by year.
 *
 * Only days OFF are listed. Adjusted workday weekends (调休上班) need no entry:
 * they already bill at the valley price under the weekend rule, so the peak
 * schedule only has to know which weekdays are holidays.
 *
 * A year's arrangement is published by the State Council each November for the
 * FOLLOWING year (e.g. the 2026 arrangement was published in November 2025).
 * That is why 2027 is absent here: it is not known yet. When a year is missing,
 * `coverageOf()` reports `covered: false`, the snapshot carries
 * `peak.holidayCovered: false`, and the popover tells the user that holidays may
 * be mis-classified — the plugin never silently pretends to know.
 *
 * Keep this file data-only: peak.js owns the schedule logic, this file owns the
 * calendar.
 */

/** @type {Record<number, string[]>} year → YYYY-MM-DD days off. */
export const HOLIDAYS = {
  // 国办发明电〔2025〕7 号 — the arrangement for the year this release targets.
  // Only the current year is kept on purpose: past years are never consulted
  // (the schedule is evaluated for "now"), and shipping an entry nobody has
  // re-checked against the notice is worse than shipping none.
  2026: [
    '2026-01-01', '2026-01-02', '2026-01-03',
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
    '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
    '2026-04-04', '2026-04-05', '2026-04-06',
    '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
    '2026-06-19', '2026-06-20', '2026-06-21',
    '2026-09-25', '2026-09-26', '2026-09-27',
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    '2026-10-05', '2026-10-06', '2026-10-07',
  ],
}

/** Years present in the table, ascending. */
export const HOLIDAY_YEARS = Object.keys(HOLIDAYS).map(Number).sort((a, b) => a - b)

const HOLIDAY_SET = new Set(
  HOLIDAY_YEARS.flatMap((year) => HOLIDAYS[year]),
)

/**
 * Is this Beijing calendar day (YYYY-MM-DD) a statutory holiday?
 *
 * @param {string} day
 * @returns {boolean}
 */
export function isHolidayDay(day) {
  return HOLIDAY_SET.has(String(day))
}

/**
 * Whether the table can be trusted for the year of `day`.
 *
 * @param {string} day YYYY-MM-DD
 * @returns {{ covered: boolean, year: number, years: number[] }}
 */
export function coverageOf(day) {
  const year = Number(String(day).slice(0, 4))
  return {
    covered: HOLIDAY_YEARS.indexOf(year) >= 0,
    year: Number.isFinite(year) ? year : 0,
    years: HOLIDAY_YEARS,
  }
}
