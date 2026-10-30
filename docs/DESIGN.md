# 架构与数据契约 · Design

本文档描述「余额小口袋」的内部结构、数据契约与安全边界。它是代码之外唯一的实现说明；
修改行为时请同步更新这里（见 [CONTRIBUTING.md](../CONTRIBUTING.md)）。

## 目标与非目标

**目标**：在 DSH Web/桌面端的侧栏底部提供一个常驻入口，用最低打扰的方式展示
DeepSeek 余额、峰谷时段和今日已用；外观可配置；凭据绝不出本机。

**非目标**：不做账单/流水分析（余额接口本身不是流水），不替代官方用量面板，
不新建独立页面，不引入第三方运行时依赖或构建链。

## 架构

```
plugin/
  package.json         DSH 插件清单：dsh.bundle.patch + dsh.client
  cordis.patch.yml     bundle patch：把 Host 半个插件插入 entry list（含重复挂载守卫）
  index.js             Host：快照路由、余额来源、缓存、后台观测
  peak.js              峰谷时段判定（纯函数）
  holidays.js          中国法定节假日表（按年份，纯数据）
  ledger.js            余额观测账本（文件 I/O 集中在此，永不向调用方抛错）
  client.js            Client：手写 React，经 window.__ModuleLoader__.load 注册
  locale/{zh,en}.json  插件管理器展示用的标题/描述
  icon.svg             插件图标
```

- **Host 半个插件**：`index.js` 导出 `apply(ctx)` 与 `inject: ['webServer']`，
  在 `ctx.effect` 中注册只读路由和后台观测定时器。
- **Client 半个插件**：`client.js` 通过 `dsh.client` 清单由 DSH 加载，
  导出 `apply(ctx)` 与 `inject: ['slots', 'locale']`，注册三个 slot occupant：
  `sidebar.footer.action`（入口按钮）、`shell.overlay`（弹窗）、`settings.section`（外观设置页）。
- **无构建**：客户端直接使用浏览器模块表提供的 `react`，只用 `React.createElement`（`h` 助手），
  不写 JSX；`plugin/` 目录就是完整发布包。

## 快照契约

`GET /dsh-balance-pocket/snapshot` → `200 application/json`，`Cache-Control: no-store`。

```jsonc
{
  "ok": true,
  "serverNowMs": 1790000000000,          // Host 当前时间，前端用于校准倒计时
  "balance": {
    "available": true,
    "total": 123.45,                     // 充值 + 赠金，<=6 位小数
    "recharge": 100.0,
    "bonus": 23.45,
    "currency": "CNY",
    "source": "api-key",                 // "api-key" | "account"
    "updatedAtMs": 1790000000000,
    "stale": false,                      // 网络抖动时复用旧值标记
    "staleMs": null
  },
  "balanceError": null,                  // available=false 时的人话错误
  "peak": {
    "isPeak": false,
    "reason": "off-hours",               // "peak" | "weekend" | "holiday" | "off-hours"
    "periodStartAtMs": 1790000000000,
    "nextChangeAtMs": 1790003600000,
    "nextIsPeak": true,
    "peakMultiplier": 2,                 // 仅提示，不参与计费
    "holidayCovered": true,              // false = 该年份不在节假日表里
    "holidayYear": 2026,
    "holidayYears": [2025, 2026]
  },
  "today": {
    "day": "2026-10-30",                 // 北京时间日历日
    "used": 1.23,                        // 无法观测时为 null
    "currency": "CNY",
    "partial": true,                     // 当日首次观测晚于 00:15
    "observedFromMs": 1790000000000,
    "observedToMs": 1790000000000,
    "source": "balance-observation"
  }
}
```

规则：

- 余额优先级：① `ctx.get('credentials').resolve('DEEPSEEK_API_KEY')` →
  `https://api.deepseek.com/user/balance`；② 失败或没有 key 时
  `ctx.get('deepseekAccount').getBalance(clientMetadata())`（充值钱包 + 赠金钱包按币种相加）。
  两条路都失败时 `balance.available=false`，错误文案放 `balanceError`，路由仍返回 200。
- 路由**不抛 500**：任何内部异常都变成 `{ ok: false, serverNowMs, error }`，前端显示可重试。
- `HEAD` 返回 200 无 body；非 GET/HEAD 返回 405；不可信请求返回 403。
- **凭据绝不出现在任何字段、日志或错误文案中。**

## 峰谷判定（`peak.js`）

官方规则（北京时间，无夏令时）：

- 高峰：**周一至周五 09:00–12:00、14:00–18:00**，不含中国法定节假日；
- 其余全部时段为低峰：周末、法定节假日全天、12:00–14:00、夜间；
- 低峰价 = 高峰价 × 50%（`peakMultiplier: 2` 仅用于提示）。

实现要点：

- 所有判定基于「北京时间日历」：`atMs + 8h` 后取 UTC 字段，避免宿主时区影响。
- 峰谷只会在北京 00:00 / 09:00 / 12:00 / 14:00 / 18:00 这些候选边界翻转；
  对每个候选点比较 `isPeakAt(t)` 与 `isPeakAt(t - 1)`，只有真正翻转的点才算
  时段起点 / 下次切换点（`periodStartAtMs` / `nextChangeAtMs`）。
  这样节假日、周末与工作日交界处也能得到正确结果。
- 节假日表在 `holidays.js`，按年份分组，只列**放假不上班**的日期；调休上班的周末不列
  （周末规则天然按低峰计费）。当前覆盖 2025–2026。
- **未覆盖年份必须显式降级**：`peakState()` 返回 `holidayCovered: false` 与 `holidayYear`，
  快照透传，弹窗显示「节假日表未覆盖 YYYY 年」，`check.mjs` 断言这一点。
  宁可承认不知道，也不要把假期当工作日（那会让峰谷徽标与实际计费相反）。
- 每年 11 月国务院公布次年安排后补表，并在 `check.mjs` 补该年份断言（假期首日、末日、节后首个工作日）。

## 今日已用账本（`ledger.js`）

余额接口是钱包快照，不是流水，因此「今日已用」只能由观测推导：

- 当日首次观测 = 开盘余额；之后每次观测更新最新余额；
  `used = max(0, 开盘 − 最新) / 1e6`（内部用整数微元存储，避免浮点误差）。
- **充值平移**：余额上升时把开盘余额同步抬高相同数额，因此充值不会让已用变小或变负。
- 乱序/重复观测忽略；非法金额拒绝且不污染账本。
- 不同来源（`api-key` / `account`）与不同币种分账本，绝不跨币种混算。
- 当日首次观测晚于 00:00 超过 15 分钟 → `partial: true` + `observedFromMs`，
  界面写「自 HH:mm 起观测」；恰好 15 分钟仍算完整。
- 持久化：`$DSH_HOME/dsh-balance-pocket/ledger.json`，原子写（临时文件 + rename），
  文件损坏/不可写时静默降级为空账本，绝不打断余额显示；超过 120 天的记录自动清理。
- Host 每 5 分钟后台观测一次，所以插件常驻时数字是连续的。

## 客户端（`client.js`）

- **共享 store**：模块级 `{ open, closing, anchor, sidebar, snapshot, loading, error, offsetMs, appearance }`，
  通过 `React.useSyncExternalStore` 订阅；三个 occupant 共享同一份状态。
- **入口按钮**：32×32，宽栏（`ownerProps.wide`）时显示余额与状态点；
  `aria-haspopup="dialog"`、`aria-expanded`、本地化 `title`/`aria-label`。
- **弹窗**：`shell.overlay` 中 `position: fixed` 的 `role="dialog"`，宽度 280（窄栏时收进侧栏宽度），
  锚点为按钮 `getBoundingClientRect()`：向上弹出，空间不足（< 180px）改为向下；
  resize/scroll 重算；点外部、Esc、窗口失焦关闭；打开时立即拉取并每 30 秒轮询，关闭即清定时器。
- **外观设置**：独立 `settings.section` 页面（`order: 45`，label 来自 i18n），
  左栏三张卡片（背景 / 版式 / 显示）+ 右栏实时预览；改动立即写
  `localStorage['dsh-balance-pocket:appearance:v1']`，只影响当前浏览器。
  背景六选一（主题 / 纯色 / 半透明 / 磨砂 / 透明 / 亚克力），版式三选一（标准 / 紧凑 / 极简），
  不透明度与模糊半径仅在相关背景出现；纯色用亮度估算反转文字/边框 token。
- **i18n**：`ctx.locale.register('balancePocket', 'zh' | 'en', dict)`，
  `t(key, params)` 每次调用都读当前 locale，并订阅语言切换触发重渲染；缺 key 时回退中文。
- **清理**：所有 slot 注册、locale 注册/订阅、定时器、全局事件监听都在 `ctx.effect` 返回的 disposer 中释放；
  卸载时重置共享 store，避免残留状态。
- **无障碍**：图标按钮都有 label；开关是 `role="switch"` + `aria-checked`；
  分段选择器用 `aria-pressed`；弹窗打开时焦点移到对话框根节点（不做焦点陷阱，Esc 可关闭）。
- 颜色全部来自主题 token；只有用户自选纯色背景会在卡片内局部覆盖 `--dsw-alias-*`，
  保证主题插件仍然能整体换色。

## 安全模型

1. **两层信任**：先做插件自己的轻量校验（Host 必须回环、`Sec-Fetch-Site` 不得为 `cross-site`、
   带 `Origin` 时必须与 Host 同源），再在 Harness 提供 `connection.requestRejection` 时**委托**它
   （它知道 `--trusted-host`、反向代理与 GUI 鉴权）；栅栏抛异常一律按拒绝处理（fail-closed）。
   没有栅栏的老 Harness 才回落到 `DSH_BALANCE_POCKET_TRUSTED_HOSTS` 显式放行列表。
   `connection` 是**可选服务**（`ctx.get('connection')`），绝不写进 `inject`，否则老宿主上整个插件不会 apply。
2. 凭据只用于请求 DeepSeek 官方接口，不写响应、日志、错误文案、DOM、账本。
3. 插件只读：除自己的账本文件外不写任何东西，不读其他插件 DOM，不改 profile。
4. 无第三方运行时依赖；客户端不加载远程脚本。
5. 内部错误使用通用文案，不暴露堆栈或路径。
6. 客户端 fetch 带 15 秒超时，避免挂起请求让界面永远停在「加载中」；
   复用旧读数时会标注「数据延迟 N 秒」，不把过期值当实时值。
7. 钱包解析把「字段缺失」与「余额为 0」严格区分：`null` / `''` / 非数字一律视为不可用，
   绝不渲染成 `¥0.00`。

详见 [SECURITY.md](../SECURITY.md)。

## 测试（`check.mjs`）

单文件自检，`node check.mjs`（Node >= 18），共 72 项断言：

- 峰谷时刻与边界（含毫秒边界、周末、节假日、春节、跨日切换点）；
- 节假日表结构（年份有序、日期格式与归属年份、每个假期都不判高峰）与**未覆盖年份降级**；
- 账本规则（跨日、充值平移、乱序、partial 边界、币种隔离、损坏文件、非法金额）；
- 钱包解析：缺失/null/空串不得当成 0、仅赠金账号可用、同币种充值与赠金相加、CNY 优先；
- Host 半个插件：真实 `import`、fake Cordis ctx、路由的 403/405/HEAD/200 与凭据不泄露；
  信任栅栏委托（宿主放行→200、宿主拒绝→沿用状态码、栅栏抛错→403、跨站仍拒绝）；
- Client 半个插件：stub 模块加载器、三个 slot 注册、设置页渲染与偏好持久化、
  弹窗各版式/背景渲染、图标按钮数量、stale 标注与节假日未覆盖提示；
- 清单与资源：`package.json` 字段、locale JSON、`icon.svg`、patch YAML。

测试通过 `DSH_HOME` 指向临时目录，绝不污染真实账本。

## 兼容性与维护

- 针对 2026-10 的 DSH desktop（`sidebar.footer.action` / `shell.overlay` / `settings.section` 等 slot）开发。
  DSH 的 slot 契约变化时，可能需要同步调整注册位置。
- 峰谷钟点若官方调整，改 `PEAK_RANGES`；节假日表（`holidays.js`）每年 11 月更新。
- 余额来源依赖 DSH 的 `credentials` 与 `deepseekAccount` 服务；任一不可用时自动走另一条路。
  冷启动时凭据服务可能尚未就绪，会短暂重试一次再判定「未配置」。
- 重复挂载守卫：`cordis.patch.yml` 的 `disabled: !!js` 表达式会在聚合 bundle 已挂载同名包时
  退让，避免两条 exact 路由导致启动失败。
