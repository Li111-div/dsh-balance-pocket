/**
 * Daily "how much did today cost" ledger built from **balance observations**.
 *
 * The DeepSeek balance API is a wallet snapshot, not a transaction feed, so the
 * only honest way to derive today's spend is to watch the wallet: the first
 * observation of a Beijing day records the opening balance, and every later
 * observation updates the last balance. today.used = opening − last.
 *
 * Rules that experience (and the shipped whale widget's issues) demand:
 * - Amounts are stored as integer micro-units; float subtraction would drift.
 * - A balance INCREASE (top-up) shifts the opening balance up by the same
 *   amount, so a recharge never reduces today's spend and never creates a
 *   negative number.
 * - Out-of-order / duplicate observations are ignored.
 * - Different sources (API key vs account login) and currencies keep separate
 *   books — they may be different wallets and must not be mixed.
 * - `partial` is reported whenever today's first observation happened more than
 *   LEADING_GAP_MS after Beijing midnight; the UI then says "observed since …"
 *   instead of pretending the number covers the whole day.
 *
 * The module owns its own file I/O and never throws at the caller: a broken or
 * unwritable ledger must not break the balance display.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SCALE = 1000000 // micro-yuan
const OFFSET_MS = 8 * 60 * 60 * 1000
const KEEP_DAYS = 120
const LEADING_GAP_MS = 15 * 60 * 1000

function resolveDataDir() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'dsh-balance-pocket')
}

function toUnits(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error('余额数值无效')
  const units = Math.round(number * SCALE)
  if (!Number.isSafeInteger(units)) throw new Error('余额超出可记录范围')
  return units
}

function beijingDayOf(atMs) {
  return new Date(Number(atMs) + OFFSET_MS).toISOString().slice(0, 10)
}

function dayStartOf(day) {
  const ms = Date.parse(String(day) + 'T00:00:00+08:00')
  return Number.isFinite(ms) ? ms : null
}

function emptyLedger() {
  return { version: 1, active: null, books: {} }
}

/**
 * Create the ledger facade. `clock` is injectable for tests.
 * @param {() => number} [clock]
 */
export function createLedger(clock = () => Date.now()) {
  const dataDir = resolveDataDir()
  const dataFile = path.join(dataDir, 'ledger.json')

  function load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
      if (parsed && parsed.version === 1 && parsed.books && typeof parsed.books === 'object') return parsed
    } catch {
      /* no ledger yet, or unreadable: start a fresh one */
    }
    return emptyLedger()
  }

  let data = load()

  function save() {
    try {
      fs.mkdirSync(dataDir, { recursive: true })
      const temp = dataFile + '.tmp'
      fs.writeFileSync(temp, JSON.stringify(data), 'utf8')
      fs.renameSync(temp, dataFile)
    } catch {
      /* display must survive a read-only home directory */
    }
  }

  function scopeOf(source, currency) {
    const safeSource = String(source || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'unknown'
    const safeCurrency = String(currency || 'CNY').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'CNY'
    return safeSource + '-' + safeCurrency
  }

  function prune() {
    const cutoff = beijingDayOf(clock() - KEEP_DAYS * 86400000)
    for (const scope of Object.keys(data.books)) {
      const book = data.books[scope]
      if (!book || !book.days) {
        delete data.books[scope]
        continue
      }
      for (const day of Object.keys(book.days)) {
        if (day < cutoff) delete book.days[day]
      }
    }
  }

  /**
   * Record one wallet observation. Returns the day row (or null when the input
   * is unusable). Never throws.
   */
  function observe(input) {
    try {
      const at = Number(input && input.at)
      if (!Number.isFinite(at)) return null
      const units = toUnits(input.total)
      const currency = String((input && input.currency) || 'CNY').toUpperCase()
      const scope = scopeOf(input && input.source, currency)
      const day = beijingDayOf(at)

      let book = data.books[scope]
      if (!book || typeof book !== 'object') {
        book = data.books[scope] = { currency, days: {} }
      }
      if (!book.days || typeof book.days !== 'object') book.days = {}
      data.active = scope

      let row = book.days[day]
      if (!row) {
        row = book.days[day] = { day, firstAt: at, lastAt: at, openingUnits: units, lastUnits: units }
      } else if (at > row.lastAt) {
        if (units > row.lastUnits) row.openingUnits += units - row.lastUnits
        row.lastUnits = units
        row.lastAt = at
      } else {
        return row // stale or duplicate sample: keep the existing row untouched
      }
      prune()
      save()
      return row
    } catch {
      return null
    }
  }

  /**
   * Today's summary as the snapshot contract wants it.
   * @param {number} [atMs]
   * @param {{ source?: string, currency?: string } | null} [prefer]
   */
  function today(atMs = clock(), prefer = null) {
    const at = Number(atMs)
    const day = beijingDayOf(Number.isFinite(at) ? at : clock())
    let scope = prefer && prefer.source ? scopeOf(prefer.source, prefer.currency) : data.active
    const preferredCurrency = prefer && prefer.currency ? String(prefer.currency).toUpperCase() : null
    let book = scope ? data.books[scope] : null
    if (!book || !book.days) {
      book = null
      // Fall back to another book that has today's row, but never mix
      // currencies: the popover prints one symbol for both amounts.
      for (const key of Object.keys(data.books)) {
        const candidate = data.books[key]
        if (!candidate || !candidate.days || !candidate.days[day]) continue
        if (preferredCurrency && String(candidate.currency || '').toUpperCase() !== preferredCurrency) continue
        book = candidate
        scope = key
        break
      }
    }
    const row = book && book.days ? book.days[day] : null
    const currency = (book && book.currency) || (prefer && prefer.currency) || 'CNY'
    const start = dayStartOf(day)
    const leadingGap = row && start !== null ? row.firstAt - start : null
    const partial = !row || leadingGap === null || leadingGap > LEADING_GAP_MS
    return {
      day,
      used: row ? Math.max(0, row.openingUnits - row.lastUnits) / SCALE : null,
      currency,
      partial,
      observedFromMs: row ? row.firstAt : null,
      observedToMs: row ? row.lastAt : null,
      source: 'balance-observation',
    }
  }

  return { observe, today, scopeOf, dataDir }
}
