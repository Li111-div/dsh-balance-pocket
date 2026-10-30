/**
 * DeepSeek API peak / valley (off-peak) pricing schedule in Beijing time.
 *
 * Official rule (docs.deepseek.com pricing footnote): the PEAK period is
 * **09:00–12:00 and 14:00–18:00 on Monday–Friday, excluding Chinese statutory
 * holidays**. Every other moment — weekends (including adjusted workday
 * weekends), statutory holidays all day, nights and the 12:00–14:00 lunch
 * break — bills at the valley price. The peak token price is 2x the valley price.
 *
 * This module is deliberately dependency-free and pure so it can be reviewed
 * and exercised without a running Host. The holiday calendar itself lives in
 * holidays.js (data only).
 */

import { isHolidayDay, coverageOf, HOLIDAY_YEARS } from './holidays.js'

const OFFSET_MS = 8 * 60 * 60 * 1000 // Asia/Shanghai has no DST.
const PEAK_RANGES = [
  [9, 12],
  [14, 18],
]
const BOUNDARY_HOURS = [0, 9, 12, 14, 18]

/** Beijing calendar date (YYYY-MM-DD) of an epoch-millisecond instant. */
export function beijingDay(atMs) {
  const shifted = new Date(Number(atMs) + OFFSET_MS)
  if (!Number.isFinite(shifted.getTime())) throw new Error('invalid instant')
  return shifted.toISOString().slice(0, 10)
}

function beijingHour(atMs) {
  return new Date(Number(atMs) + OFFSET_MS).getUTCHours()
}

/** 0 = Sunday … 6 = Saturday, in the Beijing calendar. */
function beijingWeekday(atMs) {
  return new Date(Number(atMs) + OFFSET_MS).getUTCDay()
}

export function isWeekend(atMs) {
  const dow = beijingWeekday(atMs)
  return dow === 0 || dow === 6
}

export function isHoliday(atMs) {
  return isHolidayDay(beijingDay(atMs))
}

/** Whether one instant bills at the peak price. */
export function isPeakAt(atMs) {
  const at = Number(atMs)
  if (!Number.isFinite(at)) return false
  if (isWeekend(at) || isHoliday(at)) return false
  const hour = beijingHour(at)
  for (const [start, end] of PEAK_RANGES) {
    if (hour >= start && hour < end) return true
  }
  return false
}

/** Epoch ms of Beijing midnight of the calendar day containing `atMs`. */
function beijingMidnight(atMs) {
  const shifted = new Date(Number(atMs) + OFFSET_MS)
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    0, 0, 0, 0,
  ) - OFFSET_MS
}

/** Every peak/valley boundary (Beijing 00:00/09:00/12:00/14:00/18:00) near `atMs`, ascending. */
function boundariesAround(atMs, backDays = 16, aheadDays = 16) {
  const base = beijingMidnight(atMs)
  const out = []
  for (let day = -backDays; day <= aheadDays; day++) {
    for (const hour of BOUNDARY_HOURS) {
      out.push(base + day * 86400000 + hour * 3600000)
    }
  }
  out.sort((a, b) => a - b)
  return out
}

/** The peak flag genuinely flips at this boundary (and not merely a bookkeeping edge). */
function isChangeBoundary(boundaryMs) {
  return isPeakAt(boundaryMs) !== isPeakAt(boundaryMs - 1)
}

/**
 * The peak/valley state around one instant.
 *
 * `holidayCovered` is false when the calendar has no entry for that year
 * (the State Council publishes next year's arrangement each November), so the
 * UI can warn instead of silently mis-classifying holidays as workdays.
 *
 * @returns {{
 *   isPeak: boolean,
 *   reason: 'peak' | 'weekend' | 'holiday' | 'off-hours',
 *   periodStartAtMs: number | null,
 *   nextChangeAtMs: number | null,
 *   nextIsPeak: boolean | null,
 *   peakMultiplier: number,
 *   holidayCovered: boolean,
 *   holidayYear: number,
 *   holidayYears: number[],
 * }}
 */
export function peakState(atMs = Date.now()) {
  const at = Number(atMs)
  if (!Number.isFinite(at)) throw new Error('invalid instant')
  const isPeak = isPeakAt(at)
  const boundaries = boundariesAround(at)
  let periodStartAtMs = null
  for (let i = boundaries.length - 1; i >= 0; i--) {
    const boundary = boundaries[i]
    if (boundary <= at && isChangeBoundary(boundary)) {
      periodStartAtMs = boundary
      break
    }
  }
  let nextChangeAtMs = null
  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i]
    if (boundary > at && isChangeBoundary(boundary)) {
      nextChangeAtMs = boundary
      break
    }
  }
  let reason = 'off-hours'
  if (isPeak) reason = 'peak'
  else if (isWeekend(at)) reason = 'weekend'
  else if (isHoliday(at)) reason = 'holiday'
  const coverage = coverageOf(beijingDay(at))
  return {
    isPeak,
    reason,
    periodStartAtMs,
    nextChangeAtMs,
    nextIsPeak: nextChangeAtMs === null ? null : isPeakAt(nextChangeAtMs),
    peakMultiplier: 2,
    holidayCovered: coverage.covered,
    holidayYear: coverage.year,
    holidayYears: HOLIDAY_YEARS,
  }
}
