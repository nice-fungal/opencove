# OpenCove Canvas 视觉与交互设计分析

> updated_at: 2026-07-20  
> scope: Canvas 的视觉实现、坐标约束、Space 包含、Task→Agent 连线与磁吸；不讨论业务数据结构是否合理  
> evidence: 当前仓库源码、现有 Unit/E2E、React Flow 官方文档  
> status: 现状调研与设计建议，不包含运行代码修改

## 1. 结论摘要

OpenCove Canvas 基于 React Flow（`@xyflow/react`），但并不是把所有能力都交给 React Flow：

- 节点、边、缩放、平移和基础选择由 React Flow 负责。
- Space 不是 React Flow 原生 group/parent node，而是画在相同 viewport 坐标系中的自定义 DOM overlay。
- Task 被“固定”在 Space 内，不依赖 DOM 嵌套或 CSS 裁剪，而依赖拖放命中、坐标投影、边界约束、Space 自动扩容和联动位移。
- Task→Agent 箭头是 React Flow Edge；节点上放置不可见 Handle，React Flow 计算 SVG 路径和箭头 marker。
- 当前磁吸已经同时支持 24px 网格与对象边缘/中心线对齐，但吸附结果主要在松手时提交；拖动时显示辅助线。
- 精细网格可以实现，不过必须先拆开“背景网格、吸附网格、自动排列网格”三个目前耦合的概念。

## 2. Canvas 的渲染分层

```text
WorkspaceCanvas
└─ ReactFlowProvider
   └─ ReactFlow viewport（统一 pan / zoom 坐标系）
      ├─ ViewportPortal: Space 区域 DOM（节点层下面）
      ├─ SVG edge layer: Task / Role → Agent 连线
      ├─ Node layer: Task / Agent / Note / Terminal / Website ...
      └─ Background / MiniMap / Controls

ReactFlow 外部的屏幕坐标 overlay
└─ Snap guides / selection draft / menus / windows
```

核心入口：

- `src/contexts/workspace/presentation/renderer/components/WorkspaceCanvas.tsx`
- `src/contexts/workspace/presentation/renderer/components/WorkspaceCanvasInner.tsx`
- `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/WorkspaceCanvasView.tsx`

Canvas 采用受控节点/边模式：OpenCove 传入 `nodes`、`edges`、`viewport` 和变更回调；React Flow 提供渲染、坐标转换和交互事件，OpenCove 决定业务布局结果。

## 3. Space 是怎么实现的

### 3.1 Space 不是 React Flow 节点

Space 由 `WorkspaceSpaceRegionsOverlay` 通过 React Flow 的 `ViewportPortal` 渲染。每个 Space 最终是一个绝对定位的 `<div>`：

```css
transform: translate(space.x, space.y);
width: space.width;
height: space.height;
```

因为 `ViewportPortal` 与节点共享 React Flow viewport transform，所以画布 pan/zoom 时，Space 与节点保持同一视觉坐标系，不需要手工把 flow 坐标转换成屏幕坐标。

Space 的视觉主体由以下内容构成：

- 半透明背景、虚线/实线边框和圆角；
- Space 名称、文件入口、分支、PR 和操作状态；
- 四周拖拽/缩放命中区域；
- child Space 的独立视觉样式；
- 选中态和 label color。

对应实现：

- `WorkspaceSpaceRegionsOverlay.tsx`
- `WorkspaceSpaceRegionItem.tsx`
- `workspace-overlays.spaces.css`

### 3.2 Space 为什么看起来在包裹节点

视觉上有三个因素：

1. Space 是带背景和边框的矩形区域。
2. Space portal 的层级为 `z-index: 0`，React Flow node layer 为 `z-index: 1`，节点自然显示在 Space 上方。
3. Space 主体默认 `pointer-events: none`，只有标签、边框 handle 和选中后的拖动表面接收事件，因此不会用一个大矩形挡住内部节点交互。

这不是 DOM 包裹：Task DOM 并不在 Space DOM 内，也没有通过 `overflow:hidden` 裁剪。

### 3.3 Space 的移动和缩放

Space 边框的 pointer 事件先通过 `screenToFlowPosition()` 转成 flow 坐标，再依据指针相对矩形的位置决定是移动还是缩放：

- 顶边主要作为移动 handle；
- 左、右、下边用于单轴 resize；
- 四个角用于双轴 resize；
- hitbox 会除以 zoom，保持近似固定的屏幕命中宽度。

拖动过程使用 `requestAnimationFrame` 合并预览更新。预览写入 `spaceFramePreview`，结束时才提交最终 Space rect 和节点位置。

关键文件：

- `hooks/useSpaceDrag.ts`
- `hooks/useSpaceDrag.preview.ts`
- `hooks/useSpaceDrag.applyLayout.ts`
- `hooks/useSpaceDrag.finalize.ts`
- `utils/spaceLayout.ts`

## 4. 为什么 Task 可以固定在 Space 内部

“固定”是布局规则产生的效果，不是浏览器布局能力。

### 4.1 节点拖入 Space

拖动 Task 时，OpenCove 执行以下流程：

```text
指针/节点位置
  → 计算拖动节点包围盒
  → 用指针或包围盒中心寻找最内层 Space
  → 把节点包围盒约束到 Space 内部
  → 避让 child Space 和同区域节点
  → 必要时扩大 Space
  → 提交节点位置与视觉归属
```

边界约束使用 Space rect 和 `SPACE_NODE_PADDING = 24`。如果目标位置越过 Space 边缘，布局投影会把整个拖动包围盒平移回允许范围，而不是裁掉超出的部分。

关键实现：

- `hooks/useSpaceOwnership.projectLayout.primary.ts`
- `hooks/useSpaceOwnership.projectLayout.ts`
- `hooks/useSpaceOwnership.applyDrop.ts`
- `contexts/space/application/spaceContainment.ts`

### 4.2 Task 随 Space 一起移动

拖动 Space 时，系统保存开始时的 Space rect 和全部节点基线位置。每一帧用同一 `dx/dy` 平移：

- 当前 Space；
- 其 descendant Spaces；
- 当前 Space 和 descendant Spaces 所拥有的节点。

因此 Task 看起来像 Space 的子元素。实际上它仍然是绝对 flow 坐标，只是 Space 移动时同步改写了它的位置。

### 4.3 Space 不能缩到 Task 外面

开始 resize 时会计算 owned nodes 和 descendant Spaces 的总边界。新的 Space rect 至少覆盖这个边界，因此不能把边框缩过内部 Task。

反方向也有限制：节点 resize 会通过 `clampSizeToContainingSpace()` 限制最大宽高，避免节点右边或下边越过所属 Space。

### 4.4 节点过大或新节点放不下时

OpenCove 不是简单拒绝，而是调用 `expandSpaceToFitOwnedNodesAndPushAway()`：

1. 扩大目标 Space；
2. 必要时逐级扩大 ancestor Spaces；
3. 如果与外部 Space/节点冲突，再执行 push-away 布局。

所以当前的视觉承诺更接近：

> Space 必须完整包住直属节点和 child Space；空间不足时优先扩容和推开相邻布局。

## 5. Task 指向 Agent 的箭头怎么实现

### 5.1 没有“箭头节点”

箭头不是一个单独节点，也不是 DOM 包裹。它是一条 React Flow Edge，由三个部分组成：

1. Task 右侧的 source Handle；
2. Agent 左侧的 target Handle；
3. React Flow 根据两个 Handle 位置绘制的 SVG path。

Handle 实际存在，但 CSS 设置为透明且不可交互：

```css
opacity: 0;
pointer-events: none;
```

它们只是连线路由的锚点，不作为用户手工连线入口。

对应实现：

- Task Handle：`src/contexts/task/presentation/renderer/components/TaskNode.tsx`
- Agent Handle：`components/terminalNode/TerminalNodeFrame.tsx`
- Handle 样式：`src/app/renderer/styles/terminal-node.css`

### 5.2 Edge 的生成

`useTaskAgentEdges.ts` 根据当前节点关系派生 Edge：

```ts
{
  source: taskNode.id,
  target: agentNode.id,
  type: 'default',
  markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 }
}
```

React Flow 的默认 Edge 负责 SVG 曲线路径；`MarkerType.ArrowClosed` 负责终点箭头。节点移动、resize 或 viewport 变化时，React Flow 自动重新计算 Handle 位置和路径。

### 5.3 视觉样式与“包裹”感

Task→Agent Edge 有两种状态：

- Agent working：高亮、虚线和流动动画；
- Agent idle：低亮度实线。

箭头 marker 有独立颜色和 drop-shadow。Edge 不可选中、不可聚焦，所以它主要是关系投影，而不是可编辑对象。

所谓“箭头包裹”实际是 SVG path 从 Task 边界的 Handle 出发，到 Agent 边界的 Handle 结束。React Flow 根据节点矩形决定锚点位置；并不存在围绕节点的额外容器。

Role→Agent 使用同一机制，但颜色为绿色并带 label 背景。

## 6. 磁吸效果怎么实现

### 6.1 当前已经具备的能力

`resolveWorkspaceSnap()` 是一个自定义二维吸附求解器，每个轴独立选择最小位移。

当前吸附目标：

- 24px 网格；
- 节点/Space 的左、中心、右对齐；
- 节点/Space 的上、中心、下对齐。

规则：

- 节点 threshold：8 flow units；
- Space threshold：10 flow units；
- 网格与对象同距离时，对象对齐优先；
- X/Y 可以分别吸附到不同候选；
- 多选拖动按所有移动节点的联合包围盒计算；
- 对象候选最多处理 96 个，超出时先按距离筛近邻。

### 6.2 候选范围不是全画布

节点只和同一布局区域中的对象吸附：

- Space 内节点：与同 Space 的 sibling nodes 和 Space 边界对齐；
- root 节点：与其他 root nodes 和所有 Space rect 对齐；
- 一次拖动跨越多个 owner 时，不做对象吸附，只保留网格吸附。

这个限制很重要，它避免远处或其他 Space 的对象制造不可解释的“磁场”。

### 6.3 拖动时和松手时的区别

当前更准确的说法是“辅助线预览 + release snap”：

- 拖动过程中计算候选并显示水平/垂直辅助线；
- 节点仍主要跟随原始指针位置；
- 松手时应用 `dx/dy`，提交吸附后的坐标；
- Space move 同样只在 commit 阶段真正应用吸附偏移。

这样可以减少拖动过程中来回跳动，但“磁性拉近”的触感会弱于持续硬吸附。

### 6.4 辅助线

辅助线保存在 flow 坐标中，渲染时读取 React Flow viewport 的 `x/y/zoom` 转换为屏幕坐标，并裁剪在 viewport 内。因此 pan/zoom 后仍能准确覆盖对齐位置。

相关文件：

- `utils/workspaceSnap.ts`
- `utils/workspaceSnap.nodes.ts`
- `hooks/useNodeDragSession.ts`
- `hooks/useSpaceDrag.preview.ts`
- `view/WorkspaceSnapGuidesOverlay.tsx`
- `tests/unit/contexts/workspaceSnap.spec.ts`
- `tests/e2e/workspace-canvas.snap-guides.spec.ts`

## 7. 能不能做更精细的网格

可以，但不建议直接修改 `WORKSPACE_ARRANGE_GRID_PX = 24`。

当前 24px 同时影响：

- Background dots 的视觉间距；
- 拖动吸附网格；
- 自动 arrange/packing 的对齐粒度与间距语义。

直接改成 8px 或 12px 会连带改变自动排列密度，属于隐式耦合。

### 7.1 建议拆分四个概念

```text
visualMajorGrid   = 24px   主点阵/节奏
visualMinorGrid   = 8px    可选的弱次网格
snapGrid          = 8px    节点精细定位
arrangeGrid       = 24px   自动排列保持当前节奏
```

具体数值应通过体验验证决定；关键是先拆语义，不让一个常量控制四种行为。

### 7.2 建议的磁吸优先级

1. 明确对象对齐（边/中心线）；
2. Space 内边距线；
3. 精细网格；
4. 无高置信候选时保持自由位置。

保留对象优先于网格的现有规则，可以避免节点为了网格错过更有意义的视觉对齐。

### 7.3 zoom 一致性

当前 threshold 是 flow units，因此屏幕上的吸附距离会随 zoom 改变：

```text
screen threshold = flow threshold × zoom
```

更稳定的体验应像 Space resize hitbox 一样，以屏幕像素定义阈值，再换算为 flow units：

```text
flow threshold = desiredScreenPixels / zoom
```

这会使放大和缩小时的磁吸手感更一致。

### 7.4 防抖与手动 override

如果未来改成拖动中持续硬吸附，需要增加：

- hysteresis：进入吸附和退出吸附使用不同阈值；
- 单轴 snap lock：避免相邻候选之间快速切换；
- `Alt` 等临时绕过吸附方式；
- `off / grid / object / both` 的显式模式；
- 多选、Space resize 和 child Space 的独立回归测试。

否则精细网格会提高候选密度，反而更容易出现抖动。

## 8. 为什么没有直接使用 React Flow 原生 group

React Flow 官方提供：

- `parentId`：子节点位置相对 parent；移动 parent 时子节点自动跟随；
- `extent: 'parent'`：限制子节点不能拖出 parent；
- group node：无 Handle 的便利 parent 类型。

OpenCove 当前没有使用这套机制。源码能确认的是当前选择及其结果，不能据此断言历史决策原因。

两种方案的差异：

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| React Flow parent/group | 跟随移动与 parent extent 由框架处理，代码较少 | 子节点改为相对坐标；reparent 要转换坐标；edge z-index 有特殊规则；Space 必须进入 node 体系 |
| OpenCove overlay + projection | 所有节点保持统一绝对坐标；Space 可独立承载嵌套、Explorer、Worktree、push-away 等语义 | 包含、移动、缩放、扩容、碰撞和吸附必须自行维持一致性 |

对当前 OpenCove 来说，Space 已不只是视觉 group，而是复杂的可交互区域。迁移到原生 group 不是简单替换组件，而是 Canvas 坐标与交互架构重构。

## 9. 外部参考与可迁移原则

### React Flow: Sub Flows

<https://reactflow.dev/learn/layouting/sub-flows>

- 承诺：`parentId` 提供相对坐标和父子联动；`extent:'parent'` 提供边界约束。
- invariant：parent 在 nodes 数组中必须先于 child；parent 移动时 child 同步移动。
- trade-off：有 parent 的节点会改变 edge 默认层级行为。
- OpenCove 转译：即使不采用 parentId，也必须明确保证“移动联动”和“边界约束”两个用户承诺。

### React Flow: Edge Markers / Custom Edges

<https://reactflow.dev/examples/edges/markers>  
<https://reactflow.dev/learn/customization/custom-edges>

- 承诺：Edge path 是 SVG；marker 在 SVG `<defs>` 中定义并由 `markerStart/markerEnd` 引用。
- owner：React Flow 负责 Handle 坐标与内置路径，调用方负责 edge 声明和样式。
- OpenCove 转译：现有 Task→Agent Edge 采用标准机制，不需要自建 DOM 连线层。

### React Flow: snapToGrid / Helper Lines

<https://reactflow.dev/api-reference/react-flow>  
<https://reactflow.dev/examples/interaction/helper-lines>

- 承诺：React Flow 内置基础 `snapToGrid + snapGrid`；对象辅助线和对象吸附属于更高层策略。
- invariant：helper lines 必须正确应用 viewport transform/scale。
- OpenCove 转译：内置 grid 不足以处理 Space、同 owner 候选、多选包围盒和 push-away；保留自定义 solver 是合理的，但应拆分配置语义。

## 10. Canvas 交互应保持的不变量

1. Space 与内部节点始终使用同一个 flow 坐标系；视觉层不得另造一套位置真相。
2. 一个节点完成 drop 后，要么完整位于目标 Space 内，要么完整位于 root 区域，不能半跨边界。
3. 移动 Space 时，其 owned nodes 和 descendant Spaces 必须使用同一个有效位移。
4. Space resize 不得越过 owned content；节点 resize 不得越过所属 Space。
5. Edge 路径只从 React Flow Handle 派生，不缓存第二份几何真相。
6. Snap preview 不得覆盖用户正在拖动的原始交互状态；最终 commit 必须只发生一次。
7. pan/zoom/drag 热路径不得引入持久化或 IPC feedback loop，避免 snap-back 和抖动。

## 11. 主要风险与后续问题

- 当前 snap threshold 使用 flow units，zoom 下手感并不恒定。
- 24px 常量同时承担视觉、吸附和 arrange 语义，精细化前应先解耦。
- Space 不是原生 parent，任何新增 drag/resize/auto-layout 能力都必须同时检查节点、Space、child Space 和 push-away 投影。
- 当前 release snap 比较稳定；若升级为 live hard snap，必须先设计 hysteresis，不能只在每帧直接取最近候选。
- Edge 目前是不可编辑的关系投影；如果以后允许用户手动改线，需要重新定义 Handle 的交互、校验、selection 和删除语义。

## 12. 当前验证锚点

- `tests/unit/contexts/workspaceSnap.spec.ts`
- `tests/e2e/workspace-canvas.snap-guides.spec.ts`
- `tests/unit/contexts/workspaceCanvasAgentEdges.spec.ts`
- `tests/unit/contexts/workspaceCanvasEdgeStyles.spec.ts`
- `tests/unit/contexts/workspaceNodeDragProjection.spec.ts`
- `tests/unit/contexts/workspaceNodeDropProjection.spec.ts`
- `tests/unit/contexts/workspaceNodeLiveDragProjection.spec.ts`
- `tests/e2e/workspace-canvas.spaces.drop-ownership.spec.ts`
- `tests/e2e/workspace-canvas.spaces.overlay-drag.spec.ts`
- `tests/e2e/workspace-canvas.child-space-node-drop.spec.ts`
- `tests/e2e/workspace-canvas.child-space-node-resize.spec.ts`

## 13. 一句话总结

OpenCove 的 Canvas 是“React Flow 基础画布 + 自定义 Space 几何/布局策略”：Space 的包裹感来自同坐标系 overlay 与严格布局投影，Task→Agent 箭头来自标准 SVG Edge，而更精细网格的正确演进方向是先解耦网格语义，再统一 zoom 阈值并为 live snap 增加防抖策略。
