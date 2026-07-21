# Space 创建、协作与归档调研

> updated_by: HBR - GPT-5
> updated_at: 2026-07-25 14:42:27

## 1. 调研前提

- `Project = Workspace`。
- 当前只专注调研单个 Project，可以简单认为系统中有且只有一个 Project。
- 一个 Project 包含多个 Space。
- 一个 Space 对应一个 Directory。

## 2. Project、Space 与 Directory

当前讨论采用如下关系：

```text
Project / Workspace
├── Space A ─── Directory A
├── Space B ─── Directory B
└── Space C ─── Directory C
```

一个节点最多属于一个 Space。Space 之间不是共享所有权关系；移动节点意味着所有权转移，而不是让多个 Space 同时拥有该节点。

同一个 Directory 下的不同 Space 可以通过文件系统间接影响彼此，但这不构成 Space 之间的原生通信协议。

## 3. Task 的意义与 Agent 启动

### 3.1 Task 的定位

Task 是持久化的任务规格，同时也是 Agent 编排入口。创建 Task 本身不会自动启动 Agent；点击 Run 后，Task 才会启动或重跑 Agent。

### 3.2 Task 作为 Prompt 传给 Agent

“Task 作为 Prompt 传递给/启动 Agent”这个说法需要精确化：

- Run 读取 `TaskNodeData.requirement`；
- `requirement` 字符串作为 `prompt` 传给 Agent；
- 不是把整个 Task 对象序列化后作为 Prompt；
- `title`、`status`、`priority`、`tags` 等字段不会自动拼接进 Prompt；
- 创建 Task 不会自动启动 Agent。

关键实现位置：

- `src/contexts/workspace/presentation/renderer/types.ts`
- `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useTaskActions.agentSession.run.ts`

### 3.3 Task 状态与完成标准

- Run 会自动把 Task 设置为 `doing`；
- Agent 进入 `standby`、正常退出或失败，都不会自动把 Task 标记为 `ai_done` 或 `done`；
- 当前没有自动验收标准；
- `ai_done` / `done` 主要由用户或外部 `node.update` 操作设置。

因此，Task 的“完成”目前不是由 Agent 生命周期自动推断的，也不是由系统根据 Prompt 结果自动验收的。

相关实现：

- `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/usePtyTaskCompletion.ts`

## 4. Task 与 Agent 的交互关系

### 4.1 不同 Task 是否互相知道

默认不知道。

- Task 没有依赖、父子或关联字段；
- Agent Prompt 不包含其他 Task 的信息；
- 不同 Task 默认互不感知。

### 4.2 不同 Task/Agent 是否有原生交互手段

当前没有原生的 Agent-to-Agent 消息、handoff 或 mailbox 机制。

可行的间接交互方式包括：

- 通过共享 Directory、文件或 Git 交换结果；
- 由人工在不同 Task 之间转述上下文；
- 显式使用 OpenCove CLI / Control Surface 查询或修改其他节点。

CLI 是管理旁路，不是 Agent 之间的协作协议。

## 5. Space 与 Space 的协作/通信

Space 没有运行时消息字段，也没有原生通信机制。

Space 之间可以存在以下结构关系：

- 父子层级关系；
- 目录边界关系；
- 归档 subtree 的级联关系。

这些关系不等于运行时协作。若两个 Space 使用同一 Directory，它们可以通过文件系统间接影响彼此；但系统没有提供 Space-to-Space 的消息、事件或同步通道。

## 6. Space Archive 动作语义

Space 的 Archive 弹窗中，主要动作含义如下：

| 动作 | 实际效果 |
| --- | --- |
| Cancel | 关闭弹窗，不产生副作用 |
| Execute & Close | 关闭 subtree 中的 Agent/Terminal；执行勾选的 Worktree/Branch 清理；从当前 Project 移除 Space subtree 和节点；不保存 Archive Record |
| Execute & Archive | 执行与 Execute & Close 相同的关闭、清理和移除操作；额外保存 Space、节点和 Git 快照 |

这里的 `Execute` 不是执行 Task 或启动 Agent，而是执行用户勾选的清理、关闭与移除操作。

关键实现位置：

- `src/contexts/worktree/presentation/renderer/windows/SpaceWorktreePanels.tsx`
- `src/contexts/worktree/presentation/renderer/windows/useSpaceWorktreePanelHandlers.ts`
- `src/contexts/worktree/presentation/renderer/windows/useSpaceWorktreeArchiveState.ts`
- `src/contexts/workspace/presentation/renderer/utils/spaceArchiveRecords.ts`

当前 Archive Record 不能恢复或重放为活动 Space。

## 7. Archive 的只读查看入口

只读入口位于：

```text
Command Center
└── Space 归档记录
    ├── 左侧：Archive Record 列表
    └── 右侧：Archived Space Display / 快照画布
```

打开后可以查看：

- Space 布局；
- Task 内容；
- Note 内容；
- Agent / Terminal 元数据；
- Git 快照信息。

右侧快照画布是只读的：

- 不可拖动节点；
- 不可选择元素；
- 可平移和缩放查看；
- Note 内容以只读 `textarea` 展示；
- 没有恢复、编辑或重新运行按钮。

相关实现：

- `src/app/renderer/shell/components/CommandCenter.tsx`
- `src/app/renderer/shell/components/SpaceArchiveRecordsWindow.tsx`
- `src/app/renderer/shell/components/SpaceArchiveReplayCanvas.tsx`
- `src/app/renderer/shell/components/SpaceArchiveReplayNodes.tsx`

## 8. Archive 删除功能的当前状态

理论上，源码在左侧 Archive Record 按钮上注册了 `onContextMenu`，并渲染“删除归档”菜单项。

但实际运行时，左侧记录右键没有响应，且 Archived Space Display 区没有常驻删除按钮。因此当前应以以下结论为准：

> Archive 可以只读查看，但当前 UI 没有可靠可用的删除入口。

端到端测试虽然包含“右键记录 → 删除归档”的断言，但该测试当前整体使用 `test.skip`，不能证明运行中的 Electron 界面可用。

涉及位置：

- `src/app/renderer/shell/components/SpaceArchiveRecordsWindow.tsx:178`：记录按钮的 `onContextMenu`；
- `src/app/renderer/shell/components/SpaceArchiveRecordsWindow.tsx:239`：删除上下文菜单；
- `tests/e2e/space-archives.spec.ts:13`：当前被跳过的 Archive 测试。

## 9. 是否由重构改坏：当前判断

不能把问题归因于整个 Project/Space 重构；但从提交历史看，**共享菜单定位重构是最可疑的回归点**：

1. `101b6d34`（2026-03-25，`Spaces: Space Archives snapshots + replay`）首次实现 Archive。删除菜单当时是窗口内部的普通元素，并由组件自己处理关闭事件。
2. `ccde99a6`（2026-03-30，`fix: unify shared menu positioning`）将 Archive 删除菜单改为 `ViewportMenuSurface` 和 Portal，以统一菜单定位。
3. `2610a036`（2026-04-30）将 Archive 端到端测试改为 `test.skip`，使后续回归不会被自动发现。
4. 当前源码仍保留记录按钮的 `onContextMenu`，所以仅凭代码差异还不能完全证明 `ccde99a6` 是唯一根因；但它是与 Archive 删除菜单直接相关、且发生在问题出现之前的结构变更。

因此更准确的表述是：

> 当前现象高度疑似由共享菜单定位重构引入或暴露，但尚未完成完整的运行时因果验证。

已记录的问题上报：`[BLAME-043] Space 归档记录右键删除在实际界面无响应`。

## 10. 参考文件与提交

### 关键文件

- `src/contexts/workspace/presentation/renderer/types.ts`
- `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useTaskActions.agentSession.run.ts`
- `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/usePtyTaskCompletion.ts`
- `src/contexts/worktree/presentation/renderer/windows/SpaceWorktreePanels.tsx`
- `src/contexts/worktree/presentation/renderer/windows/useSpaceWorktreePanelHandlers.ts`
- `src/contexts/worktree/presentation/renderer/windows/useSpaceWorktreeArchiveState.ts`
- `src/contexts/workspace/presentation/renderer/utils/spaceArchiveRecords.ts`
- `src/app/renderer/shell/components/CommandCenter.tsx`
- `src/app/renderer/shell/components/SpaceArchiveRecordsWindow.tsx`
- `src/app/renderer/shell/components/SpaceArchiveReplayCanvas.tsx`
- `src/app/renderer/shell/components/SpaceArchiveReplayNodes.tsx`
- `tests/e2e/space-archives.spec.ts`

### 相关提交

- `101b6d34` — Spaces: Space Archives snapshots + replay
- `ccde99a6` — fix: unify shared menu positioning
- `2610a036` — feat: add standalone CLI installation；同时将 Archive E2E 测试改为 skipped
- `BLAME-043` — Space 归档记录右键删除在实际界面无响应
