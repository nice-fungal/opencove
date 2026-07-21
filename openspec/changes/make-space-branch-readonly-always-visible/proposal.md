# Space 右上角 Branch 改为只读常显

> updated_by: HBR - GPT-5
> updated_at: 2026-07-25 00:19:38

## 为什么

Space 画布右上角已经存在 branch badge，但当前行为把“是否显示 branch”和“是否允许重命名 branch”耦合在同一套组件与状态中：

- `WorkspaceSpaceRegionsOverlay.tsx` 使用 `shouldShowRepoSummary = !isWorkspaceRootWorktree || isSelected` 控制 branch badge。绑定 Workspace 根仓库的 Space 在未选中时不显示 branch，只有选中后才显示；linked worktree Space 则常显。
- 该条件最初随 Space Explorer 的 repo summary 降噪逻辑引入，历史上曾允许 Explorer 打开时显示，随后又收窄为仅选中时显示。现有 `workspace-canvas.space-explorer.layout.spec.ts` 以 badge 数量为 `0` 锁定了隐藏行为。
- linked worktree Space 的 branch badge 被渲染为按钮。点击后打开 `WorkspaceSpaceBranchRenameDialog`，确认后经 mount-aware Worktree API 调用 `renameBranch` 修改 Git branch。

这与当前产品意图不一致：右上角 branch 应作为 Space 所处 Git 上下文的稳定只读信息，而不是依赖选中状态出现的隐式编辑入口。

## 变更内容

1. 只要系统已为 Space 解析到 branch 或 detached HEAD，右上角 branch badge 就始终显示；branch 的显示逻辑与 `isWorkspaceRootWorktree`、`isSelected` 和 Explorer 状态完全无关。
2. branch badge 统一渲染为非交互文本，不再使用按钮样式、点击事件、焦点状态或编辑语义。
3. 只禁用 Canvas branch badge 的点击入口，使点击不再打开现有 branch rename 修改框。
4. 保留 `WorkspaceSpaceBranchRenameDialog` 修改框本身及其状态、校验、提交、样式和文案，不对修改框实现做清理或重构。
5. 保留底层 `renameBranch` Preload、IPC、Control Surface、use case 与 Git service 能力。本变更禁用的是 Space 右上角 branch 的修改入口，不是删除底层 Git branch rename 兼容能力。
6. 保持 branch 数据轮询、mount-aware worktree 枚举、PR chip、Files change count、Space 名称修改和 Worktree 生命周期行为不变。

## 能力

### 新增能力

- `space-branch-indicator`：规定 Space 右上角 branch 指示器在可解析 Git 上下文下常显且只读，并明确其不得触发 branch 修改。

### 保持能力

- linked worktree 与 Workspace 根仓库继续通过现有 Worktree 枚举和最近路径匹配解析 branch。
- detached HEAD 继续以短 SHA 展示。
- PR chip 和 Files change count 继续遵循各自现有展示条件；不得因为 branch 常显而扩大其他 repo summary 的范围。
- 底层 Git branch rename 契约继续存在，供非本入口的兼容调用与测试使用。

## 影响范围

- Canvas Space Git 上下文编排：拆分 branch badge 展示条件与其他 repo summary 展示条件。
- Space region 视图：删除 branch button 分支和改名回调 props，统一输出只读 badge。
- Canvas branch rename UI：只断开 branch badge 的点击触发入口；修改框及其内部实现保持不变。
- 测试：把根仓库 Space 未选中时“无 branch badge”的断言改为“branch 常显”，并增加只读和零改名副作用断言。

## 保留不动

- `window.opencoveApi.worktree.renameBranch` 及其类型。
- `worktree:rename-branch` IPC channel、payload validator、main handler、use case 和 Git service。
- `gitWorktree.renameBranch`、mount-aware rename handler 及远程 Worker 能力。
- `WorkspaceSpaceBranchRenameDialog.tsx`、branch rename state、校验、提交、专用样式与中英文文案。
- Worktree list polling、branch 刷新、PR 查询、Git status 查询和 Space Explorer。
- Space 名称的点击重命名功能；本变更只处理 Git branch badge。
- Archive、remove、branch cleanup、恢复和已有 Worktree 管理。

## 非目标

- 不新增 branch 选择器、切换器、复制按钮或上下文菜单。
- 不把 branch badge 改成不可见、hover 才显示或仅 active Space 显示。
- 不为非 Git 目录伪造 branch 占位；尚未解析到 branch/head 时允许不显示。
- 不改变 PR chip 或 Files change count 的现有 gating。
- 不删除底层 branch rename API，也不建立新的权限或安全边界。
- 不删除、修改或重构 branch rename 修改框本身；本变更只让 branch badge 无法触发它。

## 验收边界

- 绑定 Workspace 根仓库的 Space 在未选中、Explorer 关闭时仍显示当前 branch。
- linked worktree Space 继续始终显示其 branch。
- detached HEAD Space 始终显示 detached 标识与短 SHA。
- branch badge 的 DOM 不是 `button`、没有可触发改名的点击行为，也不会打开 branch rename 弹窗。
- 点击 branch badge 不调用任何 `renameBranch` API。
- 选择 Space、打开或关闭 Explorer 不改变 branch badge 的存在性。
- PR chip、Files change count、Space 名称编辑和底层 rename 契约无行为回归。
