# 设计：移除 Git Worktree 创建入口

> updated_by: HBR - GPT-5
> updated_at: 2026-07-22 23:13:59

## 背景

Worktree 创建能力当前存在两条正式调用链：

```text
人工用户
  -> Space 操作菜单
  -> openSpaceCreateWorktree
  -> SpaceWorktreeWindow(create)
  -> Desktop IPC 或 gitWorktree.createInMount

Agent / CLI / Web
  -> opencove worktree create 或 Browser OpenCove API
  -> worktree.create / gitWorktree.create / gitWorktree.createInMount
  -> createGitWorktreeUseCase
  -> createGitWorktree
  -> git worktree add
```

本变更只切断上游正式入口。IPC 与领域/基础设施实现继续存在，以避免破坏旧桌面调用、测试能力、数据格式和历史 Worktree 管理。

## 目标

- 正常生产 UI 不再显示或打开 Worktree 创建界面。
- CLI、Agent 和 Web 客户端无法通过受支持接口创建 Worktree。
- 三个创建型 Control Surface command 不被注册，也不出现在可调用命令面中。
- 桌面 IPC 与底层创建实现保持兼容。
- 已有 Worktree 的所有非创建行为保持不变。

## 非目标

- 不建立针对恶意 renderer、DevTools 或任意代码执行的安全边界。
- 不删除 `createGitWorktree`、IPC、DTO、错误码、`worktreesRoot` 或 SQLite 字段。
- 不删除已有 Worktree，不迁移 Space 目录，不改变 archive/remove/rename 行为。
- 不增加 `worktreeEnabled` 开关，也不保留 disabled 菜单占位。

## 入口处置矩阵

| 层级 | 当前入口 | 处置 | 理由 |
|---|---|---|---|
| Space UI | “创建 Worktree”菜单项 | 删除 | 人工正式入口 |
| Canvas UI wiring | `canCreateWorktreeForActiveMenuSpace`、`openSpaceCreateWorktree` | 删除生产透传 | 防止菜单之外残留可达路径 |
| 创建弹窗实现 | `SpaceWorktreeWindow` 的 create view | 保留但生产不可达 | 避免扩大共享 archive 窗口重构 |
| Workspace 设置 | Worktree 根目录配置行与搜索项 | 隐藏 | 避免展示只服务于已下线入口的配置 |
| Workspace 数据 | `worktreesRoot` 字段与 updater | 保留 | 旧状态和 IPC 兼容 |
| CLI | `opencove worktree create` | 删除 | Agent/人工命令入口 |
| Control Surface | `worktree.create` | 不注册 | 高层 Agent 命令入口 |
| Control Surface | `gitWorktree.create` | 不注册 | 本地/Worker 创建入口 |
| Control Surface | `gitWorktree.createInMount` | 不注册 | mount-aware/远程创建入口 |
| Browser API | `worktree.create` 到 `gitWorktree.create` 的映射 | 删除 | Web 正式入口 |
| Desktop Preload | `window.opencoveApi.worktree.create` | 保留 | IPC 兼容面 |
| Electron IPC | `worktree:create` | 保留 | 用户明确要求的底层兼容层 |
| 领域与基础设施 | DTO、port、use case、Git service | 保留 | 控制回归范围 |

## 设计决策

### 决策一：删除注册，不注册“禁用命令”

三个 Control Surface 创建命令必须从注册表消失。调用旧 ID 时沿用统一的未知/未注册命令行为，不新增 `disabled_by_policy` 错误码，也不保留一个会返回禁用错误的命令壳。

原因：需求要求删除 Agent 入口；保留可发现命令再返回错误仍然把它暴露为产品能力，并会继续诱导 Agent 调用。

### 决策二：删除 UI 触发链，避免重写共享创建实现

从 `WorkspaceSpaceActionMenu` 删除菜单项，并清理 `canCreateWorktreeForActiveMenuSpace` 与 `openSpaceCreateWorktree` 的生产 prop/hook 透传。`openSpaceArchive` 和共享 archive 窗口继续保留。

创建弹窗、表单、内部 `pending.kind === 'create'` 分支和 IPC 调用实现可以保留为不可达兼容代码。本变更的复核条件是生产代码中不存在把 create operation 加入 UI state 的调用点，而不是源码中不存在 create view。

### 决策三：设置只隐藏展示层

删除 Workspace 设置页中的 Worktree Root 行、设置搜索索引和只服务于该行的展示文案。`WorkspaceState.worktreesRoot`、序列化、SQLite、updater 和上层 props 可继续保留，避免 60 个以上 fixture 与恢复路径发生无关变化。

如果隐藏行后产生局部未使用 prop，可以只清理 presentation 层透传；不得把清理扩展到领域类型或持久化结构。

### 决策四：IPC 与 Preload 是明确保留的兼容面

以下内容不得随入口清理删除或改签名：

- `IPC_CHANNELS.worktreeCreate`
- `registerWorktreeIpcHandlers` 中的 `worktree:create` handler
- `normalizeCreateGitWorktreePayload`
- `OpenCoveApi.worktree.create` 的桌面 Preload 实现和类型
- `CreateGitWorktreeInput/Result`

这意味着拥有内部 Electron 调用能力的代码理论上仍可创建 Worktree。该残留是本需求主动接受的兼容权衡，不应在验收时误判为入口清理失败。

### 决策五：Browser bridge 不属于 IPC 兼容面

Browser runtime 当前把 `worktree.create` 直接映射为公开 Control Surface command。该映射必须删除；Browser API 对象不得继续发出 `gitWorktree.create` 请求。若共享类型要求该键存在，应让 Browser 专用实现明确返回“不支持”且不得发出 Control Surface 请求，同时增加测试锁定零副作用。优先采用运行时不暴露该键的实现。

### 决策六：保留并验证非创建 Worktree 能力

以下入口和实现必须保留：

- `worktree.list`、`worktree.archive`
- `gitWorktree.list*`、`statusSummary*`、`remove*`、`renameBranch*`
- Space branch/PR/status 展示
- 现有 Worktree 的 archive、remove、branch cleanup、recovery
- Node Control 按 branch 定位

## 实施顺序

1. 先增加或调整负向测试，锁定菜单和命令入口缺失。
2. 删除 Space 菜单与 create UI wiring，隐藏 Worktree Root 设置展示。
3. 删除 CLI 路由与帮助。
4. 摘除三个 Control Surface 注册块和 Browser bridge。
5. 迁移依赖正式创建入口的 E2E：纯入口测试改为负向断言；下游恢复测试使用外部 Git fixture、IPC 或 service 测试能力准备已有 Worktree。
6. 运行定向测试、类型检查和全量单测，再进行残留入口扫描。

## 测试设计

### 负向入口测试

- Space 操作菜单中 `Create Worktree` 数量为零。
- Workspace 设置不显示 Worktree Root 配置。
- CLI help 不包含 `worktree create`，命令分发不会发出 `worktree.create`。
- Control Surface 调用三个旧 ID 得到统一未知命令结果，且 mock `createWorktree` 未被调用。
- Browser API 不发出 `gitWorktree.create` 请求。

### 兼容回归测试

- IPC `worktree:create` handler 与 payload validator 保持通过。
- `createGitWorktreeUseCase` 和 `GitWorktreeService` 创建测试保持通过。
- `worktree.list`、`worktree.archive`、remove、rename、status 和 PR 展示测试保持通过。
- 依赖已有 Worktree 的恢复测试改用非产品入口建立 fixture 后继续执行原断言。

## 风险与缓解

- **风险：只删菜单但遗留 Agent command。** 通过 Control Surface 负向契约测试和命令 ID 全仓扫描防止。
- **风险：误删 IPC。** 将 IPC/Preload 文件列入保留清单，并保留兼容测试。
- **风险：共享 Window 重构影响 archive。** 不删除 create view，只切断生产触发链，减少共享组件改动。
- **风险：隐藏设置时扩散到持久化迁移。** 只修改 presentation 层，不变更 Workspace schema。
- **风险：旧 E2E 继续通过产品入口创建。** 所有 fixture 建立必须改为外部 Git、IPC 或 service 层，禁止借测试重新暴露正式入口。

## 复核门槛

- `rg` 不得在 UI action、CLI route、Browser bridge 和 Control Surface registration 中命中三个创建入口。
- `rg` 必须仍能在 IPC、DTO、use case 和 service 中命中创建实现。
- Git diff 不得包含 SQLite schema、Workspace 持久化格式或非创建 Worktree command 的删除。
- 负向入口测试与底层兼容测试必须同时通过。

