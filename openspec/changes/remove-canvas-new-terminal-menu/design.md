# 设计：画布下线 Terminal 创建能力

> updated_by: Kilo - kimi/k3
> updated_at: 2026-07-21 22:25:00

## 入口盘点与处置

画布上"新建 Terminal"的全部用户入口：

| # | 入口 | 处置 | 状态 |
|---|---|---|---|
| ① | 右键菜单 New Terminal（`WorkspaceContextMenuParts.tsx`） | 删除 | ✅ 已完成 |
| ② | 快捷键 Cmd/Ctrl+T（`workspaceCanvas.createTerminal`） | 删除 | ✅ 已完成 |
| ③ | Quick Commands（terminal kind spawn + pty.write） | 功能整体下线 | ✅ 已完成 |
| ④ | 核心函数 `createTerminalNodeAtFlowPosition` | 暂缓（决策：等入口清理稳定后再评估） | 保留 |

## ③ Quick Commands 复核结论

- domain 确认只有 `terminal` / `url` 两种 kind（`quickCommands.ts` 判别联合）。
- url kind 依赖 `websiteWindowPolicy.enabled`，默认 `false`（实验功能）；禁用时 `runQuickCommand` 静默 `return`，菜单层也把 url 命令过滤掉——用户视角等于坏的。
- 结论：整体删除成立；Quick Phrases 是独立功能（插入文本/创建便签），保留。

## ② 快捷键删除范围

- `keybindings.ts`：`WORKSPACE_CANVAS_COMMAND_IDS` 成员 + `resolveDefaultKeybindings` 默认键位
- `useShortcuts.ts`：分发 case + prop + 依赖
- `shortcutCommandKeys.ts`：设置面板 title/help key 两个 case
- `useCanvasShortcutActions.ts`：`createTerminalAtViewportCenter` 及仅其使用的 options（`workspaceId` / `workspacePath` / `environmentVariables` / `createNodeForSession` / `onShowMessage` / `terminalDisplayMetrics` / `defaultTerminalProfileId` / `terminalFontSize`）
- i18n：`workspaceCanvasCreateTerminal`（en/zh-CN）
- 测试：`shortcuts.spec.ts` 键位断言、`workspaceCanvas.shortcuts.hook.spec.tsx` prop

## ③ Quick Commands 删除范围

- 整体删除：`domain/quickCommands.ts`、`settingsPanel/quickMenu/QuickCommandsSubsection.tsx`
- 摘除 command 部分（保留 phrases）：`agentSettings.{ts,types.ts,defaults.ts}`、`QuickMenuSection`、`TasksAndShortcutsSection`、`SettingsPanel`、`useSettingsPanelUpdaters`、`settingsSearchIndex`（删 `quick-menu.commands` 条目）、`WorkspaceContextMenuQuickMenuParts`（删 pinned 项 + commands 触发钮 + `WorkspaceContextQuickCommandsSubmenu`）、`WorkspaceContextSubmenus`、`WorkspaceContextMenu(.types)`、`WorkspaceContextMenuParts`、`WorkspaceCanvasMenus`、`WorkspaceCanvasView(.types)`、`WorkspaceCanvasInner`、`useInteractions.quickMenuActions`（瘦身到只剩 `insertQuickPhrase`）、`useInteractions`
- i18n：删 `quickMenu.commands.*`；`quickMenu.title` 改为 'Quick Phrases' / '快捷短语'
- `'quick-menu'` 设置页别名保留（phrases 的 Customize 仍用），scroll target 改指 `settings-section-quick-phrases`（registry + spec + m6 helpers 同步）

## 保留清单（勿动）

- Agent 全链路：`launchWorkspaceAgentSession`、`createNodeForSession`、hydration、nodeControl、PTY 服务层（main/control surface/IPC）、Terminal Profile 设置（agent 会话共用 `defaultTerminalProfileId`）
- 存量终端节点的恢复/重启（`useHydrateAppState.helpers.ts`、`nodeControlUseCases.ts`）
- `createTerminalNodeAtFlowPosition` + `useInteractions.terminalCreation.ts`（test harness 绑定）+ `createNodeForSession`
- Quick Phrases 全链路、`quickMenu/moveItem.ts`、`openQuickMenuSettings.ts`

## 测试迁移原则

- e2e/脚本中"借菜单创建终端"的前置步骤 → test harness `createTerminalAtFlowPoint`（新增共享 helper `createTerminalViaTestApi`）；web-canvas 经 `?opencoveTerminalTestApi=1` 启用，dev-profile spec 经 `OPENCOVE_TERMINAL_TEST_API=1` env 启用（harness 绑定门槛：`meta.isTest || meta.enableTerminalTestApi`）
- 菜单存在性断言 → `toHaveCount(0)`
- 功能专属测试（quick commands 归一化、快捷键键位断言）→ 删除
- 生成产物 `harness/architecture/results/*.jsonl` → 重新生成
