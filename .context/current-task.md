# 关闭 Space 选择时的自动画布定位与缩放

> updated_by: HBR - GPT-5
> updated_at: 2026-07-31 22:01:35

## 目标

用户点击或选择具体 Space 时，不自动移动画布中心，也不自动修改画布缩放比例。用户继续通过画布的放大、缩小和移动控件自行调整视口。本任务不修改任何 active 状态或视觉反馈。

## 问题根因（修复前）

原相关实现位于 `src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaces.focus.ts`。

`focusSpaceInViewport` 先通过 `getViewportForBounds` 同时计算新的 `x`、`y` 和 `zoom`，随后通过 `reactFlow.setViewport(nextViewport, ...)` 一次性应用整个视口。因此，Focus 与 Zoom 并不是两个独立调用：

```text
选择 Space
  -> focusSpaceInViewport
  -> getViewportForBounds 计算 x、y、zoom
  -> setViewport 同时应用 Focus 与 Zoom
```

不能仅注释 `setViewport` 调用并保持项目检查通过。该调用被注释后，`nextViewport` 会成为未使用变量，而项目启用了 TypeScript 的 `noUnusedLocals`。

## 修正方案

采用最小生产代码修正：

1. 在 `useSpaces.focus.ts` 中停止执行具体 Space 的视口计算和 `setViewport`。
2. 保留 Space 存在性校验和现有返回契约，使调用方仍可正常完成 Space 选择及显式请求消费。
3. 清理只服务于具体 Space 自动定位的 `getViewportForBounds` import、默认视口尺寸常量、`useStore` 订阅和相关依赖。
4. 不修改 `activeSpaceId`、`onActiveSpaceChange`、Space 重命名及其他 Space 状态逻辑。
5. 保留 `focusAllInViewport` 的 `fitView()` 行为；点击 `All` 仍显示全局画布，不属于本次“具体 Space 选择”范围。

不采用“注释 `setViewport` 后增加 `void nextViewport`”的临时方案，因为它会保留无效计算并制造明显技术债。

## 影响范围

以下入口选择具体 Space 后都不再移动或缩放画布：

- 画布顶部 Space 切换项；
- 侧栏 Space；
- Space 搜索或显式 Space focus request；
- Space 快捷键导航；
- 重复点击当前 Space；
- 新建空 Space 后调用 `focusSpaceInViewport` 的定位动作。

普通节点的自动定位、节点目标缩放、Arrange 操作、画布缩放按钮及 `All` 的全局适配保持不变。

## 验证边界

- 不以现有 e2e 断言作为实现依据；测试本身可能不符合最新需求。
- 不新增测试；现有测试仅同步已删除的参数与 focus/zoom 行为。
- 仅通过生产代码审查、差异检查和 TypeScript 检查验证本次改动。

## 验收标准

- 点击前后画布 `x`、`y`、`zoom` 不变。
- 重复点击当前 Space 不改变视口。
- 点击 `All` 仍可适配全局画布。
- 普通节点自动定位和手动画布控制不受影响。
- 本次改动不引入新的 TypeScript 错误。
