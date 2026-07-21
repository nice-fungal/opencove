# External-Worker · OpenCove Worker 机制调研

> updated_by: Kilo - k3
> updated_at: 2026-07-24 09:55:20
> scope: OpenCove 自带 Worker 机制的现状事实（shipped 机制）：Worker 是什么、在哪里、谁拉起、如何被发现、release 形态、standalone 实质；不含任何改造方案
> evidence_window: 2026-07-19（main/develop 分支源码核查 + 本机 dev 实测）
> 关联: `.context/RUNBOOK.md`（技术调研报告见文末附录，原 WORKSHOP-005 已并入）、`.context/External-Task.md`

## 1. Worker 是什么

Worker 是 OpenCove 的**后端服务进程**——整个产品里唯一持有持久化真相（durable truth）的进程。其余一切（Desktop、CLI、Web UI）都是它的 client。

持有三样东西：

| 持有物 | 形态 | 证据锚点 |
|---|---|---|
| 持久化真相 | 本机 SQLite `opencove.db`（schema v11） | `src/app/worker/userData.ts`、`src/platform/persistence/sqlite/schema.ts` |
| 执行运行时 | 本机 PTY（headless runtime） | `src/app/worker/index.ts:159`（`createHeadlessPtyRuntime`） |
| 服务面 | Control Surface HTTP（`/invoke`、`/events` SSE、`/pty` WS、auth） | `src/app/main/controlSurface/controlSurfaceHttpServer.ts` |

进程关系（已核源码事实）：

```
Desktop Renderer ──IPC──> Electron Main ──HTTP/WS──> Worker ──> SQLite / PTY
CLI ────────────────────HTTP/WS────────> Worker
Web UI (浏览器) ─────────HTTP/SSE/WS─────> Worker
```

- Electron Main **不是** Worker，它是 Worker 的 client（同时兼 supervisor，见 §4）。
- Control Surface HTTP server **只存在于 Worker 进程**：`registerControlSurfaceServer.ts`（在 Main 里嵌 server 的包装）当前无任何调用方；唯一活调用在 `worker/index.ts:161`。

## 2. Worker 实际在哪里

| 维度 | 事实 | 证据锚点 |
|---|---|---|
| 进程形态 | 独立子进程，但**无独立二进制**——复用 Electron 可执行文件以纯 Node 模式跑 | `localWorkerManager.ts:215-219`（`spawn(process.execPath, args, { env: { ELECTRON_RUN_AS_NODE: '1' } })`） |
| 代码（dev） | `out/main/worker.js` | `localWorkerManager.ts:31` |
| 代码（prod） | 安装包 resources 内 `<resources>/out/main/worker.js` | `localWorkerManager.ts:27-29`、`opencoveRuntimePaths.ts:18-19` |
| 数据 | userData 目录：`opencove.db`、`worker-control-surface.json`、锁文件、topology 文件 | `src/app/worker/userData.ts` |
| 网络 | 绑定 `127.0.0.1` + 动态端口；连接信息写报到文件供发现 | `localWorkerSpawn.ts:44-48` |
| 单实例 | 同一 userData 全局一个 Worker（文件锁 + pid 检测） | `src/app/worker/singleInstanceLock.ts` |

**Desktop 安装包自包含**：打包产物内置 Worker 代码（resources 内），不依赖 standalone bundle。

## 3. 谁拉起 Worker（单机全路径）

| 拉起者 | 触发 | 死约 | 证据锚点 |
|---|---|---|---|
| **Desktop Main** | IPC `workerStart` → `startLocalWorker()`：先读报到文件复用判定，无可复用则 spawn | **有**：spawn 带 `--parent-pid`，Worker 每秒探测 parent，Main 死则 Worker 自杀 | `registerLocalWorkerIpcHandlers.ts:17`、`localWorkerManager.ts:216,335-339,359-369`、`localWorkerSpawn.ts:41-44`、`worker/index.ts:234-243` |
| **CLI**（`opencove worker start`） | 用户/脚本手动执行 | **无**：不传 `--parent-pid`，进程独立存活 | `worker/index.ts:42-54,234`（parent 探测仅在有 parentPid 时启用） |
| **External-Worker 复用** | 任何 client 启动时先读报到文件，pid 活 + 端口可达 + 版本兼容 → 直接连接，**永不 spawn** | — | `localWorkerManager.ts:335-339`（`isReusableLocalWorkerConnection`） |

**拉起 Agent 的那一行**：`localWorkerManager.ts:216`

```ts
const child = spawn(process.execPath, args, { env: { ELECTRON_RUN_AS_NODE: '1', ... } })
```

## 4. Main 的双重身份（为什么 pnpm dev 能拉起 Worker）

`pnpm dev` 拉起的不是"一个 client"，而是整个 Electron 应用（Main + Preload + Renderer）。Main 有双重身份：

| 身份 | 职责 |
|---|---|
| Worker 的 **client** | 业务角色：转发 Renderer 请求，经 HTTP/WS 调 Worker |
| Worker 的 **supervisor** | 进程宿主角色：确保本机 Worker 存在（复用或 spawn），带 parent-pid 死约 |

"client" 与"拉起 server"不矛盾——嵌入式服务模式：启动时先确保本地 server 存在，再以 client 身份连接。Renderer 和 CLI 才是纯 client（CLI 有另一种拉起能力，见 §3）。

有 External-Worker 时 Main 退化为纯 client（复用判定第一步就返回，走不到 spawn）。Desktop 退出后 External-Worker 无死约继续存活，下次启动再复用。

**parent-pid 死约的性质**：Main 拉起的 Worker 随 App 退出而自杀。此设计保证 dev 迭代干净、不留孤儿进程，是 Desktop 内嵌形态的兜底；CLI 拉起的 Worker 无此约束。

## 5. Worker 实际干什么（概念层）

对照 RUNBOOK 附录的 Project→Space→Task→Agent 概念模型，Worker 干三件事：**真相保管、命令执行、状态广播**。

| 概念层 | Worker 的角色 |
|---|---|
| Project | 持有所有 `WorkspaceState` 真相，创建/删除/切换/持久化落 SQLite `workspaces` 表 |
| Space | 保管 Space 定义（mount、directory、capability）；执行目录解析、mount 边界 enforce（approved-roots + mount-root）都在 Worker |
| Task | 保管 Task 状态真相；权威写入只经 Worker 的 `node.update`（`nodeControlUpdate.ts:145-153`） |
| Agent | 实际 spawn 并持有 PTY；Agent 输出观测（watcher）、scrollback、terminal recovery 记录落 SQLite |
| 画布 | 节点列表、布局、Space-节点关联全在 SQLite，经 SSE 广播 revision 给各 client |

所有写操作以 command 经 `/invoke` 到 Worker，Worker 落 SQLite 并执行副作用；client 只渲染和发命令，经 `sync.state` + SSE 追赶 revision。

## 6. Agent 由谁拉起（Task Run 三层链路）

**是 Worker 拉起。** 发起 ≠ 拉起：

```
[触发]  Renderer: Run 按钮 → runTaskAgentAction → launchWorkspaceAgentSession
[转发]  Main IPC handler → resolveWorkerEndpoint → HTTP POST /invoke
        { id: 'session.launchAgent', payload: {...} }
[执行]  Worker: sessionHandlers.ts:95 handler
        → Worker 自己的 headless PTY runtime spawn agent CLI 进程
```

- Renderer 只拼 payload + 发 invoke（`useWorkspaceAgentLaunch.shared.ts:231`）。
- Main 只转发：IPC → HTTP client（`registerRemoteAgentIpcHandlers.ts:311-349`），不碰 PTY。
- Worker 是真正的拉起者：`worker/index.ts:159-168` 把 `createHeadlessPtyRuntime` 传给 Control Surface server。
- **推论**：Agent 生命周期挂在 Worker 上。Desktop 关闭，CLI 拉起的 Worker 及其 Agent 继续跑；重开 Desktop 经报到文件重连。

## 7. worker-control-surface.json（发现机制）

名字勘误：实际文件名是 **`worker-control-surface.json`**（`shared/constants/controlSurface.ts:1`；`control-surface.json` 是通用 resolver 的缺省名，`resolveControlSurfaceConnectionInfo.ts:5`）。

**它是 Worker 的"报到文件"——不依赖任何服务注册表的发现机制：**

- **谁写**：Worker 自己。HTTP server `listen` 成功那一刻写入（`controlSurfaceHttpServer.ts:401-421`），权限 `0600`（`connectionFile.ts:11`）。
- **内容**：`{ version: 1, pid, hostname, port, token, createdAt, appVersion, startedBy }`（`controlSurfaceHttpServer.ts:401-410`）。三合一：连接地址（hostname+port）、凭据（token，Bearer）、存活凭证（pid）。`startedBy ∈ {'cli','desktop'}` 标记拉起者。
- **谁读**：任何想连 Worker 的 client。校验：`version===1`、字段齐全、默认 `requireLivePid`（`process.kill(pid,0)` 探测）——**Worker 已死但文件还在 = 视为不存在**（`resolveControlSurfaceConnectionInfo.ts:39-61`）。
- **何时删**：Worker 正常退出 `server.dispose()` 时删（`controlSurfaceHttpServer.ts:442-447`）。异常死残留陈旧文件，靠 pid 探测兜底；Main 下次启动 `repairStaleLocalWorkerFiles` 清理。
- **因果链**：Desktop 路径下观察到的"随 App 启动出现、退出消失"，实际是"随 Worker 生、随 Worker 死"——Desktop 退出 → parent-pid 探测 → Worker 自杀 → 删文件。

## 8. userData 目录解析

| 场景 | 目录 | 证据锚点 |
|---|---|---|
| Desktop prod | `~/Library/Application Support/opencove`（macOS） | `appRuntimeConfig.ts:71-73` |
| Desktop dev | `~/Library/Application Support/opencove-dev`（默认 `-dev` 后缀），或 `OPENCOVE_DEV_USER_DATA_DIR` 覆盖 | `appRuntimeConfig.ts:84-90` |
| CLI / standalone | `OPENCOVE_USER_DATA_DIR` 覆盖；否则 `opencove-dev` 存在则优先，否则 `opencove` | `worker/userData.ts:24-38` |
| 共享已安装版数据 | `OPENCOVE_DEV_USE_SHARED_USER_DATA=1`（dev 跳过 `-dev` 后缀） | `appRuntimeConfig.ts:75-82` |

**发现的前提**：client 与 Worker 读写同一个 userData 的报到文件才能接上。dev（`opencove-dev`）与 prod（`opencove`）是两个目录，各连各的 Worker，互不可见。

**实测记录（2026-07-19）**：本地 `package.json` dev 脚本曾写为 `OPENCOVE_DEV_USER_DATA_DIR=... & node ...`——单个 `&` 是 shell 后台符，环境变量未传给 node，实际落到默认 `opencove-dev`。改 `&&` 或前缀赋值后生效。实测文件位于 `~/Library/Application Support/opencove-dev/`：`opencove.db`(+shm/wal)、`worker-control-surface.json`、`opencove-worker.lock`、`worker-topology.json`、`worker-endpoint-secrets.json`、`approved-workspaces.json`、`home-worker.json`。

## 9. dev vs prod：机制差异

机制**完全一致**（spawn、复用判定、parent-pid 死约、报到文件读写全是同一份运行时代码），差异仅两处路径：

| | dev | prod |
|---|---|---|
| Worker 脚本 | `out/main/worker.js` | 安装包 resources 内 |
| userData | `opencove-dev`（或 env 覆盖） | `opencove` |

## 10. 官方 release 与 standalone 下载

**release 方式**：打 tag 即发布（`docs/runtime/RELEASING.md`、`.github/workflows/release.yml`）。

- `git tag v*` + push → GitHub Actions 自动构建三端产物并创建 GitHub Release。
- 渠道：`stable`（纯版本 tag）/ `nightly`（`-nightly.YYYYMMDD.N`，另有每天 04:00 北京时间定时发布 `nightly.yml`）。
- 产物：Desktop 安装包（dmg/zip/exe/AppImage/deb）+ standalone bundle + 安装/卸载脚本 + `SHA256SUMS.txt`。

**standalone 单独下载存在**（`release.yml:115-181` 确认每 release 构建 + 冒烟 + 上传）：

| 资产 | 用途 |
|---|---|
| `opencove-server-<platform>-<arch>.tar.gz`（mac/Linux）/ `opencove-server-windows-<arch>.zip` | CLI + Worker 自包含 runtime |
| `opencove-install-v<tag>.sh` / `.ps1` | tag-pinned 一键安装脚本 |
| `opencove-install.sh` / `.ps1` | latest stable 别名（仅 stable） |

口径警告（`RELEASING.md:84-86`）：`releases/latest/download/opencove-install.sh` 若 404，说明 latest stable 未发布 standalone 资产，对外文档不得宣称可装。

## 11. install 脚本实质：不是"安装"

通读 `scripts/release-assets/opencove-install.ps1`（304 行），实际只做三件事：

| 动作 | 脚本位置 | 性质 |
|---|---|---|
| 下载 zip 解压到 `%LOCALAPPDATA%\OpenCove\standalone\` | `:269-283` | 拷文件 |
| 写 `opencove.cmd` shim | `:209-241` | 写一个批处理文件 |
| bin 目录加入**用户级** PATH | `:52-81,294` | 改一条用户环境变量 |

对照 Windows"安装"的构成要素：注册表 ❌、ARP 条目 ❌、服务/计划任务/自启 ❌、快捷方式/文件关联 ❌、系统目录/管理员权限 ❌。

**本质：portable（xcopy）部署 + PATH 便利。** 卸载对称（删目录、删 shim、摘 PATH，`:132-161`），不留系统痕迹。OS 从头到尾不知道 OpenCove 存在；Worker 从不被注册成持久实体，只在有人跑 `opencove worker start`（或 Desktop spawn）那一刻才存在。macOS/Linux 的 `.sh` 同构（`~/.local/share/opencove` + `~/.local/bin/opencove`）。

## 12. Electron 即 Node 运行时

**Electron 二进制被当作 Node.js 运行时用。**

- Electron 官方开关：`ELECTRON_RUN_AS_NODE=1` 使二进制跳过 Chromium，退化为纯 `node`。
- 三处同一技巧：
  - Desktop Main spawn Worker：`localWorkerManager.ts:216-219`
  - Windows `opencove.cmd` shim：`opencove-install.ps1:236-237`
  - standalone CLI：同 shim 机制
- **效果**：standalone bundle 自带运行时——用户机器不需要装 Node.js。OpenCove 没有独立的 Worker 可执行文件，Electron 二进制就是它的 Node 运行时。

## 13. standalone 包内容：未裁剪的完整应用

通读 `scripts/create-standalone-server-bundle.mjs`（251 行）+ `scripts/lib/standalone-asset-build.mjs`：

构建链：`electron` npm 包（build 时下载 Electron 二进制）→ `electron-builder --dir`（`standalone-asset-build.mjs:24-27`）产出 unpacked 应用目录 → 原样拷入压缩包。

zip 内容：

```
opencove-server-windows-x64.zip
├── runtime/win-unpacked/          ← electron-builder --dir 的完整解压应用目录，原样拷贝（:224-226）
│   ├── OpenCove.exe               ← Electron 二进制（重命名）
│   ├── *.dll / locales / resources.pak 等   ← Electron 全部运行时依赖
│   └── resources/app.asar         ← OpenCove 全部代码（CLI、Worker、GUI Main、Renderer 全在）
├── opencove-runtime.env           ← 两个路径指针（可执行文件 + CLI 入口，:227-235）
└── README.txt
```

**关键发现：无裁剪。** standalone 不是"只含 Worker 的精简包"，而是**整份未装包的 Desktop 应用**原样压缩：

1. 无裁剪配置：`package.json` `build` 段无 `files`、无 `asarUnpack`、无 `afterPack`；无 electron-builder 配置文件。默认规则 `out/` 全量进 `app.asar`。
2. Renderer 实体存在：`out/renderer/` 30MB（`index.html` + `web.html` + `assets/`）。
3. bundle 脚本零过滤：整个 unpacked 目录递归 `cp`（`:224-226`）。
4. 入口分流：`package.json` `main` → `./out/main/index.js`（GUI 入口，创建 BrowserWindow）；standalone launcher → `app.asar/src/app/cli/opencove.mjs`（无头入口，node 模式，`:156`）。跑 CLI 时 `out/main/index.js` 从不被 require，30MB renderer 从不被加载。

**standalone 的准确含义**：同一个构建产物的另一种打包形态——Desktop 安装包把这份目录压成 dmg/exe 安装器，standalone 把同一份目录压成 zip。代码零差异，差异只在启动方式。"自包含"指 zip 带齐运行所需一切（Electron 二进制当 Node + 全部代码），目标机器零预装。

## 14. 一句话现状总结

当前机制 = **单实例锁（文件锁 + pid 检测）+ 报到文件（`worker-control-surface.json`）+ 先到先得**：谁先需要 Worker 谁拉起它（Desktop 带死约、CLI 不带），后来者读报到文件复用同一个；全程无 OS 服务、无注册表，唯一状态就是 userData 目录里的几个文件。External-Worker 模式下这套机制已按"发现并连接、生命周期独立"的语义运转；带死约的 spawn 只是"没人先拉起时"的兜底。

## 证据边界

- **已核源码事实**：本文件 §1-§13 的所有 file:line 锚点均经 2026-07-19 源码通读核查。
- **本机实测**：userData 目录文件清单、dev 脚本 `&` bug（§8）。
- **配置链推导**：§13"renderer 在 app.asar 内"为配置链推导（无裁剪配置 + 零过滤拷贝 + 30MB 产物在打包源路径上），未逐字节解开实际 release 的 app.asar 验证；钉死方法：`pnpm build:standalone` 后解开 `dist/opencove-server-*.tar.gz` 内的 app.asar。
- **未实机验证**：Windows 用户级安装路径推断、latest stable 是否实际含 standalone 资产（需查 GitHub Releases 页面）。

## 修订记录

| 时间 | 修订内容 |
|---|---|
| 2026-07-19 23:52 | 初版：Worker 定义与位置、拉起路径（Main spawn 死约 / CLI 无死约 / 复用）、Main 双重身份、Worker 概念层职责、Agent 三层拉起链路、worker-control-surface.json 发现机制（含文件名勘误）、userData 解析（含 dev `&` bug 实测）、dev/prod 差异、release 方式与 standalone 下载、install 脚本实质（非安装）、Electron 即 Node 运行时、standalone 包内容（未裁剪完整应用）。全部现状事实，无改造方案。 |
