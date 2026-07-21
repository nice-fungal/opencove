# 任务：移除 Git Worktree 创建入口

> updated_by: HBR - GPT-5
> updated_at: 2026-07-22 23:13:59

## 1. 建立入口基线与回归护栏

- [ ] 1.1 在 `workspaceSpaceActionMenu` 相关单测中增加负向断言：Space 菜单不包含“创建 Worktree”，archive 和其他 Space 动作仍存在。
- [ ] 1.2 在 Workspace 设置相关测试中增加负向断言：不展示 `settings-worktree-root`，设置搜索结果不包含 Worktree Root。
- [ ] 1.3 在 `controlSurface.worktreeHandlers` 相关测试中增加负向契约：`worktree.create`、`gitWorktree.create`、`gitWorktree.createInMount` 均按未注册命令处理，且 create mock 调用次数为零。
- [ ] 1.4 为 CLI 增加或调整测试：帮助文本不包含 `worktree create`，解析该命令不得发出 `worktree.create` 请求。
- [ ] 1.5 为 Browser OpenCove API 增加测试：Browser runtime 不暴露可用 create bridge，任何兼容占位均不得调用 `invokeBrowserControlSurface` 的 `gitWorktree.create`。

## 2. 删除人工 UI 入口

- [ ] 2.1 从 `WorkspaceSpaceActionMenu.tsx` 删除“创建 Worktree”菜单项、图标 import、`canCreateWorktree` 与 `onCreateWorktree` props，并删除 `spaceActions.createWorktree` 中英文文案。
- [ ] 2.2 清理 `WorkspaceCanvasMenus.tsx`、`WorkspaceCanvasView.tsx` 和 `WorkspaceCanvasView.types.ts` 中的 `canCreateWorktreeForActiveMenuSpace`、`openSpaceCreateWorktree` 透传。
- [ ] 2.3 从 `useSpaceUi.ts` 删除生产 `openSpaceCreateWorktree` callback；保留 `openSpaceArchive`、operation phase 和共享 archive 窗口行为。
- [ ] 2.4 从 `useCanvasSpaceMenuState.ts` 删除只服务于创建菜单资格的 Worktree polling、repo root 解析和 eligibility 计算；不得影响 Canvas overlay 自身的 Worktree status/branch/PR polling。
- [ ] 2.5 确认生产代码中不存在向 `spaceWorktreeOperations` 加入 create mode 的调用点；保留 `SpaceWorktreeWindow` create view、IPC 调用和内部实现为不可达兼容代码。

## 3. 隐藏 Worktree 创建目录设置

- [ ] 3.1 从 `WorkspaceSection.tsx` 删除 Worktree Root 可见配置行、解析后路径展示和仅由该行使用的局部计算。
- [ ] 3.2 从 `settingsSearchIndex.ts` 删除 Worktree Root 搜索词，并删除 `en/zh-CN.settingsPanel.workspace.ts` 中只服务于该可见配置的文案。
- [ ] 3.3 只清理 Settings presentation 层产生的未使用 props；保留 `worktreesRoot` 的 Workspace 类型、updater、归一化、序列化、SQLite schema 和历史数据读取。

## 4. 删除 CLI 与公开 Control Surface 创建入口

- [ ] 4.1 从 `src/app/cli/opencove.mjs` 删除 `worktree create` 命令分发，从 `usage.mjs` 删除对应帮助文本；保留 `worktree list` 和 `worktree archive`。
- [ ] 4.2 从 `gitWorktreeHandlers.ts` 摘除 `gitWorktree.create` 注册块；保留 list/status/default-branch/remove/rename/suggest handlers 及底层 create service。
- [ ] 4.3 从 `gitWorktreeMountWriteHandlers.ts` 摘除 `gitWorktree.createInMount` 注册和远程转发入口；保留 remove/rename mount handlers。
- [ ] 4.4 从 `worktreeHandlers.ts` 摘除 `worktree.create` 注册块；保留 `worktree.list`、`worktree.archive` 和历史 Worktree 收尾流程。
- [ ] 4.5 复核 Control Surface 注册表与命令发现结果中不再出现三个创建 ID；旧 ID 调用必须走统一的未知命令路径，不新增禁用错误码。

## 5. 删除 Web 创建桥接并保留桌面 IPC

- [ ] 5.1 从 `browserOpenCoveApi.ts` 删除 Browser runtime 到 `gitWorktree.create` 的映射；若共享类型要求兼容键，使用不转发、无副作用的 Browser 专用 unsupported 实现。
- [ ] 5.2 明确保留 `src/app/preload/index.ts` 与 `index.d.ts` 中桌面 `worktree.create` 方法及签名。
- [ ] 5.3 明确保留 `IPC_CHANNELS.worktreeCreate`、`registerWorktreeIpcHandlers` 的 `worktree:create` handler、payload validator 和 IPC 清理逻辑。
- [ ] 5.4 运行 IPC 创建兼容测试，确认桌面内部调用仍能到达既有 use case；不得通过修改 IPC 来实现入口禁用。

## 6. 迁移创建型测试与脚本

- [ ] 6.1 将 `workspace-canvas.worktree-create.light-theme` 等纯创建 UI 测试改为入口缺失断言，或在被负向组件/E2E 覆盖后删除重复用例。
- [ ] 6.2 更新 `spaceWorktreeWindow.create-close`、`spaceWorktreeWindow.flow` 等测试：保留底层/不可达 create view 的兼容覆盖，但不得断言生产菜单可以打开创建界面。
- [ ] 6.3 将 recovery、remote mount、web canvas 和真实 Agent 脚本中“借正式入口创建 Worktree”的 fixture 建立步骤迁移到外部 `git worktree add`、桌面 IPC 或直接 service/test harness；后续恢复与运行断言保持不变。
- [ ] 6.4 保留 `GitWorktreeService`、use case、IPC payload/handler 的创建测试，确保路径分配、branch mode、错误码和清理兼容性未回归。
- [ ] 6.5 保留并运行 existing Worktree 的 list/status/PR/archive/remove/rename/recovery 测试，确认入口清理没有误伤非创建行为。

## 7. 更新说明与架构记录

- [ ] 7.1 删除 CLI、Agent playbook、Canvas/Control Surface 文档中把三个创建命令或菜单描述为正式能力的内容。
- [ ] 7.2 更新 `.context/WORKSHOP-005.md` 的历史结论：正式 UI/Agent 创建入口已下线；IPC 和底层实现仅为内部兼容面。
- [ ] 7.3 不删除普通 Git/已有 Worktree 的架构说明，不把本变更描述为“完全删除 Worktree 支持”或“安全级禁止”。

## 8. 验证与自我复核

- [ ] 8.1 运行格式化、`pnpm check` 和相关 lint，修复本次引入的问题，不处理无关存量错误。
- [ ] 8.2 运行 UI、Settings、CLI、Control Surface、Browser 和 IPC 的定向测试。
- [ ] 8.3 运行 `pnpm vitest run`，确认全量单元/集成测试无新增失败。
- [ ] 8.4 运行受影响的 Electron/Web E2E，确认菜单和设置入口缺失、Agent command 未注册、已有 Worktree 行为正常。
- [ ] 8.5 执行残留入口扫描：UI action、CLI route、Browser bridge、Control Surface registration 不得命中三个创建入口。
- [ ] 8.6 执行兼容保留扫描：IPC、Preload、DTO、port、use case、Git service、`worktreesRoot` 与 SQLite schema 必须仍存在。
- [ ] 8.7 审阅最终 diff：不得包含数据库迁移、Workspace 持久化格式变更、非创建 Worktree command 删除或用户磁盘清理。
- [ ] 8.8 对照 proposal、design 和 delta spec 逐项验收，并记录任何无法执行的 E2E 或残余风险。
