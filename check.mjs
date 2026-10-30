/**
 * Local self-check for dsh-balance-pocket. Not part of the bundle.
 * Run: node check.mjs   (from the workspace root)
 *
 * Validates: peak schedule correctness for known dates and millisecond
 * boundaries, ledger rules (cross-day, top-up, ordering, partial, currency
 * separation, corrupt file), module syntax and shapes (Host half imported for
 * real, Client half loaded through a stubbed module loader), the snapshot route
 * handler through a fake Cordis ctx (403/405/HEAD/200 + no key leak), and the
 * manifest/locale/icon resources.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Keep the real profile ledger untouched: the self-check must never write
// fake balance observations into $DSH_HOME/dsh-balance-pocket/ledger.json.
const SANDBOX_HOME = path.join(os.tmpdir(), 'dsh-balance-pocket-check')
process.env.DSH_HOME = SANDBOX_HOME
fs.rmSync(path.join(SANDBOX_HOME, 'dsh-balance-pocket'), { recursive: true, force: true })

const here = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.join(here, 'plugin')
const bj = (text) => Date.parse(text)

const results = []
function check(name, fn) {
  try {
    fn()
    results.push(['PASS', name])
  } catch (error) {
    results.push(['FAIL', name, error && error.message ? error.message : String(error)])
  }
}
async function checkAsync(name, fn) {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (error) {
    results.push(['FAIL', name, error && error.message ? error.message : String(error)])
  }
}
function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(pluginDir, name), 'utf8'))
}

const peak = await import(pathToFileURL(path.join(pluginDir, 'peak.js')).href)

// --- peak schedule ---------------------------------------------------------
check('Fri 2026-10-30 08:33 is valley', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T08:33:00+08:00')), false)
})
check('Fri 2026-10-30 09:00:00.000 is peak', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T09:00:00.000+08:00')), true)
})
check('Fri 2026-10-30 08:59:59.999 is valley', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T08:59:59.999+08:00')), false)
})
check('Fri 2026-10-30 11:59:59.999 is peak', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T11:59:59.999+08:00')), true)
})
check('Fri 2026-10-30 12:00:00.000 is valley (lunch)', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T12:00:00.000+08:00')), false)
})
check('Fri 2026-10-30 14:00 is peak', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T14:00:00+08:00')), true)
})
check('Fri 2026-10-30 17:59:59.999 is peak', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T17:59:59.999+08:00')), true)
})
check('Fri 2026-10-30 18:00 is valley', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-30T18:00:00+08:00')), false)
})
check('Sat 2026-10-31 10:00 is valley (weekend)', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-31T10:00:00+08:00')), false)
})
check('Sun 2026-11-01 15:00 is valley (weekend)', () => {
  assert.equal(peak.isPeakAt(bj('2026-11-01T15:00:00+08:00')), false)
})
check('Mon 2026-11-02 10:00 is peak', () => {
  assert.equal(peak.isPeakAt(bj('2026-11-02T10:00:00+08:00')), true)
})
check('National Day 2026-10-01 10:00 is valley (holiday)', () => {
  assert.equal(peak.isPeakAt(bj('2026-10-01T10:00:00+08:00')), false)
})
check('2026-10-30 08:33 next switch is 09:00 peak, start is yesterday 18:00', () => {
  const state = peak.peakState(bj('2026-10-30T08:33:00+08:00'))
  assert.equal(state.isPeak, false)
  assert.equal(state.nextChangeAtMs, bj('2026-10-30T09:00:00+08:00'))
  assert.equal(state.nextIsPeak, true)
  assert.equal(state.periodStartAtMs, bj('2026-10-29T18:00:00+08:00'))
  assert.equal(state.reason, 'off-hours')
})
check('2026-10-30 10:00 period started 09:00, next switch 12:00', () => {
  const state = peak.peakState(bj('2026-10-30T10:00:00+08:00'))
  assert.equal(state.isPeak, true)
  assert.equal(state.periodStartAtMs, bj('2026-10-30T09:00:00+08:00'))
  assert.equal(state.nextChangeAtMs, bj('2026-10-30T12:00:00+08:00'))
  assert.equal(state.nextIsPeak, false)
})
check('Fri 2026-10-30 20:00 next switch is Mon 09:00', () => {
  const state = peak.peakState(bj('2026-10-30T20:00:00+08:00'))
  assert.equal(state.isPeak, false)
  assert.equal(state.nextChangeAtMs, bj('2026-11-02T09:00:00+08:00'))
  assert.equal(state.nextIsPeak, true)
})
check('Sat 2026-10-31 00:00 is no switch point (valley since Fri 18:00)', () => {
  const state = peak.peakState(bj('2026-10-31T00:00:00+08:00'))
  assert.equal(state.periodStartAtMs, bj('2026-10-30T18:00:00+08:00'))
  assert.equal(state.nextChangeAtMs, bj('2026-11-02T09:00:00+08:00'))
})
check('holiday end: 2026-10-07 23:59 next switch is 10-08 09:00', () => {
  assert.equal(peak.peakState(bj('2026-10-07T23:59:00+08:00')).nextChangeAtMs, bj('2026-10-08T09:00:00+08:00'))
})
check('Spring Festival 2026-02-15 10:00 valley, next switch 02-24 09:00', () => {
  assert.equal(peak.isPeakAt(bj('2026-02-15T10:00:00+08:00')), false)
  assert.equal(peak.peakState(bj('2026-02-15T10:00:00+08:00')).nextChangeAtMs, bj('2026-02-24T09:00:00+08:00'))
})
check('reason: weekend / peak / holiday', () => {
  assert.equal(peak.peakState(bj('2026-10-31T10:00:00+08:00')).reason, 'weekend')
  assert.equal(peak.peakState(bj('2026-10-30T09:00:00+08:00')).reason, 'peak')
  assert.equal(peak.peakState(bj('2026-10-01T10:00:00+08:00')).reason, 'holiday')
})
check('invalid instant throws', () => {
  assert.throws(() => peak.peakState(NaN))
})
check('beijingDay crosses UTC day boundary', () => {
  assert.equal(peak.beijingDay(Date.parse('2026-10-30T16:30:00Z')), '2026-10-31')
})

// --- holiday calendar coverage --------------------------------------------
// The peak schedule is only as correct as its holiday table. A year that is
// missing must be REPORTED (holidayCovered: false), never silently treated as
// "no holidays" — that would show "off-peak" during a holiday at peak price.
const holidays = await import(pathToFileURL(path.join(pluginDir, 'holidays.js')).href)
check('holiday table years are sorted and parseable', () => {
  assert.ok(holidays.HOLIDAY_YEARS.length >= 1, 'the calendar must cover at least the current year')
  const sorted = holidays.HOLIDAY_YEARS.slice().sort((a, b) => a - b)
  assert.deepEqual(holidays.HOLIDAY_YEARS, sorted)
  for (const year of holidays.HOLIDAY_YEARS) {
    assert.ok(holidays.HOLIDAYS[year].length > 0, 'year ' + year + ' has no entries')
    for (const day of holidays.HOLIDAYS[year]) {
      assert.match(day, /^\d{4}-\d{2}-\d{2}$/)
      assert.equal(Number(day.slice(0, 4)), year, 'entry ' + day + ' is filed under ' + year)
      assert.ok(Number.isFinite(Date.parse(day + 'T00:00:00+08:00')), 'unparseable holiday ' + day)
    }
  }
})
check('a covered year reports covered', () => {
  assert.equal(peak.peakState(bj('2026-10-01T10:00:00+08:00')).holidayCovered, true)
  assert.equal(peak.peakState(bj('2026-10-01T10:00:00+08:00')).holidayYear, 2026)
})
check('an uncovered year is flagged, not silently treated as holiday-free', () => {
  const state = peak.peakState(bj('2027-01-01T10:00:00+08:00'))
  assert.equal(state.holidayCovered, false)
  assert.equal(state.holidayYear, 2027)
})
check('every listed holiday is never peak', () => {
  for (const year of holidays.HOLIDAY_YEARS) {
    for (const day of holidays.HOLIDAYS[year]) {
      // 10:00 Beijing would be peak on an ordinary weekday.
      assert.equal(peak.isPeakAt(bj(day + 'T10:00:00+08:00')), false, day + ' must not be peak')
    }
  }
})
check('uncovered-year weekdays still follow the weekday rule', () => {
  // 2027-01-04 is a Monday: peak at 10:00 even though the calendar is silent.
  assert.equal(peak.isPeakAt(bj('2027-01-04T10:00:00+08:00')), true)
})

// --- ledger ----------------------------------------------------------------
const { createLedger } = await import(pathToFileURL(path.join(pluginDir, 'ledger.js')).href)
const ledger = createLedger(() => bj('2026-10-30T12:00:00+08:00'))
check('ledger observes and computes today usage', () => {
  const day = '2026-10-30'
  const at = (hhmm) => bj(day + 'T' + hhmm + ':00+08:00')
  ledger.observe({ at: at('00:00'), total: 100, currency: 'CNY', source: 'api-key' })
  ledger.observe({ at: at('10:00'), total: 98.5, currency: 'CNY', source: 'api-key' })
  const summary = ledger.today(at('12:00'), { source: 'api-key', currency: 'CNY' })
  assert.equal(summary.day, day)
  assert.equal(summary.used, 1.5)
  assert.equal(summary.partial, false)
  assert.equal(summary.observedFromMs, at('00:00'))
  assert.equal(summary.observedToMs, at('10:00'))
})
check('top-up does not reduce used or go negative', () => {
  const day = '2026-10-30'
  const at = (hhmm) => bj(day + 'T' + hhmm + ':00+08:00')
  ledger.observe({ at: at('13:00'), total: 110, currency: 'CNY', source: 'api-key' })
  const summary = ledger.today(at('13:00'), { source: 'api-key', currency: 'CNY' })
  assert.equal(summary.used, 1.5)
})
check('out-of-order sample is ignored', () => {
  const day = '2026-10-30'
  const at = (hhmm) => bj(day + 'T' + hhmm + ':00+08:00')
  ledger.observe({ at: at('09:00'), total: 0.01, currency: 'CNY', source: 'api-key' })
  const summary = ledger.today(at('13:00'), { source: 'api-key', currency: 'CNY' })
  assert.equal(summary.used, 1.5)
})
check('late first observation marks partial', () => {
  const at = bj('2026-10-31T10:00:00+08:00')
  ledger.observe({ at, total: 50, currency: 'CNY', source: 'api-key' })
  const summary = ledger.today(at, { source: 'api-key', currency: 'CNY' })
  assert.equal(summary.partial, true)
  assert.equal(summary.used, 0)
})
check('leading gap exactly 15min is still a full day, +1ms is partial', () => {
  ledger.observe({ at: bj('2026-11-03T00:15:00.000+08:00'), total: 20, currency: 'CNY', source: 'api-key' })
  assert.equal(ledger.today(bj('2026-11-03T08:00:00+08:00'), { source: 'api-key', currency: 'CNY' }).partial, false)
  ledger.observe({ at: bj('2026-11-04T00:15:00.001+08:00'), total: 20, currency: 'CNY', source: 'api-key' })
  assert.equal(ledger.today(bj('2026-11-04T08:00:00+08:00'), { source: 'api-key', currency: 'CNY' }).partial, true)
})
check('invalid amount is rejected without polluting the ledger', () => {
  const before = ledger.today(bj('2026-10-30T13:00:00+08:00'), { source: 'api-key', currency: 'CNY' }).used
  assert.equal(ledger.observe({ at: bj('2026-10-30T14:00:00+08:00'), total: 'not-a-number', currency: 'CNY', source: 'api-key' }), null)
  assert.equal(ledger.today(bj('2026-10-30T13:00:00+08:00'), { source: 'api-key', currency: 'CNY' }).used, before)
})
check('currency separation: no cross-currency fallback', () => {
  const at = bj('2026-11-02T10:00:00+08:00')
  ledger.observe({ at, total: 5, currency: 'USD', source: 'account' })
  const summary = ledger.today(at, { source: 'api-key', currency: 'CNY' })
  assert.equal(summary.used, null)
  assert.equal(summary.currency, 'CNY')
})
check('corrupt ledger file does not throw and starts empty', () => {
  const file = path.join(SANDBOX_HOME, 'dsh-balance-pocket', 'ledger.json')
  fs.writeFileSync(file, '{ not json', 'utf8')
  const broken = createLedger(() => bj('2026-10-30T12:00:00+08:00'))
  const summary = broken.today(bj('2026-10-30T12:00:00+08:00'), null)
  assert.equal(summary.used, null)
  assert.equal(broken.observe({ at: bj('2026-10-30T12:00:00+08:00'), total: 1, currency: 'CNY', source: 'api-key' }) !== null, true)
})

// --- Host half loads -------------------------------------------------------
let host = null
try {
  host = await import(pathToFileURL(path.join(pluginDir, 'index.js')).href)
} catch (error) {
  results.push(['FAIL', 'Host half imports', error && error.message ? error.message : String(error)])
}
check('Host half exports apply + inject', () => {
  assert.ok(host, 'index.js failed to import')
  assert.equal(typeof host.apply, 'function')
  assert.deepEqual(host.inject, ['webServer'])
})

// --- wallet selection (pure, and the one place a missing field could be
// misread as "balance is zero") --------------------------------------------
check('api-key wallet: missing/null amounts are not read as 0', () => {
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [{ currency: 'CNY', total_balance: null }] }), null)
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [{ currency: 'CNY', total_balance: '' }] }), null)
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [{ currency: 'CNY' }] }), null)
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [] }), null)
  assert.equal(host.pickDeepSeekWallet(null), null)
})
check('api-key wallet: prefers a non-zero CNY wallet, then any non-zero, then CNY', () => {
  const cny = { currency: 'CNY', total_balance: '12.5' }
  const usdZero = { currency: 'USD', total_balance: 0 }
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [usdZero, cny] }), cny)
  const usd = { currency: 'USD', total_balance: 3 }
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [usd, cny] }), cny)
  assert.equal(host.pickDeepSeekWallet({ balance_infos: [{ currency: 'USD', total_balance: 0 }, usd] }), usd)
})
check('account wallets: bonus-only account is usable', () => {
  const picked = host.pickAccountWallets([], [{ currency: 'CNY', balance: 4.5 }])
  assert.equal(picked.total, 4.5)
  assert.equal(picked.recharge, 0)
  assert.equal(picked.bonus, 4.5)
})
check('account wallets: recharge and bonus of the same currency are summed', () => {
  const picked = host.pickAccountWallets(
    [{ currency: 'CNY', balance: 10 }, { currency: 'USD', balance: 99 }],
    [{ currency: 'CNY', balance: 2.5 }],
  )
  assert.equal(picked.currency, 'CNY')
  assert.equal(picked.recharge, 10)
  assert.equal(picked.bonus, 2.5)
  assert.equal(picked.total, 12.5)
})
check('account wallets: nothing usable means null, not 0', () => {
  assert.equal(host.pickAccountWallets([], []), null)
  assert.equal(host.pickAccountWallets(null, null), null)
  assert.equal(host.pickAccountWallets([{ currency: 'CNY', balance: null }], []), null)
})

// --- snapshot route through a fake Cordis ctx ------------------------------
function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value },
    end(body) { this.body = body === undefined ? '' : String(body) },
  }
}
function makeReq(overrides) {
  return Object.assign({ method: 'GET', headers: { host: '127.0.0.1:8313' } }, overrides || {})
}

let routeHandler = null
if (host && typeof host.apply === 'function') {
  const routes = []
  const fakeCtx = {
    effect(fn) { const dispose = fn(); return () => { if (typeof dispose === 'function') dispose() } },
    get() { return undefined },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  try {
    host.apply(fakeCtx)
    routeHandler = routes.length === 1 ? routes[0].handler : null
    check('host registers exactly one exact GET route', () => {
      assert.equal(routes.length, 1)
      assert.equal(routes[0].kind, 'exact')
      assert.equal(routes[0].path, '/dsh-balance-pocket/snapshot')
      assert.equal(typeof routes[0].handler, 'function')
    })
  } catch (error) {
    results.push(['FAIL', 'host registers the snapshot route', error && error.message ? error.message : String(error)])
  }
}

if (routeHandler) {
  await checkAsync('route rejects a non-loopback Host', async () => {
    const res = makeRes()
    await routeHandler(makeReq({ headers: { host: 'evil.example.com:8313' } }), res)
    assert.equal(res.statusCode, 403)
  })
  await checkAsync('route rejects sec-fetch-site: cross-site', async () => {
    const res = makeRes()
    await routeHandler(makeReq({ headers: { host: '127.0.0.1:8313', 'sec-fetch-site': 'cross-site' } }), res)
    assert.equal(res.statusCode, 403)
  })
  await checkAsync('route rejects a mismatched Origin', async () => {
    const res = makeRes()
    await routeHandler(makeReq({ headers: { host: '127.0.0.1:8313', origin: 'http://evil.example.com' } }), res)
    assert.equal(res.statusCode, 403)
  })
  await checkAsync('route answers 405 to POST', async () => {
    const res = makeRes()
    await routeHandler(makeReq({ method: 'POST' }), res)
    assert.equal(res.statusCode, 405)
  })
  await checkAsync('route answers HEAD with no body', async () => {
    const res = makeRes()
    await routeHandler(makeReq({ method: 'HEAD' }), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body, '')
  })
  await checkAsync('route answers 200 with the snapshot contract and no secret', async () => {
    const res = makeRes()
    await routeHandler(makeReq(), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['cache-control'], 'no-store')
    const payload = JSON.parse(res.body)
    assert.equal(payload.ok, true)
    assert.ok(payload.serverNowMs > 0)
    assert.equal(typeof payload.peak.isPeak, 'boolean')
    assert.equal(payload.peak.peakMultiplier, 2)
    assert.equal(typeof payload.peak.holidayCovered, 'boolean')
    assert.ok(Array.isArray(payload.peak.holidayYears) && payload.peak.holidayYears.length > 0)
    assert.ok(payload.today && typeof payload.today.day === 'string')
    assert.equal(payload.today.source, 'balance-observation')
    assert.ok(payload.balance && typeof payload.balance.available === 'boolean')
    assert.ok(payload.balance.available === true || typeof payload.balanceError === 'string')
    const text = JSON.stringify(payload).toLowerCase()
    for (const needle of ['sk-', 'bearer ', 'authorization', 'token']) {
      assert.ok(text.indexOf(needle) === -1, 'snapshot must not leak "' + needle + '"')
    }
  })
}

// --- Host trust fence delegation ------------------------------------------
// When the Harness exposes connection.requestRejection, the plugin delegates to
// it (it knows --trusted-host / reverse proxies) and fails CLOSED if it throws.
async function handlerWith(fence) {
  const routes = []
  const ctx = {
    effect(fn) { const dispose = fn(); return () => { if (typeof dispose === 'function') dispose() } },
    get(name) { return name === 'connection' ? fence : undefined },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  host.apply(ctx)
  return routes[0].handler
}

if (host && typeof host.apply === 'function') {
  await checkAsync('a trusted non-loopback Host is allowed when the Host fence vouches for it', async () => {
    const handler = await handlerWith({ requestRejection() { return null } })
    const res = makeRes()
    await handler(makeReq({ headers: { host: 'myhost.lan:8313' } }), res)
    assert.equal(res.statusCode, 200)
  })
  await checkAsync('a rejected request from the Host fence keeps its status code', async () => {
    const handler = await handlerWith({ requestRejection() { return 401 } })
    const res = makeRes()
    await handler(makeReq(), res)
    assert.equal(res.statusCode, 401)
  })
  await checkAsync('a throwing Host fence fails closed', async () => {
    const handler = await handlerWith({ requestRejection() { throw new Error('boom') } })
    const res = makeRes()
    await handler(makeReq(), res)
    assert.equal(res.statusCode, 403)
  })
  await checkAsync('cross-site stays rejected even when the fence is present', async () => {
    const handler = await handlerWith({ requestRejection() { return null } })
    const res = makeRes()
    await handler(makeReq({ headers: { host: 'myhost.lan:8313', 'sec-fetch-site': 'cross-site' } }), res)
    assert.equal(res.statusCode, 403)
  })
}

// --- Client half loads through a stubbed module loader ---------------------
let clientConfig = null
globalThis.window = { __ModuleLoader__: { load(config) { clientConfig = config } } }
const clientPath = path.join(pluginDir, 'client.js')
if (fs.existsSync(clientPath)) {
  try {
    await import(pathToFileURL(clientPath).href)
  } catch (error) {
    results.push(['FAIL', 'Client half imports', error && error.message ? error.message : String(error)])
  }
  check('Client half registers one module with a factory', () => {
    assert.ok(clientConfig, 'window.__ModuleLoader__.load was not called')
    assert.equal(clientConfig.id, 'dsh-balance-pocket')
    assert.equal(typeof clientConfig.factory, 'function')
  })
  check('Client factory returns apply + inject', () => {
    const stub = () => ({
      createElement() { return null },
      Fragment: 'fragment',
      useState() { return [undefined, () => {}] },
      useEffect() {},
      useLayoutEffect() {},
      useRef() { return { current: null } },
      useCallback(fn) { return fn },
      useMemo(fn) { return undefined },
      useSyncExternalStore() { return undefined },
      createContext() { return {} },
      useContext() { return {} },
    })
    const module = clientConfig.factory(stub)
    assert.ok(module && typeof module.apply === 'function')
    assert.ok(Array.isArray(module.inject))
    assert.ok(module.inject.includes('slots'))
    assert.ok(module.inject.includes('locale'))
  })
} else {
  results.push(['FAIL', 'Client half exists', 'plugin/client.js is missing'])
}

// --- Client render smoke test ---------------------------------------------
// No react-dom here, so the stub returns plain element nodes and the helpers
// below expand function components the way React would. That is enough to catch
// a missing STYLE key, a wrong handler wiring or a layout branch that throws.
if (clientConfig) {
  const captured = {}
  const capturedConfig = {}
  const now = Date.now()

  function elementStub() {
    return {
      createElement(type, props) {
        const children = Array.prototype.slice.call(arguments, 2)
        // React puts children on props too, and components such as SettingsCard
        // read them from there, so the stub has to mimic that shape.
        const merged = Object.assign({}, props || {})
        if (children.length === 1) merged.children = children[0]
        else if (children.length > 1) merged.children = children
        return { type: type, props: merged, children: children }
      },
      Fragment: 'fragment',
      useState(initial) {
        return [typeof initial === 'function' ? initial() : initial, function noop() {}]
      },
      useEffect() {},
      useLayoutEffect() {},
      useRef() {
        return { current: null }
      },
      useCallback(fn) {
        return fn
      },
      useMemo(fn) {
        return fn()
      },
      useSyncExternalStore(subscribe, getSnapshot) {
        return getSnapshot()
      },
      createContext() {
        return {}
      },
      useContext() {
        return {}
      },
    }
  }

  function texts(node, out) {
    out = out || []
    if (node === null || node === undefined || node === false || node === true) return out
    if (typeof node === 'string' || typeof node === 'number') {
      out.push(String(node))
      return out
    }
    if (Array.isArray(node)) {
      node.forEach((child) => texts(child, out))
      return out
    }
    if (typeof node !== 'object') return out
    if (typeof node.type === 'function') {
      texts(node.type(node.props), out)
      return out
    }
    node.children.forEach((child) => texts(child, out))
    return out
  }

  function find(node, predicate, out) {
    out = out || []
    if (node === null || node === undefined || node === false || node === true) return out
    if (Array.isArray(node)) {
      node.forEach((child) => find(child, predicate, out))
      return out
    }
    if (typeof node !== 'object') return out
    if (typeof node.type === 'function') {
      find(node.type(node.props), predicate, out)
      return out
    }
    if (predicate(node)) out.push(node)
    node.children.forEach((child) => find(child, predicate, out))
    return out
  }

  function dialogOf(tree) {
    return find(tree, (node) => node.props && node.props['data-dsh-balance-pocket'] === 'popover')[0]
  }

  const reactStub = elementStub()

  globalThis.document = {
    hidden: false,
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.window = {
    __ModuleLoader__: { load() {} },
    localStorage: {
      stored: null,
      getItem() {
        return this.stored
      },
      setItem(key, value) {
        this.stored = value
      },
      removeItem() {
        this.stored = null
      },
    },
    innerWidth: 1280,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
  }
  const payload = {
    ok: true,
    serverNowMs: now,
    balance: {
      available: true,
      total: 8.45,
      recharge: 8.45,
      bonus: 0,
      currency: 'CNY',
      source: 'account',
      updatedAtMs: now,
    },
    balanceError: null,
    peak: {
      isPeak: true,
      reason: 'peak',
      periodStartAtMs: now - 3600e3,
      nextChangeAtMs: now + 5400e3,
      nextIsPeak: false,
      peakMultiplier: 2,
    },
    today: {
      day: '2026-10-30',
      used: 1.41,
      currency: 'CNY',
      partial: true,
      observedFromMs: now - 7200e3,
      observedToMs: now,
      source: 'balance-observation',
    },
  }
  globalThis.fetch = async function () {
    return { ok: true, status: 200, json: async () => payload }
  }

  const module = clientConfig.factory(function requireStub() {
    return reactStub
  })
  const disposers = []
  const fakeCtx = {
    effect(fn) {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
      return function () {
        if (typeof dispose === 'function') dispose()
      }
    },
    get() {
      return undefined
    },
    slots: {
      inject(key, callback) {
        const dispose = callback()
        return function () {
          if (typeof dispose === 'function') dispose()
        }
      },
      register(config, component) {
        captured[config.id] = component
        capturedConfig[config.id] = config
        return function () {}
      },
    },
    locale: {
      register() {
        return function () {}
      },
      subscribe() {
        return function () {}
      },
      bind() {
        return null
      },
    },
  }
  const click = {
    preventDefault() {},
    stopPropagation() {},
  }

  await checkAsync('client apply registers all three slot occupants', async () => {
    module.apply(fakeCtx)
    assert.equal(typeof captured['balance-pocket'], 'function')
    assert.equal(typeof captured['balance-pocket-popover'], 'function')
    assert.equal(typeof captured['balance-pocket-settings'], 'function')
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  await checkAsync('settings.nav entry has a localized label and an order', async () => {
    const config = capturedConfig['balance-pocket-settings']
    assert.equal(config.name, 'settings.section')
    assert.equal(typeof config.order, 'number')
    assert.equal(typeof config.label, 'function')
    assert.equal(config.label(), '余额小口袋')
  })

  await checkAsync('settings page renders cards and a live preview', async () => {
    const page = captured['balance-pocket-settings']({ close() {} })
    const text = texts(page).join(' ')
    for (const needle of [
      '外观设置',
      '效果预览',
      '跟随主题',
      '磨砂',
      '亚克力',
      '版式',
      '今日已用',
      '距低峰',
      '实时',
      '设置同时作用于弹窗',
    ]) {
      assert.ok(text.indexOf(needle) >= 0, 'settings page missing: ' + needle)
    }
    assert.equal(find(page, (node) => node.type === 'section').length, 3)
    const preview = find(page, (node) => node.props && node.props['data-dsh-balance-pocket-preview'] === 'card')[0]
    assert.ok(preview, 'preview card missing')
    assert.ok(typeof preview.props.style.background === 'string')
    assert.ok(text.indexOf('¥8.45') >= 0, 'preview did not use the live balance')
    // The theme background needs neither an opacity nor a blur slider.
    assert.equal(find(page, (node) => node.type === 'input' && node.props.type === 'range').length, 0)
  })

  await checkAsync('the one preview reflects layout and display switches', async () => {
    let page = captured['balance-pocket-settings']({ close() {} })
    const previewOf = function (tree) {
      return find(tree, (node) => node.props && node.props['data-dsh-balance-pocket-preview'] === 'card')[0]
    }
    let preview = previewOf(page)
    assert.equal(preview.props['data-dsh-balance-pocket-preview-layout'], 'standard')
    let previewText = texts(preview).join(' ')
    assert.ok(previewText.indexOf('¥8.45') >= 0, 'preview lost the live amount')
    assert.ok(previewText.indexOf('账号登录') >= 0, 'preview lost the source label')
    assert.ok(previewText.indexOf('起观测') >= 0, 'preview lost the observation note')

    // Switching the layout re-renders the preview itself.
    const pick = function (label) {
      const option = find(
        captured['balance-pocket-settings']({ close() {} }),
        (node) => node.type === 'button' && texts(node).join('') === label
      )[0]
      assert.ok(option, 'layout option missing: ' + label)
      option.props.onClick(click)
    }
    pick('紧凑')
    page = captured['balance-pocket-settings']({ close() {} })
    assert.equal(previewOf(page).props['data-dsh-balance-pocket-preview-layout'], 'compact')
    pick('极简')
    page = captured['balance-pocket-settings']({ close() {} })
    preview = previewOf(page)
    assert.equal(preview.props['data-dsh-balance-pocket-preview-layout'], 'minimal')
    assert.ok(texts(preview).join(' ').indexOf('今日已用') === -1, 'minimal preview must not show the usage row')

    // Display switches are previewed as well.
    const toggle = function (index) {
      const switches = find(
        captured['balance-pocket-settings']({ close() {} }),
        (node) => node.props && node.props.role === 'switch'
      )
      assert.equal(switches.length, 3)
      switches[index].props.onClick(click)
    }
    toggle(0) // source off
    page = captured['balance-pocket-settings']({ close() {} })
    assert.ok(texts(previewOf(page)).join(' ').indexOf('账号登录') === -1, 'source still previewed when off')
    toggle(0) // source back on
    toggle(2) // seconds off
    page = captured['balance-pocket-settings']({ close() {} })
    const flat = texts(previewOf(page)).join('').replace(/\s+/g, '')
    assert.ok(/01:\d\d(?!:)/.test(flat), 'seconds still previewed when off: ' + flat)
    toggle(2) // seconds back on

    // Leave the page on the standard layout for the later checks.
    pick('标准')
  })

  await checkAsync('frosted background reveals sliders that write the preference', async () => {
    let page = captured['balance-pocket-settings']({ close() {} })
    const chip = find(page, (node) => node.type === 'button' && texts(node).join('') === '磨砂')[0]
    assert.ok(chip, 'frosted chip missing on the settings page')
    chip.props.onClick(click)
    page = captured['balance-pocket-settings']({ close() {} })
    const sliders = find(page, (node) => node.type === 'input' && node.props.type === 'range')
    assert.equal(sliders.length, 2)
    sliders[0].props.onChange({ target: { value: '55' } })
    const stored = JSON.parse(globalThis.window.localStorage.getItem('dsh-balance-pocket:appearance:v1'))
    assert.ok(Math.abs(stored.opacity - 0.55) < 1e-6, 'opacity slider did not persist')
    // Restore the theme look so later checks start from a known state.
    page = captured['balance-pocket-settings']({ close() {} })
    const themeChip = find(page, (node) => node.type === 'button' && texts(node).join('') === '跟随主题')[0]
    themeChip.props.onClick(click)
  })

  await checkAsync('balance view renders amount, usage and peak state', async () => {
    const button = find(captured['balance-pocket']({ wide: true }), (node) => node.type === 'button')[0]
    assert.ok(button, 'footer button did not render')
    button.props.onClick(click)
    const tree = captured['balance-pocket-popover']({})
    const dialog = dialogOf(tree)
    assert.ok(dialog, 'popover did not render')
    const text = texts(tree).join(' ')
    assert.ok(text.indexOf('¥8.45') >= 0, 'balance amount missing: ' + text)
    assert.ok(text.indexOf('¥1.41') >= 0, 'today usage missing: ' + text)
    assert.ok(text.indexOf('高峰期') >= 0, 'peak state missing: ' + text)
    // The countdown is split into a stable HH:MM part and a dim :SS part.
    const flat = text.replace(/\s+/g, '')
    assert.ok(/01:\d\d:\d\d/.test(flat), 'countdown missing: ' + flat)
  })

  await checkAsync('popover header exposes only refresh and close', async () => {
    const tree = captured['balance-pocket-popover']({})
    const labels = find(tree, (node) => node.type === 'button' && node.props['aria-label']).map(
      (node) => node.props['aria-label']
    )
    assert.deepEqual(labels, ['刷新', '关闭'])
  })

  await checkAsync('every background option applies without throwing', async () => {
    for (const label of ['纯色', '半透明', '磨砂', '透明', '亚克力', '跟随主题']) {
      const page = captured['balance-pocket-settings']({ close() {} })
      const chip = find(page, (node) => node.type === 'button' && texts(node).join('') === label)[0]
      assert.ok(chip, 'background chip missing: ' + label)
      chip.props.onClick(click)
      assert.ok(dialogOf(captured['balance-pocket-popover']({})), 'render failed for background ' + label)
    }
  })

  await checkAsync('solid background gets its own readable text tokens', async () => {
    const page = captured['balance-pocket-settings']({ close() {} })
    const chip = find(page, (node) => node.type === 'button' && texts(node).join('') === '纯色')[0]
    chip.props.onClick(click)
    const dialog = dialogOf(captured['balance-pocket-popover']({}))
    assert.equal(dialog.props['data-dsh-balance-pocket-background'], 'solid')
    assert.ok(typeof dialog.props.style['--dsw-alias-label-primary'] === 'string')
  })

  await checkAsync('frosted and acrylic add a backdrop filter', async () => {
    for (const label of ['磨砂', '亚克力']) {
      const page = captured['balance-pocket-settings']({ close() {} })
      const chip = find(page, (node) => node.type === 'button' && texts(node).join('') === label)[0]
      chip.props.onClick(click)
      const dialog = dialogOf(captured['balance-pocket-popover']({}))
      assert.ok(typeof dialog.props.style.backdropFilter === 'string', label + ' has no backdrop filter')
    }
  })

  await checkAsync('each layout renders on the balance view', async () => {
    const layouts = [
      ['紧凑', 'compact'],
      ['极简', 'minimal'],
      ['标准', 'standard'],
    ]
    for (const [label, key] of layouts) {
      const page = captured['balance-pocket-settings']({ close() {} })
      const chip = find(page, (node) => node.type === 'button' && texts(node).join('') === label)[0]
      assert.ok(chip, 'layout chip missing: ' + label)
      chip.props.onClick(click)
      const tree = captured['balance-pocket-popover']({})
      assert.equal(dialogOf(tree).props['data-dsh-balance-pocket-layout'], key)
      const text = texts(tree).join(' ')
      if (key === 'minimal') assert.ok(text.indexOf('今日已用') === -1, 'minimal layout must not show the usage row')
      else assert.ok(text.indexOf('今日已用') >= 0, key + ' lost the usage row')
    }
  })

  await checkAsync('appearance is persisted and restored', async () => {
    const stored = globalThis.window.localStorage.getItem('dsh-balance-pocket:appearance:v1')
    assert.ok(stored, 'appearance was not persisted')
    const parsed = JSON.parse(stored)
    assert.equal(parsed.layout, 'standard')
    assert.equal(parsed.background, 'acrylic')
    assert.equal(typeof parsed.opacity, 'number')
    assert.equal(typeof parsed.blur, 'number')
  })

  // The popover header's refresh button is the public way to re-read the snapshot.
  // The stub's effects are no-ops, so no poll runs here: close the card first
  // (which clears `loading`) and then hit refresh while it is still mounted for
  // its exit animation.
  const flush = function () {
    return new Promise((resolve) => setTimeout(resolve, 0))
  }
  const clickButton = function (tree, label) {
    const button = find(tree, (node) => node.type === 'button' && node.props['aria-label'] === label)[0]
    assert.ok(button, 'button missing: ' + label)
    button.props.onClick({ preventDefault() {}, stopPropagation() {} })
    return button
  }
  const loadWith = async function (snapshotPayload) {
    const original = globalThis.fetch
    globalThis.fetch = async function () {
      return { ok: true, status: 200, json: async () => snapshotPayload }
    }
    try {
      clickButton(captured['balance-pocket-popover']({}), '关闭')
      await flush()
      const button = clickButton(captured['balance-pocket-popover']({}), '刷新')
      assert.notEqual(button.props.disabled, true, 'refresh button should be enabled once the load settled')
      await flush()
      await flush()
    } finally {
      globalThis.fetch = original
    }
  }

  await checkAsync('a stale cached balance is labelled, not shown as live', async () => {
    const stalePayload = JSON.parse(JSON.stringify(payload))
    stalePayload.balance.stale = true
    stalePayload.balance.staleMs = 125000
    await loadWith(stalePayload)
    assert.ok(texts(captured['balance-pocket-popover']({})).join(' ').indexOf('延迟') >= 0, 'stale reading was not labelled')
    // Restore a live payload so later layout checks start from a known state.
    await loadWith(payload)
    assert.ok(texts(captured['balance-pocket-popover']({})).join(' ').indexOf('延迟') === -1, 'stale note survived a live reading')
  })

  await checkAsync('an uncovered holiday year is warned about', async () => {
    const uncovered = JSON.parse(JSON.stringify(payload))
    uncovered.peak.holidayCovered = false
    uncovered.peak.holidayYear = 2027
    await loadWith(uncovered)
    assert.ok(texts(captured['balance-pocket-popover']({})).join(' ').indexOf('节假日表未覆盖') >= 0, 'missing holiday coverage was not surfaced')
    await loadWith(payload)
    // Re-open the popover for the checks that follow.
    find(captured['balance-pocket']({ wide: true }), (node) => node.type === 'button')[0]
      .props.onClick({ preventDefault() {}, stopPropagation() {} })
    await flush()
  })

  // Dispose every registered effect (timers included) so the run can exit.
  disposers.forEach(function (dispose) {
    try {
      dispose()
    } catch (error) {
      // ignore disposal failures
    }
  })
}

// --- manifest / locales / icon --------------------------------------------
for (const [name, validate] of [
  ['package.json', (value) => {
    assert.equal(value.name, 'dsh-balance-pocket')
    assert.ok(value.exports['./client'])
    assert.ok(value.dsh && value.dsh.bundle && value.dsh.bundle.patch)
    assert.ok(value.dsh.client && value.dsh.client.platform === 'web')
    assert.ok(Array.isArray(value.files) && value.files.includes('client.js'))
    assert.ok(value.files.includes('README.md'))
  }],
  ['locale/en.json', (value) => assert.ok(value.meta && value.meta.title && value.meta.description)],
  ['locale/zh.json', (value) => assert.ok(value.meta && value.meta.title && value.meta.description)],
]) {
  check('valid ' + name, () => validate(loadJson(name)))
}
check('icon.svg is a plausible SVG', () => {
  const text = fs.readFileSync(path.join(pluginDir, 'icon.svg'), 'utf8')
  assert.ok(text.trimStart().startsWith('<svg'))
  assert.ok(text.includes('</svg>'))
  assert.ok(Buffer.byteLength(text, 'utf8') < 256 * 1024)
})
check('patch YAML mentions the package id', () => {
  const text = fs.readFileSync(path.join(pluginDir, 'cordis.patch.yml'), 'utf8')
  assert.ok(text.includes('dsh-balance-pocket'))
  assert.ok(text.includes('insert'))
})

// --- report ----------------------------------------------------------------
let failed = 0
for (const row of results) {
  if (row[0] === 'FAIL') failed += 1
  console.log(row[0] + '  ' + row[1] + (row[2] ? '  — ' + row[2] : ''))
}
console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed')
process.exitCode = failed === 0 ? 0 : 1
