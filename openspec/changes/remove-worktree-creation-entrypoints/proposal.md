# 移除 Git Worktree 创建入口

> updated_by: HBR - GPT-5
> updated_at: 2026-07-22 23:13:59

## 为什么

OpenCove 当前同时向人工用户和 Agent 暴露了创建 Git linked worktree 的正式入口，包括 Space 操作菜单、CLI 和 Control Surface 命令。项目已经决定不再把“新建 worktree”作为受支持的工作模式，但现有 IPC、DTO、use case、Git service、持久化字段和历史 worktree 生命周期仍承担兼容职责，直接删除底层实现会扩大回归面。

本变更采用入口级下线：删除正式可发现、可调用的创建入口，同时保留内部实现和兼容契约。目标是让正常产品流程与 Agent 工具无法新建 worktree，又不引入数据库迁移或破坏已有 worktree 的读取、运行、恢复、归档和删除。

## 变更内容

1. 删除 Space 操作菜单中的“创建 Worktree”动作及其生产 UI 透传链，使创建弹窗无法通过正常界面打开。
2. 隐藏设置页中的 Worktree 根目录配置行及相关搜索项、展示文案；保留 `worktreesRoot` 数据字段和更新能力作为兼容层。
3. 删除 CLI `opencove worktree create` 命令及帮助文本。
4. 不再注册以下 Control Surface 创建命令：
   - `worktree.create`
   - `gitWorktree.create`
   - `gitWorktree.createInMount`
5. 删除 Web Browser API 到 `gitWorktree.create` 的桥接，避免 Web UI 或浏览器侧调用者绕过已移除的菜单。
6. 保留桌面 IPC `worktree:create`、Preload API、输入校验、DTO、port、use case、service、错误码和持久化结构。
7. 增加负向契约测试，验证人工 UI、CLI、Control Surface 和 Web bridge 不再暴露创建入口；保留底层创建与 IPC 兼容测试。
8. 更新面向用户和 Agent 的说明，删除对正式创建入口的描述，同时记录 IPC 仅为内部兼容面，不是受支持的产品入口。

## 能力

### 新增能力

- `worktree-creation-entrypoints`：规定哪些 Worktree 创建入口必须下线、哪些兼容层必须保留，以及入口缺失时的可观察行为。

### 变更能力

- Space 操作菜单不再提供 Worktree 创建动作。
- CLI 与 Control Surface 不再把 Worktree 创建声明为受支持命令。
- Workspace 设置不再展示仅服务于新建 Worktree 的根目录配置。

## 影响范围

- 人工 UI：Space 操作菜单、菜单状态 hook、Canvas prop 透传、Workspace 设置页和中英文文案。
- Agent/外部接口：CLI 路由与帮助、三个 Control Surface 注册点、Browser OpenCove API。
- 测试：菜单缺失、命令未注册、Browser bridge 缺失的负向测试；既有创建型 E2E 不再通过正式入口执行。
- 文档：CLI、Agent 工作流、架构说明和历史上下文中对正式创建入口的描述。

## 保留不动

- `worktree:create` IPC channel、handler、validator、Preload 方法和现有调用契约。
- `CreateGitWorktreeInput`、`CreateGitWorktreeResult`、`GitWorktreePort.createWorktree`、`createGitWorktreeUseCase` 与 `createGitWorktree`。
- `worktreesRoot` 的运行时字段、持久化字段、SQLite 列和旧数据读取逻辑。
- Worktree 创建弹窗及其内部创建逻辑可以保留为不可达兼容代码；本变更只保证生产入口不可达。
- 已有 Worktree 的枚举、状态、分支、PR、运行、恢复、归档、删除和分支重命名。
- `worktree.list`、`worktree.archive` 及所有非创建 Control Surface/IPC 能力。

## 非目标

- 不把本变更实现为安全沙箱或恶意代码防护。保留 IPC 意味着拥有内部 Electron 调用能力的代码仍可能调用底层创建能力。
- 不删除 Git Worktree 领域模块，不迁移数据库，不清理用户磁盘上的 Worktree。
- 不增加功能开关、禁用提示、占位菜单或新的设置项。
- 不改变普通 Git 状态、branch、PR 展示和 Node Control 的按 branch 定位能力。

## 验收边界

- 普通用户在生产 UI 中看不到 Worktree 创建菜单、弹窗入口或 Worktree 根目录设置。
- CLI 帮助和命令分发不包含 `worktree create`。
- Control Surface 命令目录不包含三个创建命令；直接调用按未知/未注册命令处理，且不产生文件系统副作用。
- Web Browser API 不提供 Worktree 创建桥接。
- 桌面 IPC 创建契约和底层单元测试继续通过。
- 已有 Worktree 的非创建操作无行为回归。
