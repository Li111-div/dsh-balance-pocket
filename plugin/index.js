/**
 * dsh-balance-pocket — Host half.
 *
 * Serves one read-only snapshot route the Client half polls:
 *   GET /dsh-balance-pocket/snapshot
 *     → { ok, serverNowMs, balance | balanceError, peak, today }
 *
 * Balance source priority (the same split DeepSeek itself documents):
 *  1. the configured `DEEPSEEK_API_KEY` credential → https://api.deepseek.com/user/balance
 *  2. the signed-in DSH DeepSeek account → ctx.deepseekAccount.getBalance()
 *     (recharge wallets + bonus wallets, summed per currency)
 * Neither route falls back to the other inside DeepSeek; here we do try both,
 * in that order, because the plugin's job is one number the user can trust.
 *
 * The key/token never leaves this file: no response field, no log line.
 *
 * Peak schedule lives in peak.js, today's spend bookkeeping in ledger.js.
 */

import { peakState } from './peak.js'
import { createLedger } from './ledger.js'

const VERSION = '0.1.0'
const ROUTE_PATH = '/dsh-balance-pocket/snapshot'
const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const FETCH_TIMEOUT_MS = 8000
const ACCOUNT_TIMEOUT_MS = 6000
const BALANCE_TTL_MS = 20000
const STALE_GRACE_MS = 10 * 60 * 1000
const BACKGROUND_OBSERVE_MS = 5 * 60 * 1000

/**
 * Extra authorities the snapshot route trusts beyond loopback, for a GUI opened
 * through a LAN address or a reverse proxy, e.g.
 * `DSH_BALANCE_POCKET_TRUSTED_HOSTS=myhost.lan:8313,proxy.example.com`.
 * Empty by default: a local desktop GUI only needs loopback.
 */
const TRUSTED_AUTHORITIES = String(process.env.DSH_BALANCE_POCKET_TRUSTED_HOSTS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean)

export const inject = ['webServer']

function messageOf(error) {
  if (!error) return '未知错误'
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return '超时'
  return '网络错误'
}

function optionalService(ctx, name) {
  try {
    return typeof ctx.get === 'function' ? ctx.get(name) : undefined
  } catch {
    return undefined
  }
}

function round6(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number * 1e6) / 1e6 : null
}

function pickDeepSeekWallet(data) {
  const infos = Array.isArray(data && data.balance_infos) ? data.balance_infos : []
  const usable = infos.filter((info) => info && Number.isFinite(Number(info.total_balance)))
  if (usable.length === 0) return null
  const isCny = (info) => String((info && info.currency) || '').toUpperCase() === 'CNY'
  const nonZero = usable.filter((info) => Number(info.total_balance) > 0)
  return nonZero.find(isCny) || nonZero[0] || usable.find(isCny) || usable[0]
}

function pickAccountWallets(value, bonusWallets) {
  const normal = (Array.isArray(value) ? value : []).filter((wallet) => wallet && Number.isFinite(Number(wallet.balance)))
  const bonus = (Array.isArray(bonusWallets) ? bonusWallets : []).filter((wallet) => wallet && Number.isFinite(Number(wallet.balance)))
  const all = normal.concat(bonus)
  if (all.length === 0) return null
  const currencyOf = (wallet) => String((wallet && wallet.currency) || 'CNY').toUpperCase()
  const nonZero = all.filter((wallet) => Number(wallet.balance) > 0)
  const picked = nonZero.find((wallet) => currencyOf(wallet) === 'CNY') ||
    nonZero[0] ||
    all.find((wallet) => currencyOf(wallet) === 'CNY') ||
    all[0]
  const currency = currencyOf(picked)
  const sumOf = (list) => list
    .filter((wallet) => currencyOf(wallet) === currency)
    .reduce((total, wallet) => total + Number(wallet.balance), 0)
  return {
    currency,
    recharge: round6(sumOf(normal)),
    bonus: round6(sumOf(bonus)),
    total: round6(sumOf(all)),
  }
}

function isLoopbackHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (!host) return false
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1') return true
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!match) return false
  if (Number(match[1]) !== 127) return false
  return [match[2], match[3], match[4]].every((part) => Number(part) <= 255)
}

/** The snapshot is local-only: a loopback (or explicitly trusted) Host and a same-origin/none Origin. */
function isTrustedRequest(req) {
  try {
    const headers = (req && req.headers) || {}
    const host = String(headers.host || '')
    if (!host) return false
    const parsed = new URL('http://' + host)
    if (!isLoopbackHostname(parsed.hostname) && !isTrustedAuthority(parsed)) return false
    const site = String(headers['sec-fetch-site'] || '').toLowerCase()
    if (site === 'cross-site') return false
    const origin = headers.origin
    if (typeof origin === 'string' && origin && origin !== 'null') {
      const originUrl = new URL(origin)
      if (originUrl.host.toLowerCase() !== parsed.host.toLowerCase()) return false
    }
    return true
  } catch {
    return false
  }
}

function isTrustedAuthority(parsed) {
  const authority = parsed.host.toLowerCase()
  const hostname = parsed.hostname.toLowerCase()
  return TRUSTED_AUTHORITIES.some((entry) => (entry.indexOf(':') >= 0 ? entry === authority : entry === hostname))
}

/**
 * @param {import('cordis').Context} ctx
 */
export function apply(ctx) {
  const ledger = createLedger()
  /** @type {{ at: number, value: object } | null} */
  let cached = null
  /** @type {Promise<object> | null} */
  let inflight = null

  function clientMetadata() {
    return {
      version: String(process.env.DSH_CLIENT_VERSION || process.env.DSH_VERSION || '') || VERSION,
      locale: String(process.env.DSH_LOCALE || '') || 'zh_CN',
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    }
  }

  async function tryApiKey() {
    const credentials = optionalService(ctx, 'credentials')
    if (!credentials || typeof credentials.resolve !== 'function') {
      return { status: 'missing', message: '当前 Harness 没有凭据服务' }
    }
    let credential
    try {
      credential = await credentials.resolve('DEEPSEEK_API_KEY')
    } catch {
      return { status: 'missing', message: '读取 DEEPSEEK_API_KEY 失败' }
    }
    if (!credential || !credential.value) return { status: 'missing', message: '未配置 DEEPSEEK_API_KEY' }

    let response
    try {
      response = await fetch(BALANCE_URL, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + credential.value, Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (error) {
      return { status: 'fail', message: '余额接口请求失败（' + messageOf(error) + '）' }
    }
    if (!response.ok) return { status: 'fail', message: '余额接口返回 HTTP ' + response.status }

    let data
    try {
      data = await response.json()
    } catch {
      return { status: 'fail', message: '余额接口返回了无法解析的数据' }
    }
    const wallet = pickDeepSeekWallet(data)
    if (!wallet) return { status: 'fail', message: '余额接口没有返回可用钱包' }
    const total = Number(wallet.total_balance)
    const toppedUp = Number(wallet.topped_up_balance)
    const granted = Number(wallet.granted_balance)
    return {
      status: 'ok',
      value: {
        available: true,
        total: round6(total),
        recharge: Number.isFinite(toppedUp) ? round6(toppedUp) : null,
        bonus: Number.isFinite(granted) ? round6(granted) : null,
        currency: String(wallet.currency || 'CNY').toUpperCase(),
        source: 'api-key',
        updatedAtMs: Date.now(),
      },
    }
  }

  async function tryAccount() {
    const account = optionalService(ctx, 'deepseekAccount')
    if (!account || typeof account.getBalance !== 'function') {
      return { status: 'missing', message: '当前 Harness 没有账号服务' }
    }
    const timeoutToken = { __timeout: true }
    let outcome
    try {
      outcome = await Promise.race([
        account.getBalance(clientMetadata()),
        new Promise((resolve) => {
          const timer = setTimeout(() => resolve(timeoutToken), ACCOUNT_TIMEOUT_MS)
          if (typeof timer.unref === 'function') timer.unref()
        }),
      ])
    } catch {
      return { status: 'fail', message: '账号余额接口调用失败' }
    }
    if (outcome === timeoutToken) return { status: 'fail', message: '账号余额请求超时' }
    if (!outcome) return { status: 'missing', message: '未登录 DeepSeek 账号' }
    if (outcome.status !== 'ready') return { status: 'fail', message: '账号余额接口未就绪' }
    const wallets = pickAccountWallets(outcome.value, outcome.bonusWallets)
    if (!wallets) return { status: 'fail', message: '账号没有可用的余额钱包' }
    return {
      status: 'ok',
      value: {
        available: true,
        total: wallets.total,
        recharge: wallets.recharge,
        bonus: wallets.bonus,
        currency: wallets.currency,
        source: 'account',
        updatedAtMs: Date.now(),
      },
    }
  }

  async function resolveBalance() {
    const apiKey = await tryApiKey()
    if (apiKey.status === 'ok') return apiKey.value
    const account = await tryAccount()
    if (account.status === 'ok') return account.value
    const apiKeyText = apiKey.status === 'missing'
      ? (apiKey.message || '未配置 DEEPSEEK_API_KEY')
      : 'API Key 路：' + (apiKey.message || '查询失败')
    const accountText = account.status === 'missing'
      ? (account.message || '未登录 DeepSeek 账号')
      : '账号登录路：' + (account.message || '查询失败')
    return { available: false, error: apiKeyText + '；' + accountText }
  }

  /**
   * Cached balance read. A transient network failure within the grace window
   * reuses the last good reading instead of flashing an error in the popover.
   */
  async function readBalance(force = false) {
    const now = Date.now()
    if (!force && cached && now - cached.at < BALANCE_TTL_MS) return cached.value
    if (inflight) return inflight
    inflight = (async () => {
      let value
      try {
        value = await resolveBalance()
      } catch {
        value = { available: false, error: '读取余额时发生未知错误' }
      }
      const at = Date.now()
      if (!value.available && cached && cached.value && cached.value.available && at - cached.at <= STALE_GRACE_MS) {
        // Keep the cached timestamp so the next request retries immediately.
        return { ...cached.value, stale: true, staleMs: at - cached.at }
      }
      cached = { at, value }
      if (value.available && Number.isFinite(Number(value.total))) {
        ledger.observe({ at: value.updatedAtMs || at, total: value.total, currency: value.currency, source: value.source })
      }
      return value
    })().finally(() => {
      inflight = null
    })
    return inflight
  }

  async function buildSnapshot() {
    const balance = await readBalance(false)
    // Sample the clock AFTER the (possibly slow) balance read so that
    // serverNowMs, the peak window and the ledger day all describe the same
    // instant the client receives; sampling before made the popover countdown
    // lag by one request (measured ~5s on the account route).
    const now = Date.now()
    const peak = peakState(now)
    const today = ledger.today(now, balance.available ? { source: balance.source, currency: balance.currency } : null)
    return {
      ok: true,
      serverNowMs: now,
      balance: balance.available
        ? {
            available: true,
            total: balance.total,
            recharge: balance.recharge === undefined ? null : balance.recharge,
            bonus: balance.bonus === undefined ? null : balance.bonus,
            currency: balance.currency,
            source: balance.source,
            updatedAtMs: balance.updatedAtMs === undefined ? null : balance.updatedAtMs,
            stale: Boolean(balance.stale),
            staleMs: balance.staleMs === undefined ? null : balance.staleMs,
          }
        : { available: false },
      balanceError: balance.available ? null : (balance.error || '读取不到余额'),
      peak,
      today,
    }
  }

  function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload)
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(body)
  }

  async function handleSnapshot(req, res) {
    if (!isTrustedRequest(req)) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('forbidden')
      return
    }
    const method = String((req && req.method) || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.end()
      return
    }
    let payload
    try {
      payload = await buildSnapshot()
    } catch {
      payload = { ok: false, serverNowMs: Date.now(), error: '生成余额快照失败，请稍后重试' }
    }
    if (method === 'HEAD') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end()
      return
    }
    sendJson(res, 200, payload)
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: handleSnapshot,
  }), 'dsh-balance-pocket: snapshot route')

  // Background observation keeps the "today used" book continuous even while
  // the popover is closed. One cheap GET every five minutes.
  ctx.effect(() => {
    const timer = setInterval(() => {
      readBalance(false).catch(() => {})
    }, BACKGROUND_OBSERVE_MS)
    if (typeof timer.unref === 'function') timer.unref()
    return () => clearInterval(timer)
  }, 'dsh-balance-pocket: background balance observer')
}
