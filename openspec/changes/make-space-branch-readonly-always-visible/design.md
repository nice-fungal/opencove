# 设计：Space Branch 只读常显

> updated_by: HBR - GPT-5
> updated_at: 2026-07-25 00:19:38

## 背景

当前生产调用链如下：

```text
WorkspaceSpaceRegionsOverlay
  -> listWorktrees / resolveClosestWorktree
  -> 判断 isWorkspaceRootWorktree
  -> shouldShowRepoSummary = !isWorkspaceRootWorktree || isSelected
  -> resolvedBranchBadge
  -> WorkspaceSpaceRegionItem
     -> allowBranchRename = true：渲染 button
        -> onStartBranchRename
        -> WorkspaceSpaceBranchRenameDialog
        -> renameBranch
        -> refreshNonce 重新拉取 Worktree
     -> allowBranchRename = false：渲染 span
```

这段逻辑产生两个耦合：

1. Workspace 根仓库的 branch 被归入 repo summary，只在 Space 选中时显示。
2. linked worktree 的 branch 因 `allowBranchRename` 被提升为编辑按钮，而同一个视觉元素同时承担信息展示和写操作入口。

历史提交表明，隐藏不是数据缺失：系统已经通过 `listWorktrees` 获取 Workspace 根仓库信息。它是 Space Explorer 阶段为了减少根仓库摘要常驻而引入的显示条件，后来被 E2E 固化。因此本变更只需解除展示 gating，不需要新增 Git 查询。

## 目标

- branch/head 一旦解析成功，所有 Space 都稳定显示右上角 branch badge。
- badge 只承担信息展示，不具备修改 branch 的交互能力。
- 只移除 branch badge 的点击触发入口，使其不能打开 branch rename 修改框。
- branch rename 修改框、状态、校验、提交和底层调用链保持原样。
- branch 常显不得隐式扩大 PR chip、Files change count 等其他 repo summary。
- 底层 rename 契约和服务保持兼容。

## 非目标

- 不改变 Worktree 枚举、路径匹配、mount 路由或轮询频率。
- 不改变 detached HEAD 的识别和短 SHA 格式。
- 不改变 Space 名称重命名。
- 不删除 Git branch rename 的 IPC、Control Surface 或 service。
- 不增加新的 Git 状态占位或错误提示。

## 现有实现锚点

| 职责 | 当前实现 | 本变更处置 |
|---|---|---|
| Worktree/branch 数据 | `WorkspaceSpaceRegionsOverlay.worktreePolling.ts` | 保持不变 |
| 最近 Worktree 解析 | `resolveClosestWorktree` | 保持不变 |
| branch 显示 gating | `WorkspaceSpaceRegionsOverlay.tsx` 的 `shouldShowRepoSummary` | branch badge 不再使用该 gating |
| PR 与 change count gating | 同文件的 `branchKey`、`resolvedChangedFileCount` | 保持现有 gating |
| branch badge 渲染 | `WorkspaceSpaceRegionItem.tsx` | 统一为只读 `span` |
| branch 改名触发入口 | `WorkspaceSpaceRegionItem.tsx` 的 branch button | 改为只读文本，不再触发回调 |
| branch 改名状态与提交 | `WorkspaceSpaceRegionsOverlay.tsx` | 保持不变，不做清理或重构 |
| 改名弹窗 | `WorkspaceSpaceBranchRenameDialog.tsx` | 保持组件、样式、文案和行为不变 |
| 旧 region 实现 | `WorkspaceSpaceRegion.tsx` | 不在本变更中清理 |
| 底层 rename 能力 | Preload、IPC、Control Surface、use case、Git service | 保留 |

## 设计决策

### 决策一：只解除 branch badge 的展示 gating

`shouldShowRepoSummary` 当前同时影响 branch badge、PR 查询目标和 Files change count。直接把该变量恒定为 `true` 会让本需求意外改变 PR 与 Git status 的展示范围。

因此 branch badge 独立按 `resolvedWorktreeInfo` 计算：

```text
resolvedWorktreeInfo.branch
  -> 直接显示完整 branch 名（无 Branch 种类前缀）

无 branch 但存在 resolvedWorktreeInfo.head
  -> 直接显示短 SHA（无 Detached 种类前缀）

无 resolvedWorktreeInfo 或 branch/head 均为空
  -> 不显示 badge
```

PR key 与 changed file count 继续使用既有 repo summary 条件。这样“branch 始终显示”只改变用户明确指出的控件。

### 决策二：branch badge 永远使用静态语义

`WorkspaceSpaceRegionItem` 删除以下输入：

- `allowBranchRename`
- `onStartBranchRename`

`resolvedWorktreeInfo` 继续保留，因为现有 PR chip 判断仍使用 branch 与 worktree path；本变更只删除 branch click 分支，不改变 PR 逻辑。

只要 `resolvedBranchBadge` 非空，就渲染统一的 `span.workspace-space-region__branch-badge`。保留 `data-testid` 和 `title`，方便自动化测试与完整 branch 名查看；删除 button modifier、点击 handler、焦点和按压语义。

branch badge 不再应用 `workspace-space-region__branch-badge--button` class；现有 CSS 规则保持不动，避免把入口禁用扩大为样式清理。

### 决策三：只禁用 branch badge 的点击入口

本变更只在 `WorkspaceSpaceRegionItem` 的 branch badge 渲染边界断开交互：branch/head 存在时始终输出静态 `span`，不再根据 `allowBranchRename` 输出 button，也不再从该 badge 调用 `onStartBranchRename`。

`WorkspaceSpaceRegionsOverlay.tsx` 中既有的以下内容保持不变，不因入口不可达而删除或重构：

- `BranchRenameState` 与 `branchRename` state
- branch rename input ref、focus/select 与 Escape effect
- `closeBranchRename`、`submitBranchRename`
- branch name 校验、错误转换和 mount-aware rename API
- 改名提交 busy label 与 `refreshNonce`
- `WorkspaceSpaceBranchRenameDialog` 渲染

允许清理 `WorkspaceSpaceRegionItem` 与调用点之间只服务于 branch badge 点击的 prop 透传，但不得进一步修改修改框内部实现。验收依据是点击 branch badge 无法让 `branchRename` 从 `null` 进入打开状态，而不是源码中完全不存在 branch rename 能力。

### 决策四：修改框与底层能力均明确保留

以下 UI 资产不删除、不修改、不重构：

- `WorkspaceSpaceBranchRenameDialog.tsx`
- branch rename dialog 对应 overlay/popover 样式
- `branchRenameDialog` 中英文文案
- 修改框的校验、提交、错误展示、Escape 和 loading 行为
- 当前无生产引用的 `WorkspaceSpaceRegion.tsx`

以下底层内容同样明确不删除：

- Desktop Preload `worktree.renameBranch`
- `worktree:rename-branch` IPC channel 与 handler
- rename DTO、validator、use case、port 和 Git service
- Browser/Control Surface 的 `gitWorktree.renameBranch`
- mount-aware 本地与远程 rename 实现

禁用边界是“Space 右上角 branch 控件不再是修改框入口”，不是“删除修改框”或“系统不能修改 Git branch”。

### 决策五：保持 branch 数据新鲜度

常显仍复用 `useWorkspaceWorktreeInfoByPath` 的首次加载、10 秒轮询、document hidden 跳过和失败时保留快照策略。本变更不新增请求，也不因取消 UI 改名而降低对外部 Git branch 变化的感知能力。

## 目标调用链

```text
WorkspaceSpaceRegionsOverlay
  -> listWorktrees / resolveClosestWorktree
  -> branch/head 存在
  -> 构造 resolvedBranchBadge（不读取 selected/explorer/root gating）
  -> WorkspaceSpaceRegionItem
  -> 只读 span

点击 branch badge
  -> 无事件处理
  -> branchRename 状态不变化
  -> 修改框不出现
  -> 无 rename API
```

## 测试设计

### 单元测试

- Workspace 根仓库 Space 在 `selectedSpaceIds=[]` 时显示 branch badge。
- 同一 Space 在选中状态切换前后 badge 均存在且文本不变。
- linked worktree Space 的 badge 元素不是 `button`，不含 button modifier class。
- 点击 badge 不出现 `workspace-space-branch-rename-dialog`，`renameBranch` mock 调用次数为零。
- detached HEAD 无 branch 时显示短 SHA（无 Detached 种类前缀）。
- 原本通过点击 badge 打开修改框的集成测试改为只读负向测试；修改框自身的校验、输入和提交行为测试保留，必要时直接渲染修改框验证。

### E2E 回归

- `workspace-canvas.space-explorer.layout.spec.ts` 把根 Space branch badge 的 `toHaveCount(0)` 改为打开 Explorer 前后均可见。
- local/remote worktree 与 PR chip 集成测试继续断言 branch badge 和 PR chip 可见。
- 验证未选中根 Space、选中根 Space和 Explorer 开关不改变 badge 存在性。

### 兼容测试

- 既有 IPC、Control Surface、use case 和 Git service rename 测试继续通过，证明底层兼容能力未被误删。

## 风险与缓解

- **风险：把 repo summary 全部改为常显。** branch 单独计算，PR 与 Files count 继续使用原 gating。
- **风险：入口禁用被误解为删除修改框。** 明确保留 dialog、state、校验、提交、样式和文案，只在 badge 渲染边界移除点击触发。
- **风险：删除底层 rename 能力扩大变更。** 把 Preload、IPC、Control Surface、use case 与 service 列入保留清单并运行兼容测试。
- **风险：清理不可达代码扩大变更范围。** 本变更不清理旧 region 或修改框资产，后续如需删除必须另立变更。
- **风险：常显后长 branch 名挤压右侧布局。** 保留现有 badge 截断和 title 语义，并运行 Space/Explorer layout E2E 检查 overflow。

## 复核门槛

- `WorkspaceSpaceRegionItem` 中不存在 branch button、`allowBranchRename` 或 `onStartBranchRename`。
- branch badge 不具备点击 handler，点击后 `branchRename` 状态不变化且修改框不出现。
- branch badge 计算不依赖 `isSelected`、Explorer 状态或 `isWorkspaceRootWorktree`。
- PR 与 Files change count 的条件未因本变更放宽。
- `WorkspaceSpaceBranchRenameDialog.tsx`、其样式、文案、状态、校验和提交逻辑没有被本变更修改或删除。
- 底层 rename IPC、Control Surface、use case 与 service 仍存在且测试通过。
- 根 Space 的 branch badge 在未选中时可见，点击无写操作副作用。
