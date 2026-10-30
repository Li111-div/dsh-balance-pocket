# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-30

### Added

- Sidebar footer entry (`sidebar.footer.action`) with a coin icon, optional wide-mode label, live amount and peak/off-peak status dot.
- Upward-opening popover (`shell.overlay`) anchored to the sidebar: balance, peak/off-peak period with countdown, and today's spend; 30 s polling while open, manual refresh, outside-click / Esc / window-blur dismissal.
- Balance resolution over two read-only routes: the configured `DEEPSEEK_API_KEY` credential (`https://api.deepseek.com/user/balance`) and the signed-in DSH DeepSeek account (`deepseekAccount.getBalance`, recharge + bonus wallets summed per currency).
- Peak schedule for Beijing time (Mon–Fri 09:00–12:00 and 14:00–18:00, excluding Chinese statutory holidays) with the 2026 holiday calendar in `holidays.js`, period start and next-switch timestamps.
- Daily spend ledger derived from balance observations: top-up compensation, out-of-order sample rejection, per-source/per-currency books, 15-minute leading-gap detection (`partial` / `observedFromMs`) and 120-day pruning, persisted under `$DSH_HOME/dsh-balance-pocket/ledger.json`.
- Snapshot route `GET /dsh-balance-pocket/snapshot` with loopback Host/Origin/`Sec-Fetch-Site` validation, delegation to the Harness trust fence (`connection.requestRejection`) with fail-closed behaviour, `no-store`, HEAD support, 405 for other methods and an optional `DSH_BALANCE_POCKET_TRUSTED_HOSTS` allow-list for Harnesses without the fence.
- Appearance settings page (`settings.section` → 余额小口袋): six backgrounds (theme, solid, translucent, frosted, transparent, acrylic), three layouts (standard, compact, minimal), opacity/blur sliders, display toggles and a live preview card; stored per browser in `localStorage`.
- Chinese and English UI dictionaries registered through the DSH locale service, switching live with the host language.
- `check.mjs` self-check (72 assertions): peak-schedule boundaries, holiday-table structure and uncovered-year handling, ledger rules, wallet parsing (missing fields never read as zero), route security and trust-fence delegation, client registration, rendering smoke tests (including stale-reading and holiday-coverage notices) and package manifest validation.

### Notes

- Statutory holidays are only known for years present in `holidays.js`. For any other year the popover
  says the calendar does not cover it instead of silently treating holidays as workdays.
- A cached balance reused after a failed refresh is labelled with its age; it is never presented as live.
- `cordis.patch.yml` carries an aggregate double-mount guard so an aggregate bundle that already mounts
  this package wins instead of registering the snapshot route twice.
