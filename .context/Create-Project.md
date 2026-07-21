# Create Project 本地目录模型调研

> updated_by: HBR - GPT-5
> updated_at: 2026-07-24 22:04:39
> scope: 在禁用 Remote Connection 与 Remote Worker 的前提下，核查 Project、Workspace、Local Mount / Location、Directory 与 Space 的关系，以及本地目录创建、默认目录、多目录使用和目录查重行为
> evidence_window: 2026-07-24（当前工作区源码与 `pnpm run dev` 实际行为）

## 1. 前提与结论

本文只讨论本机能力，明确排除 Remote Connection、Remote Worker、Remote endpoint、远程目录与远程传输语义。

当前本地模型可概括为：

```text
Project / Workspace
├── 0..N Local Mount / Location
│   ├── Mount 1 → Directory A（Default）
│   ├── Mount 2 → Directory B
│   └── Mount 3 → Directory C
└── 0..N Space
    ├── Space 1 → Directory A
    ├── Space 2 → Directory B
    └── Space 3 → Directory A
```

复核结论：

1. **Project 与 Workspace 基本是同一顶层实体的产品名和代码名。** UI 主要使用 Project，状态、持久化与部分内部接口主要使用 Workspace；创建 Project 时生成的 `projectId` 会直接成为 `WorkspaceState.id`。
2. **一个 Project 可以注册多个 Local Mount / Location。** 在本文的本地简化语义中，一个 Mount / Location 对应一个注册的本地根目录，因此 Project 可以关联多个 Directory。
3. **一个 Project 有一个 Default Directory。** Default 不是独立字段，而是该 Project 按 `sortOrder` 排序后的第一个 Mount；「设为默认」实际是把指定 Mount 调整到列表第一位。
4. **一个 Project 可以包含多个 Space。** `WorkspaceState.spaces` 是 Space 数组。
5. **一个 Space 在任一时刻解析为一个有效工作目录。** Space 通过 `targetMountId + directoryPath` 绑定执行位置；不同 Space 可以指向同一个 Directory。
6. **Space 不等于 Directory。** Space 是带名称、节点、画布位置、父子关系和执行上下文的逻辑工作区；Directory 只是它绑定的文件系统位置。

更准确的关系是：

```text
Project → 多个 Mount / Location
Mount / Location → 一个本地根目录
Project → 多个 Space
Space → 一个有效工作目录
Directory ← 可以被多个 Space 使用
```

## 2. 本地 Project 创建入口

使用当前源码执行 `pnpm run dev`，并保持 Remote Connection 与 Remote Worker 禁用时：

1. 点击侧边栏 `+`、空画布「添加项目」或 Command Center 的添加入口；
2. `AddProjectWizardWindow` 自动调用 `chooseLocalFolder(true)`；
3. 系统目录选择器打开；
4. 选择目录后，以目录名派生 Project 名称并立即创建；
5. 应用内 Create Project Wizard 不显示。

因此，在当前前提下看到纯系统目录选择器是预期行为，不表示正在运行旧构建。

创建过程会：

- 生成一个 `projectId`；
- 为所选目录创建一个 Local Mount；
- 将这个 Mount 的 `rootPath` 写入 `workspace.path`；
- 由于它是该 Project 的第一个 Mount，所以同时成为 Default Directory；
- 创建 `WorkspaceState`，其 `id` 等于 `projectId`。

## 3. 一个 Project 如何添加多个本地目录

创建 Project 后，可以通过以下入口添加更多本地目录：

1. 在侧边栏右键 Project；
2. 点击「管理位置… / Manage Locations」；
3. 在「本地位置」中选择或输入一个绝对目录路径；
4. 点击「添加」；
5. 重复上述步骤即可添加多个 Local Location。

「管理位置」窗口会列出该 Project 的所有 Mount。列表第一项标记为「默认」；对其他项执行「设为默认」会调用 `mount.promote`，重新排列该 Project 的 Mount，使目标 Mount 的 `sortOrder` 变为 `0`。

数据关系不是 `WorkspaceState.mounts[]` 内嵌，而是独立 Topology Store 中的外部一对多关系：

```text
WorkspaceState.id / Project.id
  ↑
  ├── Mount A.projectId
  ├── Mount B.projectId
  └── Mount C.projectId
```

`mount.list` 会返回全部满足 `mount.projectId === projectId` 的记录。

## 4. 多个本地目录的实际用途

多个 Local Location 不会让 Project 根级操作自动同时使用所有目录。它们的主要用途是让同一个 Project 下的不同 Space 绑定不同的本地目录。

### 4.1 Default Directory 的作用

以下情况会使用 Default Directory 或 `workspace.path`：

- 在 Project 根级、没有命中任何 Space 时创建 Terminal 或 Agent；
- 直接在空白画布创建空 Space；
- 旧状态缺少有效 `targetMountId`，需要回退到第一个 Mount 时。

因此，如果只在 Project 根级工作，没有创建并绑定到非默认 Location 的 Space，观察上确实只有 Default Directory 生效。

### 4.2 非默认 Directory 的生效入口

当前可确认的 UI 入口是：

1. 在画布中选中一个或多个节点；
2. 右键选择「用所选节点创建 Space」；
3. 当 Project 有多个 Mount 时，应用显示「选择目标位置」；
4. 选择一个非默认 Local Location；
5. 新 Space 保存所选 Mount 的 `mountId`，并把其 `rootPath` 保存为 `directoryPath`。

之后，在该 Space 内新建的 Terminal、Agent 和 Space Explorer 会解析这个 Space 的 Mount 与工作目录：

- Terminal 通过 `pty.spawnInMount` 在对应目录启动；
- Agent 启动会携带该 Space 的 Mount 与执行目录；
- Space Explorer 以该 Space 的 Mount scope 访问文件。

### 4.3 当前 UX 边界

- 直接在空白画布创建空 Space 时，不显示 Location 选择器；该 Space 初始使用 `workspace.path`，`targetMountId` 为 `null`，随后按默认 Mount 解析。
- 将已运行的 Terminal 节点放入绑定其他目录的 Space，不会迁移现有 Shell 进程，也不会自动改变其当前工作目录；绑定主要影响之后创建或重新启动的运行实例。
- 当前没有发现一个通用的「编辑现有 Space 的目标 Location」入口；非默认 Location 的显式选择主要发生在「用所选节点创建 Space」流程中。
- Child Space 默认继承 Parent Space 的 `directoryPath` 与 `targetMountId`，所以多个 Space 可以自然共享同一 Directory。

## 5. Space 与 Directory 的精确关系

`WorkspaceSpaceState` 同时保存：

- `directoryPath`：Space 当前使用的目录；
- `targetMountId`：该目录所属的 Mount；
- `parentSpaceId`：画布上的父子关系；
- `nodeIds`、`rect`、名称与其他展示状态。

Space 的有效工作目录不一定永远等于 Mount 的 `rootPath`：

- 创建时通常先绑定 Mount 根目录；
- 后续可以使用 Mount 根目录内的子目录；
- Worktree boundary 可以把有效工作目录切换到对应 Worktree 目录；
- 无论使用根目录还是子目录，运行时目录都必须位于对应 Mount 的 scope 内。

因此应使用以下表述：

| 表述 | 判定 |
| --- | --- |
| `Project = Workspace` | 基本成立，是同一顶层实体的产品名与代码名差异 |
| `Project → 多个 Directory` | 成立，通过多个 Local Mount / Location 建立关系 |
| `Mount = Directory` | 在本地简化语义中成立；严格说是「Mount 注册一个目录根」 |
| `Project → 多个 Space` | 成立 |
| `Space → 一个 Directory` | 成立，表示一个有效工作目录 |
| `Space = Directory` | 不成立；Space 是绑定目录的逻辑工作区 |
| 多个 Space → 同一个 Directory | 成立，无唯一占用限制 |

## 6. 目录查重与共享约束

当前本地实现没有阻止目录共享或重复注册：

- 活跃的 Project 创建路径没有按 path 查重；名称检查也是空块，不阻止重复创建；
- `workspaces.path` 是普通非空文本列，没有唯一约束；
- `mount.create` 不按 `rootPath` 去重；
- 同一个本地目录可以被同一 Project 重复添加为多个 Mount；
- 同一个本地目录也可以被不同 Project 分别添加；
- 多个 Space 可以绑定同一个 Mount 或同一个目录。

当前实际约束是：某个 Space 的 cwd 必须位于其 Mount root 内。这个约束限制运行范围，但不提供目录所有权或排他性。

## 7. 本地模型锚点

| 主题 | 路径：行号 |
| --- | --- |
| `pnpm run dev` 脚本 | `package.json:64` |
| 添加 Project 入口 | `src/app/renderer/shell/AppShell.tsx:255`、`src/app/renderer/shell/hooks/useAddProjectWizardRequest.ts`、`src/app/renderer/shell/components/SidebarToolbar.tsx:32-50` |
| 禁用远程能力时自动选择本地目录 | `src/app/renderer/shell/components/AddProjectWizardWindow.tsx:120-162,180-182` |
| Project 创建与首个 Local Mount | `src/app/renderer/shell/components/addProjectWizard/useAddProjectWizardCreateProject.ts:127-171` |
| Project / Workspace 状态 | `src/contexts/workspace/presentation/renderer/types.ts:168-218` |
| Manage Locations 入口 | `src/app/renderer/shell/components/ProjectContextMenu.tsx:409-423` |
| 添加 Local Location | `src/app/renderer/shell/components/ProjectMountManagerWindow.tsx:168-208` |
| Default Location 的列表语义 | `src/app/renderer/shell/components/ProjectMountManagerWindow.tsx:373-392` |
| `mount.promote` 调整排序 | `src/app/main/controlSurface/topology/topologyStore.ts:350-403` |
| Mount 记录与 `projectId` | `src/app/main/controlSurface/topology/topologyFileV1.ts:32-49` |
| `mount.list` 一对多查询 | `src/app/main/controlSurface/topology/topologyStore.ts:260-274` |
| Space 选择目标 Location | `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaces.createSpaceSelection.ts:90-124` |
| 保存 Space 的 Mount 与目录 | `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaces.ts:284-300` |
| Space 工作目录解析 | `src/contexts/space/application/resolveSpaceMountContext.ts:58-145` |
| Space 内 Terminal 启动 | `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useInteractions.paneNodeCreation.ts:109-160` |
| 空 Space 默认目录行为 | `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaces.createSpace.ts:450-475` |
| Child Space 继承目录 | `src/contexts/space/application/createChildSpace.ts:215-230` |
| Project 创建路径无 path 查重 | `src/app/renderer/shell/components/addProjectWizard/useAddProjectWizardCreateProject.ts:123-125` |
| Mount 创建无 rootPath 唯一约束 | `src/app/main/controlSurface/topology/topologyStore.ts:277-329` |
| workspaces 表无 path 唯一约束 | `src/platform/persistence/sqlite/schema.ts:23-38` |
