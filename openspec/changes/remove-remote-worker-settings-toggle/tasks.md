# 任务：移除 Settings 中的 Remote Worker 启用开关

> updated_by: HBR - GPT-5
> updated_at: 2026-07-24 22:10:44

## 1. 删除可见 Settings 入口

- [x] 1.1 从 `WorkerConnectionsSection.tsx` 删除 `settings-section-worker-connections` SettingsGroup 及其 Remote Worker toggle 行。
- [x] 1.2 删除 `WorkerConnectionsSection` 的 `onChangeRemoteWorkersEnabled` prop；保留 `remoteWorkersEnabled` 只读 prop 及 endpoint enabled/disabled 条件渲染。
- [x] 1.3 从 `SettingsPanel.tsx` 删除 `updateExperimentalRemoteWorkersEnabled` 的局部解构和 `onChangeRemoteWorkersEnabled` prop 透传。
- [x] 1.4 保留 `useSettingsPanelUpdaters.updateExperimentalRemoteWorkersEnabled`、AgentSettings 字段、default、normalizer 与 persistence，不做底层清理。

## 2. 删除搜索与展示残留

- [x] 2.1 从 `settingsSearchIndex.ts` 删除 `experimental.remote-workers` 搜索定义，保留 `endpoints.list` 及其 `endpointsEnabled` gating。
- [x] 2.2 在确认无其他引用后，删除中英文 `settingsPanel.experimental.remoteWorkersTitle`、`remoteWorkersHelp`、`remoteWorkersEnabledLabel`、`remoteWorkersEnabledHelp`。
- [x] 2.3 扫描 Settings presentation 层，确认不存在 toggle test id、章节 anchor、callback prop 或指向已删除 anchor 的搜索结果。

## 3. 更新回归测试

- [x] 3.1 将 `settingsPanel.spec.tsx` 的 toggle 正向测试替换为负向断言：Worker 页面不存在 toggle、章节 anchor 和启用文案。
- [x] 3.2 更新 `settingsSearchIndex.spec.ts`，断言 `experimental.remote-workers` 不再被索引，同时保留 endpoint 搜索 gating 测试。
- [x] 3.3 保留并运行 enabled/disabled endpoint 渲染测试，验证旧 `true` 值与默认 `false` 值仍使用既有逻辑。（测试已保留；运行见 4.1 人工验收）
- [x] 3.4 确认 AgentSettings 归一化、默认值和持久化测试无需删除或改写。

## 4. 范围与质量验证

- [ ] 4.1 运行定向 Settings 面板与搜索索引测试。**人工验收**：运行 `tests/unit/contexts/settingsPanel.spec.tsx` 与 `src/contexts/settings/presentation/renderer/settingsPanel/settingsSearchIndex.spec.ts`。
- [ ] 4.2 运行 Prettier、TypeScript/项目检查和 `git diff --check`。**人工验收**：按 steering，整体编译/运行验证与 git 命令由 Human 执行。
- [x] 4.3 用 `rg` 确认生产 Settings UI 不再命中可见开关入口，同时领域、持久化和 runtime 中仍保留 `experimentalRemoteWorkersEnabled`。
- [ ] 4.4 检查最终 diff：不得包含 endpoint、mount、Remote Worker runtime、Control Surface、数据库 schema、设置默认值或归一化逻辑的改动。**人工验收**：本次改动仅触及 `WorkerConnectionsSection.tsx`、`SettingsPanel.tsx`、`settingsSearchIndex.ts`、中英文 `*.settingsPanel.ts` locale、`settingsSearchIndex.spec.ts`、`settingsPanel.spec.tsx`，未触及 endpoint/mount/runtime/schema/default/归一化代码；最终 diff 复核由 Human 执行。
