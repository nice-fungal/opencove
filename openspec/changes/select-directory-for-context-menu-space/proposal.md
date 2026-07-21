# 右键创建 Space 时选择 Directory

> updated_by: Kilo - k3
> updated_at: 2026-07-24 23:36:00

## 为什么

Project 可以注册多个 Local Location，但当前从根画布右键菜单执行“创建 Space”时，会直接使用 `workspace.path` 创建空 Space，并把 `targetMountId` 写为 `null`。用户无法在创建时选择其他已注册 Directory。

系统已经提供可复用的 Directory 选择窗口 `SpaceTargetMountPickerWindow`。右键创建不应建立第二套向导；同时，“用所选节点创建 Space”属于已经工作的原功能，其触发条件、节点数量判断、Mount 处理、状态、确认逻辑和测试都不属于本变更范围。

## 变更内容

1. 根画布右键菜单的“创建 Space”不再立即以 `workspace.path` 创建空 Space，而是先按既有 Mount 选择语义解析可用 Directory。
2. 当 Project 有多个 Local Location 时，由右键 Create Space 自己的待确认状态直接渲染现有 `SpaceTargetMountPickerWindow`，让用户选择新 Space 的 Directory。
3. 当 Project 只有一个 Location 时，沿用既有行为直接使用该 Location 创建 Space，不显示没有选择意义的向导。
4. 根画布入口调用 Mount 准备流程获取可用 Mount；流程内部的查询与补建判断按既有语义自行处理，不属于本需求范围。流程失败时显示既有消息且不创建 Space。
5. 用户确认后，空 Space 保持右键点击位置的布局语义，同时写入所选 Mount 的 `mountId` 和 `rootPath`；用户取消时不创建 Space。
6. 在已有父 Space 内右键创建 Child Space 时，继续继承 Parent Space 的 `directoryPath` 与 `targetMountId`，不额外打开 Directory 选择向导。这与“选中父 Space 内节点创建 Child Space”的现有行为一致。
7. 不改变 `createSpaceFromSelectedNodesWithMounts`、`SpaceTargetMountPickerState`、`confirmSpaceTargetMountPicker` 的行为和原功能测试；不改写 `SpaceTargetMountPickerWindow`，不新增第二套 Directory 选择 UI；Mount 查询与补建只保留一份共享实现，两条入口复用。

## 能力

### 新增能力

- `context-menu-space-directory-selection`：规定从根画布右键创建空 Space 时如何选择、确认和持久化 Directory，以及单 Location、无 Mount、取消和 Child Space 场景的行为。

### 保持能力

- “用所选节点创建 Space”完整排除在本变更之外；无论其当前对单个或多个选中节点采取何种弹窗规则，均原样保留。
- Child Space 继续继承 Parent Space 的 Directory 上下文。
- Space Target Mount Picker 的视觉、交互、文案与选择规则保持不变。

## 影响范围

- 右键 Space 创建状态：新增只服务于根画布右键 Create Space 的待确认上下文，不扩展原功能状态。
- 右键 Space 创建 hook：右键入口增加 Mount 解析、独立确认与取消回调，并在确认后调用空 Space 创建逻辑。
- Canvas 菜单：保持现有菜单项与文案，只调整点击后的创建时机。
- 测试：只增加根画布右键创建在多 Location、单 Location、取消、无 Mount 和父 Space 内的覆盖；不补充、不修改“用所选节点创建 Space”的测试。

## 保留不动

- `createSpaceFromSelectedNodesWithMounts` 的输入、分支、行为和现有调用链，以及所有相关测试（内部共享 Mount 准备不改变其行为）。
- `SpaceTargetMountPickerState` 与 `confirmSpaceTargetMountPicker` 的现有定义和行为。
- `SpaceTargetMountPickerWindow` 的组件结构、视觉样式、文案、选项和确认/取消交互。
- `mount.list`、`mount.create`、`mount.promote` 及 Topology Store。
- 已有 Space 的目录编辑、Mount 修复、运行目录解析和 Worktree boundary。
- 右键点击位置对应的空 Space 尺寸、避让、聚焦和默认命名规则。

## 非目标

- 不增加任意文件系统目录选择器；用户只能选择当前 Project 已注册的 Local Location。
- 不在本变更中增加或编辑 Project Location，Location 管理仍通过“管理位置”完成。
- 不允许 Child Space 跨越 Parent Space 的 Mount scope。
- 不修改已有 Space 的 Directory，也不迁移已运行的 Terminal 或 Agent。
- 不改变同一目录可被多个 Space 使用的现有规则。

## 验收边界

- Project 有两个或更多 Location 时，在根画布右键点击“创建 Space”会打开现有 Directory 选择窗口，确认前不会创建 Space。
- 选择非默认 Location 并确认后，新 Space 位于右键目标附近，`targetMountId` 等于所选 Mount，`directoryPath` 等于该 Mount 的 `rootPath`。
- 取消选择不会新增 Space；再次打开时仍可正常选择。
- Project 只有一个 Location 时无需弹窗，新 Space 直接绑定该 Location。
- Mount 准备流程未能返回可用 Mount 时，显示既有消息且不创建 Space。
- 在 Parent Space 内右键创建仍生成继承父目录上下文的 Child Space，不打开跨 Mount 选择。
- 实现 diff 不包含“用所选节点创建 Space”功能或其测试的修改；其单选、多选及其他现有条件分支全部保持原样。
