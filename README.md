<div align="center">

<img src="plugin/icon.svg" width="96" height="96" alt="Balance Pocket icon" />

# 余额小口袋 · Balance Pocket

**在 DSH 侧栏底部，随手看一眼 DeepSeek 余额、峰谷时段和今天花了多少。**

[![CI](https://github.com/Li111-div/dsh-balance-pocket/actions/workflows/ci.yml/badge.svg)](https://github.com/Li111-div/dsh-balance-pocket/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/DSH-plugin-4b6bfb.svg)](https://github.com/Li111-div/dsh-balance-pocket)

[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-2ea44f.svg)](#%E4%B8%AD%E6%96%87)
[![English](https://img.shields.io/badge/README-English-8250df.svg)](#english)

</div>

---

## 中文

### 这是什么

一个 **DSH（DeepSeek Harness）** Web 端插件。它在左侧栏底部（设置按钮旁边）加一个金币图标，
点一下**向上**弹出一个小窗，显示：

- **DeepSeek 剩余余额**：充值余额 + 赠金，按接口返回的币种显示（¥ / $）；
- **当前是高峰期还是低峰期**：按北京时间判定，并显示距离下次切换的倒计时；
- **今日已用**：Host 端按余额变化记账得出的真实消费；观测不完整时会标注「自 HH:mm 起观测」。

不新建页面、不占主面板。弹窗打开时每 30 秒刷新一次，也可以手动刷新；关闭弹窗后停止轮询与倒计时，
侧栏状态点改为 60 秒低频刷新。
界面的背景、版式和显示项都可以在 **设置 → 余额小口袋** 里调整，带实时预览，改动立即生效并保存在当前浏览器。

### 功能特点

| | |
|---|---|
| 侧栏入口 | 32×32 金币按钮；宽栏时直接显示余额和峰谷状态点，无需打开弹窗 |
| 向上弹窗 | 贴着侧栏向上弹出，空间不足自动改为向下；点外部 / Esc / 窗口失焦关闭 |
| 峰谷时段 | 周一至周五 09:00–12:00、14:00–18:00 为高峰；周末、法定节假日、夜间为低峰 |
| 今日已用 | 余额是钱包快照而非流水，插件用「当日开盘余额 − 当前余额」观测消费，充值会自动平移不会变成负数 |
| 外观设置 | 跟随主题 / 纯色 / 半透明 / 磨砂 / 透明 / 亚克力；标准 / 紧凑 / 极简三种版式；来源、观测起点、秒数可分别开关 |
| 中英双语 | 跟随 DSH 界面语言实时切换，无需重启 |
| 无构建 | 客户端是手写 React（`React.createElement`），装好即用，没有打包步骤 |

### 安装

要求：DSH 桌面端（Web GUI），并且已经登录 DeepSeek 账号或配置了 `DEEPSEEK_API_KEY`。

**方式 A：插件管理器（推荐）**

1. 下载或 `git clone` 本仓库；
2. 打开 DSH 的**设置 → 插件**，选择安装本地插件，目录指向仓库里的 `plugin/`；
3. 重载界面（或重启 DSH），侧栏底部出现金币图标。

**方式 B：写进 profile 依赖**

把下面这行加入 `$DSH_HOME/profiles/<profile>/package.json` 的 `dependencies`，然后让插件管理器/包管理器重新安装：

```json
"dsh-balance-pocket": "link:D:/path/to/dsh-balance-pocket/plugin"
```

发布 GitHub Release 之后，也可以直接装 `.tgz`：

```json
"dsh-balance-pocket": "https://github.com/Li111-div/dsh-balance-pocket/releases/download/v0.1.0/dsh-balance-pocket-0.1.0.tgz"
```

发布页同时提供 `SHA256SUMS.txt` 供校验。

**方式 C：开发模式**

```bash
git clone https://github.com/Li111-div/dsh-balance-pocket.git
# 在 profile 里 link 到本仓库的 plugin/，改完刷新界面即可
```

> 本插件不需要 `npm install`，也没有构建产物；`plugin/` 目录本身就是完整的包。

### 余额从哪来

| 数据 | 来源 |
|---|---|
| 余额 | ① 已配置的 `DEEPSEEK_API_KEY` → `https://api.deepseek.com/user/balance`；② 未配置或失败 → DSH 已登录的 DeepSeek 账号（`deepseekAccount.getBalance`，充值钱包 + 赠金钱包按币种相加） |
| 峰/谷 | 北京时间：**周一至周五（不含中国法定节假日）09:00–12:00、14:00–18:00 为高峰**，其余时段为低峰（低峰价 = 高峰价 × 50%） |
| 今日已用 | Host 端按余额观测记账：当日首次观测 = 开盘余额，之后每次观测更新；`今日已用 = 开盘 − 当前`。跨日重置，不同余额来源/币种分账本 |

余额数据由本机只读路由 `GET /dsh-balance-pocket/snapshot` 提供，Host 端缓存 20 秒并每 5 分钟后台观测一次。

### 隐私与安全

- **API Key 和账号 token 不会出现在任何响应、日志或 DOM 里**。Host 端只在请求 DeepSeek 接口时使用它们。
- 快照路由优先校验回环 Host（`localhost` / `127.0.0.1` / `::1`）与 `Origin`、`Sec-Fetch-Site`；
  若当前 DSH 提供信任栅栏（`connection.requestRejection`，它会处理 `--trusted-host` 与反向代理），
  非回环请求交给宿主判定，栅栏抛错按拒绝处理（fail-closed）。
- 没有信任栅栏的老版本 DSH，可通过环境变量显式放行 Host：
  `DSH_BALANCE_POCKET_TRUSTED_HOSTS=myhost.lan:8313`（逗号分隔）。
  ⚠️ 一旦放行，**同网段任何能访问该地址的设备都能读到余额**（充值 + 赠金），请只在可信网络里使用。
- 记账文件位于 `$DSH_HOME/dsh-balance-pocket/ledger.json`，只保存余额数值和币种，不含凭据。
- 外观设置只写当前浏览器的 `localStorage`，不上传任何地方。

### 已知限制

- **「今日已用」只能观测插件运行期间的变化**。如果当天插件是中午才第一次取到余额，之前的消费无法追回，界面会写「自 HH:mm 起观测」，不会假装是全天数据。
- **法定节假日表当前覆盖 2026 年**（`plugin/holidays.js`，依据国务院 2026 年放假安排）。国务院每年 11 月公布次年安排；
  表里没有的年份，插件会在弹窗里明确提示「节假日表未覆盖 YYYY 年」，而不是默默把假期当工作日。
- 网络抖动时会短暂复用上一次成功读数（最多 10 分钟），此时弹窗会标注「数据延迟 N 秒」，不会当成实时值。
- 余额接口是钱包快照，不等于账单；「今日已用」是观测值，存在最多 5 分钟的采样延迟。
- 高峰期价格倍率（2×）只作为提示展示，不参与任何计费计算。

### 开发

```bash
node --version        # >= 18
node check.mjs        # 自检：72 项，覆盖峰谷边界、节假日表、账本规则、路由与信任栅栏、客户端渲染
```

项目结构：

```
plugin/
  index.js          Host 端：快照路由、余额来源、缓存、后台观测
  peak.js           峰谷时段判定（纯函数）
  holidays.js       中国法定节假日表（按年份，纯数据）
  ledger.js         余额观测账本（今日已用 / partial / 充值平移 / 分账本）
  client.js         客户端：侧栏入口 + 向上弹窗 + 外观设置页（手写 React，无构建）
  cordis.patch.yml  bundle patch（含重复挂载守卫）
  package.json      DSH 插件清单
  locale/*.json     插件管理器里的标题/描述
  icon.svg          图标
check.mjs           本地自检脚本（不属于发布包）
docs/DESIGN.md      架构与数据契约
```

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)；安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

### 许可证

[MIT](LICENSE) © 2026 Li111-div

---

## English

### What it is

A plugin for **DSH (DeepSeek Harness)** Web/desktop. It adds a coin icon at the foot of the left sidebar — click it and a small popover opens **upwards** with:

- your **remaining DeepSeek balance** (top-up + bonus, in the API's currency);
- the **current peak / off-peak pricing period** (Beijing time) and a countdown to the next switch;
- **today's spend**, derived from balance observations (clearly marked "observed since …" when the day was not fully observed).

No extra page, no main-panel takeover. It refreshes every 30 s while open and stops polling and
the countdown when closed (the sidebar status dot then refreshes once a minute). Background, layout
and displayed rows are configurable under **Settings → Balance Pocket**, with a live preview and
per-browser persistence.

### Install

Requires DSH desktop with either a `DEEPSEEK_API_KEY` credential or a signed-in DeepSeek account.

1. Clone this repository.
2. In DSH open **Settings → Plugins** and install a local plugin from the repository's `plugin/` directory.
3. Reload the UI. The coin icon appears at the sidebar foot.

Alternatively add it to `$DSH_HOME/profiles/<profile>/package.json`:

```json
"dsh-balance-pocket": "link:D:/path/to/dsh-balance-pocket/plugin"
```

or, after a GitHub release, use the packaged tarball:

```json
"dsh-balance-pocket": "https://github.com/Li111-div/dsh-balance-pocket/releases/download/v0.1.0/dsh-balance-pocket-0.1.0.tgz"
```

Each release also ships `SHA256SUMS.txt` for verification.

### Privacy

- The API key / account token never appear in responses, logs or the DOM.
- The snapshot route checks loopback `Host`, `Origin` and `Sec-Fetch-Site` first, then delegates to the
  Harness trust fence (`connection.requestRejection`) when it exists, and fails closed if that fence throws.
  On older Harnesses without the fence, `DSH_BALANCE_POCKET_TRUSTED_HOSTS` opts a LAN host in explicitly —
  doing so exposes the balance to anyone who can reach that address on your network.
- The ledger stores amounts and currencies only (`$DSH_HOME/dsh-balance-pocket/ledger.json`).
- Appearance preferences stay in the browser's `localStorage`.

### Known limitations

- **Today's spend can only cover the time the plugin was observing.** A late first reading of the day is
  labelled "observed since …", never presented as a full-day figure.
- **The statutory-holiday calendar covers 2026** (`plugin/holidays.js`). For a year it does not cover,
  the popover says so explicitly instead of silently treating holidays as workdays.
- A cached reading reused after a failed refresh (up to 10 minutes) is labelled with its age.
- The balance API is a wallet snapshot, not a ledger, so today's spend lags by up to the 5-minute sampling
  interval. The 2× peak multiplier is display-only.

### Development

```bash
node check.mjs   # 72 checks: peak boundaries, holiday table, ledger rules, route + trust fence, client rendering
```

No build step: `plugin/client.js` is hand-written React loaded through DSH's module loader.

### License

[MIT](LICENSE) © 2026 Li111-div
