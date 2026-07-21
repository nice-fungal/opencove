# RUNBOOK · Mac 二次开发执行步骤

> updated_by: Kilo - k3
> updated_at: 2026-07-24 09:55:20
> scope: 在 macOS（Apple Silicon / Intel）上把 OpenCove 开发环境跑起来并具备二次开发能力
> 关联: 技术调研结论见文末「附录：OpenCove 技术调研报告（原 WORKSHOP-005）」

## 1. 启动开发环境

```bash
pnpm dev
```

### 3.1 复用已安装版 userData（可选）

```bash
OPENCOVE_DEV_USE_SHARED_USER_DATA=1 pnpm dev
```

### 3.2 自定义 dev 数据目录（可选）

```bash
OPENCOVE_DEV_USER_DATA_DIR=/path/to/userData pnpm dev
```

### 3.3 强制本机 Worker 客户端模式（可选）

```bash
OPENCOVE_WORKER_CLIENT=1 pnpm dev
```

---

## 2. 改 Worker / Web UI / Control Surface 源码后

Worker 跑 `out/main/worker.js`，不随 `pnpm dev` HMR 更新。改源码后：

```bash
pnpm build
```

再重启 App（`pnpm dev`）。

---

## 3. 验证命令

类型检查：

```bash
pnpm check
```

Lint：

```bash
pnpm lint
```

格式检查：

```bash
pnpm format:check
```

单元测试：

```bash
pnpm test -- --run
```

E2E（含 build）：

```bash
pnpm test:e2e
```

终端恢复原生测试：

```bash
pnpm test:terminal-recovery:native
```

架构 harness：

```bash
pnpm arch:check
```

---

## 4. 提交前门槛

1. 暂存改动：

   ```bash
   git add <files>
   ```

2. 行数门禁（只查 staged 文件）：

   ```bash
   pnpm line-check:staged
   ```

3. 命名门禁：

   ```bash
   pnpm naming-check:staged
   ```

4. UI 样式检查：

   ```bash
   pnpm ui:style-check
   ```

5. 全量提交闸（type / lint / format / test / e2e:pre-commit）：

   ```bash
   pnpm pre-commit
   ```

### 6.1 用户可感知变化（功能 / UX / bug fix / 默认行为变化）

先 `pnpm build`，再跑 E2E：

```bash
pnpm build
pnpm test:e2e
```

### 6.2 改 Renderer 用户可见文案

同步更新 i18n：

- `src/app/renderer/i18n/locales/en.ts`
- `src/app/renderer/i18n/locales/zh-CN.ts`

### 6.3 改动影响架构契约

若改动触及依赖方向、层职责、进程边界、allowlist、禁止 import/API 或 severity：

```bash
pnpm arch:doc-sync
```

---

## 5. 单跑 Playwright 用例

前置 `pnpm build`：

```bash
pnpm build
pnpm exec playwright test tests/e2e/xxx.spec.ts
```

---

## 6. 测试失败排查

任何 `pnpm pre-commit` / `pnpm test -- --run` / `pnpm test:e2e` / Playwright 单用例失败，先读：

- `docs/development/DEBUGGING.md`

---

## 7. 打包产物（可选）

Apple Silicon：

```bash
pnpm build:mac:arm64
```

Intel：

```bash
pnpm build:mac:x64
```

未签名：

```bash
pnpm build:mac:unsigned
```

standalone runtime：

```bash
pnpm build:standalone
```

解包目录：

```bash
pnpm build:unpack
```

---

## 8. 最小可跑序列

```bash
pnpm dev
```

改 Worker / Web UI 后：

```bash
pnpm build && pnpm dev
```

---

## 9. TODO

### 9.1 接入 Claude Code CLI

Claude Code 是 OpenCove 内置 provider（`claude-code`），通常无需二开，仅环境配置：

1. 安装 CLI：`npm i -g @anthropic-ai/claude-code`（或官方安装脚本）。
2. 首次运行 `claude` 完成登录 / API key 配置。
3. 启动 OpenCove（`pnpm dev`），画布右键 → `Run Agent` → 选 Claude Code。
4. 若菜单不可见：`Settings → Agents` 检查 provider 顺序与 executable override；确认 `/opt/homebrew/bin` 或 `~/.npm-global/bin` 在 PATH（dev 默认 fallback 已覆盖 homebrew）。
5. 验证：创建 Task 节点 → 写需求 → Run，确认 agent 节点出现在右侧并显示 working/standby 状态。

### 9.2 接入 Kilo CLI

Kilo 未注册为 provider，需二开（详见文末附录「Task 节点与任务编排深入分析」与「Worktree 模式讨论与禁用方案」）：

1. 档 2（注册 provider，MVP）：
   - `shared/contracts/dto/agent.ts` 的 `AgentProviderId` 加 `'kilo'`。
   - `agentSettings.providers.ts` 的 `AGENT_PROVIDERS` 加 `'kilo'`；`agentSettings.providerMeta.ts` 加 label + capabilities（起步 `runtimeObservation:'none'`）。
   - `AgentCommandFactory.ts`：`resolveAgentCliCommand('kilo')` → `'kilo'`；新增 kilo 分支（new: `kilo`；resume: `kilo run --session <id> --continue`）。
   - 补 `KiloModelCatalog.ts`（`kilo models --format json`）、i18n 双语、E2E（`*.kilo.spec.ts`）。
   - 走 Spec → Plan → `pnpm pre-commit`（含 E2E）。
2. 档 3（原生 provider-api，按需）：
   - 接 `kilo serve` / `kilo acp` + reserved local port（复用 opencode port-reservation 路径）。
   - 新增 `KiloSessionApi.ts` / `KiloSessionStateWatcher.ts`，`runtimeObservation:'provider-api'`。
   - Feasibility 先行：确认 `kilo run --format json` 事件 schema 与 ACP 协议稳定性。
3. 关键能力目标：任务编排（Task→Run 喂 Kilo）+ 状态观测（working/standby + 标题同步）；worktree 无关。

---

## 附录：OpenCove 技术调研报告（原 WORKSHOP-005）

> updated_by: HBR - glm-5.2（二开后源码核查重写）
> updated_at: 2026-07-23 23:18:35
> evidence_window: 2026-07-23（二开后源码核查）
> note: 本附录整合自原 `.context/WORKSHOP-005.md`（2026-07-24 并入 RUNBOOK，原文件已删除）

### 交付结论

本次二开后重核确认：

0. **工作机合规**：支持 Windows / macOS 工作机安装，主体功能运行在 PC 本地（Worker 进程 + 本机 SQLite + 本机 PTY）；经调研**不存在 SaaS 版**，无官方云端网关。
1. OpenCove 是基于 Electron + React + TypeScript 的空间开发工作台，专为 AI 编码代理设计。
2. 源码可见；Worker 可自托管，不强制在线校验。
3. SQLite 嵌入式数据库 + HTTP Control Surface 统一接口。
4. 桌面应用 / CLI / Web UI 三种接入方式，具备 managed SSH 远程 Worker 能力。
5. 单进程 Worker 模式（源码推导），无分布式协调。

### 技术画像

#### 开源属性与自托管

| 属性 | 结论的证据等级 | 证据锚点 |
| --- | --- | --- |
| 自托管 | 已核源码事实 | Worker 自托管部署；`docs/runtime/RELEASING.md`（详见「Standalone Worker」章节） |
| 网络出口（可选） | 已核源码事实 | 见下表「可选网络出口」 |

**可选网络出口**（已核源码事实）：

| 出口 | 触发条件 | 证据锚点 |
| --- | --- | --- |
| Control Surface 默认 loopback | Worker 默认仅本机监听 | `docs/architecture/CONTROL_SURFACE.md` |
| GitHub Release 自动更新 | Desktop 启用 auto-update 时 | `package.json` `electron-updater`；`docs/runtime/RELEASING.md` |
| GitHub Release 下载 / 安装脚本 | 用户主动安装或升级 | `docs/runtime/RELEASING.md` |
| Managed SSH remote endpoint | 用户配置远程 Worker | `docs/architecture/CONTROL_SURFACE.md` |
| AI 代理外部 API | 启动 Claude Code / Codex 等会话 | 产品定位（README） |

**证据锚点**：
- 部署与网络：`docs/runtime/RELEASING.md`

#### 基础设施分析

##### 运行时拓扑与凭证文件

由 Worker 在 userData 目录运行时读写，**非**用户可编辑配置，亦**非** SQLite 持久化：

| 文件 | 形态 | 内容 | 证据锚点 |
| --- | --- | --- | --- |
| `worker-topology.json` | JSON | 拓扑注册表：remote endpoint 记录（managed SSH / 手动远程 Worker）+ mount 记录（mountId→endpointId→rootPath/rootUri） | `src/app/main/controlSurface/topology/topologyFileV1.ts`（`TopologyFileV1`）、`docs/architecture/PERSISTENCE.md` |
| `worker-endpoint-secrets.json` | JSON | 凭证存储：按 `credentialRef` 索引的 endpoint bearer token，与拓扑分文件存放 | 同上（`SecretsFileV1`） |

> SQLite 数据库、schema 版本、表结构见文末「数据库与持久化」章节。

##### 对外接口

**HTTP 传输面**（已核源码事实，5 条主路径，非 handler 模块数）：

| 接口类型 | 路径 | 功能 | 证据锚点 |
| --- | --- | --- | --- |
| HTTP | `/invoke` | Command/Query 调用 | `docs/architecture/CONTROL_SURFACE.md` |
| HTTP | `/events` | Server-Sent Events 流 | 同上 |
| WebSocket | `/pty` | PTY 流 attach/control | 同上 |
| HTTP | `/auth/claim` | Ticket 换 Cookie（loopback） | 同上 |
| HTTP | `/auth/login` | Web UI 密码登录（LAN） | 同上 |

**Handler 模块统计**（已核源码事实）：`src/app/main/controlSurface/handlers/` 下共 **42** 个 TypeScript 模块文件。此为 command/query handler 实现模块数，**不等于** HTTP 端点数量或稳定 API 面计数。

**CLI 命令**：入口 `src/app/cli/opencove.mjs`；Worker 子命令含 `worker start` 等（`docs/runtime/RELEASING.md`）。

**鉴权中间件**（源码推导）：`src/app/main/controlSurface/http/requestAuth.ts`、`webAuthRoutes.ts`、`webSessionManager.ts`。

**操作组**（已核源码事实，摘自 `CONTROL_SURFACE.md`）：
- Core system：`system.ping`、`system.homeDirectory`
- Topology：`endpoint.*`、`mount.*`
- Filesystem：`filesystem.*`、`filesystem.*InMount`
- Sessions：`session.*`、`pty.*`
- Canvas control：`node.*`、`canvas.focus`

##### 消息通信

| 机制 | 用途 | 实现方式 | 证据等级 |
| --- | --- | --- | --- |
| HTTP `/invoke` | 同步 command/query | Node.js `http` | 已核源码事实 |
| SSE `/events` | 状态 sync 推送 | `event: opencove.sync`，带 `revision` 作 event id | 已核源码事实（`http/syncSse.ts`） |
| WebSocket `/pty` | PTY 双向流 | `ws` 库；`ptyStream/` 模块族 | 已核源码事实 |
| Electron IPC | Renderer ↔ Main | preload 白名单 | 已核源码事实 |
| 应用层健康检查 | Worker / endpoint 可达性 | `system.ping`、`endpoint.ping` | 已核源码事实 |

**边界说明**（未决 / 源码推导）：
- **调度 tick vs 网络心跳**：未发现独立 cron/scheduler 中间件；PTY output checkpoint 使用 bounded trailing debounce（`PERSISTENCE.md` Terminal Recovery 章节）
- **WebSocket ping/pong 帧**：未在 `ptyStream/` 抽样中证实独立 ping/pong 帧实现；长连接保活机制未运行验证
- **断线恢复**：Remote PTY 有 overflow reset、replay cursor、instance fence 机制（`PERSISTENCE.md`）；SSE 断线后的客户端重连行为未运行验证

> 任务队列与 Worker 协调机制见文末「任务队列与协调机制」章节。

#### 部署形态分析

##### 支持的部署方式

| 形态 | 平台 | 产物 | 证据锚点 |
| --- | --- | --- | --- |
| 桌面应用 | macOS / Windows / Linux | Electron 安装包（`.dmg` / `.exe` / AppImage / deb） | `docs/runtime/RELEASING.md` |
| Web UI | 浏览器 | Worker 同源托管 | `docs/runtime/WEB_UI_TROUBLESHOOTING.md` |
| 源码构建 | 任意平台 | `pnpm build` | `README.md` |

> Standalone CLI/Worker runtime bundle 见文末「Standalone Worker」章节。

##### 工作机安装（Windows / macOS）

<!-- // RUNBOOK v2026-07-18 核心调研焦点：工作机不允许是 Linux；必须覆盖安装方式、运行入口、依赖、权限、卸载五项 -->

###### Windows 安装方式与入口

| 项目 | 结论 | 证据锚点 |
| --- | --- | --- |
| Desktop 产物 | `pnpm build:win` → `*.exe` | `docs/runtime/RELEASING.md` |
| 权限推断 | Desktop 用户级安装，**推断**无需管理员权限 | 源码推导；**未在 Windows 实机验证** |
| 自动更新 | Windows Release 含 `latest*.yml` metadata；auto-update 可用 | `docs/runtime/RELEASING.md` |

> Standalone Worker（`opencove-server-windows-<arch>.zip` 及其一键安装命令、PATH、CLI launcher）见文末「Standalone Worker」章节；该模式实际不使用。

###### macOS 安装方式与入口

| 项目 | 结论 | 证据锚点 |
| --- | --- | --- |
| Desktop 产物 | `pnpm build:mac:arm64` / `pnpm build:mac:x64` → `.dmg` / `.zip`（拆分架构，无 universal） | `docs/runtime/RELEASING.md` |
| Desktop 签名状态 | **未签名 / 未公证**（unsigned / ad-hoc） | 同上；`README.md` |
| Desktop 首次打开 | Gatekeeper 拦截，需 `xattr -dr com.apple.quarantine /Applications/OpenCove.app` | `README.md` |
| 自动更新 | macOS unsigned/ad-hoc 构建禁用更新检查；需手动从 GitHub Releases 下载新版本 | `docs/runtime/RELEASING.md` |

> Standalone Worker（`opencove-server-darwin-<arch>.tar.gz` 及其一键安装命令、PATH、CLI launcher）见文末「Standalone Worker」章节；该模式实际不使用。

###### 依赖、权限与网络要求

| 项 | Windows | macOS | 证据等级 |
| --- | --- | --- | --- |
| 运行时（源码构建） | Node.js >= 22.12.0 + pnpm >= 9.6.0 | 同左 | `README.md`、`RELEASING.md` |
| 安装权限 | Desktop 用户级安装，推断无需管理员 | Desktop 用户级安装，推断无需 sudo | 源码推导 |
| 网络出口（安装时） | 访问 GitHub Releases 下载产物 | 同左 | `RELEASING.md` |
| 网络出口（运行时） | Worker 默认绑定 `127.0.0.1`（loopback），不暴露 LAN | 同左 | `src/app/worker/index.ts` 已核源码事实 |
| 可选网络出口（LAN） | 需显式 `--hostname 0.0.0.0` + `--web-ui-password` | 同左 | 同上 |
| AI 代理外部 API | 启动 Claude Code / Codex 等会话时 | 同左 | `README.md` |

###### 卸载方式

Desktop 卸载按 OS 标准方式（移除 `.app` / 卸载 `.exe`）；不会自动清理 userData 目录（`opencove.db` 等），需手动删除。

> Standalone Worker 的卸载脚本（`opencove-uninstall.*`）见文末「Standalone Worker」章节。

##### 主体功能运行位置

<!-- // RUNBOOK 规定：主体必须在 PC 本地 -->

**判定**：主体功能运行在 **PC 本地**，符合 find-agent-infra RUNBOOK 要求。

| 主体能力 | 运行位置 | 证据锚点 |
| --- | --- | --- |
| Worker 进程（Control Surface + 业务逻辑） | 本机 Node.js 进程 | `src/app/worker/index.ts` 已核源码事实 |
| 持久化真身（`opencove.db`） | 本机磁盘（userData 目录） | `src/app/worker/userData.ts` 已核源码事实 |
| PTY / 终端运行时 | 本机 `node-pty` + headless PTY runtime | `src/app/worker/index.ts`（`createHeadlessPtyRuntime`） |
| 画布 UI | Desktop：Electron Renderer（本机）；Web UI：浏览器（连本机 Worker） | `README.md`；`docs/runtime/WEB_UI_TROUBLESHOOTING.md` |
| AI 代理会话 | 本机 PTY 内运行 Claude Code / Codex 等 CLI | 产品定位 |

**权威状态**：所有权威状态由本机 Worker 进程独占持有（durable truth owner）。

##### 桌面应用独立性

**结论**：实际部署形态 = Desktop Electron App 自拉 Worker。非「单文件完全独立运行」，亦非外部独立 Worker。

**实际启动链路**（已核源码事实）：
- Desktop Electron 主进程启动时，由 `localWorkerManager.ts` 用 `spawn(process.execPath, args, { env: { ELECTRON_RUN_AS_NODE: '1' } })` 拉起一个 Worker 子进程（同一份 Electron 二进制以纯 Node 模式运行）。
- Renderer 经 Electron IPC 调用 Main；Main 作为 client 连接 Worker Control Surface（HTTP/WebSocket）。
- 数据持久化在 Worker 侧的 SQLite；Web UI 由 Worker 同源托管。

**配置方式**：
- 连接信息：`control-surface.json`（运行时发现文件，非 durable truth）
- 鉴权：Bearer token 或 Cookie session
- LAN 访问：需启用 Web UI password

> 手动 `opencove worker start` 无头服务即 Standalone Worker，见文末「Standalone Worker」章节；该模式实际不使用。

#### 客户端接入分析

##### 官方接入面

| 接入面 | 协议 | 鉴权 | 典型用途 |
| --- | --- | --- | --- |
| Desktop 应用 | Electron IPC（Renderer→Main）+ HTTP/WebSocket（Main→Worker） | 内部 + Bearer | 图形界面交互 |
| CLI | HTTP + WebSocket | Bearer token | 脚本自动化 |
| Web UI | HTTP + SSE + WebSocket | Cookie session | 浏览器访问 |

##### 协议开放性（架构能力，非部署方式）

Control Surface 的协议面对外开放，CLI / Web UI / 自定义 client 均可不经中间代理直连 Worker。这是**技术架构设计能力**，非推荐部署形态——实际部署以 Desktop App 自拉 Worker 为主，外部直连不作生产用途。

**协议面**（已核源码事实）：
- HTTP `/invoke`：JSON command/query
- HTTP `/events`：SSE 事件流
- WebSocket `/pty`：PTY 双向流

**鉴权方式**：
- 程序化调用：`Authorization: Bearer <token>`
- Browser 访问：`/auth/claim`（loopback）或 `/auth/login`（LAN）

#### 架构范式推导

##### 当前架构形态

**结论**（源码推导）：单进程 Worker 模式，支持多 client 连接。

**拓扑结构**（已核源码事实）：

```
Desktop App ←→ Local Worker ←→ Remote Worker (SSH)
     ↓              ↓
   Renderer    SQLite DB
     ↓              ↓
   Web UI ←→ Control Surface
```

**关键特征**：
- Worker 是 durable truth owner
- Desktop / CLI / Web UI 都是 client
- 通过 Control Surface 统一接口访问
- 支持远程 endpoint（managed SSH）

### 场景化选型结论

> 本节为场景适配推断，**非**最终选型裁决。

#### 适用场景

- **个人开发者**：需要管理多个 AI 代理会话和终端
- **小团队**：需要共享工作空间和远程开发能力（Remote Worker / mount）
- **私有化部署**：Worker 可自托管，Control Surface 默认 loopback

#### 不适用场景

- **严格气隙离线环境**：AI 代理本身通常需外部 API；Desktop auto-update / 安装脚本默认访问 GitHub
- **大规模协作**：当前缺乏多用户 RBAC
- **高可用集群**：当前为单 Worker 模式
- **复杂 CI/CD**：缺少原生流水线集成

### 未决项与证据边界

#### 未决项

1. **性能基准**：大规模节点、远程 endpoint 延迟、SQLite 高并发
2. **安全审计**：鉴权鲁棒性、加密存储需求
3. **竞品对比**：步骤 7 按边界排除
4. **通信细节**：WebSocket 底层 ping/pong 帧、SSE 客户端重连策略（未运行验证）
5. **Windows 权限**：用户级安装推断未实机证实

#### 证据边界

- **已确认**：SQLite schema v11、Control Surface 五主路径、42 handler 模块、Worker 单实例锁
- **源码推导**：单进程架构、Windows 用户级权限
- **未证实**：生产性能、安全漏洞、WebSocket/SSE 运行时行为
- **不应扩大**：估算工期、场景适配推断、竞品分析

### 后续行动建议

#### 立即可执行

1. 在测试环境部署 Worker，验证基本功能
2. 使用 CLI 测试 Control Surface 接口
3. 阅读 `docs/architecture/` 下的架构文档

#### 需要人工裁决

1. 是否需要进行安全审计
2. 是否要补充竞品对比分析（步骤 7）

### 数据库与持久化

OpenCove 使用 SQLite 作为嵌入式持久化真身，由本机 Worker 进程独占持有（durable truth owner）。

#### 概况

| 组件 | 形态 | 证据锚点 |
| --- | --- | --- |
| 数据库 | SQLite（嵌入式，`better-sqlite3`） | `src/platform/persistence/sqlite/schema.ts` |
| Schema 版本 | v11 | `docs/architecture/PERSISTENCE.md`（`DB_SCHEMA_VERSION = 11`） |
| 持久化文件 | `opencove.db` | 同上 |

#### 表结构（已核源码事实，`schema.ts`）

| 表名 | 用途 |
| --- | --- |
| `app_meta` | 应用元数据 |
| `app_settings` | 应用设置 |
| `workspaces` | 工作空间 |
| `nodes` | 画布节点 |
| `workspace_spaces` | 空间定义 |
| `workspace_space_nodes` | 空间-节点关联 |
| `node_scrollback` | 终端 scrollback 兼容镜像（legacy reader） |
| `terminal_recovery_records` | 终端恢复 durable source（v11） |
| `agent_node_placeholder_scrollback` | Agent 节点占位 scrollback |
| `agent_session_title_cache` | 会话目录扫描结果缓存 |
| `browser_profile_settings` | 浏览器 profile 设置（客户端本地） |
| `browser_history` | 浏览历史 |
| `browser_bookmarks` | 书签 |
| `browser_downloads` | 下载记录 |
| `browser_permission_decisions` | 权限决策 |

#### 边界说明

- Browser profile 相关表默认不进入 Worker/WebUI 同步（`docs/architecture/PERSISTENCE.md` Write Ownership）。
- SQLite 事务与 Terminal recovery CAS 属协调机制，见文末「任务队列与协调机制」章节。

### 任务队列与协调机制

#### 任务队列

**结论**：未发现 RabbitMQ / Kafka / Redis 等传统消息队列组件（源码检索未发现）。OpenCove 不依赖外部 broker，协调全部在单 Worker 进程内完成。

#### 协调机制

| 机制 | 形态 | 证据锚点 | 证据等级 |
| --- | --- | --- | --- |
| 进程内协调 | Map、Set、EventEmitter | Control Surface / runtime 模块 | 源码推导 |
| Worker 单实例锁 | 文件锁（`wx` + pid 检测） | `src/app/worker/singleInstanceLock.ts` | 已核源码事实 |
| Terminal recovery CAS | generation + binding + checkpoint compare-and-set | `docs/architecture/PERSISTENCE.md` §Terminal Recovery Records | 已核源码事实 |
| SQLite 事务 | 幂等迁移、checkpoint 写入 | `migrate.ts`、`PersistenceStore.ts` | 源码推导 |

#### 边界说明

- Terminal recovery 的 generation/binding/checkpoint CAS 是 Worker 侧核心 durability 协调机制，**不**等同于通用任务队列。
- Worker 单实例锁保证同一 userData 目录只有一个 Worker 进程持有真身，非跨节点分布式锁。

### Standalone Worker

#### 本质

Standalone Worker **不是**独立产品，而是同一套 Electron App 以 Worker 模式无头启动。构建流程先跑 `electron-builder --dir` 产出 unpacked Electron app，再从中抽取 `app.asar` + Electron 运行时打包成 server bundle（`scripts/lib/standalone-asset-build.mjs`、`scripts/create-standalone-server-bundle.mjs`，已核源码事实）。即 Worker 进程代码与 Desktop 共用同一份 main bundle，仅入口不同（`opencove worker start` vs Electron 窗口），**无新意**。

#### 关键要点

| 项 | 结论 | 证据锚点 |
| --- | --- | --- |
| 产物 | `opencove-server-<platform>-<arch>.tar.gz`（macOS/Linux）、`opencove-server-windows-<arch>.zip` | `docs/runtime/RELEASING.md` |
| 运行入口 | `opencove worker start`（含 `--hostname` / `--web-ui-password` 等子参数） | 同上 |
| 运行时 | 自带 Node 运行时（复用 Electron runtime） | 源码推导；未实机验证 |
| 一键安装 | `opencove-install.ps1`（Win）/ `opencove-install.sh`（macOS/Linux），默认路径 `OPENCOVE_INSTALL_ROOT` 可覆盖，bin 目录加入用户级 PATH | 同上 |
| 卸载 | `opencove-uninstall.ps1` / `opencove-uninstall.sh`（含 tag-pinned 变体） | 同上 |
| 默认监听 | loopback `127.0.0.1`；LAN 需显式 `--hostname 0.0.0.0 --web-ui-password` | `src/app/worker/index.ts` 已核源码事实 |

#### 边界说明

- 「无头部署」即本模式（手动 `opencove worker start` 跑 Worker 无 GUI），与 Standalone Worker 同义。
- 卸载 standalone runtime 不一定删除 userData 目录（`opencove.db` 等），两者路径独立（`OPENCOVE_INSTALL_ROOT` vs userData 目录），未实机验证。
- **本部署模式实际不使用**：实际部署为 Desktop Electron App 自拉 Worker 子进程（见「桌面应用独立性」），无头/远程场景需求时再评估 Standalone Worker。

### 附录

#### 关键文件路径

- Schema：`src/platform/persistence/sqlite/schema.ts`
- Control Surface HTTP：`src/app/main/controlSurface/controlSurfaceHttpServer.ts`
- Handler 注册：`src/app/main/controlSurface/registerControlSurfaceHandlers.ts`
- Handler 模块目录：`src/app/main/controlSurface/handlers/`（42 模块）
- Worker 单实例锁：`src/app/worker/singleInstanceLock.ts`
- SSE 写入：`src/app/main/controlSurface/http/syncSse.ts`
- Worker 入口：`src/app/worker/index.ts`
- CLI 入口：`src/app/cli/opencove.mjs`
- 架构文档：`docs/architecture/`
- 部署文档：`docs/runtime/RELEASING.md`

#### 版本信息

- 当前版本：0.2.0
- Node.js 要求：>= 22.12.0
- pnpm 要求：>= 9
- SQLite schema 版本：11

#### 参考文档

- README：`README.md` / `README_ZH.md`
- 架构总览：`docs/architecture/CURRENT_ARCHITECTURE.md`
- Control Surface：`docs/architecture/CONTROL_SURFACE.md`
- 持久化：`docs/architecture/PERSISTENCE.md`
- Web UI 故障排查：`docs/runtime/WEB_UI_TROUBLESHOOTING.md`

### 补充调研：Mac 二次开发前置

> updated_by: Kilo - glm-5.2
> updated_at: 2026-07-19 16:55:00
> scope: 在 macOS 上把 OpenCove 开发环境跑起来所需的前置条件；不含新功能调研
> evidence_window: 2026-07-19（main 分支 README / CONTRIBUTING / DEVELOPMENT / package.json）

#### 目标与边界

- **目标**：在 macOS（Apple Silicon 与 Intel 均覆盖）上从源码启动 `pnpm dev`，得到可运行的 Electron 开发环境。
- **不包含**：新增功能、产品改造、分发打包（仅列出打包命令作为参考，不展开签名/公证）。

#### 前置工具链

##### 必备（版本门槛已核源码事实）

| 工具 | 版本要求 | 证据锚点 | macOS 获取建议 |
| --- | --- | --- | --- |
| Node.js | `>= 22.12.0` | `package.json` `engines.node`、`README.md` Prerequisites | 用 `fnm` / `nvm` / `volta` 管理；`node -v` 校验 |
| pnpm | `9.6.0`（CONTRIBUTING/README 指定；`engines.pnpm` 为 `>=9`） | `package.json` `engines.pnpm`、`CONTRIBUTING.md` | `corepack enable && corepack prepare pnpm@9.6.0 --activate`，或 `npm i -g pnpm@9.6.0` |
| Git | 任意近期版本 | `git clone` 步骤 | 系统自带或 Xcode CLT 提供 |

##### 原生模块编译依赖（关键，Mac 专有）

OpenCove 依赖原生模块 `node-pty`（PTY 运行时）、`better-sqlite3`（SQLite 嵌入式）等，`pnpm install` 会触发 `postinstall: electron-builder install-app-deps`，对 Electron 的 Node ABI 重新编译原生模块，因此必须有 C/C++ 工具链。

| 依赖 | 用途 | macOS 获取 |
| --- | --- | --- |
| Xcode Command Line Tools | 提供 clang / git / make / 头文件 | `xcode-select --install` |
| Python 3 | `node-gyp` 依赖 | Xcode CLT 自带或 `brew install python` |
| C++ 编译器 | 原生模块构建 | 随 Xcode CLT 的 clang |

> **Apple Silicon 注意**：原生模块需与 Electron 架构匹配。Electron arm64 在 M 系列上原生编译；若混用 x64 Node + arm64 Electron 会出现 native addon ABI mismatch。建议 Node 与系统架构一致，由 `electron-builder install-app-deps` 处理 Electron 侧 rebuild。

##### 可选（体验完整 agent 工作流）

| 工具 | 用途 | 证据锚点 |
| --- | --- | --- |
| Claude Code CLI | 在 PTY 节点内运行 Claude 会话 | `README.md` Recommended |
| Codex CLI | 在 PTY 节点内运行 Codex 会话 | 同上 |

二者非启动 dev 环境的硬性前置；缺失不影响 `pnpm dev` 跑起画布与终端。

#### 源码获取与依赖安装

```bash
# 1. 克隆
git clone https://github.com/DeadWaveWave/opencove.git
cd opencove

# 2. 安装依赖（会触发 electron-builder install-app-deps 重建原生模块）
pnpm install
```

**`pnpm install` 行为要点**（已核源码事实，`package.json` `scripts.postinstall`）：
- 自动执行 `electron-builder install-app-deps`，按 Electron 目标 Node ABI 重编译 `node-pty`、`better-sqlite3` 等。
- 若网络受限：pnpm 默认走 npm registry，`node-pty`/`better-sqlite3` 在 install 阶段会下载 prebuilt 或本地编译；可设 `npm_config_registry` 与代理。
- `husky`（`prepare` 脚本）会安装 git hooks，仅影响提交期检查，不影响 dev 启动。

#### 启动开发环境

```bash
pnpm dev
```

**dev 行为要点**（已核源码事实，`DEVELOPMENT.md` 快速开始）：
- 入口：`scripts/run-electron-vite-dev.mjs`，经 `electron-vite` 启动 Main / Preload / Renderer，Renderer 走 HMR。
- 默认使用**独立** userData 目录，不污染已安装版数据（`OPENCOVE_DEV_USER_DATA_DIR` 可自定义）。
- 想复用已安装版数据：`OPENCOVE_DEV_USE_SHARED_USER_DATA=1 pnpm dev`。
- **Worker / Web UI 不随 HMR 更新**：Worker 跑的是 `out/main/worker.js`，源码改动后须 `pnpm build` 再重启 App，否则会出现「恢复/同步/持久化看似不生效」的假象。

#### 构建产物（dev 非必需，调试 Worker/Web UI 时需要）

```bash
pnpm build            # 构建 out/（main/preload/renderer）
pnpm build:mac:arm64  # 仅在需要打包 .app 时；dev 不需要
```

- 验证 Worker/Web UI 行为前先 `pnpm build`，再 `pnpm dev` 重启。
- 单独跑 Playwright：必须先 `pnpm build`，否则用旧 `out/` 产物导致与源码不一致（`DEVELOPMENT.md` E2E 说明）。

#### 验证命令（与 CI 对齐，提交前最低门槛）

| 命令 | 用途 | 证据锚点 |
| --- | --- | --- |
| `pnpm check` | TypeScript 类型检查（`tsc -b`） | `package.json` `scripts.check` |
| `pnpm lint` | oxlint 静态检查 | `scripts.lint` |
| `pnpm format:check` | Prettier 格式检查 | `scripts.format:check` |
| `pnpm test -- --run` | Vitest 单元测试 | `scripts.test` |
| `pnpm test:e2e` | Playwright E2E（含 build，默认 offscreen） | `scripts.test:e2e` |
| `pnpm pre-commit` | 提交前总闸（line/secret/naming/ui-style/lint/format/check/test/e2e:pre-commit） | `scripts.pre-commit` |

> **dev 跑起来只需 `pnpm install` + `pnpm dev`**；上表为改动后自证不回归用的，非启动前置。

#### 常见坑点（Mac 专有，源码推导 + 文档明示）

1. **原生模块 ABI 不匹配**：报错常见于 `node-pty` / `better-sqlite3` `Module did not self-register` 或 `NODE_MODULE_VERSION` 不一致。处理：确认 Node 与系统架构一致；重跑 `pnpm rebuild` 或 `pnpm exec electron-builder install-app-deps`；不要手改 `pnpm-lock.yaml`（`DEVELOPMENT.md` 全局硬规则）。
2. **Worker 行为不更新**：dev HMR 只覆盖 Renderer；改了 Worker/Control Surface 后须 `pnpm build` 再重启（`DEVELOPMENT.md` FAQ）。
3. **userData 数据复用**：默认 dev 用独立目录；想复用已安装版数据用 `OPENCOVE_DEV_USE_SHARED_USER_DATA=1`，但 schema v11 与旧 profile 迁移有自动修复逻辑，混用前先备份 `opencove.db`。
4. **Gatekeeper / 签名**：仅影响分发的 `.app`；`pnpm dev` 启动的是未签名 Electron 开发实例，不触发 Gatekeeper。
5. **端口/loopback**：dev Worker 默认 `127.0.0.1`；LAN Web UI 需显式 `--hostname 0.0.0.0 --web-ui-password`（与运行时部署一致）。
6. **磁盘与构建缓存**：`node_modules` + Electron 下载 + `out/` + e2e 缓存建议预留 ≥ 5GB。
7. **行数门禁**：staged 文件超过 500 行会触发 `line-check:staged` 失败（`DEVELOPMENT.md` 提交前检查），二次开发拆分代码时需注意。

#### 最小可跑清单（Mac 一键序列）

```bash
# 前置一次性
xcode-select --install
corepack enable && corepack prepare pnpm@9.6.0 --activate
fnm install 22 && fnm use 22   # 或 nvm/volta 等价命令

# 取代码 + 装依赖 + 跑 dev
git clone https://github.com/DeadWaveWave/opencove.git
cd opencove
pnpm install
pnpm dev
```

跑通上述序列即在 Mac 上得到可运行的 OpenCove 开发环境；如需调试 Worker/Web UI 行为，追加一次 `pnpm build` 再重启 App。

#### 修订记录

| 时间 | 修订内容 |
| --- | --- |
| 2026-07-17 23:30 | 审计修订：弱化「无遥测/无网络出口/完全离线」表述；补充可选网络出口表、完整 schema 表、42 handler 模块计数、Windows 部署专项、消息通信与 terminal recovery CAS 细节；修正 Desktop 接入协议描述；步骤 8 标记完成；移除无证据锚点的「技术债务」推断段 |
| 2026-07-18 20:30 | RUNBOOK 合规修订（find-agent-infra v2026-07-18）：交付结论新增工作机合规判定（结论 0）；部署形态章节新增「工作机安装（Windows / macOS）」完整五项（安装方式、运行入口、依赖、权限、卸载）、新增「主体功能运行位置」明确判定 PC 本地、新增「云端网关」明确判定无官方网关；补充 macOS 安装表、standalone 卸载命令、Worker 默认 loopback 绑定源码证据；补充 userData 目录源码证据；主体位置结论由源码核查加固（index.ts / userData.ts / singleInstanceLock.ts） |
| 2026-07-19 16:55 | 补充调研：新增「Mac 二次开发前置」章节，覆盖工具链版本、原生模块编译依赖、源码构建流程、dev 启动与验证命令、常见坑点；目标为「在 Mac 上把开发环境跑起来」，不涉及新功能 |
| 2026-07-19 18:10 | 功能分析：新增「Add Terminal 功能分析」附录，回答「Add Terminal 是否冗余、能否删除」；结论为不可删除（它是 agent 节点的底层原语 + 无 provider 时的唯一执行面），问题归因为可发现性/命名而非冗余 |
| 2026-07-19 18:26 | 功能分析：新增「Task 节点与任务编排深入分析」附录，覆盖 Task Run 链路、provider gate（`defaultProvider` 仅 4 值）、task↔agent 双向 linkage、与状态观测的依赖关系、Kilo 接入 feasibility；结论：任务编排对未注册 CLI 是全有或全无，档 2 是最低门槛 |
| 2026-07-19 18:31 | 功能分析：新增「Worktree 模式讨论与禁用方案」附录；勘误前序 Kilo 集成方案误把 worktree 当关键能力；结论：worktree 是 opt-in 非默认，单分支开发零配置即可，硬禁用需档 C（加 `worktreeEnabled` 设置） |
| 2026-07-19 20:00 | 概念澄清：新增「Project → Space → Task → Agent 概念流程与实际工作方式」附录；对齐术语（Project==Workspace）、剥离视觉与功能诱导、给出最小闭环；约束：不允许使用 Worktree |
| 2026-07-19 20:05 | 概念调研：新增「Add Role 概念调研」附录；明确 Role = 可复用 persona/prompt 模板，与 Task 是 sibling 而非嵌套；给出 Role 在主工作流中的定位与用法 |
| 2026-07-19 20:15 | 概念定论：在「Add Role 概念调研」附录追加「与真实工作流的关系」段；定论：真实工作流=拆 Task 时，Role 与独立 Run Agent 等价地不进闭环（`taskId:null`）；Role 仅在"不走 Task 范式"场景成立；若要拉入闭环需二开（Large，当前无路径） |
| 2026-07-23 09:57 | 变更同步：「移除 Git Worktree 创建入口」落地（openspec `remove-worktree-creation-entrypoints`）。Space 菜单 "Create Worktree"、CLI `opencove worktree create`、Control Surface `worktree.create` / `gitWorktree.create` / `gitWorktree.createInMount`、Web Browser 创建桥接全部下线；Workspace 设置的 Worktree Root 配置行隐藏。桌面 IPC `worktree:create`、Preload、DTO、use case、Git service、`worktreesRoot` 字段与 SQLite schema 保留为内部兼容面；已有 Worktree 的 list/status/PR/archive/remove/rename/recovery 不受影响。前序附录中「创建入口」描述以此条为准 |

---

### 附：Add Terminal 功能分析（2026-07-19）

> 触发问题：用户在画布右键菜单看到 `New Terminal` 与 `Run Agent` 并存，直观上像是重复入口，疑问「Add Terminal 看上去没有实际用途，是否可以删除」。
> 方法：源码核查 + 架构对比。仅分析，不改代码。

#### 1. 入口与实际功能

- 菜单入口：画布 pane 右键菜单 `New Terminal`（`WorkspaceContextMenuParts.tsx:108`，i18n key `workspaceContextMenu.newTerminal`，`en.workspaceCanvas.ts:3`）。
- 调用链：`useWorkspaceCanvasTerminalCreation`（`useInteractions.terminalCreation.ts:49`）→ `createTerminalNodeAtFlowPosition`（`useInteractions.paneNodeCreation.ts:41`）。
- 实际行为：
  1. 在右键点处计算放置锚点与 PTY geometry（cols/rows）。
  2. 解析目标 Space + Mount，得到 `mountId` / `resolvedCwd`（`resolveSpaceMountLaunchContext`）。
  3. 在 Worker 侧 spawn 一个真实 PTY：
     - 有 mount：`pty.spawnInMount`（Control Surface command）。
     - 无 mount 但有 Control Surface plain runtime：`pty.spawn`（Control Surface command）。
     - 兜底：`window.opencoveApi.pty.spawn`（IPC）。
  4. 调 `createNodeForSession({ kind: 'terminal', sessionId, ... })` 创建画布节点。
  5. 把节点挂到目标 Space 并展开。
- 渲染：与 agent 节点共用 `TerminalNode.tsx`（xterm.js + `TerminalNodeData`），`agent` 字段为 `null`。

#### 2. 与 Run Agent 的关系（关键架构事实）

- 画布节点底层只有**一个数据形态** `TerminalNodeData`（`types.ts:135`），通过 `kind` 字段区分：`terminal | agent | task | note | role | image | document | website`（`workspaceNodeSizing.ts:5`）。
- `Run Agent` 与 `New Terminal` **共用同一个 `createNodeForSession` helper**，差异仅在：
  - `kind`：`'agent'` vs `'terminal'`（`useAgentLauncher.ts:158` vs `useInteractions.paneNodeCreation.ts:204`）。
  - `agent` 子对象：`{provider, prompt, model, effectiveModel, launchMode, ...}` vs `null`。
  - spawn 路径：`session.launchAgent(InMount)` vs `pty.spawn(InMount)`。
- 即 **Agent = Terminal 节点 + agent 元数据 + agent 启动路径**。Terminal 是 agent 的底层原语，不是并列功能。

#### 3. Add Terminal 是否冗余 / 能否删除

**结论：不能删除。它不冗余，是必需的底层执行面。**

不冗余的证据：

1. **唯一无 provider 也能跑的执行面**。`Run Agent` 依赖 `AgentExecutableResolver` 解析到 `claude`/`codex`/`opencode`/`gemini`（`EXTERNAL_EXECUTABLE_RESOLUTION.md`），未安装任何 agent CLI 时该入口失效；`New Terminal` 只依赖终端 profile（PowerShell/Git Bash/WSL/POSIX shell），**始终可用**。新机器、CI、最小依赖场景下，它是 OpenCove 仍可作为空间终端管理器的前提。
2. **自由 shell 语义**。Agent 节点被绑定到某个 provider 的 CLI（带 `--model`、`--resume`、`--dangerously-skip-permissions` 等 wrapper 语义），不能当作通用 shell 用。Terminal 节点提供原汁原味的 PTY：跑 `git` / `pnpm` / `docker` / `kubectl` / `gh` / 调试脚本 / 手动复现 agent 行为，是 agent 无法替代的。
3. **与 agent 并排观测**。在 agent 节点旁开一个 terminal 节点，对同一 mount/worktree 做 `git status` / `tail log` / 进程检查，是空间画布范式的核心价值之一（README 强调 "context stays visible"）。
4. **删除不可行（结构上）**。Agent 节点的渲染、PTY 复用、`TerminalNodeData` 形状都依赖 terminal 这条路径；能删的只是「右键菜单那一项」，不是「terminal 节点类型」。删菜单项不会简化任何代码，只会让用户失去显式创建自由 terminal 的入口（被迫先建 agent 再清空，体验更差）。
5. **Task 节点不替代它**。Task 的 Run 按钮触发的是 `session.launchAgent`（`useTaskActions.agentSession.run.ts:216`），产出 agent 节点，仍非自由 shell。

#### 4. 真正的问题归因

用户感觉「没实际用途」来自**可发现性 / 命名歧义**，不是功能冗余：

- `New Terminal` 与 `Run Agent` 在同一右键菜单并列，新用户难以判断「什么时候用哪个」。
- 没有 onboarding 提示区分二者职责。

#### 5. 建议（不做删除，做收敛）

- 命名/分组：把 `New Terminal` 与 `Run Agent` 在 pane 菜单里分组或加副文案，例如 `New Terminal · free shell` vs `Run Agent · Claude Code / Codex / ...`。
- 空态引导：画布无节点时给一行 hint（右键创建 / 拖入），明确 Terminal 是「任意命令」、Agent 是「绑定 CLI agent」。
- 文档：在 `.context/RUNBOOK.md` 或新用户引导里写明二者关系。
- 这些属 Small→Large UX 改动，需走 Spec + E2E（用户可感知变化），不在本次分析范围内落地。

#### 6. 锚点（便于后续追踪）

- 菜单：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/view/WorkspaceContextMenuParts.tsx:108`
- 终端创建：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useInteractions.terminalCreation.ts:49`
- 终端节点 spawn：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useInteractions.paneNodeCreation.ts:143-210`
- Agent 创建对比：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useAgentLauncher.ts:158`
- 节点数据形态：`src/contexts/workspace/presentation/renderer/types.ts:135`、`src/contexts/workspace/domain/workspaceNodeSizing.ts:5`
- 外部可执行解析约束：`docs/cli/EXTERNAL_EXECUTABLE_RESOLUTION.md`

---

### 附：Task 节点与任务编排深入分析（2026-07-19）

> 触发问题：评估"把 Kilo CLI 作为 agent provider 二开接入 OpenCove"时，识别出**任务编排**是区别于"裸 terminal 跑 kilo"的关键功能之一。本节深入 Task 节点的实际行为、provider gate、与状态观测的依赖关系。
> 方法：源码核查。仅分析，不改代码。

#### 1. Task 节点的实际功能

- Task 是画布节点（`TaskNode.tsx`，规范见 `docs/ui/TASK_UI_STANDARD.md`），数据结构 `TaskNodeData` 挂在统一节点形态 `TerminalNodeData.task`（`types.ts:160`）。
- 卡片结构（`TASK_UI_STANDARD.md`）：
  - Header：标题 inline 编辑 + `...` 菜单（模板/完整编辑）+ `×` 删除。
  - 内容区：`requirement` 多行 inline 编辑（空值禁止提交）。
  - Footer：状态下拉（`todo / doing / ai_done / done`，`TaskNodeFooter.tsx:17`）+ Assign + **运行按钮**。
- 关键字段：`requirement`（需求文本，作为 agent 的 prompt 来源）、`linkedAgentNodeId`（绑定的 agent 节点）、`status`、`lastRunAt`。

#### 2. 任务编排的实际链路（Run 按钮）

Run 按钮触发 `runTaskAgentAction`（`useTaskActions.agentSession.run.ts:104`），四步：

1. **读 requirement 作为 prompt**：`task.requirement.trim()`，空则报错（`:113-121`）。
2. **解析 Space/Mount/cwd**：`resolveWorkspaceAgentLaunchBinding`（`:130`）。
3. **启动 agent + 创建 agent 节点**：`launchWorkspaceAgentSession({ prompt: requirement, provider, mode: 'new', ... })`（`:182`）→ `createNodeForSession({ kind: 'agent', agent: { prompt: requirement, taskId: taskNodeId, ... } })`（`:209`），节点放在 task 右侧（`preferredDirection: 'right'`，`:219`）。
4. **双向 linkage + 状态置 doing**：`agent.taskId = taskNodeId`（`:233`）、`task.linkedAgentNodeId = agentNodeId`、`task.status = 'doing'`、`task.lastRunAt = now`（`:258-264`）。

**重跑复用**：若 `linkedAgentNodeId` 仍存在且仍是 agent 节点，走 `reuseLinkedAgentForTask`（`:21`）——只更新 prompt 与目录，再 `launchAgentInNode(linkedAgentNodeId, 'new')`（`:155`），不另起新 session/新节点。

#### 3. provider gate（决定性证据）

`runTaskAgentAction:166`：
```ts
const provider = context.agentSettings.defaultProvider
```
- `defaultProvider` 类型 `AgentProvider = 'claude-code'|'codex'|'opencode'|'gemini'`（`agentSettings.providers.ts:1`，默认 `'codex'`，`agentSettings.defaults.ts:14`）。
- `isValidProvider` 只接受这 4 值（`agentSettings.providers.ts:11`）。

**结论：Task→Run 只能启动已注册 provider。** 未注册的 CLI（如 Kilo）无法成为 Task 的执行目标，requirement 无法结构化喂给它——用户只能手敲 `kilo run "<requirement>"`，requirement 与 agent 之间无绑定、无重跑复用。

这是"任务编排"对 Kilo 的**全有或全无**属性：
- 不注册（档 1）：Task 节点对 Kilo 毫无意义。
- 注册 provider（档 2）：立刻拿到"写需求→一键跑 Kilo→右侧绑定 agent 节点→重跑复用"完整链路。

#### 4. 与状态观测的依赖关系（Task 闭环的条件）

Task 的 `doing` 由 Run 设置，但"agent 何时算完"依赖状态观测信号：

- 状态观测输出 `TerminalSessionState = 'working'|'standby'`（`terminal.ts:185`），经 `ptyEventHub.onState`（`usePtyTaskCompletion.ts:202`）消费。
- `applyAgentStateToNodes:15` 只改 **agent 节点** `status`，**不改 `task.status`**——即当前 task 不会从 agent 状态 auto-advance 到 `ai_done`/`done`（Footer 的状态是手动 select）。
- 但 **`standby` 转换触发 `startTitleSync`（`:207`）→ 经 `agentTitle.ts:118`（`linkedAgentNodeId` 匹配）同步标题到 linked task 节点**——说明 task↔agent 链路是通的，当前只接了"标题同步"，未接"状态 auto-advance"，**未来可扩**。

含义：
- **档 2 单独做** = Task→Kilo 启动 + linkage（能力从无到有），但 Kilo agent 节点状态黑盒（无 working/standby，标题不自动同步）。
- **档 3 补状态观测** = Task↔Kilo 闭环可期（agent 完成可驱动 task 标题/未来状态），Kilo 节点真正成为"一等公民 agent"而非"跑着 kilo 的 terminal"。

#### 5. Kilo 接入状态观测的 feasibility（比 claude/codex 更好）

Kilo 有三条观测通道（实测）：
1. `kilo run --format json` —— 实时 JSON 事件流（stdout），比 claude/codex 的 jsonl 文件 tail 更直接。
2. `kilo acp` —— ACP（Agent Client Protocol）server，行业标准 agent 协议。
3. `~/.local/share/kilo/kilo.db`（SQLite）+ `kilo session list` / `kilo export <id>` —— durable store（DB 非 log，不适合增量 tail，但可做 session catalog / resume）。

→ 档 3 对 Kilo 可行；档 2 起步可 `runtimeObservation:'none'`（等同 gemini 弱形态），档 3 再接 `--format json` 事件流做 `provider-api` 级观测。

#### 6. 锚点

- Task Run：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useTaskActions.agentSession.run.ts:104`
- provider gate：同上 `:166`，`src/contexts/settings/domain/agentSettings.providers.ts:1`
- 状态消费：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/usePtyTaskCompletion.ts:15,202`
- task↔agent 标题同步：`src/contexts/workspace/presentation/renderer/utils/agentTitle.ts:118`
- Task 卡片规范：`docs/ui/TASK_UI_STANDARD.md`
- 状态观测架构：`src/contexts/agent/infrastructure/watchers/SessionTurnStateWatcher.ts`、`SessionTurnStateDetector.ts`、`SessionFileResolver.ts`

---

### 附：Worktree 模式讨论与禁用方案（2026-07-19）

> 触发问题：项目策略要求"单分支开发"，评估 OpenCove 的 worktree 是否会强制多分支、以及如何禁用 worktree 模式。
> 方法：源码核查。仅分析，不改代码。

> **2026-07-23 更新**：本附录分析的正式创建入口已下线。Space 菜单、CLI、Control Surface 三个创建命令（`worktree.create` / `gitWorktree.create` / `gitWorktree.createInMount`）与 Web 创建桥接均已移除，不再需要档 B/C 的"硬禁用"方案。桌面 IPC `worktree:create` 与底层创建实现（DTO、use case、Git service）保留为内部兼容面，不是受支持的产品入口；`worktreesRoot` 数据字段保留，但其设置页配置行已隐藏。已有 Worktree 的读取、运行、恢复、归档、删除能力不受影响。

#### 1. 事实校正：worktree 不是默认模式

OpenCove 的 Space Worktree 是 **opt-in**，不强制多分支：

- Add Project 向导只设 `worktreesRoot: ''`（`useAddProjectWizardCreateProject.ts:173`），**不创建任何 worktree**。
- 创建 worktree 是显式 Control Surface 命令 `gitWorktree.create(InMount)`（`gitWorktreeMountWriteHandlers.ts:104`），唯一 UI 入口是 Space 操作菜单的 "Create Worktree" 按钮（`WorkspaceSpaceActionMenu.tsx:297`），且被 `canCreateWorktree` 资格判定 gating（`useCanvasSpaceMenuState.ts:75`）。
- 默认项目 = mount 绑定到项目自身工作目录（单分支），与普通 git 仓库一致。

**结论：单分支开发今天零配置即可，只需不点 "Create Worktree"。** 无须"禁用"也能满足单分支策略。

#### 2. Worktree 的实际语义（避免误解）

- OpenCove 的 "Space Worktree" = Git linked worktree（同一 repo 的独立工作目录 + 独立 branch），不是"多分支并行开发强制项"。
- 资格规则（`spaceWorktreeEligibility.ts`）：一条 ancestor chain 上最多一个 worktree boundary；sibling child Space 可各自成为 worktree。
- 语义见 `docs/canvas/SPACE_LIFECYCLE_SPEC.md` 的 "Worktree Eligibility" 段。
- 它是"把某个 Space 转成独立物理目录"的能力，不是项目默认形态。

#### 3. 若要硬禁用（防误触 / 团队策略）

没有现成全局开关。三档：

| 档 | 做法 | 代价 | 范围 |
| --- | --- | --- | --- |
| A | 不动代码，靠约定不用 | 0 | 仅行为约束，不防误触 |
| B | 改 `getSpaceWorktreeEligibility`（`spaceWorktreeEligibility.ts`）恒返回 `canCreate:false`（加 reason `disabled_by_policy`） | Small，~1 文件 + E2E | 隐藏所有 UI 入口；`gitWorktree.create` Control Surface 命令仍可达（无 UI 触发） |
| C | 加 workspace/global 设置 `worktreeEnabled`（默认 true 兼容）→ gate eligibility + gate Control Surface handler | Large，DTO+迁移+Settings UI+arch doc sync | 真正策略级禁用，可配置 |

推荐：
- 个人/团队约定 → A（零成本，worktree 本就 opt-in）。
- 产品级防止误触 → C（B 是临时补丁，留个可达 handler 是结构性残留，不符 `DEVELOPMENT.md` "结构优先于补丁"原则）。

#### 4. 与 Kilo 集成讨论的关系（勘误）

前序 Kilo 集成方案曾把 "Mount/Worktree 绑定" 列为关键能力之一，此为误判：worktree 是 opt-in 的组织能力，非 agent 集成的关键因素。Kilo 接入的关键因素是**任务编排 + 状态观测**两项，worktree 无关。本节勘误此点。

#### 5. 锚点

- 向导不建 worktree：`src/app/renderer/shell/components/addProjectWizard/useAddProjectWizardCreateProject.ts:173`
- 创建命令：`src/app/main/controlSurface/handlers/gitWorktreeMountWriteHandlers.ts:104`
- UI 入口 + gating：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/view/WorkspaceSpaceActionMenu.tsx:297`、`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useCanvasSpaceMenuState.ts:75`
- 资格判定：`src/contexts/space/application/spaceWorktreeEligibility.ts`
- 语义规格：`docs/canvas/SPACE_LIFECYCLE_SPEC.md`（"Worktree Eligibility" 段）

---

### 附：Project → Space → Task → Agent 概念流程与实际工作方式（2026-07-19）

> 触发问题：用户实操后能复述 "Add Task → Run" 的过程，但反过来质疑 "Add Agent 没有实际意义"、"Space 有什么用"，并明确要求"讨论核心概念，不要把视觉和概念混起来"、"不允许使用 Worktree"。
> 方法：源码核查 + 概念剥离。仅分析，不改代码。
> 约束：本节聚焦"最小概念闭环"，**不展开** worktree / 远程 endpoint / capability boundary / 多 provider 选择 / CLI 自动化等 opt-in 能力——它们都是诱导项，不是闭环必需。

#### 1. 术语对齐：Project == Workspace

- 用户在 UI 看到的是 **Project**；代码内部类型叫 **Workspace**（`WorkspaceState`，`types.ts:168`）。
- 同一概念的两层命名：UI 文案统一用 Project（`en.ts:152` `Project: {{workspaceName}}`、`en.ts:205` `Each project has its own infinite canvas and terminals.`），内部代码用 Workspace。
- 后文统一称 **Project**，提代码锚点时才用 `WorkspaceState`。

#### 2. 概念层（剥离视觉与功能诱导）

四个概念按"从总集到执行"的顺序：

| 概念 | 是什么（概念） | 不是什么（诱导项排除） | 代码锚点 |
| --- | --- | --- | --- |
| **Project** | 所有状态的总容器（spaces + nodes + activeSpaceId + viewport）。一个 Project = 一个工程根，存 SQLite `workspaces` 表。 | 不是"一个 git 仓库"（Project 可跨多个目录）；不是"一次会话" | `types.ts:168` `WorkspaceState` |
| **Space** | **执行边界**：一组 `(mount, directory, capability)` 的命名绑定 + 一组归属它的节点。决定"这个 Space 里的 task/agent/terminal 跑在哪个 cwd、经哪个 Worker endpoint"。 | 不是"视觉矩形框"（`rect` 仅渲染）；不是"目录继承"（`parentSpaceId` 是视觉嵌套树，不等于执行目录继承）；不是"必须绑 worktree"（默认单目录绑定即可） | `types.ts:207` `WorkspaceSpaceState`（`targetMountId`/`directoryPath`/`boundary`/`nodeIds`） |
| **Task** | **规格记录**：`requirement` 文本 + status + 历史 agent sessions。本身**无 runtime**，只是需求/spec。Run 时才把 requirement 作为 prompt 喂给 agent。 | 不是"一个待办项"（它的实体是 prompt 来源 + linkage）；不是"必须立即跑"（可只写需求不 Run） | `types.ts:69` `TaskNodeData`（`requirement`/`linkedAgentNodeId`/`agentSessions`） |
| **Agent** | **执行器**：一个 live agent CLI session（PTY + scrollback + 状态 watcher）。可以是 Task 的执行器（`agent.taskId` 非空），也可以是独立的（`taskId:null`）。 | 不是"一个 AI 模型"；不是"必须绑 Task"（独立 Run Agent 合法） | `types.ts:53` `AgentNodeData`（`provider`/`prompt`/`taskId`/`launchMode`） |

**一句话链条**：
> Project 是"这个工程所有东西的总集"；Space 是"这块画布里的节点都在这个目录上干活"；Task 是"写下来的需求"；Agent 是"把需求跑起来的执行器"。

#### 3. 概念关系（非视觉）

- **归属**：node 最多属于一个 Space（取最内层包含它的）。执行 scope 从**所属 Space** 解析，**不是**从当前 active space（`SPACE_LIFECYCLE_SPEC.md:58-59`、`WORKSPACE_CAPABILITY_ARCHITECTURE.md:30`）。
- **Task ↔ Agent 双向 linkage**：`task.linkedAgentNodeId` ↔ `agent.taskId`（`types.ts:66,74`）。Task Run 时若已有 linked agent 则**复用**，否则新建一个 agent 节点并绑定（`useTaskActions.agentSession.run.ts:21,182`）。一个 Task 当前最多绑一个 agent；一个 Task 的历史可有多个 agent session 记录（`agentSessions[]`）。
- **Space 决定 Agent 的 cwd**：`resolveSpaceMountContext`（`resolveSpaceMountContext.ts:58`）按"所属 Space"解析出 `workingDirectory`，作为 `executionDirectory`/`cwdUri` 传给 `session.launchAgent`（`useAgentLauncher.ts:105`、`sessionHandlers.ts:121`）。

#### 4. 视觉 vs 概念对照（不要混）

| 视觉上看到的 | 概念层是什么 |
| --- | --- |
| Project 标题 / 工程切换器 | `WorkspaceState`（所有状态容器） |
| Space 矩形框、嵌套、拖拽、颜色 | `rect` + `parentSpaceId` + `labelColor`，**仅渲染，不决定执行** |
| Space `...` 菜单里的目录/Mount 设置 | `directoryPath` + `targetMountId` + `boundary`，**这才是 Space 的概念实体** |
| 节点落在哪个框里 | `nodeIds` + 归属解析，**决定该节点跑时的 cwd** |
| 右键 "New Task" / "Run Agent" | Task = spec；Agent = executor。两个不同 `kind` 的统一节点 |

关键不变量：**视觉嵌套（`parentSpaceId`）≠ 执行目录继承**。执行边界是每个 Space 各自独立绑定的；child Space 不自动继承 parent 的目录，除非显式配置。

#### 5. 实际工作方式（最小闭环，不用 Worktree）

剥离所有 opt-in 诱导项后，真正的工作闭环只有四步：

1. **创建 Project**：Add Project → 指定一个工程路径。此时 Project 默认绑到该路径对应的 mount（单目录），**不创建 worktree**（`useAddProjectWizardCreateProject.ts:173`，`worktreesRoot:''`）。
2. **创建/确认 Space**：默认有一个 Space 绑到 Project 的目录。若要在不同目录上跑 agent，才额外建 Space 并各自绑目录（`SpaceTargetMountPickerWindow`）。**单目录工作 = 不需要额外建 Space**，默认那个就够。
3. **创建 Task**：右键 → New Task → 写 `requirement`（需求/spec）→ 提交。此时 Task 是一条纯记录，**无 runtime**（`useNodesStore.createNodes.ts:256`）。
4. **Task → Run**：Task 卡片 Run 按钮 → `runTaskAgentAction`：
   - 读 `requirement` 作为 prompt（空则拒）；
   - 按"Task 所属 Space"解析 cwd + mount + endpoint；
   - spawn agent CLI（claude/codex/opencode/gemini）在 PTY，创建 agent 节点绑到 Task 右侧，`agent.taskId` ↔ `task.linkedAgentNodeId` 双向绑定，task 置 `doing`；
   - 重跑同 Task 复用已绑 agent 节点（`reuseLinkedAgentForTask`）。

闭环到此结束。worktree / 远程 endpoint / capability boundary / 多 provider picker / CLI `node create` 自动化——全部是**在此闭环之上的 opt-in 扩展**，不是闭环必需。

#### 6. "Add Agent 没有实际意义" 的判断

部分正确：若把 "Run Agent"（独立 agent 节点，`taskId:null`、`prompt:''`）当 iTerm 聊天框用，确实和 iTerm 区别不大。它的价值只在两个场景显现：

1. **作为 Task 的执行器**（由 Task Run 自动创建并绑定，状态回流任务图）——这是主路径，**不靠"Add Agent"菜单触发**。
2. **独立长会话**：需要 per-launch 选 provider/model/目录、要 resume、或被 CLI 自动化编排时——主路径不提供这些。

即：日常闭环走 **Task → Run**，几乎用不到独立的 "Run Agent"。"Run Agent" 是逃生口（ad-hoc 聊一句、临时换 provider、CLI 注入），不是主路径。把它当主路径用 → 感觉"没意义"是合理的。

#### 7. "Space 有什么用" 的判断

Space 的价值是**条件性**的：

- **单目录工作**（一个 repo 跑所有事）：默认 Space 绑到 Project 目录即可，Space 概念**近乎透明**，用户不需要显式管理。
- **多目录/多 endpoint 工作**（frontend repo + backend repo + 部署目录，或本地 + 远程 Worker）：Space 的价值才显现——每个 Space 绑不同目录，Task/Agent 在各自 Space 里跑各自的 cwd。

判断口径：**Space 不是"必须显式用才有用"的概念，而是"确保每个节点跑在正确目录"的执行边界**。即便你不显式建 Space，默认那个 Space 也在工作（决定 cwd）。显式建 Space 的动机只有一个：**要把不同目录的活儿并排在同一画布里**。

#### 8. Worktree 约束（本节明确）

按项目策略：**不允许使用 Worktree**。该约束与本闭环不冲突——

- Add Project 默认 `worktreesRoot:''`，不建任何 worktree（`useAddProjectWizardCreateProject.ts:173`）。
- 创建 worktree 是显式命令 + 显式 UI 入口（Space 操作菜单 "Create Worktree"），**opt-in**，详见前序「Worktree 模式讨论与禁用方案」附录。
- 单分支开发今天零配置即可，**只需不点 "Create Worktree"**。

本节所述最小闭环**不依赖 worktree**；worktree 是在此闭环之上的组织能力扩展。

#### 9. 锚点

- Project/Workspace 类型：`src/contexts/workspace/presentation/renderer/types.ts:168`
- Space 类型：`src/contexts/workspace/presentation/renderer/types.ts:207`（`targetMountId`/`directoryPath`/`boundary`/`nodeIds`）
- Task 类型：`src/contexts/workspace/presentation/renderer/types.ts:69`
- Agent 类型：`src/contexts/workspace/presentation/renderer/types.ts:53`
- 节点归属解析：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaceOwnership.ts`
- Space → cwd 解析：`src/contexts/space/application/resolveSpaceMountContext.ts:58`、`resolveSpaceWorkingDirectory.ts:5`
- Task Run → Agent 绑定：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useTaskActions.agentSession.run.ts:21,104,182`
- 独立 Run Agent：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useAgentLauncher.ts:72`
- Agent CLI argv：`src/contexts/agent/infrastructure/cli/AgentCommandFactory.ts:70`
- Space 语义规格：`docs/canvas/SPACE_LIFECYCLE_SPEC.md`
- 能力链规格：`docs/architecture/WORKSPACE_CAPABILITY_ARCHITECTURE.md`

---

### 附：Add Role 概念调研（2026-07-19）

> 触发问题：在厘清 Project → Space → Task → Agent 主闭环后，追问画布上 "Add Role" / "Run Role" 是什么、与主闭环的关系。
> 方法：源码核查。仅分析，不改代码。
> 关联：本节接续「Project → Space → Task → Agent」附录，把 Role 放进同一概念坐标系。

#### 1. Role 是什么（数据层）

Role 由两个分离的对象承担：

- **`ProjectRoleDefinition`**（真身，project-scoped，存设置而非节点）：`id / name / description / promptTemplate / inputHint / outputFormat / createdAt / updatedAt`（`projectRoles.ts:3`）。存于 `AgentSettings.projectRolesByWorkspaceId: Record<workspaceId, ProjectRoleDefinition[]>`（`agentSettings.types.ts:52`，默认 `{}`）。一个 Project 下可定义多个 Role，全局可复用、可编辑/删除。
- **`RoleNodeData`**（画布上的使用实例，挂在统一节点形态 `TerminalNodeData.role`，`types.ts:98`）：`roleId / roleName / roleDescription / promptTemplate / inputHint / outputFormat / input（每次运行的输入）/ selectedProvider（per-node provider 覆盖）/ linkedAgentNodeId / runHistory[]`。

**关键点**：Role 的"内容"就是 `promptTemplate`——一段 persona/prompt 文本。**没有 model 字段**（model 由 `resolveAgentModel(settings, provider)` 运行时解析，`useRoleActions.run.ts:121`）；**没有独立 system-prompt 通道**（`promptTemplate` 即 persona 本体）。

#### 2. New Role vs Run Role（菜单入口差异）

画布右键菜单两个 Role 入口（`en.workspaceCanvas.ts:7`，`WorkspaceContextRoleMenuParts.tsx`）：

| 入口 | 行为 | 是否启动 agent |
| --- | --- | --- |
| **New Role** | 打开 `RoleCreatorWindow`（`mode:'create'`）→ `createRole` 写入新 `ProjectRoleDefinition` + 在画布落一个 role 节点（`useRoleActions.ts:179, useNodesStore.createRoleNode.ts:53`） | 否，只创建定义+节点 |
| **Run Role** | 列出已存在的 `ProjectRoleDefinition`，点某个 → 在游标处落一个 role 节点（`runProjectRoleFromContextMenu`→`createRoleNodeAtFlowPoint`，`useRoleActions.ts:337`） | 否，只实例化节点 |

即两个入口**都不直接跑 agent**；都只创建 role 节点。真正跑 agent 是 role 节点上的 **Run 按钮**（`RoleNode.tsx:204` → `runRoleNode`）。

术语校正：用户看到的 "Add Role" 实际是这两个入口之一（New Role 创定义；Run Role 复用定义实例化）。代码里无 `addRole` 字面。

#### 3. Run Role 时注入什么（关键概念）

`runRoleNodeAction`（`useRoleActions.run.ts:94`）的核心：

1. 解析真身 `ProjectRoleDefinition`（`resolveNodeRoleDefinition:55`）；缺失或 `promptTemplate` 为空 → 报错（`roleNode.missingRoleDefinition`）。
2. 选 provider：`role.selectedProvider ?? agentSettings.defaultProvider`（`:120`）。
3. **组合 prompt**（`useRolePrompt.ts:3`）：
   ```
   promptTemplate（trim）
   +
   （若 input 非空）"User input:\n" + input
   ```
   拼成一段文本。
4. 解析所属 Space 的 cwd（`resolveSpaceWorkingDirectory`，`:135`）。
5. `launchWorkspaceAgentSession({ prompt: 组合prompt, provider, mode:'new', ... })`（`:148`）→ 与 Run Agent 同一条 IPC 路径（`session.launchAgentInMount`）。
6. 创建 agent 节点：`kind:'agent'`、`agent.prompt = 组合prompt`、`agent.taskId: null`、放在 role 节点右侧，画 role→agent 边（`useTaskAgentEdges.ts:54`）。
7. 记 `RoleRunRecord`（input/prompt/provider/agentNodeId/sessionId）到 `runHistory`。

**结论**：Role 把 `promptTemplate` 作为 agent 的**首条 prompt**注入（拼上用户 input），**不是**独立 system-prompt/persona 通道。底层 provider CLI（claude/codex/opencode/gemini）拿这段当第一条用户消息。agent 节点本身不感知"自己来自 role"——它就是个带 prompt 的 agent 节点。

#### 4. Role 与 Task 的关系（sibling，非嵌套）

| 维度 | Task | Role |
| --- | --- | --- |
| prompt 来源 | `task.requirement`（需求文本） | `promptTemplate + input`（persona + 输入） |
| 产出 agent 的 `taskId` | `taskNodeId`（双向绑定） | `null`（无 task 绑定） |
| 重跑语义 | 复用同一 linked agent 节点 | 每次记 `RoleRunRecord`，agent 节点新建 |
| 状态生命周期 | todo/doing/ai_done/done | 无 task 状态机 |
| 画布边 | 蓝色 task→agent | teal role→agent（带 role 名标签） |

代码里**无** Task 引用 Role 的路径（`TaskNodeData` 无 `roleId`，`useTaskActions.*` 不查 Role）。二者是**并列的 agent 生产路径**：

- Task = 目标导向、带验收/状态、requirement 驱动。
- Role = persona/模板导向、可复用、promptTemplate 驱动。

#### 5. 在主工作流中怎么用 Role

按前序「Project → Space → Task → Agent」附录的最小闭环，Role 是**闭环之外的一条 shortcut**：

1. 主闭环（Task → Run）已经能完成"写需求→跑 agent"。Role **不进入**这条闭环。
2. Role 的价值场景：
   - **复用 persona**：反复用同一段系统级指令/角色设定（如"你是严格的 code reviewer，只输出 issues 列表"），不想每次重抄。New Role 定义一次 → 多次实例化 → 各自填 input → Run。
   - **per-node 选 provider**：同一 persona 想分别用 claude / codex 跑对比，靠 `selectedProvider` 覆盖（Task 路径不提供 per-launch 选 provider）。
   - **可追溯的 prompt 模板**：`runHistory` 留下每次 input+prompt+provider+sessionId，适合 persona 调试/对照。
3. 与 Task 的取舍：
   - 一次性需求、要状态/验收 → 用 **Task**。
   - 反复用同一种 agent 角色设定、不在意 task 状态 → 用 **Role**。
   - 临时问一句、无 persona、无需求固化 → 用 **Run Agent**（独立 agent，`prompt:''`）。

三者关系：Role 是介于 "Run Agent（裸 agent）" 与 "Task（需求+状态+验收）" 之间的中间层——比裸 agent 多了 persona 注入与 run history，比 Task 少了状态生命周期。它们都最终产出 `kind:'agent'` 节点，差异只在 prompt 来源与绑定关系。

#### 6. 与 Space 的关系（不变量复述）

Role 节点跑 agent 时，cwd 仍由**所属 Space** 解析（`useRoleActions.run.ts:135` 用 `resolveSpaceWorkingDirectory(owningSpace, ...)`）。即 Role 不自带目录语义，Space 的执行边界规则对 Role 与 Task 一视同仁。Role 节点放哪个 Space → agent 就在哪个 Space 的 cwd 跑。

#### 7. 锚点

- Role 真身定义：`src/contexts/settings/domain/projectRoles.ts:3`
- Role 节点数据：`src/contexts/workspace/presentation/renderer/types.ts:98`
- Role 存储位置：`src/contexts/settings/domain/agentSettings.types.ts:52`
- 菜单入口：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/view/WorkspaceContextRoleMenuParts.tsx:7`
- Role 节点 UI：`src/contexts/workspace/presentation/renderer/components/RoleNode.tsx:204`
- 创建/编辑/删除/实例化：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useRoleActions.ts:179,337,354,378`
- Run 逻辑 + prompt 组合：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useRoleActions.run.ts:94`、`useRolePrompt.ts:3`
- role→agent 边：`src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useTaskAgentEdges.ts:54`
- E2E：`tests/e2e/workspace-canvas.roles.spec.ts`

#### 8. 与真实工作流的关系（定论）

接续「Project → Space → Task → Agent」附录的最小闭环，给定**真实工作流 = 拆 Task → 跑 Task**，Role 的定位定论如下。

**判据：是否绑定 Task（`taskId`）。**

| 入口 | 产出 agent 的 `taskId` | 是否进入 Task 拆解闭环 |
| --- | --- | --- |
| Task → Run | `taskNodeId`（绑定 + 双向 linkage + 状态/复用） | 是 |
| Run Agent（独立） | `null`（`useAgentLauncher.ts`） | 否 |
| Run Role | `null`（`useRoleActions.run.ts:202`） | 否 |

**定论**：

1. Role 与独立 Run Agent 在"是否参与真实 Task 闭环"上**等价**——都不绑定 Task、不进 Task 状态机、不走重跑复用。Role 只是在"脱离闭环"前提下额外叠加：prompt 预填 persona、per-node 选 provider、`RoleRunRecord` run history + role→agent 边。
2. 真实工作流（拆 Task）**只经过 Task → Run** 这一条路径。独立 Run Agent 与 Role 都是**旁路**，不进闭环。
3. Role 的 persona 模板/历史/provider 选择价值，仅在"不走 Task 范式"的工作模式成立（反复用同一段 persona、不在意 task 状态/验收）。一旦主范式是 Task 拆解，Role 与独立 Run Agent 一样用不上。
4. **若要把 Role 拉进真实闭环**，需二开：让 Task 能选/绑 Role，把 Role 的 `promptTemplate` 注入到 Task Run 的 prompt 前。当前代码无此路径（`TaskNodeData` 无 `roleId`、`useTaskActions.*` 不查 Role）。属 Large 改动（DTO + Settings UI + arch doc sync + E2E），不在本次调研范围落地。

**一句话**：在"拆 Task"的真实工作流里，Role ≈ 独立 Run Agent ≈ iTerm 旁路，均不进闭环；Role 仅在不走 Task 范式时才显现差异。
