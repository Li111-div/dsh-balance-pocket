# 安全策略 · Security Policy

## 支持范围

| 版本 | 支持 |
|---|---|
| 0.1.x | ✅ 接受安全报告 |
| < 0.1.0 | ❌ 不提供支持 |

## 报告漏洞

**请不要开公开 Issue。** 请使用 GitHub 的私密漏洞报告：

👉 https://github.com/LMC111-div/dsh-balance-pocket/security/advisories/new

报告里请包含：受影响的版本、复现步骤、影响描述，以及（如有）最小 PoC。
**不要**附带真实的 `DEEPSEEK_API_KEY`、账号 token 或完整账本文件；如需展示，请打码或使用伪造值。

我会尽快确认收到并评估影响；修复发布后会在 Advisory 与 CHANGELOG 中致谢（除非你希望匿名）。

## 设计上的安全边界

这个插件处理余额与凭据，因此以下约束属于**安全契约**，任何改动都不得削弱：

1. **凭据不出 Host 端**：`DEEPSEEK_API_KEY` / 账号 token 只用于向 DeepSeek 官方接口发请求，
   不得出现在快照响应、日志、错误文案、DOM 或账本文件中。
2. **快照路由只服务本机**：`GET /dsh-balance-pocket/snapshot` 校验 `Host` 必须是回环地址
   （`localhost` / `127.0.0.0/8` / `::1`），并校验 `Origin` 与 `Sec-Fetch-Site`，拒绝跨站请求。
   通过局域网/反向代理访问属于显式选择加入，需要设置 `DSH_BALANCE_POCKET_TRUSTED_HOSTS`。
3. **只读**：插件不写 profile、不改其他插件数据；唯一的落盘是 `$DSH_HOME/dsh-balance-pocket/ledger.json`，
   内容只有日期、余额数值、币种和来源标识。
4. **最小依赖**：Host 与 Client 都不引入第三方运行时依赖，客户端无构建、无远程脚本。
5. **错误不泄露内部信息**：路由任何内部失败都返回 200 + 通用错误文案，不返回堆栈、路径或凭据。

## 不在范围内

- 需要用户先安装恶意插件/修改系统才能触发的攻击；
- DeepSeek 官方接口自身的安全问题（请报告给 DeepSeek）；
- 已明确标注为「仅提示、不参与计费」的展示逻辑。

## English

Report vulnerabilities privately via GitHub Security Advisories
(https://github.com/LMC111-div/dsh-balance-pocket/security/advisories/new), never in a public issue.
Do not include real API keys or tokens. Supported versions: 0.1.x.

Security contract: credentials never leave the Host process and never appear in responses/logs/DOM;
the snapshot route is loopback-only with Origin and Sec-Fetch-Site checks (LAN access is opt-in via
`DSH_BALANCE_POCKET_TRUSTED_HOSTS`); the plugin is read-only apart from its own ledger file; no
third-party runtime dependencies; internal errors are never exposed verbatim.
