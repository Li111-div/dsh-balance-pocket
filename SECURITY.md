# 安全策略 · Security Policy

## 支持范围

| 版本 | 支持 |
|---|---|
| 0.1.x | ✅ 接受安全报告 |
| < 0.1.0 | ❌ 不提供支持 |

## 报告漏洞

**请不要开公开 Issue。** 请使用 GitHub 的私密漏洞报告：

👉 https://github.com/Li111-div/dsh-balance-pocket/security/advisories/new

报告里请包含：受影响的版本、复现步骤、影响描述，以及（如有）最小 PoC。
**不要**附带真实的 `DEEPSEEK_API_KEY`、账号 token 或完整账本文件；如需展示，请打码或使用伪造值。

我会尽快确认收到并评估影响；修复发布后会在 Advisory 与 CHANGELOG 中致谢（除非你希望匿名）。

## 设计上的安全边界

这个插件处理余额与凭据，因此以下约束属于**安全契约**，任何改动都不得削弱：

1. **凭据不出 Host 端**：`DEEPSEEK_API_KEY` / 账号 token 只用于向 DeepSeek 官方接口发请求，
   不得出现在快照响应、日志、错误文案、DOM 或账本文件中。
2. **快照路由两层信任**：先校验 `Host` 必须为回环地址（`localhost` / `127.0.0.0/8` / `::1`）、
   `Sec-Fetch-Site` 不得为 `cross-site`、带 `Origin` 时必须与 `Host` 同源；随后在 Harness 提供
   `connection.requestRejection` 时**委托**宿主栅栏（它知道 `--trusted-host` 与反向代理），
   栅栏抛异常一律按拒绝处理（fail-closed）。仅在没有栅栏的老 Harness 上，
   才回落到 `DSH_BALANCE_POCKET_TRUSTED_HOSTS` 显式放行列表 ——
   **放行后同网段任何能访问该地址的设备都能读取余额**，属于用户显式选择加入的风险。
3. **只读**：插件不写 profile、不改其他插件数据；唯一的落盘是 `$DSH_HOME/dsh-balance-pocket/ledger.json`，
   内容只有日期、余额数值、币种和来源标识。
4. **最小依赖**：Host 与 Client 都不引入第三方运行时依赖，客户端无构建、无远程脚本。
5. **错误不泄露内部信息**：路由任何内部失败都返回 200 + 通用错误文案，不返回堆栈、路径或凭据。
6. **不假装知道**：钱包字段缺失时判为「不可用」而不是 `0`；节假日表未覆盖的年份会在界面明确提示，
   复用过期读数会标注延迟时间 —— 宁可显示「不知道」，也不给用户一个看起来确定但错误的值。

## 不在范围内

- 需要用户先安装恶意插件/修改系统才能触发的攻击；
- DeepSeek 官方接口自身的安全问题（请报告给 DeepSeek）；
- 已明确标注为「仅提示、不参与计费」的展示逻辑。

## English

Report vulnerabilities privately via GitHub Security Advisories
(https://github.com/Li111-div/dsh-balance-pocket/security/advisories/new), never in a public issue.
Do not include real API keys or tokens. Supported versions: 0.1.x.

Security contract: credentials never leave the Host process and never appear in responses/logs/DOM;
the snapshot route validates loopback `Host`, `Origin` and `Sec-Fetch-Site`, then delegates to the
Harness trust fence (`connection.requestRejection`) when present and fails closed if it throws —
LAN access is opt-in via `DSH_BALANCE_POCKET_TRUSTED_HOSTS` only on Harnesses without that fence, and
doing so exposes the balance to anyone on that network; the plugin is read-only apart from its own
ledger file; no third-party runtime dependencies; internal errors are never exposed verbatim;
missing wallet fields are reported as unavailable rather than 0, an uncovered holiday year is labelled,
and a reused stale reading shows its age.
