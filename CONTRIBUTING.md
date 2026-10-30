# 贡献指南 · Contributing

感谢你愿意改进「余额小口袋」。这个项目很小，但希望它保持**可读、可验证、不偷数据**。

English summary at the bottom.

## 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 报告问题

- **Bug / 功能建议**：使用 [Issue 模板](https://github.com/Li111-div/dsh-balance-pocket/issues/new/choose)。
- **安全漏洞**：不要开公开 Issue，请按 [SECURITY.md](SECURITY.md) 私下报告。
- 提 Issue 前请先搜索是否已有相同问题；附上 DSH 版本、操作系统、复现步骤，以及**脱敏后的**错误信息。
  请不要贴 `DEEPSEEK_API_KEY`、账号 token 或完整的 `ledger.json`。

## 开发环境

- Node.js **>= 18**（只用于自检，插件本身没有运行时依赖）。
- 不需要 `npm install`，也没有构建步骤。
- 编辑器建议开启 EditorConfig；仓库已提供 `.editorconfig`。

```bash
node check.mjs   # 全部 72 项通过后再提交 PR
```

## 代码约定

**Host 端（`plugin/index.js`、`peak.js`、`ledger.js`）**

- 纯 ESM，零第三方依赖。
- `peak.js` / `ledger.js` 保持纯函数式、可独立测试；文件 I/O 集中在 `ledger.js`，且任何异常都不能冒泡到 UI。
- **凭据只用于请求 DeepSeek 接口**：不得写进响应、日志、错误文案或账本。
- 新增路由或读取环境变量时，同步更新 README 的「隐私与安全」和 `docs/DESIGN.md`。
- 定时器必须 `unref()` 或在 `ctx.effect` 的 disposer 里清理。

**Client 端（`plugin/client.js`）**

- 手写 React：只用 `require('react')` + `React.createElement`（`h`），不引入 JSX/构建工具。
- 颜色、字体一律使用主题 token（`--dsw-alias-*`、`--dsw-specific-*`），不要硬编码亮色/暗色。
- 所有可见文案都要同时加到 `zh` 和 `en` 字典；不要直接写死中文。
- 所有定时器、事件监听、slot 注册、locale 注册都要在 `ctx.effect` 返回的 disposer 里清理。
- 不要读取其他插件的 DOM；只通过 DSH 提供的 slot / locale / service API 工作。

**测试**

- `check.mjs` 是唯一测试入口；新增行为请补对应断言，并保持 100% 通过。
- 修改路由安全、账本规则、峰谷边界时，务必先补测试再改实现。

## 提交 PR

1. Fork 仓库，从 `main` 建分支：`feat/xxx`、`fix/xxx`、`docs/xxx`。
2. 提交信息用 [Conventional Commits](https://www.conventionalcommits.org/)：
   `feat: ...`、`fix: ...`、`docs: ...`、`chore: ...`。
3. 运行 `node check.mjs`，全绿。
4. 同步更新：`CHANGELOG.md` 的 `[Unreleased]`；有契约变化时更新 `docs/DESIGN.md`。
5. 发起 PR，填写 PR 模板里的检查项。

维护者合并时默认 **Squash and merge**，请保持一个 PR 只做一件事。

## 维护节假日表

节假日表在 `plugin/holidays.js`（按年份分组，纯数据）。国务院每年 11 月发布次年放假安排，
新增年份时：

1. 只列**放假不上班**的日期；调休上班的周末不要列（周末规则已经覆盖）。
2. 在 `check.mjs` 里补该年份的边界断言（至少：假期第一天、最后一天、节后首个工作日 09:00）。
   表结构与「每个假期都不判高峰」已有通用断言，新增年份会自动被它们检查。
3. 同步更新 README 的「已知限制」和 CHANGELOG。
4. 未收录年份不需要特殊处理：`peakState()` 会返回 `holidayCovered: false`，界面自动提示。

## 发布流程（维护者）

```bash
# 1. 更新 plugin/package.json 与根 package.json 的 version，更新 CHANGELOG.md
node check.mjs
git add -A
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

推送 `v*` 标签会触发 `.github/workflows/release.yml`：跑自检 → `npm pack` 出
`dsh-balance-pocket-<version>.tgz` → 创建 GitHub Release 并附上 tarball。
DSH 用户可以直接用这个 tarball 安装（见 README 方式 B）。

## English summary

- Be kind; read the code of conduct.
- Report bugs through the issue templates, security issues privately via SECURITY.md.
- Node >= 18 for tests only; no build step, no runtime dependencies.
- Run `node check.mjs` before opening a PR; add assertions for new behaviour.
- Keep Host code dependency-free, never log or return credentials, use theme tokens,
  add both `zh` and `en` strings, and dispose every timer/listener/slot.
- Conventional Commits, one concern per PR, update CHANGELOG and docs.
- Maintainers squash-merge, and tag `vX.Y.Z` to publish a GitHub Release tarball.
