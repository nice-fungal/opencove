# 画布下线 Terminal 创建能力（只保留 Agent）

> updated_by: Kilo - kimi/k3
> updated_at: 2026-07-21 22:25:00

## 为什么

产品方向：**画布只允许暴露 Agent，不允许暴露 Terminal**。画布上所有"用户可新建 Terminal"的入口都要移除；Agent 节点底层虽然复用 PTY/终端渲染，但属于核心功能，必须保留。

## 变更内容

1. **右键菜单 New Terminal**：已删（菜单项 + i18n + `createTerminalNode` prop 链 + 死代码 `createTerminalNodeFromPaneContextMenu`）。
2. **快捷键 Cmd/Ctrl+T**（`workspaceCanvas.createTerminal`）：删除命令注册、默认键位、设置面板展示、`useShortcuts` 分发 case、`createTerminalAtViewportCenter` 及其专用 options。
3. **Quick Commands 功能整体下线**：复核确认其只有 `terminal` / `url` 两种 kind——terminal kind 违反本需求；url kind 依赖 `websiteWindowPolicy.enabled`（默认 false，实验功能）且在禁用时**静默失败**，等同坏的。删除 domain、设置面板 subsection、右键菜单 pinned 项与子菜单、`runQuickCommand` hook 逻辑、i18n。**保留 Quick Phrases**（独立功能，插入文本/便签）。
4. **核心函数 `createTerminalNodeAtFlowPosition` 暂缓删除**：按决策保留（连同 test harness 绑定），待入口清理稳定后再评估。

## 保留不动

- Agent 节点全链路（Run Agent / Task / Role / hydration / nodeControl / PTY 服务层 / Terminal Profile 设置）——Agent 是核心功能，底层 PTY 依赖不动。
- 存量终端节点的启动恢复与重启路径（用户确认无需兼容处理，但也无需主动删）。
- Quick Phrases 及其设置 UI、`openQuickMenuSettings`（scroll target 改指 `settings-section-quick-phrases`）。

## 测试策略

- 依赖"创建终端"做前置步骤的 e2e/脚本（重启恢复、mount cwd、web 同步等场景，断言目标是创建**之后**的行为）→ 迁移到既有 test harness `createTerminalAtFlowPoint`（harness 绑定门槛扩展为 `meta.isTest || meta.enableTerminalTestApi`）。
- 菜单内容断言 → 改为 `toHaveCount(0)`。
- 快捷键设置面板断言、quick commands 归一化单测 → 随功能删除。
