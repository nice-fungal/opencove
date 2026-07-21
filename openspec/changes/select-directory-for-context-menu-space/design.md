# 设计：右键创建 Space 时复用 Directory 选择向导

> updated_by: Kilo - k3
> updated_at: 2026-07-24 23:36:00

## 背景

当前存在两条顶层 Space 创建路径：

```text
选中节点后创建
  -> createSpaceFromSelectedNodes
  -> createSpaceFromSelectedNodesWithMounts
  -> mount.list / 必要时 mount.create
  -> 单 Mount：直接创建
  -> 多 Mount：SpaceTargetMountPickerWindow
  -> createSpaceWithTargetMount

根画布右键创建
  -> createSpaceFromContextMenu
  -> createEmptySpaceAtPoint
  -> directoryPath = workspace.path
  -> targetMountId = null
```

右键入口缺少 Mount 解析，因此多 Location Project 无法为新空 Space 选择 Directory。现有选择窗口已经是该交互的唯一正式实现，本变更只为右键 Create Space 增加独立的 Mount 准备和确认链，并复用这个窗口组件；不接入、不改造选中节点原功能的状态或控制流。

## 目标

- 根画布右键创建空 Space 时使用 Project 的 Mount 信息决定 Directory。
- 多 Mount 时复用现有 `SpaceTargetMountPickerWindow`，不新增或复制 UI。
- 确认后保留右键创建的定位、避让、命名、聚焦和持久化行为。
- “用所选节点创建 Space”的所有现有逻辑、节点数量条件和测试均保持原样。
- 失败与取消均不得留下半创建 Space 或错误的默认目录绑定。

## 非目标

- 不把系统目录选择器接入 Space 创建。
- 不允许在向导内创建、删除、排序或设为默认 Location。
- 不重构 Topology Store、Space 持久化格式或目录解析策略。
- 不改变 Parent/Child Space 的 Mount scope 约束。
- 不改变选中节点 helper、状态、确认函数的行为与测试；仅把 Mount 查询与补建提取为共享的 `prepareSpaceTargetMounts`，供选中节点与右键两条入口复用，消息与补建语义保持原样。

## 既有能力锚点

| 职责 | 现有实现 | 本变更处置 |
|---|---|---|
| 选中节点创建的 Mount 编排 | `hooks/useSpaces.createSpaceSelection.ts` 的 `createSpaceFromSelectedNodesWithMounts` | 输入、分支、行为与测试保持原样；内部改调共享的 `prepareSpaceTargetMounts` |
| Directory 选择窗口 | `windows/SpaceTargetMountPickerWindow.tsx` | 直接复用，不新增第二套 UI，不修改视觉与交互 |
| 原功能 Picker 状态 | `SpaceTargetMountPickerState` | 保持原样，不增加右键创建字段或分支 |
| 原功能 Picker 确认 | `useSpaces.ts` 的 `confirmSpaceTargetMountPicker` | 保持原样，不接入右键创建 |
| 右键 Picker 状态与确认 | 新增的右键 Create Space 专用状态与回调 | 独立保存 flow point、Mount 列表和选择结果；仅服务右键入口 |
| 空 Space 创建 | `useSpaces.createSpace.ts` 的 `createEmptySpaceAtPoint` | 支持显式传入已解析的 Mount 与 Directory，同时保留布局规则 |
| 右键入口 | `WorkspaceContextMenu.tsx` 的 `createSpaceFromContextMenu` | 根画布分支改为发起带 Directory 解析的创建；Child Space 分支不变 |

## 设计决策

### 决策一：复用 Picker 窗口，不调用选中节点 helper 伪造节点

`createSpaceFromSelectedNodesWithMounts` 以真实选中节点为前置条件，后续 `createSpace` 也会拒绝空 `nodeIds`。为了“直接调用”该函数而伪造节点，会污染节点归属、布局与校验逻辑。

因此，本变更只直接复用 `SpaceTargetMountPickerWindow` 组件，不调用选中节点 helper，不复用或修改它的 state 实例与确认回调。两条入口共用同一个 Mount 准备流程 `prepareSpaceTargetMounts`（查询、补建、既有消息单点实现，不复制）；右键空 Space 入口只新增自己的待确认状态、确认和取消回调，现有原功能控制流的行为完全不经过新逻辑。

### 决策二：右键入口使用隔离的待确认状态

新增右键 Create Space 专用状态，保存右键 flow point、`mounts`、`selectedMountId` 与窗口 anchor。该状态不得并入 `SpaceTargetMountPickerState`，也不得要求原功能生产者或消费者增加分支。

专用状态通过轻量适配把 Picker 所需字段传给 `SpaceTargetMountPickerWindow`。适配只发生在新右键入口一侧；Window 组件和原功能 state 均不修改。

### 决策三：右键入口拥有独立确认和取消回调

新确认回调从右键专用状态读取所选 Mount，调用空 Space 创建函数并显式传入 `targetMountId` 与 `directoryPath`。新取消回调只清空右键专用状态。

既有 `confirmSpaceTargetMountPicker` 与 `cancelSpaceTargetMountPicker` 不修改。右键 Picker 打开期间不预先创建 Space，因此不会出现临时 Space、闪烁或取消后残留。

### 决策四：空 Space 创建接受显式目录上下文

空 Space 核心创建函数保留现有的命名、尺寸计算、位置换算、避让、持久化和聚焦语义，只把目录字段从硬编码改为可传入：

```text
未提供显式 Mount（兼容调用）
  -> directoryPath = workspacePath
  -> targetMountId = null

已选择 Mount（右键新流程）
  -> directoryPath = selectedMount.rootPath
  -> targetMountId = selectedMount.mountId
```

不得把选中节点专用的 `createSpace` 放宽为接受空节点，也不得改动任何节点选择或节点数量条件。

### 决策五：右键入口只消费 Mount 准备流程的结果

根画布入口调用共享 Mount 准备流程 `prepareSpaceTargetMounts` 获取可用 Mount。该流程作为黑盒：内部的查询、补建与失败判断按既有语义单点实现，选中节点入口与右键入口都只是消费结果，任何一侧不得重复实现。

对右键入口而言，该流程的结果只有两种：

1. 返回可用 Mount 列表：一个 Mount 时直接创建；多个 Mount 时打开现有 Picker，默认选中排序后的第一项。
2. 失败终止：显示既有 `projectHasNoMounts` 或 `mountListFailed` 消息，不创建 Space。

不得引入另一套提示文案或静默回退到错误 Directory。

### 决策六：Parent Space 内的右键创建保持继承

`createSpaceFromContextMenu` 会先用点击位置解析最内层 Parent Space。命中 Parent 时继续调用 `createChildSpaceInParent`，由 Child Space 继承 Parent 的 `directoryPath` 与 `targetMountId`；只有未命中 Parent 的根画布分支进入 Directory 选择流程。

这样可避免 Child Space 选择父 Mount scope 之外的 Directory，同时不涉及任何选中节点逻辑。

## 目标调用链

```text
右键 Create Space
  -> resolveInnermostSpaceAtPoint
     -> 命中 Parent Space
        -> createChildSpaceInParent（保持继承，不显示 Picker）
      -> 未命中 Parent Space
         -> 调用 Mount 准备流程（内部处理查询与补建）
            -> 失败：既有警告/错误消息，不创建
            -> 1 Mount：createEmptySpaceAtPoint(point, mount)
            -> N Mount：写入右键 Create Space 专用 Picker 状态
              -> SpaceTargetMountPickerWindow（既有 UI）
                 -> 取消：清空状态，不创建
                 -> 确认：createEmptySpaceAtPoint(point, selectedMount)
                    -> 聚焦新 Space
```

## 测试设计

### 组件与 hook 测试

- 根画布创建在多 Mount 时写入右键专用 Picker 状态，不立即调用 `onSpacesChange`。
- 右键专用状态通过现有 Picker Window 展示相同的 Mount 列表、选中态、确认和取消按钮。
- 右键专用确认回调写入所选 `mountId`/`rootPath`，且 Space rect 仍来自原右键 flow point。
- 右键专用取消回调不新增 Space。
- 单 Mount 直接创建；Mount 准备流程失败时沿用既有消息，不创建。

### E2E 回归

- 为 Project 添加第二个 Local Location，在根画布右键创建，选择非默认 Location 并确认；验证新 Space 的后续 Agent/Explorer 创建使用该 Directory。
- 取消选择后 Space 数量不变。
- 在已有 Space 内右键创建 Child Space，不出现 Picker，Child 继承 Parent Directory。

## 风险与缓解

- **风险：右键状态侵入原功能，改变单选或多选节点行为。** 使用完全隔离的右键专用状态与回调，不修改原状态、原确认函数或原测试。
- **风险：确认前已创建空 Space，取消后产生残留。** Mount 选择完成前不调用空 Space 创建函数。
- **风险：选择 Directory 后丢失原右键位置。** 在 Picker 状态中保存 flow point，确认时原样传回布局逻辑。
- **风险：为了复用向导而重构选中节点流程。** 只复用 Picker 组件与共享 Mount 准备；选中节点流程的输入、分支、消息与测试保持行为不变。
- **风险：Child Space 选择了父范围外 Mount。** 命中 Parent 时不进入 Picker，继续调用继承路径。
- **风险：只有一个 Mount 也弹出冗余窗口。** 与既有功能一致，单 Mount 直接创建。

## 复核门槛

- Diff 不得改变 `createSpaceFromSelectedNodesWithMounts`、`SpaceTargetMountPickerState`、`confirmSpaceTargetMountPicker` 的行为或原功能测试，也不得新增 Directory Picker 组件；Mount 准备逻辑在代码库中只允许存在一份实现。
- `SpaceTargetMountPickerWindow` 仍是 Space 创建选择 Directory 的唯一窗口。
- 根画布多 Mount 场景确认前 Space 数量不变，确认后只增加一个 Space。
- 新 Space 的 `targetMountId` 与 `directoryPath` 必须来自同一个所选 Mount。
- 新增测试只覆盖右键 Create Space；不得为本需求补充或修改“用所选节点创建 Space”的测试。
