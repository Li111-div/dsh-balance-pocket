/**
 * DeepSeek API peak / valley (off-peak) pricing schedule in Beijing time.
 *
 * Official rule (docs.deepseek.com pricing footnote, effective since 2026-08-17,
 * clarified 2026-09-19): the PEAK period is **09:00–12:00 and 14:00–18:00 on
 * Monday–Friday, excluding Chinese statutory holidays**. Every other moment —
 * weekends (including adjusted workday weekends), statutory holidays all day,
 * nights and the 12:00–14:00 lunch break — bills at the valley price.
 * The peak token price is 2x the valley price.
 *
 * This module is deliberately dependency-free and pure so it can be reviewed
 * and exercised without a running Host.
 */

const OFFSET_MS = 8 * 60 * 60 * 1000 // Asia/Shanghai has no DST.
const PEAK_RANGES = [
  [9, 12],
  [14, 18],
]
const BOUNDARY_HOURS = [0, 9, 12, 14, 18]

/**
 * Statutory holidays of mainland China: 2026 arrangement
 * (国办发明电〔2025〕7 号). Only days OFF are listed — adjusted workday
 * weekends (2026-01-04, 02-14, 02-28, 05-09, 09-20, 10-10) already bill at the
 * valley price under the weekend rule, so they need no entry.
 * A new year's arrangement is published each November; extend this list then.
 */
export const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
  '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',
]

const HOLIDAY_SET = new Set(HOLIDAYS_2026)

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
  return HOLIDAY_SET.has(beijingDay(atMs))
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
 * @returns {{
 *   isPeak: boolean,
 *   reason: 'peak' | 'weekend' | 'holiday' | 'off-hours',
 *   periodStartAtMs: number | null,
 *   nextChangeAtMs: number | null,
 *   nextIsPeak: boolean | null,
 *   peakMultiplier: number,
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
  return {
    isPeak,
    reason,
    periodStartAtMs,
    nextChangeAtMs,
    nextIsPeak: nextChangeAtMs === null ? null : isPeakAt(nextChangeAtMs),
    peakMultiplier: 2,
  }
}
