window.__ModuleLoader__.load({
  id: 'dsh-balance-pocket',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------

    const BUTTON_ID = 'balance-pocket'
    const POPOVER_ID = 'balance-pocket-popover'
    const SNAPSHOT_URL = '/dsh-balance-pocket/snapshot'
    const POLL_INTERVAL_MS = 30000
    const POPOVER_WIDTH = 280
    const POPOVER_GAP = 8
    const VIEWPORT_EDGE = 8
    const MIN_SPACE_ABOVE = 180
    const Z_INDEX = 90

    // Mount/unmount animation for the card: a short rise/fall + scale so the
    // popover neither appears nor vanishes abruptly. Rendered as a
    // component-local <style> so unmounting removes it, and namespaced so it
    // cannot clash with the app's own keyframes.
    const POP_OUT_MS = 140
    const POP_IN_KEYFRAMES =
      '@keyframes dsh-bp-pop-in{from{opacity:0;transform:translateY(5px) scale(.965)}' +
      'to{opacity:1;transform:translateY(0) scale(1)}}'
    const POP_OUT_KEYFRAMES =
      '@keyframes dsh-bp-pop-out{from{opacity:1;transform:translateY(0) scale(1)}' +
      'to{opacity:0;transform:translateY(5px) scale(.965)}}'

    const COLOR = {
      bgOverlay: 'var(--dsw-alias-bg-overlay)',
      border: 'var(--dsw-alias-border-l1)',
      // Every colour is a theme token, so a theme plug-in that overrides these
      // CSS variables re-colours this card too; no literal colour is baked in.
      borderStrong: 'var(--dsw-alias-border-l2)',
      labelPrimary: 'var(--dsw-alias-label-primary)',
      labelSecondary: 'var(--dsw-alias-label-secondary)',
      labelTertiary: 'var(--dsw-alias-label-tertiary)',
      hover: 'var(--dsw-specific-sidebar-nav-item-hover)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      success: 'var(--dsw-alias-state-success-primary)',
    }

    // ------------------------------------------------------------------
    // Locale dictionaries
    // ------------------------------------------------------------------

    const DICTS = {
      zh: {
        title: 'DeepSeek 余额',
        balance: '余额',
        todayUsed: '今日已用',
        peak: '高峰期',
        offPeak: '低峰期',
        period: '时段',
        nextChangeIn: '距下次切换',
        refresh: '刷新',
        close: '关闭',
        loading: '加载中…',
        loadFailed: '读取失败',
        retry: '重试',
        sourceApiKey: 'API Key',
        sourceAccount: '账号登录',
        observedSince: '自 {time} 起观测',
        unavailable: '暂不可用',
        balanceUnavailable: '余额暂不可用',
        toPeak: '距高峰',
        toOffPeak: '距低峰',
        settings: '外观设置',
        settingsDesc: '余额小口袋弹窗的背景与版式，修改后立即生效，保存在当前浏览器。',
        settingsNav: '余额小口袋',
        preview: '效果预览',
        resetDefaults: '恢复默认',
        sectionBackground: '背景',
        bgTheme: '跟随主题',
        bgSolid: '纯色',
        bgTranslucent: '半透明',
        bgFrosted: '磨砂',
        bgTransparent: '透明',
        bgAcrylic: '亚克力',
        colorLabel: '颜色',
        opacityLabel: '不透明度',
        blurLabel: '模糊半径',
        sectionLayout: '版式',
        layoutStandard: '标准',
        layoutCompact: '紧凑',
        layoutMinimal: '极简',
        sectionDisplay: '显示',
        showSource: '来源标签',
        showObservedSince: '观测起点',
        showSeconds: '倒计时秒数',
        showSourceHint: '在金额下方标注余额来源',
        showObservedSinceHint: '今日已用从何时开始统计',
        showSecondsHint: '关闭后倒计时只显示 HH:MM',
        previewLive: '实时',
        previewHint: '设置同时作用于弹窗与侧栏入口，无需重启。',
      },
      en: {
        title: 'DeepSeek balance',
        balance: 'Balance',
        todayUsed: 'Used today',
        peak: 'Peak hours',
        offPeak: 'Off-peak',
        period: 'Period',
        nextChangeIn: 'Next switch in',
        refresh: 'Refresh',
        close: 'Close',
        loading: 'Loading…',
        loadFailed: 'Failed to load',
        retry: 'Retry',
        sourceApiKey: 'API key',
        sourceAccount: 'Account login',
        observedSince: 'Observed since {time}',
        unavailable: 'Unavailable',
        balanceUnavailable: 'Balance unavailable',
        toPeak: 'Until peak',
        toOffPeak: 'Until off-peak',
        settings: 'Appearance',
        settingsDesc: 'Background and layout of the balance popover. Changes apply instantly and are saved in this browser.',
        settingsNav: 'Balance Pocket',
        preview: 'Preview',
        resetDefaults: 'Reset',
        sectionBackground: 'Background',
        bgTheme: 'Theme',
        bgSolid: 'Solid',
        bgTranslucent: 'Translucent',
        bgFrosted: 'Frosted',
        bgTransparent: 'Transparent',
        bgAcrylic: 'Acrylic',
        colorLabel: 'Color',
        opacityLabel: 'Opacity',
        blurLabel: 'Blur',
        sectionLayout: 'Layout',
        layoutStandard: 'Standard',
        layoutCompact: 'Compact',
        layoutMinimal: 'Minimal',
        sectionDisplay: 'Show',
        showSource: 'Source label',
        showObservedSince: 'Observation start',
        showSeconds: 'Countdown seconds',
        showSourceHint: 'Name the balance source under the amount',
        showObservedSinceHint: "When today's usage started being observed",
        showSecondsHint: 'Off shows HH:MM only',
        previewLive: 'Live',
        previewHint: 'Applies to the popover and the sidebar entry instantly.',
      },
    }

    // ------------------------------------------------------------------
    // Appearance preferences (client-side: a per-browser look does not need a
    // Host round-trip or a plugin reload, so localStorage is enough)
    // ------------------------------------------------------------------

    const APPEARANCE_KEY = 'dsh-balance-pocket:appearance:v1'
    const BACKGROUNDS = ['theme', 'solid', 'translucent', 'frosted', 'transparent', 'acrylic']
    const LAYOUTS = ['standard', 'compact', 'minimal']
    const SOLID_PRESETS = ['#1f2126', '#2f3238', '#f5f6f7', '#1b2434', '#16241f']

    const DEFAULT_APPEARANCE = {
      background: 'theme',
      solidColor: '#1f2126',
      opacity: 0.82,
      blur: 14,
      layout: 'standard',
      showSource: true,
      showObservedSince: true,
      showSeconds: true,
    }

    function clampNumber(value, min, max, fallback) {
      const number = typeof value === 'number' && isFinite(value) ? value : fallback
      return Math.min(max, Math.max(min, number))
    }

    function normalizeAppearance(input) {
      const source = input && typeof input === 'object' ? input : {}
      const background = BACKGROUNDS.indexOf(source.background) >= 0 ? source.background : DEFAULT_APPEARANCE.background
      const layout = LAYOUTS.indexOf(source.layout) >= 0 ? source.layout : DEFAULT_APPEARANCE.layout
      const color =
        typeof source.solidColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(source.solidColor)
          ? source.solidColor
          : DEFAULT_APPEARANCE.solidColor
      return {
        background: background,
        solidColor: color,
        opacity: clampNumber(source.opacity, 0.25, 1, DEFAULT_APPEARANCE.opacity),
        blur: clampNumber(source.blur, 0, 32, DEFAULT_APPEARANCE.blur),
        layout: layout,
        showSource: source.showSource !== false,
        showObservedSince: source.showObservedSince !== false,
        showSeconds: source.showSeconds !== false,
      }
    }

    function loadAppearance() {
      try {
        const raw = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(APPEARANCE_KEY) : null
        if (!raw) return Object.assign({}, DEFAULT_APPEARANCE)
        return normalizeAppearance(JSON.parse(raw))
      } catch (error) {
        return Object.assign({}, DEFAULT_APPEARANCE)
      }
    }

    function persistAppearance(value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(value))
        }
      } catch (error) {
        // Blocked storage must never break the popover.
      }
    }

    /** Rough relative luminance, only used to pick readable text on a solid card. */
    function isLightHex(hex) {
      const value = typeof hex === 'string' ? hex.replace('#', '') : ''
      if (value.length !== 6) return false
      const r = parseInt(value.slice(0, 2), 16)
      const g = parseInt(value.slice(2, 4), 16)
      const b = parseInt(value.slice(4, 6), 16)
      if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return false
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6
    }

    /**
     * Surface style for the chosen background. Everything except an explicit
     * solid colour is derived from theme tokens — `color-mix` keeps the theme
     * tint while lowering its alpha — so a theme switch still re-colours the
     * card, and frosted/acrylic only add a backdrop filter on top.
     */
    function surfaceStyle(appearance) {
      const alpha = Math.round(clampNumber(appearance.opacity, 0.25, 1, DEFAULT_APPEARANCE.opacity) * 100)
      const tint = 'color-mix(in srgb, var(--dsw-alias-bg-overlay) ' + alpha + '%, transparent)'
      const style = {
        border: '1px solid ' + COLOR.borderStrong,
        borderRadius: 12,
      }
      if (appearance.background === 'solid') {
        // A user-picked solid surface cannot rely on the theme's text colours,
        // so scope the label/border aliases to this card and flip them for a
        // light or dark fill. Child styles keep reading the same tokens.
        const light = isLightHex(appearance.solidColor)
        style.background = appearance.solidColor
        style['--dsw-alias-label-primary'] = light ? '#1b1b1b' : '#f2f2f2'
        style['--dsw-alias-label-secondary'] = light ? '#55585d' : '#c3c6cb'
        style['--dsw-alias-label-tertiary'] = light ? '#83878d' : '#93979d'
        style['--dsw-alias-border-l1'] = light ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)'
        style['--dsw-alias-border-l2'] = light ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.24)'
        style['--dsw-specific-sidebar-nav-item-hover'] = light ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.09)'
        style['--dsw-alias-state-warn-primary'] = light ? '#a8600a' : '#f0a92f'
        style['--dsw-alias-state-success-primary'] = light ? '#1f7a3d' : '#4ad07f'
      } else if (appearance.background === 'translucent') {
        style.background = tint
      } else if (appearance.background === 'frosted') {
        style.background = tint
        style.backdropFilter = 'blur(' + appearance.blur + 'px) saturate(1.2)'
        style.WebkitBackdropFilter = style.backdropFilter
      } else if (appearance.background === 'acrylic') {
        style.background = tint
        style.backdropFilter = 'blur(' + appearance.blur + 'px) saturate(1.8) brightness(1.06)'
        style.WebkitBackdropFilter = style.backdropFilter
        style.backgroundImage =
          'linear-gradient(135deg, color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent), transparent 48%)'
      } else if (appearance.background === 'transparent') {
        style.background = 'transparent'
        style.border = '1px dashed ' + COLOR.borderStrong
      } else {
        style.background = COLOR.bgOverlay
      }
      return style
    }

    // ------------------------------------------------------------------
    // Module-level state
    // ------------------------------------------------------------------

    const initialState = {
      open: false,
      closing: false,
      anchor: null,
      sidebar: null,
      snapshot: null,
      loading: false,
      error: null,
      errorMessage: null,
      offsetMs: null,
      receivedAtMs: null,
      localeTick: 0,
      appearance: loadAppearance(),
    }

    let state = initialState
    const subscribers = new Set()

    const store = {
      get() {
        return state
      },
      set(patch) {
        if (!patch) return
        const next = typeof patch === 'function' ? patch(state) : patch
        if (!next) return
        state = Object.assign({}, state, next)
        subscribers.forEach(function (listener) {
          try {
            listener()
          } catch (error) {
            // A broken subscriber must not break the shared store.
          }
        })
      },
      subscribe(listener) {
        if (typeof listener !== 'function') return function noop() {}
        subscribers.add(listener)
        return function unsubscribe() {
          subscribers.delete(listener)
        }
      },
    }

    function updateAppearance(patch) {
      const next = normalizeAppearance(Object.assign({}, store.get().appearance, patch))
      store.set({ appearance: next })
      persistAppearance(next)
    }

    function resetAppearance() {
      const next = Object.assign({}, DEFAULT_APPEARANCE)
      store.set({ appearance: next })
      persistAppearance(next)
    }

    let pluginCtx = null
    let footerButtonEl = null
    let requestToken = 0
    let lastOverdueFetchAtMs = 0
    let closeTimer = null

    // ------------------------------------------------------------------
    // i18n
    // ------------------------------------------------------------------

    function t(key, params) {
      let text = key
      const locale = pluginCtx && pluginCtx.locale ? pluginCtx.locale : null
      if (locale && typeof locale.bind === 'function') {
        try {
          const translate = locale.bind('balancePocket')
          if (typeof translate === 'function') {
            const translated = translate(key, params)
            if (typeof translated === 'string' && translated.length > 0) text = translated
          }
        } catch (error) {
          text = key
        }
      }
      if (text === key) {
        const fallback = DICTS.zh
        if (fallback && typeof fallback[key] === 'string') text = fallback[key]
      }
      if (params && typeof text === 'string') {
        Object.keys(params).forEach(function (name) {
          text = text.split('{' + name + '}').join(String(params[name]))
        })
      }
      return text
    }

    // ------------------------------------------------------------------
    // Formatting helpers
    // ------------------------------------------------------------------

    function formatMoney(value, currency) {
      if (typeof value !== 'number' || !isFinite(value)) return null
      const negative = value < 0
      const text = Math.abs(value).toFixed(2)
      const code = typeof currency === 'string' ? currency.toUpperCase() : ''
      const symbol = code === 'USD' ? '$' : '¥'
      return (negative ? '-' : '') + symbol + text
    }

    function pad2(value) {
      return value < 10 ? '0' + value : String(value)
    }

    function formatClock(ms) {
      if (typeof ms !== 'number' || !isFinite(ms)) return ''
      const date = new Date(ms)
      return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
    }

    /**
     * Countdown split into a stable main part (HH:MM) and the seconds, so the
     * ticking digits get a dimmer, fixed-width slot: the row never reflows and
     * the number does not compete with the minute part.
     */
    function formatCountdownParts(ms) {
      if (typeof ms !== 'number' || !isFinite(ms)) return { main: '\u2014', seconds: '' }
      const totalSeconds = Math.max(0, Math.floor(ms / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor(totalSeconds / 60) % 60
      const seconds = totalSeconds % 60
      return { main: pad2(hours) + ':' + pad2(minutes), seconds: pad2(seconds) }
    }

    /** Flat "HH:MM[:SS]" rendering used by the compact and minimal layouts. */
    function countdownText(parts, showSeconds) {
      if (!parts) return '\u2014'
      return showSeconds && parts.seconds ? parts.main + ':' + parts.seconds : parts.main
    }

    // ------------------------------------------------------------------
    // Data loading
    // ------------------------------------------------------------------

    function loadSnapshot() {
      const token = ++requestToken
      store.set({ loading: true })

      let pending
      try {
        if (typeof fetch !== 'function') throw new Error('fetch is unavailable')
        pending = fetch(SNAPSHOT_URL, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
      } catch (error) {
        if (token === requestToken) {
          store.set({ loading: false, error: 'network', errorMessage: null })
        }
        return
      }

      pending
        .then(function (response) {
          if (!response || response.ok !== true) {
            throw new Error('HTTP ' + (response && response.status ? response.status : 'error'))
          }
          return response.json()
        })
        .then(function (data) {
          if (token !== requestToken) return
          const receivedAtMs = Date.now()
          if (!data || typeof data !== 'object') throw new Error('invalid snapshot payload')
          if (data.ok === false) {
            const message = typeof data.error === 'string' && data.error ? data.error : null
            store.set({ loading: false, error: 'snapshot', errorMessage: message })
            return
          }
          const serverNowMs =
            typeof data.serverNowMs === 'number' && isFinite(data.serverNowMs) ? data.serverNowMs : receivedAtMs
          store.set({
            loading: false,
            error: null,
            errorMessage: null,
            snapshot: data,
            offsetMs: serverNowMs - receivedAtMs,
            receivedAtMs: receivedAtMs,
          })
        })
        .catch(function (error) {
          if (token !== requestToken) return
          store.set({
            loading: false,
            error: 'network',
            errorMessage: error && error.message ? String(error.message) : null,
          })
        })
    }

    // ------------------------------------------------------------------
    // Anchor / placement
    // ------------------------------------------------------------------

    function measureFooterButton() {
      if (!footerButtonEl || typeof footerButtonEl.getBoundingClientRect !== 'function') return null
      const rect = footerButtonEl.getBoundingClientRect()
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
    }

    /**
     * The sidebar column the entry lives in. Walk up to the enclosing column
     * (left-anchored, column-shaped, narrower than the app): the popover must
     * stay inside it so it reads as part of the panel instead of floating over
     * the conversation.
     */
    function measureSidebar(buttonEl) {
      if (!buttonEl || typeof buttonEl.getBoundingClientRect !== 'function') return null
      let node = buttonEl.parentElement
      let found = null
      for (let depth = 0; node && depth < 10; depth += 1) {
        if (typeof node.getBoundingClientRect === 'function') {
          const rect = node.getBoundingClientRect()
          if (rect.left <= 40 && rect.width >= 48 && rect.width <= 520 && rect.height > 180) {
            found = { left: rect.left, right: rect.right, width: rect.width, top: rect.top, height: rect.height }
          }
        }
        node = node.parentElement
      }
      return found
    }

    function refreshAnchor() {
      const anchor = measureFooterButton()
      const sidebar = measureSidebar(footerButtonEl)
      const patch = {}
      if (anchor) patch.anchor = anchor
      if (sidebar) patch.sidebar = sidebar
      if (Object.keys(patch).length > 0) store.set(patch)
      return anchor
    }

    function computePlacement(anchor, sidebar) {
      const viewportWidth = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024
      const viewportHeight = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 768
      const side = sidebar && typeof sidebar.width === 'number' ? sidebar : null
      const rail = side !== null && side.width < 120
      // Expanded sidebar: keep the whole card inside the column. 56px rail:
      // there is no room, so use the standalone width.
      const width = side !== null && !rail
        ? Math.max(240, Math.min(POPOVER_WIDTH, side.width - 2 * VIEWPORT_EDGE))
        : Math.min(POPOVER_WIDTH, viewportWidth - 2 * VIEWPORT_EDGE)
      const anchorLeft = anchor && typeof anchor.left === 'number' ? anchor.left : VIEWPORT_EDGE
      const anchorTop = anchor && typeof anchor.top === 'number' ? anchor.top : viewportHeight - 40
      const anchorBottom = anchor && typeof anchor.bottom === 'number' ? anchor.bottom : viewportHeight - 8
      let minLeft = VIEWPORT_EDGE
      let maxLeft = viewportWidth - width - VIEWPORT_EDGE
      if (side !== null && !rail) {
        minLeft = Math.max(VIEWPORT_EDGE, side.left + VIEWPORT_EDGE)
        maxLeft = Math.min(maxLeft, side.right - width - VIEWPORT_EDGE)
      }
      if (maxLeft < minLeft) maxLeft = minLeft
      const left = Math.max(minLeft, Math.min(anchorLeft, maxLeft))
      const spaceAbove = anchorTop - POPOVER_GAP

      if (spaceAbove < MIN_SPACE_ABOVE) {
        const top = Math.max(VIEWPORT_EDGE, anchorBottom + POPOVER_GAP)
        return {
          position: 'fixed',
          left: left,
          top: top,
          bottom: 'auto',
          width: width,
          maxHeight: Math.max(120, viewportHeight - top - VIEWPORT_EDGE),
          transformOrigin: 'center top',
        }
      }

      const bottom = Math.max(VIEWPORT_EDGE, viewportHeight - anchorTop + POPOVER_GAP)
      return {
        position: 'fixed',
        left: left,
        bottom: bottom,
        top: 'auto',
        width: width,
        maxHeight: Math.max(120, spaceAbove - VIEWPORT_EDGE),
        transformOrigin: 'center bottom',
      }
    }

    // ------------------------------------------------------------------
    // Open / close
    // ------------------------------------------------------------------

    function cancelCloseTimer() {
      if (closeTimer !== null) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
    }

    function closePopover() {
      const current = store.get()
      if (current.open !== true) return
      // Play the same motion in reverse: keep the card mounted for the exit
      // animation, then unmount it so the overlay layer is left clean.
      store.set({ open: false, closing: true, loading: false })
      cancelCloseTimer()
      closeTimer = setTimeout(function () {
        closeTimer = null
        if (store.get().open === true) return
        store.set({ closing: false })
      }, POP_OUT_MS)
    }

    function togglePopover() {
      if (store.get().open === true) {
        closePopover()
        return
      }
      cancelCloseTimer()
      refreshAnchor()
      store.set({ open: true, closing: false, loading: true, error: null, errorMessage: null })
    }


    // ------------------------------------------------------------------
    // Shared React hook
    // ------------------------------------------------------------------

    function useStoreState() {
      return React.useSyncExternalStore(store.subscribe, store.get, store.get)
    }

    // ------------------------------------------------------------------
    // Styles
    // ------------------------------------------------------------------

    const STYLE = {
      // Header: one 13px/600 title on the left, quiet 24px icon targets right.
      header: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '10px 12px 10px 16px',
        borderBottom: '1px solid ' + COLOR.border,
      },
      headerTitle: {
        flex: '1 1 auto',
        minWidth: 0,
        marginRight: 4,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: '20px',
        color: COLOR.labelPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      body: {
        padding: '14px 16px 16px',
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: 0,
      },
      // Tier 1 — the balance is the only 28px element in the card.
      bigMoney: {
        fontSize: 28,
        lineHeight: '34px',
        fontWeight: 650,
        letterSpacing: '-0.02em',
        color: COLOR.labelPrimary,
        fontVariantNumeric: 'tabular-nums',
      },
      // Tier 3 — state and source read as one quiet caption under the amount.
      metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        minHeight: 16,
        flexWrap: 'wrap',
      },
      metaDot: { width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto' },
      metaStatus: { fontSize: 11, lineHeight: '16px', fontWeight: 600, whiteSpace: 'nowrap' },
      metaText: { fontSize: 11, lineHeight: '16px', color: COLOR.labelTertiary, whiteSpace: 'nowrap' },
      metaSeparator: { fontSize: 11, lineHeight: '16px', color: COLOR.labelTertiary },
      // Metrics sit under one hairline, so the hero block keeps the focus.
      // The rule is pulled out to the card edges (body padding is 16px) so it
      // is exactly as long as the header rule, while the rows stay inset.
      metrics: {
        marginTop: 14,
        marginLeft: -16,
        marginRight: -16,
        paddingTop: 12,
        paddingLeft: 16,
        paddingRight: 16,
        borderTop: '1px solid ' + COLOR.border,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      },
      metric: { display: 'flex', flexDirection: 'column' },
      // Tier 2 — label/value rows share one baseline and one right edge.
      row: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        minHeight: 22,
      },
      label: {
        fontSize: 12,
        lineHeight: '18px',
        fontWeight: 500,
        color: COLOR.labelSecondary,
        whiteSpace: 'nowrap',
      },
      value: {
        fontSize: 13,
        lineHeight: '18px',
        fontWeight: 600,
        color: COLOR.labelPrimary,
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        whiteSpace: 'nowrap',
      },
      // Ticking seconds: dimmer + tabular, so the countdown never reflows.
      valueSeconds: {
        fontSize: 11,
        lineHeight: '18px',
        fontWeight: 600,
        color: COLOR.labelTertiary,
        fontVariantNumeric: 'tabular-nums',
      },
      // Qualifies the value above it, so it hangs under the value column.
      note: {
        marginTop: 2,
        fontSize: 11,
        lineHeight: '14px',
        color: COLOR.labelTertiary,
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
      },
      // --- Option chips (settings page) -----------------------------------
      segmentRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
      segment: {
        appearance: 'none',
        border: '1px solid ' + COLOR.border,
        borderRadius: 999,
        background: 'transparent',
        color: COLOR.labelSecondary,
        font: 'inherit',
        fontSize: 11,
        lineHeight: '16px',
        padding: '4px 10px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
      },
      segmentActive: {
        background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent)',
        borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent)',
        color: COLOR.labelPrimary,
        fontWeight: 600,
      },
      swatchRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
      swatch: {
        width: 20,
        height: 20,
        padding: 0,
        borderRadius: 6,
        border: '1px solid ' + COLOR.borderStrong,
        cursor: 'pointer',
        outline: 'none',
        boxSizing: 'border-box',
      },
      colorInput: {
        width: 24,
        height: 20,
        padding: 0,
        border: '1px solid ' + COLOR.borderStrong,
        borderRadius: 6,
        background: 'transparent',
        cursor: 'pointer',
      },
      switchTrack: {
        width: 32,
        height: 18,
        borderRadius: 999,
        border: '1px solid ' + COLOR.borderStrong,
        background: 'transparent',
        padding: 2,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        outline: 'none',
        flex: '0 0 auto',
        boxSizing: 'border-box',
        transition: 'background-color 160ms ease, border-color 160ms ease',
      },
      switchTrackOn: {
        background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, transparent)',
        borderColor: 'transparent',
      },
      switchKnob: {
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: COLOR.labelSecondary,
        transition: 'transform 160ms ease, background-color 160ms ease',
      },
      switchKnobOn: {
        background: 'var(--dsw-alias-label-primary-inverted)',
        transform: 'translateX(14px)',
      },
      // --- Settings page (settings.section occupant) ----------------------
      settingsPage: { padding: '20px 24px 28px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 },
      settingsPageHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
      settingsPageHeadText: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
      settingsPageTitle: {
        fontSize: 16,
        lineHeight: '24px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: COLOR.labelPrimary,
      },
      settingsPageDesc: { fontSize: 12, lineHeight: '18px', color: COLOR.labelTertiary, maxWidth: 460 },
      settingsPageBody: { display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 18, alignItems: 'flex-start' },
      settingsPageMain: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: '1 1 320px',
        minWidth: 280,
        maxWidth: 460,
      },
      settingsPageAside: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: '1 1 240px',
        minWidth: 210,
        maxWidth: 300,
        position: 'sticky',
        top: 0,
      },
      sectionCard: {
        border: '1px solid ' + COLOR.border,
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1, transparent)',
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
      },
      sectionCardHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
      sectionCardTitle: {
        fontSize: 12,
        lineHeight: '18px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: COLOR.labelPrimary,
      },
      sectionCardHint: { fontSize: 11, lineHeight: '16px', color: COLOR.labelTertiary },
      optionGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
      optionChip: {
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        border: '1px solid ' + COLOR.border,
        background: 'transparent',
        color: COLOR.labelSecondary,
        font: 'inherit',
        fontSize: 12,
        lineHeight: '16px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
      },
      optionChipActive: {
        background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent)',
        borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent)',
        color: COLOR.labelPrimary,
        fontWeight: 600,
      },
      optionDot: {
        width: 10,
        height: 10,
        borderRadius: 4,
        border: '1px solid ' + COLOR.borderStrong,
        flex: '0 0 auto',
        boxSizing: 'border-box',
      },
      optionGlyph: {
        width: 12,
        height: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        color: 'inherit',
      },
      sliderField: { display: 'flex', flexDirection: 'column', gap: 4 },
      sliderFieldHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
      fieldLabel: { fontSize: 11, lineHeight: '16px', color: COLOR.labelSecondary },
      fieldValue: {
        fontSize: 11,
        lineHeight: '16px',
        fontWeight: 600,
        color: COLOR.labelPrimary,
        fontVariantNumeric: 'tabular-nums',
      },
      sliderFieldInput: { width: '100%', margin: 0, accentColor: 'var(--dsw-alias-brand-primary)' },
      toggleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 34,
      },
      toggleRowDivider: { borderTop: '1px solid ' + COLOR.border },
      toggleRowText: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
      toggleRowLabel: { fontSize: 12, lineHeight: '18px', color: COLOR.labelPrimary },
      toggleRowHint: { fontSize: 11, lineHeight: '16px', color: COLOR.labelTertiary },
      previewFrame: {
        borderRadius: 12,
        boxSizing: 'border-box',
        width: '100%',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      },
      previewHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px 0',
      },
      previewTitle: {
        fontSize: 11,
        lineHeight: '16px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: COLOR.labelSecondary,
      },
      previewBody: { padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
      previewMoney: {
        fontSize: 26,
        lineHeight: '32px',
        fontWeight: 650,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.labelPrimary,
      },
      previewMetaRow: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 16 },
      previewRule: { height: 1, background: COLOR.border, margin: '4px 0 2px' },
      previewRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
      previewLabel: { fontSize: 11, lineHeight: '16px', color: COLOR.labelSecondary },
      previewValue: {
        fontSize: 12,
        lineHeight: '16px',
        fontWeight: 600,
        color: COLOR.labelPrimary,
        fontVariantNumeric: 'tabular-nums',
      },
      previewHint: { fontSize: 11, lineHeight: '16px', color: COLOR.labelTertiary },
      previewCompactTop: { display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
      previewCompactMoney: {
        fontSize: 18,
        lineHeight: '22px',
        fontWeight: 650,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.labelPrimary,
      },
      previewCells: { display: 'flex', gap: 16, marginTop: 6 },
      previewCell: { display: 'flex', flexDirection: 'column', minWidth: 0 },
      previewCellLabel: { fontSize: 10, lineHeight: '14px', color: COLOR.labelTertiary, whiteSpace: 'nowrap' },
      previewMinimalRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
      },
      previewMinimalMoney: {
        fontSize: 17,
        lineHeight: '22px',
        fontWeight: 650,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.labelPrimary,
      },
      previewMinimalMeta: {
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        fontSize: 10,
        lineHeight: '14px',
        color: COLOR.labelSecondary,
        whiteSpace: 'nowrap',
      },
      previewNote: { fontSize: 10, lineHeight: '14px', color: COLOR.labelTertiary, textAlign: 'right' },
      // --- Compact / minimal layouts --------------------------------------
      compactTop: { display: 'flex', alignItems: 'baseline', gap: 8 },
      compactMoney: {
        fontSize: 22,
        lineHeight: '28px',
        fontWeight: 650,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.labelPrimary,
      },
      compactCells: { display: 'flex', gap: 18, marginTop: 8 },
      compactCell: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
      compactCellLabel: { fontSize: 11, lineHeight: '14px', color: COLOR.labelTertiary, whiteSpace: 'nowrap' },
      minimalRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        minHeight: 26,
      },
      minimalMoney: {
        fontSize: 20,
        lineHeight: '26px',
        fontWeight: 650,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.labelPrimary,
      },
      minimalMeta: { fontSize: 11, lineHeight: '16px', color: COLOR.labelSecondary, whiteSpace: 'nowrap' },
      empty: {
        padding: '18px 0',
        textAlign: 'center',
        fontSize: 12,
        color: COLOR.labelTertiary,
      },
      errorTitle: {
        color: COLOR.labelPrimary,
      },
      errorDetail: {
        marginTop: 4,
        fontSize: 11,
        color: COLOR.labelTertiary,
        lineHeight: 1.4,
        wordBreak: 'break-word',
      },
      retryBox: {
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      },
    }

    // ------------------------------------------------------------------
    // Icons
    // ------------------------------------------------------------------

    function WalletIcon() {
      return h(
        'svg',
        {
          width: 24,
          height: 24,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', flex: 'none' },
        },
        h('path', { d: 'M3.25 8.5v8.25A2.25 2.25 0 0 0 5.5 19h13a2.25 2.25 0 0 0 2.25-2.25V8.5' }),
        h('path', { d: 'M3.25 8.5A2.25 2.25 0 0 1 5.5 6.25h11.75A2.25 2.25 0 0 1 19.5 8.5v.75' }),
        h('circle', { cx: 16, cy: 13.25, r: 1.1 })
      )
    }

    function RefreshIcon() {
      return h(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }),
        h('path', { d: 'M20 4v4h-4' })
      )
    }

    function CloseIcon() {
      return h(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M6 6l12 12' }),
        h('path', { d: 'M18 6L6 18' })
      )
    }

    // ------------------------------------------------------------------
    // Small components
    // ------------------------------------------------------------------

    function resolveWide(props) {
      if (!props || typeof props !== 'object') return false
      if (typeof props.wide === 'boolean') return props.wide
      if (props.ownerProps && typeof props.ownerProps.wide === 'boolean') return props.ownerProps.wide
      return false
    }

    function IconButton(props) {
      const hoveredState = React.useState(false)
      const hovered = hoveredState[0]
      const setHovered = hoveredState[1]
      const disabled = props.disabled === true

      const style = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        padding: 0,
        border: 'none',
        borderRadius: 6,
        background: hovered && !disabled ? COLOR.hover : 'transparent',
        color: disabled ? COLOR.labelTertiary : COLOR.labelSecondary,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'default' : 'pointer',
        font: 'inherit',
        outline: 'none',
        flex: '0 0 auto',
      }

      return h(
        'button',
        {
          type: 'button',
          'aria-label': props.label,
          title: props.label,
          disabled: disabled,
          onClick: function (event) {
            event.preventDefault()
            event.stopPropagation()
            if (!disabled && typeof props.onClick === 'function') props.onClick()
          },
          onMouseEnter: function () {
            setHovered(true)
          },
          onMouseLeave: function () {
            setHovered(false)
          },
          style: style,
        },
        props.icon === 'refresh' ? RefreshIcon() : CloseIcon()
      )
    }

    function RetryButton(props) {
      const hoveredState = React.useState(false)
      const hovered = hoveredState[0]
      const setHovered = hoveredState[1]

      return h(
        'button',
        {
          type: 'button',
          onClick: function (event) {
            event.preventDefault()
            event.stopPropagation()
            if (typeof props.onClick === 'function') props.onClick()
          },
          onMouseEnter: function () {
            setHovered(true)
          },
          onMouseLeave: function () {
            setHovered(false)
          },
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            height: 24,
            padding: '0 10px',
            borderRadius: 6,
            border: '1px solid ' + COLOR.border,
            background: hovered ? COLOR.hover : 'transparent',
            color: COLOR.labelPrimary,
            font: 'inherit',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
            flex: '0 0 auto',
          },
        },
        props.label
      )
    }

    // ------------------------------------------------------------------
    // Sidebar footer entry button
    // ------------------------------------------------------------------

    function BalanceButton(props) {
      const snapshot = useStoreState()
      const hoveredState = React.useState(false)
      const hovered = hoveredState[0]
      const setHovered = hoveredState[1]
      const pressedState = React.useState(false)
      const pressed = pressedState[0]
      const setPressed = pressedState[1]

      const wide = resolveWide(props)
      const open = snapshot.open === true
      const peak = snapshot.snapshot && snapshot.snapshot.peak ? snapshot.snapshot.peak : null
      const dotColor = peak
        ? peak.isPeak === true
          ? COLOR.warn
          : COLOR.success
        : COLOR.labelTertiary
      const balance =
        snapshot.snapshot && snapshot.snapshot.balance && snapshot.snapshot.balance.available === true
          ? snapshot.snapshot.balance
          : null
      const amountText = balance ? formatMoney(balance.total, balance.currency) : null
      const label = t('title')

      React.useEffect(
        function () {
          if (store.get().open === true) refreshAnchor()
        },
        [wide, open]
      )

      const buttonStyle = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: wide ? 'flex-start' : 'center',
        gap: 8,
        boxSizing: 'border-box',
        width: wide ? '100%' : 32,
        minWidth: 32,
        height: 32,
        padding: wide ? '0 9px' : 0,
        margin: 0,
        border: 'none',
        borderRadius: 8,
        background: hovered || open ? COLOR.hover : 'transparent',
        color: COLOR.labelSecondary,
        font: 'inherit',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        outline: 'none',
        // Press feedback: a quick squat so the click does not feel stiff.
        transform: pressed ? 'scale(0.94)' : 'scale(1)',
        transformOrigin: 'center',
        transition: 'background-color 120ms ease, transform 90ms ease',
        WebkitTapHighlightColor: 'transparent',
      }

      const children = [h(WalletIcon)]
      if (wide) {
        children.push(
          h(
            'span',
            {
              style: {
                fontSize: 12,
                color: 'inherit',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: '0 1 auto',
              },
            },
            t('balance')
          ),
          h('span', {
            'aria-hidden': 'true',
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              flex: '0 0 auto',
              marginLeft: -2,
            },
          }),
          h('span', { 'aria-hidden': 'true', style: { flex: '1 1 auto' } })
        )
        // The amount is visible without opening anything, as asked.
        if (amountText) {
          children.push(
            h(
              'span',
              {
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLOR.labelPrimary,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                },
              },
              amountText
            )
          )
        }
      } else {
        children.push(
          h('span', {
            'aria-hidden': 'true',
            style: {
              position: 'absolute',
              top: 2,
              right: 2,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              pointerEvents: 'none',
            },
          })
        )
      }

      return h(
        'button',
        {
          ref: function (element) {
            footerButtonEl = element
          },
          type: 'button',
          'aria-label': amountText ? label + ' ' + amountText : label,
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          title: amountText ? label + ' · ' + amountText : label,
          'data-dsh-balance-pocket': 'button',
          onClick: function (event) {
            event.preventDefault()
            event.stopPropagation()
            togglePopover()
          },
          onPointerDown: function () {
            setPressed(true)
          },
          onPointerUp: function () {
            setPressed(false)
          },
          onPointerCancel: function () {
            setPressed(false)
          },
          onPointerLeave: function () {
            setPressed(false)
            setHovered(false)
          },
          onMouseEnter: function () {
            setHovered(true)
          },
          onMouseLeave: function () {
            setHovered(false)
          },
          onBlur: function () {
            setPressed(false)
          },
          style: buttonStyle,
        },
        ...children
      )
    }

    // ------------------------------------------------------------------
    // Popover (shell.overlay occupant)
    // ------------------------------------------------------------------

    function BalancePopover() {
      const snapshot = useStoreState()
      const tickState = React.useState(0)
      const forceTick = tickState[1]
      const popoverRef = React.useRef(null)

      const open = snapshot.open === true
      const offsetMs = typeof snapshot.offsetMs === 'number' ? snapshot.offsetMs : 0
      const serverNowMs = Date.now() + offsetMs
      const appearance = snapshot.appearance && typeof snapshot.appearance === 'object'
        ? snapshot.appearance
        : DEFAULT_APPEARANCE
      const layout =
        appearance.layout === 'compact' ? 'compact' : appearance.layout === 'minimal' ? 'minimal' : 'standard'

      // Poll while open: fetch immediately, then every 30s. Closing stops
      // the poll and invalidates any in-flight response.
      React.useEffect(
        function () {
          if (!open) return undefined
          loadSnapshot()
          const pollTimer = setInterval(function () {
            loadSnapshot()
          }, POLL_INTERVAL_MS)
          return function () {
            clearInterval(pollTimer)
            requestToken += 1
            store.set({ loading: false })
          }
        },
        [open]
      )

      // Local 1s tick for the countdown; also refetches when the announced
      // peak/off-peak boundary has passed (rate-limited to avoid a storm).
      React.useEffect(
        function () {
          if (!open) return undefined
          const tickTimer = setInterval(function () {
            forceTick(function (value) {
              return value + 1
            })
            const current = store.get()
            const currentSnapshot = current.snapshot
            const peak = currentSnapshot && currentSnapshot.peak ? currentSnapshot.peak : null
            if (!peak || typeof peak.nextChangeAtMs !== 'number') return
            const currentOffset = typeof current.offsetMs === 'number' ? current.offsetMs : 0
            if (Date.now() + currentOffset < peak.nextChangeAtMs) return
            if (current.loading === true) return
            const stamp = Date.now()
            if (stamp - lastOverdueFetchAtMs < 15000) return
            lastOverdueFetchAtMs = stamp
            loadSnapshot()
          }, 1000)
          return function () {
            clearInterval(tickTimer)
          }
        },
        [open]
      )

      // Global dismissal + anchor recalculation listeners.
      React.useEffect(
        function () {
          if (!open) return undefined
          refreshAnchor()

          function onMouseDown(event) {
            const target = event.target
            if (!target) return
            const root = popoverRef.current
            if (root && typeof root.contains === 'function' && root.contains(target)) return
            if (footerButtonEl && typeof footerButtonEl.contains === 'function' && footerButtonEl.contains(target)) {
              return
            }
            closePopover()
          }

          function onKeyDown(event) {
            if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) {
              event.stopPropagation()
              closePopover()
            }
          }

          function onWindowBlur() {
            closePopover()
          }

          function onViewportChange() {
            refreshAnchor()
          }

          document.addEventListener('mousedown', onMouseDown, true)
          document.addEventListener('keydown', onKeyDown, true)
          window.addEventListener('blur', onWindowBlur)
          window.addEventListener('resize', onViewportChange)
          window.addEventListener('scroll', onViewportChange, true)

          return function () {
            document.removeEventListener('mousedown', onMouseDown, true)
            document.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('blur', onWindowBlur)
            window.removeEventListener('resize', onViewportChange)
            window.removeEventListener('scroll', onViewportChange, true)
          }
        },
        [open]
      )

      // On open, move keyboard focus to the dialog root; there is no focus
      // trap. Esc is handled by the document-level keydown listener above.
      React.useEffect(
        function () {
          if (!open) return undefined
          const root = popoverRef.current
          if (root && typeof root.focus === 'function') {
            try {
              root.focus()
            } catch (error) {
              // Focusing a non-focusable node is harmless to skip.
            }
          }
          return undefined
        },
        [open]
      )

      // Keep the card mounted through the exit animation, then unmount.
      if (!open && snapshot.closing !== true) return null

      const data = snapshot.snapshot && typeof snapshot.snapshot === 'object' ? snapshot.snapshot : null
      const balance = data && data.balance && typeof data.balance === 'object' ? data.balance : null
      const peak = data && data.peak && typeof data.peak === 'object' ? data.peak : null
      const today = data && data.today && typeof data.today === 'object' ? data.today : null
      const fetchError = typeof snapshot.error === 'string' && snapshot.error ? snapshot.error : null
      const errorMessage =
        typeof snapshot.errorMessage === 'string' && snapshot.errorMessage ? snapshot.errorMessage : null
      const balanceAvailable = !!(balance && balance.available === true)
      const hostBalanceError =
        data && typeof data.balanceError === 'string' && data.balanceError ? data.balanceError : null

      const header = h(
        'div',
        { style: STYLE.header },
        h('span', { style: STYLE.headerTitle, title: t('title') }, t('title')),
        h(IconButton, {
          label: t('refresh'),
          icon: 'refresh',
          onClick: loadSnapshot,
          disabled: snapshot.loading === true,
        }),
        h(IconButton, {
          label: t('close'),
          icon: 'close',
          onClick: closePopover,
          disabled: false,
        })
      )

      const sections = []

      if (!data) {
        if (snapshot.loading === true || !fetchError) {
          sections.push(h('div', { key: 'loading', style: STYLE.empty }, t('loading')))
        } else {
          sections.push(
            h(
              'div',
              { key: 'error', style: { padding: '10px 0' } },
              h('div', { style: STYLE.errorTitle }, t('loadFailed')),
              snapshot.error === 'snapshot' && errorMessage
                ? h('div', { style: STYLE.errorDetail }, errorMessage)
                : null,
              h('div', { style: STYLE.retryBox }, h(RetryButton, { label: t('retry'), onClick: loadSnapshot }))
            )
          )
        }
      } else {
        const totalText = balanceAvailable ? formatMoney(balance.total, balance.currency) : null
        let sourceText = null
        if (balanceAvailable) {
          if (balance.source === 'api-key') sourceText = t('sourceApiKey')
          else if (balance.source === 'account') sourceText = t('sourceAccount')
        }

        const isPeakNow = peak ? peak.isPeak === true : null
        const accent = isPeakNow === null ? COLOR.labelTertiary : isPeakNow ? COLOR.warn : COLOR.success
        const stateText = peak ? (isPeakNow ? t('peak') : t('offPeak')) : null
        const countdownMs =
          peak && typeof peak.nextChangeAtMs === 'number' && isFinite(peak.nextChangeAtMs)
            ? peak.nextChangeAtMs - serverNowMs
            : null
        const countdownLabel = peak
          ? peak.nextIsPeak === true
            ? t('toPeak')
            : peak.nextIsPeak === false
              ? t('toOffPeak')
              : t('nextChangeIn')
          : null
        const countdownParts = countdownMs === null ? null : formatCountdownParts(countdownMs)
        const usedText = today ? formatMoney(today.used, today.currency) : null
        const observedFrom =
          today && typeof today.observedFromMs === 'number' && isFinite(today.observedFromMs)
            ? formatClock(today.observedFromMs)
            : ''
        const showSource = appearance.showSource !== false
        const showSeconds = appearance.showSeconds !== false
        const showNote = appearance.showObservedSince !== false && !!today && today.partial === true && !!observedFrom

        const dot = function (key) {
          return h('span', {
            key: key,
            'aria-hidden': 'true',
            style: Object.assign({}, STYLE.metaDot, { background: accent }),
          })
        }
        const unavailableBox = !balanceAvailable
          ? h(
              'div',
              { style: { marginTop: 8 } },
              h(
                'div',
                { style: { fontSize: 12, color: COLOR.warn, lineHeight: 1.4, wordBreak: 'break-word' } },
                hostBalanceError || t('balanceUnavailable')
              ),
              h('div', { style: STYLE.retryBox }, h(RetryButton, { label: t('retry'), onClick: loadSnapshot }))
            )
          : null

        if (layout === 'minimal') {
          const right = []
          if (stateText) {
            right.push(dot('dot'))
            right.push(
              h(
                'span',
                { key: 'state', style: Object.assign({}, STYLE.minimalMeta, { color: accent, fontWeight: 600 }) },
                stateText
              )
            )
          }
          if (countdownParts) {
            if (right.length > 0) {
              right.push(h('span', { key: 'sep', 'aria-hidden': 'true', style: STYLE.metaSeparator }, '\u00b7'))
            }
            right.push(
              h(
                'span',
                { key: 'countdown', style: STYLE.minimalMeta },
                countdownLabel + ' ' + countdownText(countdownParts, showSeconds)
              )
            )
          }
          sections.push(
            h(
              'div',
              { key: 'minimal', style: STYLE.minimalRow },
              h('span', { style: STYLE.minimalMoney }, totalText || '\u2014'),
              right.length > 0
                ? h('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 5 } }, right)
                : null
            )
          )
          if (unavailableBox) sections.push(h('div', { key: 'unavailable' }, unavailableBox))
        } else if (layout === 'compact') {
          const top = [h('span', { key: 'money', style: STYLE.compactMoney }, totalText || '\u2014')]
          if (stateText) {
            top.push(dot('dot'))
            top.push(
              h('span', { key: 'state', style: Object.assign({}, STYLE.metaStatus, { color: accent }) }, stateText)
            )
          }
          if (showSource && sourceText) {
            top.push(h('span', { key: 'sep', 'aria-hidden': 'true', style: STYLE.metaSeparator }, '\u00b7'))
            top.push(h('span', { key: 'source', style: STYLE.metaText }, sourceText))
          }
          sections.push(
            h('div', { key: 'compact', style: Object.assign({}, STYLE.compactTop, { flexWrap: 'wrap' }) }, top)
          )

          const cells = []
          if (today) {
            cells.push(
              h(
                'div',
                { key: 'today', style: STYLE.compactCell },
                h('span', { style: STYLE.compactCellLabel }, t('todayUsed')),
                h('span', { style: STYLE.value }, usedText || t('unavailable'))
              )
            )
          }
          if (countdownParts) {
            cells.push(
              h(
                'div',
                { key: 'peak', style: STYLE.compactCell },
                h('span', { style: STYLE.compactCellLabel }, countdownLabel),
                h('span', { style: STYLE.value }, countdownText(countdownParts, showSeconds))
              )
            )
          }
          if (cells.length > 0) sections.push(h('div', { key: 'cells', style: STYLE.compactCells }, cells))
          if (showNote) {
            sections.push(h('div', { key: 'note', style: STYLE.note }, t('observedSince', { time: observedFrom })))
          }
          if (unavailableBox) sections.push(h('div', { key: 'unavailable' }, unavailableBox))
        } else {
          // Standard: hero amount, one caption line, then the metric rows.
          const metaParts = []
          if (peak) {
            metaParts.push(dot('dot'))
            metaParts.push(
              h('span', { key: 'state', style: Object.assign({}, STYLE.metaStatus, { color: accent }) }, stateText)
            )
          }
          if (showSource && sourceText) {
            if (metaParts.length > 0) {
              metaParts.push(h('span', { key: 'sep', 'aria-hidden': 'true', style: STYLE.metaSeparator }, '\u00b7'))
            }
            metaParts.push(h('span', { key: 'source', style: STYLE.metaText }, sourceText))
          }

          sections.push(
            h(
              'div',
              { key: 'balance' },
              h('div', { style: STYLE.bigMoney }, totalText || '\u2014'),
              metaParts.length > 0 ? h('div', { style: STYLE.metaRow }, metaParts) : null,
              unavailableBox
            )
          )

          const metrics = []
          if (today) {
            metrics.push(
              h(
                'div',
                { key: 'today', style: STYLE.metric },
                h(
                  'div',
                  { style: STYLE.row },
                  h('span', { style: STYLE.label }, t('todayUsed')),
                  h('span', { style: STYLE.value }, usedText || t('unavailable'))
                ),
                showNote ? h('div', { style: STYLE.note }, t('observedSince', { time: observedFrom })) : null
              )
            )
          }
          if (countdownParts) {
            metrics.push(
              h(
                'div',
                { key: 'peak', style: STYLE.metric },
                h(
                  'div',
                  { style: STYLE.row },
                  h('span', { style: STYLE.label }, countdownLabel),
                  h(
                    'span',
                    Object.assign({}, STYLE.value, { display: 'inline-flex', alignItems: 'baseline', gap: 1 }),
                    h('span', { style: { minWidth: 40, textAlign: 'right' } }, countdownParts.main),
                    showSeconds ? h('span', { style: STYLE.valueSeconds }, ':' + countdownParts.seconds) : null
                  )
                )
              )
            )
          }
          if (metrics.length > 0) {
            sections.push(h('div', { key: 'metrics', style: STYLE.metrics }, metrics))
          }
        }

        // A failed poll after a successful one: keep the stale data but
        // surface the failure with a retry affordance.
        if (fetchError) {
          sections.push(
            h(
              'div',
              { key: 'stale', style: { paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 11, color: COLOR.labelTertiary } }, t('loadFailed')),
              h(RetryButton, { label: t('retry'), onClick: loadSnapshot })
            )
          )
        }
      }

      const placement = computePlacement(snapshot.anchor, snapshot.sidebar)
      const dialogStyle = Object.assign(
        {
          zIndex: Z_INDEX,
          boxSizing: 'border-box',
          color: COLOR.labelPrimary,
          fontFamily: 'inherit',
          fontSize: 13,
          lineHeight: 1.4,
          pointerEvents: snapshot.closing === true ? 'none' : 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          // The same motion in both directions: rise + fade in, fall + fade out.
          animation: snapshot.closing === true
            ? 'dsh-bp-pop-out ' + POP_OUT_MS + 'ms cubic-bezier(0.4, 0, 0.6, 1) both'
            : 'dsh-bp-pop-in 160ms cubic-bezier(0.22, 0.9, 0.3, 1) both',
        },
        // The surface comes from the appearance preference: theme-following by
        // default, and theme tokens keep it re-colourable when a theme plug-in
        // overrides the aliases.
        surfaceStyle(appearance),
        placement
      )

      return h(
        'div',
        {
          ref: popoverRef,
          role: 'dialog',
          'aria-label': t('title'),
          'aria-modal': 'false',
          tabIndex: -1,
          'data-dsh-balance-pocket': 'popover',
          'data-dsh-balance-pocket-background': appearance.background,
          'data-dsh-balance-pocket-layout': layout,
          style: dialogStyle,
        },
        h('style', { key: 'dsh-bp-pop-style' }, POP_IN_KEYFRAMES + POP_OUT_KEYFRAMES),
        header,
        h('div', { style: STYLE.body }, sections)
      )
    }

    // ------------------------------------------------------------------
    // Settings panel (appearance)
    // ------------------------------------------------------------------

    function Segmented(props) {
      return h(
        'div',
        { style: STYLE.segmentRow, role: 'group' },
        props.options.map(function (option) {
          const active = option.value === props.value
          return h(
            'button',
            {
              key: option.value,
              type: 'button',
              'aria-pressed': active ? 'true' : 'false',
              onClick: function () {
                props.onChange(option.value)
              },
              style: Object.assign({}, STYLE.segment, active ? STYLE.segmentActive : null),
            },
            option.label
          )
        })
      )
    }

    /** The switch used by the settings page toggle rows. */
    function ToggleSwitch(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked ? 'true' : 'false',
          'aria-label': props.label,
          onClick: function () {
            props.onChange(!props.checked)
          },
          style: Object.assign({}, STYLE.switchTrack, props.checked ? STYLE.switchTrackOn : null),
        },
        h('span', { style: Object.assign({}, STYLE.switchKnob, props.checked ? STYLE.switchKnobOn : null) })
      )
    }

    /** Settings-page building blocks (cards, option chips, field rows). */
    function SettingsCard(props) {
      return h(
        'section',
        { style: STYLE.sectionCard },
        h(
          'div',
          { style: STYLE.sectionCardHead },
          h('div', { style: STYLE.sectionCardTitle }, props.title),
          props.hint ? h('span', { style: STYLE.sectionCardHint }, props.hint) : null
        ),
        props.children
      )
    }

    function OptionChip(props) {
      const active = props.active === true
      return h(
        'button',
        {
          type: 'button',
          'aria-pressed': active ? 'true' : 'false',
          onClick: props.onClick,
          style: Object.assign({}, STYLE.optionChip, active ? STYLE.optionChipActive : null),
        },
        props.glyph
          ? h('span', { 'aria-hidden': 'true', style: STYLE.optionGlyph }, props.glyph)
          : props.dot
            ? h('span', { 'aria-hidden': 'true', style: Object.assign({}, STYLE.optionDot, props.dot) })
            : null,
        h('span', { style: { whiteSpace: 'nowrap' } }, props.label)
      )
    }

    function SliderField(props) {
      return h(
        'div',
        { style: STYLE.sliderField },
        h(
          'div',
          { style: STYLE.sliderFieldHead },
          h('span', { style: STYLE.fieldLabel }, props.label),
          h('span', { style: STYLE.fieldValue }, props.display)
        ),
        h('input', {
          type: 'range',
          min: props.min,
          max: props.max,
          step: props.step,
          value: props.value,
          'aria-label': props.label,
          onChange: function (event) {
            props.onChange(Number(event.target.value))
          },
          style: STYLE.sliderFieldInput,
        })
      )
    }

    function ToggleRow(props) {
      return h(
        'div',
        { style: Object.assign({}, STYLE.toggleRow, props.divider ? STYLE.toggleRowDivider : null) },
        h(
          'div',
          { style: STYLE.toggleRowText },
          h('span', { style: STYLE.toggleRowLabel }, props.label),
          props.hint ? h('span', { style: STYLE.toggleRowHint }, props.hint) : null
        ),
        h(ToggleSwitch, {
          label: props.label,
          checked: props.checked,
          onChange: props.onChange,
        })
      )
    }

    const BACKGROUND_LABELS = {
      theme: 'bgTheme',
      solid: 'bgSolid',
      translucent: 'bgTranslucent',
      frosted: 'bgFrosted',
      transparent: 'bgTransparent',
      acrylic: 'bgAcrylic',
    }
    const LAYOUT_LABELS = { standard: 'layoutStandard', compact: 'layoutCompact', minimal: 'layoutMinimal' }

    /** Leading swatch for a background option: a miniature of that surface. */
    function backgroundDot(value, appearance) {
      if (value === 'solid') return { background: appearance.solidColor }
      if (value === 'translucent') {
        return { background: 'color-mix(in srgb, var(--dsw-alias-bg-overlay) 60%, transparent)' }
      }
      if (value === 'frosted') {
        return { background: 'linear-gradient(135deg, var(--dsw-alias-bg-overlay), var(--dsw-alias-bg-layer-2))' }
      }
      if (value === 'transparent') return { background: 'transparent', borderStyle: 'dashed' }
      if (value === 'acrylic') {
        return { background: 'linear-gradient(120deg, var(--dsw-alias-bg-overlay) 30%, var(--dsw-alias-brand-primary))' }
      }
      return { background: 'linear-gradient(135deg, var(--dsw-alias-bg-overlay), var(--dsw-alias-bg-layer-1))' }
    }

    /**
     * The one preview: it renders whatever the current appearance would show,
     * so background, layout and the display switches are all visible in this
     * single card instead of in separate static samples.
     */
    function AppearancePreview(props) {
      const appearance = props.appearance
      const data = props.data && typeof props.data === 'object' ? props.data : null
      const offsetMs = typeof props.offsetMs === 'number' ? props.offsetMs : 0
      const balance = data && data.balance ? data.balance : null
      const peak = data && data.peak ? data.peak : null
      const today = data && data.today ? data.today : null

      const total = balance && balance.available === true ? formatMoney(balance.total, balance.currency) : null
      let sourceText = null
      if (total) {
        if (balance.source === 'api-key') sourceText = t('sourceApiKey')
        else sourceText = t('sourceAccount')
      }
      const isPeakNow = peak ? peak.isPeak === true : null
      const accent = isPeakNow === null ? COLOR.labelTertiary : isPeakNow ? COLOR.warn : COLOR.success
      const stateText = peak ? (isPeakNow ? t('peak') : t('offPeak')) : null
      const usedText = today && typeof today.used === 'number' ? formatMoney(today.used, today.currency) : null
      const observedFrom =
        today && typeof today.observedFromMs === 'number' && isFinite(today.observedFromMs)
          ? formatClock(today.observedFromMs)
          : ''
      const countdownMs =
        peak && typeof peak.nextChangeAtMs === 'number' && isFinite(peak.nextChangeAtMs)
          ? peak.nextChangeAtMs - (Date.now() + offsetMs)
          : null
      const countdown = countdownMs === null ? null : formatCountdownParts(countdownMs)
      const countdownLabel = peak && peak.nextIsPeak === true ? t('toPeak') : t('toOffPeak')

      const showSource = appearance.showSource !== false
      const showSeconds = appearance.showSeconds !== false
      const showNote = appearance.showObservedSince !== false && !!today && today.partial === true && !!observedFrom
      const layout =
        appearance.layout === 'compact' ? 'compact' : appearance.layout === 'minimal' ? 'minimal' : 'standard'

      const meta = []
      if (stateText) {
        meta.push(
          h('span', {
            key: 'dot',
            'aria-hidden': 'true',
            style: Object.assign({}, STYLE.metaDot, { background: accent }),
          })
        )
        meta.push(h('span', { key: 'state', style: Object.assign({}, STYLE.metaStatus, { color: accent }) }, stateText))
      }
      if (showSource && sourceText) {
        if (meta.length > 0) {
          meta.push(h('span', { key: 'sep', 'aria-hidden': 'true', style: STYLE.metaSeparator }, '\u00b7'))
        }
        meta.push(h('span', { key: 'source', style: STYLE.metaText }, sourceText))
      }

      const body = []
      if (layout === 'minimal') {
        const right = []
        if (stateText) {
          right.push(
            h('span', {
              key: 'dot',
              'aria-hidden': 'true',
              style: { width: 5, height: 5, borderRadius: '50%', background: accent, flex: '0 0 auto' },
            })
          )
          right.push(h('span', { key: 'state', style: { color: accent, fontWeight: 600 } }, stateText))
        }
        if (countdown) {
          if (right.length > 0) {
            right.push(h('span', { key: 'sep', 'aria-hidden': 'true', style: STYLE.metaSeparator }, '\u00b7'))
          }
          right.push(h('span', { key: 'cd' }, countdownLabel + ' ' + countdownText(countdown, showSeconds)))
        }
        body.push(
          h(
            'div',
            { key: 'row', style: STYLE.previewMinimalRow },
            h('span', { style: STYLE.previewMinimalMoney }, total || '\u2014'),
            right.length > 0 ? h('span', { style: STYLE.previewMinimalMeta }, right) : null
          )
        )
      } else if (layout === 'compact') {
        body.push(
          h(
            'div',
            { key: 'top', style: STYLE.previewCompactTop },
            h('span', { style: STYLE.previewCompactMoney }, total || '\u2014'),
            meta.length > 0
              ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, meta)
              : null
          )
        )
        const cells = []
        if (today) {
          cells.push(
            h(
              'div',
              { key: 'used', style: STYLE.previewCell },
              h('span', { style: STYLE.previewCellLabel }, t('todayUsed')),
              h('span', { style: STYLE.previewValue }, usedText || t('unavailable'))
            )
          )
        }
        if (countdown) {
          cells.push(
            h(
              'div',
              { key: 'cd', style: STYLE.previewCell },
              h('span', { style: STYLE.previewCellLabel }, countdownLabel),
              h('span', { style: STYLE.previewValue }, countdownText(countdown, showSeconds))
            )
          )
        }
        if (cells.length > 0) body.push(h('div', { key: 'cells', style: STYLE.previewCells }, cells))
        if (showNote) {
          body.push(h('div', { key: 'note', style: STYLE.previewNote }, t('observedSince', { time: observedFrom })))
        }
      } else {
        body.push(h('div', { key: 'money', style: STYLE.previewMoney }, total || '\u2014'))
        if (meta.length > 0) body.push(h('div', { key: 'meta', style: STYLE.previewMetaRow }, meta))
        body.push(h('div', { key: 'rule', style: STYLE.previewRule }))
        if (today) {
          body.push(
            h(
              'div',
              { key: 'used', style: STYLE.previewRow },
              h('span', { style: STYLE.previewLabel }, t('todayUsed')),
              h('span', { style: STYLE.previewValue }, usedText || t('unavailable'))
            )
          )
        }
        if (showNote) {
          body.push(
            h(
              'div',
              { key: 'note', style: Object.assign({}, STYLE.previewNote, { marginTop: -2 }) },
              t('observedSince', { time: observedFrom })
            )
          )
        }
        if (countdown) {
          body.push(
            h(
              'div',
              { key: 'cd', style: STYLE.previewRow },
              h('span', { style: STYLE.previewLabel }, countdownLabel),
              h('span', { style: STYLE.previewValue }, countdownText(countdown, showSeconds))
            )
          )
        }
      }

      return h(
        'div',
        {
          style: Object.assign({}, STYLE.previewFrame, surfaceStyle(appearance)),
          'data-dsh-balance-pocket-preview': 'card',
          'data-dsh-balance-pocket-preview-layout': layout,
        },
        h('div', { style: STYLE.previewHead }, h('span', { style: STYLE.previewTitle }, t('title'))),
        h('div', { style: STYLE.previewBody }, body)
      )
    }

    // ------------------------------------------------------------------
    // Settings page (settings.section occupant, shown in Settings → 余额小口袋)
    // ------------------------------------------------------------------

    function BalanceSettingsPage() {
      const snapshot = useStoreState()
      const appearance = snapshot.appearance && typeof snapshot.appearance === 'object'
        ? snapshot.appearance
        : DEFAULT_APPEARANCE
      const data = snapshot.snapshot && typeof snapshot.snapshot === 'object' ? snapshot.snapshot : null
      const balance = data && data.balance && typeof data.balance === 'object' ? data.balance : null
      const peak = data && data.peak && typeof data.peak === 'object' ? data.peak : null
      const today = data && data.today && typeof data.today === 'object' ? data.today : null

      const isSolid = appearance.background === 'solid'
      const usesAlpha =
        appearance.background === 'translucent' ||
        appearance.background === 'frosted' ||
        appearance.background === 'acrylic'
      const usesBlur = appearance.background === 'frosted' || appearance.background === 'acrylic'
      const opacityPercent = Math.round(appearance.opacity * 100)

      const backgroundCard = h(
        SettingsCard,
        { title: t('sectionBackground') },
        h(
          'div',
          { style: STYLE.optionGrid },
          BACKGROUNDS.map(function (value) {
            return h(OptionChip, {
              key: value,
              label: t(BACKGROUND_LABELS[value]),
              active: appearance.background === value,
              dot: backgroundDot(value, appearance),
              onClick: function () {
                updateAppearance({ background: value })
              },
            })
          })
        ),
        isSolid
          ? h(
              'div',
              { style: STYLE.swatchRow },
              SOLID_PRESETS.map(function (color) {
                const selected = appearance.solidColor.toLowerCase() === color.toLowerCase()
                return h('button', {
                  key: color,
                  type: 'button',
                  'aria-label': color,
                  'aria-pressed': selected ? 'true' : 'false',
                  title: color,
                  onClick: function () {
                    updateAppearance({ solidColor: color })
                  },
                  style: Object.assign({}, STYLE.swatch, {
                    background: color,
                    boxShadow: selected ? '0 0 0 2px ' + COLOR.labelPrimary : 'none',
                  }),
                })
              }),
              h('input', {
                type: 'color',
                value: appearance.solidColor,
                'aria-label': t('colorLabel'),
                title: t('colorLabel'),
                onChange: function (event) {
                  updateAppearance({ solidColor: event.target.value })
                },
                style: STYLE.colorInput,
              })
            )
          : null,
        usesAlpha
          ? h(SliderField, {
              label: t('opacityLabel'),
              min: 25,
              max: 100,
              step: 1,
              value: opacityPercent,
              display: opacityPercent + '%',
              onChange: function (value) {
                updateAppearance({ opacity: value / 100 })
              },
            })
          : null,
        usesBlur
          ? h(SliderField, {
              label: t('blurLabel'),
              min: 0,
              max: 32,
              step: 1,
              value: appearance.blur,
              display: appearance.blur + 'px',
              onChange: function (value) {
                updateAppearance({ blur: value })
              },
            })
          : null
      )

      const layoutCard = h(
        SettingsCard,
        { title: t('sectionLayout') },
        h(Segmented, {
          value: appearance.layout,
          options: LAYOUTS.map(function (value) {
            return { value: value, label: t(LAYOUT_LABELS[value]) }
          }),
          onChange: function (value) {
            updateAppearance({ layout: value })
          },
        })
      )

      const displayCard = h(
        SettingsCard,
        { title: t('sectionDisplay') },
        h(ToggleRow, {
          label: t('showSource'),
          hint: t('showSourceHint'),
          checked: appearance.showSource,
          onChange: function (value) {
            updateAppearance({ showSource: value })
          },
        }),
        h(ToggleRow, {
          label: t('showObservedSince'),
          hint: t('showObservedSinceHint'),
          divider: true,
          checked: appearance.showObservedSince,
          onChange: function (value) {
            updateAppearance({ showObservedSince: value })
          },
        }),
        h(ToggleRow, {
          label: t('showSeconds'),
          hint: t('showSecondsHint'),
          divider: true,
          checked: appearance.showSeconds,
          onChange: function (value) {
            updateAppearance({ showSeconds: value })
          },
        })
      )

      return h(
        'div',
        { style: STYLE.settingsPage },
        h(
          'div',
          { style: STYLE.settingsPageHead },
          h(
            'div',
            { style: STYLE.settingsPageHeadText },
            h('div', { style: STYLE.settingsPageTitle }, t('settings')),
            h('div', { style: STYLE.settingsPageDesc }, t('settingsDesc'))
          ),
          h(RetryButton, { label: t('resetDefaults'), onClick: resetAppearance })
        ),
        h(
          'div',
          { style: STYLE.settingsPageBody },
          h('div', { style: STYLE.settingsPageMain }, backgroundCard, layoutCard, displayCard),
          h(
            'div',
            { style: STYLE.settingsPageAside },
            h(
              'div',
              { style: STYLE.sectionCardHead },
              h('div', { style: STYLE.sectionCardTitle }, t('preview')),
              h('span', { style: STYLE.sectionCardHint }, t('previewLive'))
            ),
            h(AppearancePreview, {
              appearance: appearance,
              data: data,
              offsetMs: typeof snapshot.offsetMs === 'number' ? snapshot.offsetMs : 0,
            }),
            h('div', { style: STYLE.previewHint }, t('previewHint'))
          )
        )
      )
    }

    // ------------------------------------------------------------------
    // Plugin definition
    // ------------------------------------------------------------------

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        pluginCtx = ctx

        // Locale dictionaries + live language switching.
        ctx.effect(
          function () {
            const disposers = []
            try {
              if (ctx.locale && typeof ctx.locale.register === 'function') {
                const disposeZh = ctx.locale.register('balancePocket', 'zh', DICTS.zh)
                const disposeEn = ctx.locale.register('balancePocket', 'en', DICTS.en)
                if (typeof disposeZh === 'function') disposers.push(disposeZh)
                if (typeof disposeEn === 'function') disposers.push(disposeEn)
              }
              if (ctx.locale && typeof ctx.locale.subscribe === 'function') {
                const disposeSub = ctx.locale.subscribe(function () {
                  store.set({ localeTick: (store.get().localeTick || 0) + 1 })
                })
                if (typeof disposeSub === 'function') disposers.push(disposeSub)
              }
            } catch (error) {
              // Locale wiring must never prevent the UI from registering.
            }
            return function () {
              for (let i = disposers.length - 1; i >= 0; i -= 1) {
                try {
                  disposers[i]()
                } catch (error) {
                  // ignore individual disposer failures
                }
              }
            }
          },
          'balance-pocket: locale'
        )

        // Sidebar footer entry.
        ctx.effect(
          function () {
            return ctx.slots.inject('sidebar.footer.action', function () {
              return ctx.slots.register(
                { name: 'sidebar.footer.action', id: BUTTON_ID, order: 10 },
                BalanceButton
              )
            })
          },
          'balance-pocket: footer action'
        )

        // Click-through overlay with the upward popover.
        ctx.effect(
          function () {
            return ctx.slots.inject('shell.overlay', function () {
              return ctx.slots.register(
                { name: 'shell.overlay', id: POPOVER_ID, order: 40 },
                BalancePopover
              )
            })
          },
          'balance-pocket: popover overlay'
        )

        // Native Settings page: Settings → 余额小口袋 (same owner as the
        // sidebar's "侧边卡片" style sections), so the look can be configured
        // without opening the popover first.
        ctx.effect(
          function () {
            return ctx.slots.inject('settings.section', function () {
              return ctx.slots.register(
                {
                  name: 'settings.section',
                  id: 'balance-pocket-settings',
                  order: 45,
                  label: function () {
                    return t('settingsNav')
                  },
                },
                BalanceSettingsPage
              )
            })
          },
          'balance-pocket: settings section'
        )

        // Keep the sidebar status dot honest while the popover is closed: one
        // low-frequency refresh a minute, paused while the page is hidden. The
        // popover's own 30s poll takes over while it is open.
        ctx.effect(
          function () {
            loadSnapshot()
            const timer = setInterval(function () {
              if (typeof document !== 'undefined' && document.hidden === true) return
              if (store.get().open === true) return
              loadSnapshot()
            }, 60000)
            return function () {
              clearInterval(timer)
            }
          },
          'balance-pocket: idle refresh'
        )

        // Reset shared state when the plugin is disposed.
        ctx.effect(
          function () {
            return function () {
              footerButtonEl = null
              requestToken += 1
              lastOverdueFetchAtMs = 0
              cancelCloseTimer()
              pluginCtx = null
              store.set({
                open: false,
                closing: false,
                anchor: null,
                sidebar: null,
                snapshot: null,
                loading: false,
                error: null,
                errorMessage: null,
                offsetMs: null,
                receivedAtMs: null,
              })
            }
          },
          'balance-pocket: reset'
        )
      },
    }
  },
})
