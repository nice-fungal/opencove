# 任务：右键创建 Space 时选择 Directory

> updated_by: HBR - GPT-5
> updated_at: 2026-07-25 00:02:35

## 1. 建立右键 Create Space 行为基线

- [x] 1.1 为根画布右键“创建 Space”补充基线测试，锁定当前点击位置、默认命名、尺寸、避让、聚焦和持久化行为。
- [x] 1.2 为 Parent Space 内右键创建 Child Space 补充断言，锁定 `directoryPath` 与 `targetMountId` 的继承语义。

## 2. 新增右键 Create Space 专用 Picker 状态

- [x] 2.1 新增只服务于根画布右键 Create Space 的待确认状态，保存 flow point、`mounts`、`selectedMountId` 与窗口 anchor。
- [x] 2.2 为右键专用状态新增独立确认、取消和 state adapter；不得扩展 `SpaceTargetMountPickerState`，不得修改 `confirmSpaceTargetMountPicker` 或 `cancelSpaceTargetMountPicker`。
- [x] 2.3 让右键专用状态直接渲染现有 `SpaceTargetMountPickerWindow.tsx`；保持其 UI、文案、选择逻辑、测试 ID 和交互不变，不得新增第二个 Directory Picker。

## 3. 让空 Space 创建接受所选 Directory

- [x] 3.1 扩展空 Space 核心创建函数，使其可选接收同一 Mount 的 `targetMountId` 与 `directoryPath`，同时保留无显式 Mount 的兼容默认值。
- [x] 3.2 保留空 Space 的命名、rect 计算、避让、`onSpacesChange`、persist flush、菜单清理和重命名清理行为。
- [x] 3.3 保留创建成功后的 viewport 聚焦；多 Mount 场景在用户确认后聚焦，不得在 Picker 打开时提前创建或聚焦。
- [x] 3.4 不调用或放宽选中节点专用 `createSpace`，不伪造临时节点。

## 4. 接入根画布右键入口

- [x] 4.1 根画布分支调用 Mount 准备流程获取可用 Mount；该流程内部按既有语义自行处理查询与补建判断，本需求不复述、不重复实现其内部逻辑。
- [x] 4.2 Mount 准备流程的结果只有两种：返回可用 Mount，或显示既有 `projectHasNoMounts` / `mountListFailed` 消息并终止；右键入口只消费结果，不新增文案。
- [x] 4.3 单 Mount 时直接以该 Mount 创建空 Space；多 Mount 时把右键 flow point 写入右键专用 Picker 状态并打开现有窗口。
- [x] 4.4 在右键专用确认回调中使用所选 Mount 和保存的 flow point 创建空 Space；原 `confirmSpaceTargetMountPicker` 不改动。

## 5. 保持 Child Space 继承边界

- [x] 5.1 保留 `createSpaceFromContextMenu` 对 `resolveInnermostSpaceAtPoint` 的判断顺序。
- [x] 5.2 命中 Parent Space 时继续调用 `createChildSpaceInParent`，不打开 Picker，不允许选择父 Mount scope 外的 Directory。
- [x] 5.3 未命中 Parent Space 时才进入新的根画布 Directory 选择流程。

## 6. 测试与验收

- [x] 6.1 增加多 Mount 根画布测试：点击右键“创建 Space”后出现 `workspace-space-target-mount-window`，确认前 Space 数量不变。
- [x] 6.2 选择非默认 Mount 并确认，断言新 Space 的 `targetMountId`、`directoryPath` 和右键目标位置正确，且只创建一个 Space。
- [x] 6.3 增加取消测试：取消后 Picker 关闭、Space 数量不变、再次打开仍可正常选择。
- [x] 6.4 增加单 Mount 测试：不显示 Picker，新 Space 直接绑定唯一 Mount。
- [x] 6.5 增加零 Mount 结果测试：Mount 准备流程返回可用 Mount 时正常创建；返回失败时显示既有消息且不创建。流程内部的补建判断由其自身保证，不在本需求测试中重复锁定。
- [ ] 6.6 运行 Parent Space 内右键创建测试，确认父目录与 Mount 继承不变。**人工验收**：运行 `tests/e2e/workspace-canvas.child-space.spec.ts`。
- [ ] 6.7 **人工验收**：运行格式化、类型检查、受影响的右键菜单单测（`tests/unit/contexts/workspaceCanvas.contextMenuSpace.spec.tsx`、`workspaceCanvas.spaceLocationZoom.spec.tsx`、`spaceAnchoredWindows.spec.tsx`）与 Canvas E2E；复核 diff 中没有修改选中节点创建逻辑及其测试、没有新增 Picker、Topology Store 变更或持久化 schema 变更。

## 7. 后续备忘：跨 Project 异步请求隔离（暂缓）

复核确认 `[BLAME-032]` 描述的风险路径成立：`WorkspaceCanvas` 在 Project 切换时复用同一组件实例；`workspaceId` 变化只清空当前 Picker 状态，不会使已经发出的 Mount 准备 Promise 失效；旧请求返回后仍可能直接创建 Space 或重新写入旧 Project 的 Mount 列表，而最终 Workspace 状态更新以调用时的活动 Project 为目标。

当前不修改实现。后续出现需要统一处理跨 Project 异步生命周期的真实场景时，与该场景一并治理：

- [ ] 7.1 为右键 Create Space 的 Mount 准备请求增加 `workspaceId` 或 request token 失效校验；在 `await` 返回后、创建 Space 或打开 Picker 前确认请求仍属于当前 Project。
- [ ] 7.2 增加延迟 Mount 查询期间切换 Project 的回归测试，同时覆盖单 Mount 直接创建与多 Mount 打开 Picker；旧 Project 请求必须无 UI 和持久化副作用。
