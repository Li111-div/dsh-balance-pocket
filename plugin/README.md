# 余额小口袋 · Balance Pocket

DeepSeek Harness（DSH）Web/桌面端插件。左侧栏底部（设置按钮旁）多一个金币图标 +
当前余额（高峰期/低峰期用小圆点表示，绿=低峰、橙=高峰），点一下**向上**弹出一个
贴着侧栏宽度的小窗：

- **DeepSeek 剩余余额**：充值 + 赠金，按接口返回的币种显示（¥ / $）；
- **当前是高峰期还是低峰期**（北京时间），以及距离下次切换的倒计时；
- **今日已用**：按余额变化观测出的真实扣费；观测不完整时标注「自 HH:mm 起观测」。

不新建独立页面、不占主面板。弹窗打开时每 30 秒刷新一次，也可手动刷新；
关闭弹窗后停止轮询与倒计时，侧栏状态点改为 60 秒低频刷新。外观（背景 / 版式 / 显示项）在 **设置 → 余额小口袋** 里调整，
带实时预览，改动立即生效并保存在当前浏览器。

> 仓库、问题反馈、贡献指南：https://github.com/LMC111-div/dsh-balance-pocket

## 功能

| | |
|---|---|
| 侧栏入口 | 32×32 金币按钮；宽栏时直接显示余额和峰谷状态点，不打开弹窗也能看到 |
| 向上弹窗 | 贴着侧栏向上弹出，空间不足自动改为向下；点外部 / Esc / 窗口失焦关闭 |
| 峰谷时段 | 周一至周五 09:00–12:00、14:00–18:00 为高峰；周末、法定节假日、夜间为低峰 |
| 今日已用 | 当日开盘余额 − 当前余额；充值自动平移，不会变成负数；跨日自动重置 |
| 外观设置 | 跟随主题 / 纯色 / 半透明 / 磨砂 / 透明 / 亚克力；标准 / 紧凑 / 极简三种版式；来源、观测起点、秒数可分别开关 |
| 中英双语 | 跟随 DSH 界面语言实时切换，无需重启 |
| 无构建 | 客户端是手写 React（`React.createElement`），装好即用，没有打包步骤 |

## 安装

要求：DSH 桌面端，并且已经登录 DeepSeek 账号或配置了 `DEEPSEEK_API_KEY`。

1. 把本仓库的 `plugin/` 目录安装为 DSH 本地插件（插件管理器选择本地目录，或写进 profile 依赖）；
2. 重载界面，侧栏底部出现金币图标。

profile 依赖示例：

```json
"dsh-balance-pocket": "link:D:/path/to/dsh-balance-pocket/plugin"
```

GitHub Release 之后也可以直接装 tarball：

```json
"dsh-balance-pocket": "https://github.com/LMC111-div/dsh-balance-pocket/releases/download/v0.1.0/dsh-balance-pocket-0.1.0.tgz"
```

本插件没有运行时依赖，也不需要 `npm install` 或构建。

## 数据从哪来

| 数据 | 来源 |
|---|---|
| 余额 | ① 已配置的 `DEEPSEEK_API_KEY` → `https://api.deepseek.com/user/balance`；② 未配置或失败 → DSH 已登录的 DeepSeek 账号（`deepseekAccount.getBalance`，充值钱包 + 赠金钱包按币种相加） |
| 峰/谷 | 北京时间：周一至周五（不含中国法定节假日）09:00–12:00、14:00–18:00 为高峰；其余时段为低峰。低峰价 = 高峰价 × 50% |
| 今日已用 | Host 端按余额观测记账：当日第一次观测 = 开盘余额，之后每次观测更新；`今日已用 = 开盘 − 当前`。跨日重置，不同来源/币种分账本 |

余额快照走本机只读路由 `GET /dsh-balance-pocket/snapshot`：先校验回环 Host、`Origin` 与
`Sec-Fetch-Site`，再委托 DSH 的信任栅栏（`connection.requestRejection`，栅栏抛错按拒绝处理）。
老版本 DSH 没有栅栏时，可通过环境变量
`DSH_BALANCE_POCKET_TRUSTED_HOSTS=myhost.lan:8313`（逗号分隔）显式放行 ——
放行后同网段任何能访问该地址的设备都能读到余额。

账本落在 `$DSH_HOME/dsh-balance-pocket/ledger.json`，不同余额来源（API Key / 账号）
与不同币种各记一本，互不混算；超过 120 天的记录自动清理。

## 隐私

- API Key / 账号 token 只用于请求 DeepSeek 官方接口，不会出现在响应、日志、错误文案或 DOM 中。
- 快照路由只服务本机，并校验 `Origin` / `Sec-Fetch-Site`。
- 账本只保存余额数值、币种与来源标识，不含任何凭据。
- 外观偏好只写浏览器 `localStorage`。

## 为什么「今日已用」有时显示 0 或「自 HH:mm 起观测」

余额接口是钱包快照、不是流水，所以插件只能观测「它运行期间」的余额变化。
如果当天插件是在中午才第一次观测到余额，之前已经产生的消费无法追回 —— 这时会显示
`partial`，界面写「自 HH:mm 起观测」，不会假装那是全天数据。
Host 每 5 分钟做一次后台观测，插件常驻时一天的数字是连续的。

## 维护点

- 节假日表在 `holidays.js`（按年份）。每年 11 月国务院公布次年放假安排后补下一年：
  只列**放假不上班**的日期，调休上班的周末不用列（周末规则天然按低峰计费）。
  表里没有的年份，弹窗会提示「节假日表未覆盖 YYYY 年」，不会默默把假期当工作日。
- 高峰期钟点若官方调整，改 `peak.js` 的 `PEAK_RANGES`。
- 价格倍数（低峰 = 高峰 × 0.5）目前只作为 `peakMultiplier` 提示，不参与计费。

## 开发与自检

```bash
node check.mjs   # 72 项：峰谷边界、节假日表覆盖、账本规则、路由与信任栅栏、客户端渲染
```

## 文件

| 文件 | 作用 |
|---|---|
| `index.js` | Host：快照路由、余额解析（API Key / 账号）、缓存与后台观测 |
| `peak.js` | 峰谷时段判定（纯函数，可独立测试） |
| `holidays.js` | 中国法定节假日表（按年份，纯数据） |
| `ledger.js` | 余额观测账本（当日已用、partial、充值平移、分账本） |
| `client.js` | Client：侧栏底部入口 + 向上弹窗 + 外观设置页（手写 React，无构建） |
| `locale/*.json` | 插件管理器里的标题/描述（中英） |
| `cordis.patch.yml` | bundle patch：插入 Host 半个插件（含重复挂载守卫） |
| `icon.svg` | 插件图标 |

架构与数据契约见仓库的 [docs/DESIGN.md](https://github.com/LMC111-div/dsh-balance-pocket/blob/main/docs/DESIGN.md)。

## English

A DSH Web/desktop plugin: a coin entry at the sidebar foot opens an upward popover with the live
DeepSeek balance (top-up + bonus), the current peak/off-peak pricing period (Beijing time) with a
countdown, and today's spend derived from balance observations. Appearance (six backgrounds, three
layouts, display toggles) is configurable under Settings → Balance Pocket with a live preview.

Install the `plugin/` directory as a local DSH plugin, or add
`"dsh-balance-pocket": "link:/path/to/plugin"` to your profile dependencies. No runtime dependencies,
no build step. The balance snapshot route is loopback-only; credentials never appear in responses,
logs or the DOM. Balance observations are stored in `$DSH_HOME/dsh-balance-pocket/ledger.json`.

Run `node check.mjs` for the self-check. Licensed under MIT.

## License

MIT © 2026 LMC111-div — see [LICENSE](LICENSE).
