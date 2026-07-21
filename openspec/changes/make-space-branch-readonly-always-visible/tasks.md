# 任务：Space Branch 只读常显

> updated_by: HBR - kimi/k3
> updated_at: 2026-07-25 00:40:00

## 1. 建立 branch 显示与交互基线

- [x] 1.1 在 `workspaceSpaceSwitcher.menu.spec.tsx` 增加 Workspace 根仓库 Space 的未选中场景，锁定当前 branch 数据能够被解析但 badge 被隐藏的基线。
- [x] 1.2 记录 linked worktree Space 当前通过 branch badge 打开改名弹窗并调用 `renameBranch` 的生产调用链。
- [x] 1.3 确认 `WorkspaceSpaceBranchRenameDialog.tsx`、相关状态、样式和文案的现状并列入保留清单；本变更不得修改或删除修改框本身。

## 2. 让 branch badge 独立常显

- [x] 2.1 在 `WorkspaceSpaceRegionsOverlay.tsx` 中让 `resolvedBranchBadge` 只依赖已解析的 `resolvedWorktreeInfo.branch/head`，不再依赖 Workspace 根仓库、选中状态或 Explorer 状态。
- [x] 2.2 保留 PR key 和 `resolvedChangedFileCount` 的既有 repo summary gating，不得把 PR chip 或 Files change count 随 branch 一起扩大为常显。
- [x] 2.3 保持 detached HEAD 的短 SHA、branch title、Worktree 路径匹配和轮询逻辑不变。

## 3. 把 branch badge 改为只读

- [x] 3.1 在 `WorkspaceSpaceRegionItem.tsx` 删除 `allowBranchRename`、`onStartBranchRename` 及交互式 button 分支。
- [x] 3.2 对所有 branch/head 统一渲染非交互 `span.workspace-space-region__branch-badge`，保留现有 `data-testid`、title 和 value；不再渲染 Branch/Detached 种类前缀。
- [x] 3.3 不再把 button modifier class 应用到 branch badge；保留现有样式文件，不为清理不可达规则扩大变更。

## 4. 只禁用 Canvas branch 修改入口

- [x] 4.1 在 branch badge 渲染边界移除点击 handler，使点击无法写入 `branchRename` state 或打开修改框。
- [x] 4.2 允许删除 `WorkspaceSpaceRegionItem` 与调用点之间只服务于 badge 点击的 `allowBranchRename` / `onStartBranchRename` prop 透传，但不得继续清理改名实现。
- [x] 4.3 保留 `WorkspaceSpaceRegionsOverlay.tsx` 中的 branch rename state、input ref、focus/Escape effects、校验、提交、错误处理、busy label 和 `refreshNonce`。
- [x] 4.4 保留 `WorkspaceSpaceBranchRenameDialog.tsx`、专用 CSS 与 `branchRenameDialog` 中英文文案，且不得修改其行为。
- [x] 4.5 不清理当前无生产引用的 `WorkspaceSpaceRegion.tsx`；不可达代码整理不属于本变更。

## 5. 保留底层 rename 兼容面

- [x] 5.1 保留 Desktop Preload 的 `worktree.renameBranch` 方法、类型和 `worktree:rename-branch` IPC channel。
- [x] 5.2 保留 IPC handler、validator、DTO、use case、port、Git service 和错误码。
- [x] 5.3 保留 Browser/Control Surface `gitWorktree.renameBranch` 与 mount-aware 本地/远程 rename handler。
- [x] 5.4 复核实现 diff 不包含底层 rename 契约删除或签名变化。

## 6. 更新自动化测试

- [x] 6.1 把根仓库 Space 未选中时 branch badge 不存在的断言改为 badge 可见且包含当前 branch。
- [x] 6.2 增加选中状态和 Explorer 开关前后 branch badge 始终存在的断言。
- [x] 6.3 增加只读 DOM 断言：badge 不是 button、不含 button modifier class、不可获得编辑语义。
- [x] 6.4 增加零副作用断言：点击 badge 不打开改名弹窗且 `renameBranch` mock 调用次数为零。
- [x] 6.5 增加 detached HEAD 常显测试，断言短 SHA 且无 Detached 前缀。
- [x] 6.6 把原本依赖点击 badge 打开修改框的集成测试改为只读负向测试；保留修改框自身的改名成功、非法名称校验和输入聚焦覆盖，必要时改为直接渲染修改框。
- [x] 6.7 保留 local/remote worktree、PR chip、IPC、Control Surface、use case 与 Git service rename 兼容测试。

## 7. 验证与自我复核

- [ ] 7.1 运行格式化、`pnpm check` 和受影响的 lint。（已完成：变更文件 prettier 通过、受影响文件 oxlint 通过，仅存在存量告警 `WorkspaceSpaceRegionsOverlay.tsx:69` 默认参数；**人工验收**：整体编译 `pnpm check`）
- [x] 7.2 运行 `tests/unit/contexts/workspaceSpaceSwitcher.menu.spec.tsx` 及相关 Canvas overlay 单测。（10/10 通过）
- [ ] 7.3 运行 `tests/e2e/workspace-canvas.space-explorer.layout.spec.ts`，验证根 Space branch 在 Explorer 打开前后常显且布局无 overflow。**人工验收**（E2E 需真实应用环境）
- [ ] 7.4 运行 local/remote Worktree 与 PR chip 集成测试，确认 linked worktree branch 和 PR 行为无回归。**人工验收**
- [ ] 7.5 运行底层 branch rename IPC、Control Surface、use case 与 Git service 定向测试。**人工验收**
- [x] 7.6 执行入口扫描：branch badge 不得具有 click handler、`allowBranchRename`、`onStartBranchRename` 或 button modifier；修改框实现本身应继续存在。
- [x] 7.7 执行兼容保留扫描：Preload、IPC、Control Surface、use case 与 Git service 的 rename 能力必须仍存在。
- [x] 7.8 审阅最终 diff，确认 branch 常显没有放宽 PR chip、Files change count 或其他 repo summary 条件。
