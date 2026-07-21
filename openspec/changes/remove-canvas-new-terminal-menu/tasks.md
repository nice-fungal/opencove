# 任务：画布下线 Terminal 创建能力

> updated_by: Kilo - kimi/k3
> updated_at: 2026-07-21 22:25:00

## 1. 右键菜单 New Terminal（①）

- [x] 1.1 删除菜单项 + i18n 条目
- [x] 1.2 清理 `createTerminalNode` prop 透传链（6 个文件）
- [x] 1.3 精简 `useInteractions.terminalCreation.ts`；删除死代码 `createTerminalNodeFromPaneContextMenu`

## 2. 快捷键 Cmd/Ctrl+T（②）

- [x] 2.1 `keybindings.ts`：移除命令注册与默认键位
- [x] 2.2 `useShortcuts.ts`：移除分发 case 与 prop
- [x] 2.3 `shortcutCommandKeys.ts` + i18n `workspaceCanvasCreateTerminal`
- [x] 2.4 `useCanvasShortcutActions.ts`：移除 `createTerminalAtViewportCenter` 及专用 options；`WorkspaceCanvasInner` 调用同步
- [x] 2.5 测试：`shortcuts.spec.ts` 键位断言、hook spec prop 清理

## 3. Quick Commands 整体下线（③）

- [x] 3.1 复核：仅 terminal/url 两种 kind；url 默认禁用且静默失败 → 删除成立
- [x] 3.2 删除 `domain/quickCommands.ts`、`QuickCommandsSubsection.tsx`
- [x] 3.3 `agentSettings.{ts,types.ts,defaults.ts}` 摘除 quickCommands 字段
- [x] 3.4 设置面板链：`QuickMenuSection` / `TasksAndShortcutsSection` / `SettingsPanel` / `useSettingsPanelUpdaters` / `settingsSearchIndex`；`'quick-menu'` 别名 scroll target 改指 phrases
- [x] 3.5 右键菜单链：pinned 项、commands 子菜单、`WorkspaceContextSubmenus`、`WorkspaceContextMenu(.types)`、`WorkspaceContextMenuParts`、`WorkspaceCanvasMenus`、`WorkspaceCanvasView(.types)`、`WorkspaceCanvasInner`
- [x] 3.6 `useInteractions.quickMenuActions.ts` 瘦身到只剩 `insertQuickPhrase`；`useInteractions.ts` 同步
- [x] 3.7 i18n：删 `quickMenu.commands.*`，`quickMenu.title` 改为 Quick Phrases / 快捷短语
- [x] 3.8 测试：`agentSettings.spec.ts`（删归一化用例）、`settingsPageRegistry.spec.ts`、m6 helpers 映射

## 4. 核心函数（④）

- [ ] 4.1 `createTerminalNodeAtFlowPosition` + test harness 绑定：暂缓删除，待入口清理稳定后评估（决策：先不动）

## 5. 测试迁移（借菜单创建终端的前置步骤）

- [x] 5.1 借菜单创建终端的前置步骤迁移到 test harness `createTerminalAtFlowPoint`；新增共享 helper `createTerminalViaTestApi`（electron 与 web-canvas 各一套）；harness 绑定门槛扩展 `isTest || enableTerminalTestApi`
  - 保留迁移（非 worktree）：`recovery.worker-client-input-after-restart`、`m6.endpoints-mounts.remoteOnly.steps`、`m6.endpoints-mounts.integration`、`workerWebCanvas` ×3、`workerWebCanvas.sync-resilience` ×3、`workerWebCanvas.sync-between-clients`、单测 ×2
  - 已回滚到 HEAD（worktree 相关，留给下一需求"禁用 worktree"统一处理）：`recovery.terminal-worktree-create-restart`、`m6.endpoints-mounts.dev-profile.happy-path`、`workerWebCanvas.worktree`、脚本 `e2e-space-worktree-{recovery,existing-branch,real-codex}.mjs`
- [x] 5.2 菜单存在性断言改 `toHaveCount(0)`
- [x] 5.3 `harness/architecture/results/*.jsonl` 重新生成

## 6. 验证

- [x] 6.1 `pnpm check`：仅剩 HEAD 已有的 2 个 onNodeDrag 类型错误（与本次无关）
- [x] 6.2 `pnpm vitest run`：1672 passed / 6 skipped
- [x] 6.3 lint：改动文件无新增错误类；prettier 已修复
- [ ] 6.4 e2e（electron / web-canvas）与手动验收：右键菜单无 New Terminal / Quick Commands；Cmd/Ctrl+T 无响应；Agent 创建正常；存量终端恢复正常
