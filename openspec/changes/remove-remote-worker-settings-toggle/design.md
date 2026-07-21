# 设计：移除 Settings 中的 Remote Worker 启用开关

> updated_by: HBR - GPT-5
> updated_at: 2026-07-24 22:10:44

## 背景

当前 Settings 链路为：

```text
SettingsPanel
  -> WorkerConnectionsSection
     -> WorkerSection
     -> settings-section-worker-connections
        -> settings-experimental-remote-workers-enabled
        -> onChangeRemoteWorkersEnabled
     -> EndpointsSection 或 disabled 状态
     -> ExperimentalWorkerWebUiSection
```

toggle 的写入链路为：

```text
checkbox change
  -> onChangeRemoteWorkersEnabled
  -> updateExperimentalRemoteWorkersEnabled
  -> updateSetting('experimentalRemoteWorkersEnabled', enabled)
```

本变更只切断并删除第一条链中的可见 toggle 分组。第二条链的底层 setting/updater 可以保留为不可达兼容能力，不扩展到领域模型或运行时清理。

## 目标

- Settings 的 Worker 页面不再展示 Remote Worker 启用章节。
- 用户无法通过该 Settings toggle 改变 `experimentalRemoteWorkersEnabled`。
- 搜索不会暴露或跳转到已删除章节。
- 所有远程实际实现和设置兼容结构保持不变。

## 非目标

- 不把 `experimentalRemoteWorkersEnabled` 常量化为 `false`。
- 不在 Settings 打开时重置已有 `true` 值。
- 不改变 `EndpointsSection` 的条件渲染或 endpoint 页面重定向逻辑。
- 不删除 updater、domain 类型、default、normalizer、persistence 或测试 fixture 字段。
- 不修改 Add Project、Manage Locations、AppShell 或远程 runtime。

## 入口处置矩阵

| 层级 | 当前内容 | 处置 |
| --- | --- | --- |
| Worker Settings UI | `settings-section-worker-connections` 分组 | 删除 |
| Worker Settings UI | `settings-experimental-remote-workers-enabled` checkbox | 删除 |
| Component props | `onChangeRemoteWorkersEnabled` | 删除该 UI prop 与 `SettingsPanel` 透传 |
| Settings 搜索 | `experimental.remote-workers` 定义 | 删除 |
| i18n | toggle 标题、说明、label、help | 无其他引用后删除 |
| Settings updater | `updateExperimentalRemoteWorkersEnabled` | 保留 |
| AgentSettings | `experimentalRemoteWorkersEnabled` | 保留 |
| Endpoint/Worker UI | 既有 enabled/disabled 条件渲染 | 保留 |
| Runtime/Control Surface | Remote Worker 与 endpoint 实现 | 保留 |

## 设计决策

### 决策一：从 DOM 删除，不使用 CSS 隐藏

直接删除 SettingsGroup 和 checkbox，而不是增加 `display: none` 或新的 feature flag。这样可确保键盘导航、辅助技术、测试选择器和 DOM 查询都无法继续操作该开关。

### 决策二：只清理 toggle 的 presentation 接线

`WorkerConnectionsSection` 仍需要 `remoteWorkersEnabled` 来决定展示 `EndpointsSection` 还是 disabled 状态，因此保留该只读 prop。删除 `onChangeRemoteWorkersEnabled` prop，以及 `SettingsPanel` 中只为这个 prop 解构和传递的局部变量。

`useSettingsPanelUpdaters.updateExperimentalRemoteWorkersEnabled` 属于既有设置更新兼容能力，本变更不删除它。保留未被当前页面解构的返回成员不会改变行为，也避免把入口清理扩大为设置模型重构。

### 决策三：删除对应搜索项

`settingsSearchIndex.ts` 中的 `experimental.remote-workers` 直接指向将被删除的 `settings-section-experimental-remote-workers`。该定义必须删除，否则搜索会返回失效结果并滚动到不存在的 anchor。

`endpoints.list` 搜索定义不属于 toggle 章节，继续遵循既有 `endpointsEnabled` gating，不在本变更中调整。

### 决策四：保留历史 `true` 值语义

本变更不修改持久化值。若某个旧配置已经保存 `experimentalRemoteWorkersEnabled: true`，现有消费逻辑仍按 `true` 运行，只是 Settings 中不再提供这个 toggle。

这是“只删除入口、不碰实际实现”的直接结果。若未来需要强制所有用户回到 `false`，应作为独立的数据策略变更处理，而不是混入本次简单重构。

### 决策五：删除仅服务于章节的文案

确认无其他生产引用后，删除以下中英文条目：

- `settingsPanel.experimental.remoteWorkersTitle`
- `settingsPanel.experimental.remoteWorkersHelp`
- `settingsPanel.experimental.remoteWorkersEnabledLabel`
- `settingsPanel.experimental.remoteWorkersEnabledHelp`

`settingsPanel.workerConnections.*`、`settingsPanel.endpoints.*` 和通用 Remote endpoint 文案继续保留。

## 测试设计

### 负向 UI 测试

- 打开 Settings → Worker 与连接。
- 断言 `settings-experimental-remote-workers-enabled` 数量为零。
- 断言 `settings-section-experimental-remote-workers` 数量为零。
- 断言页面不显示 `Enable Remote Workers` / `启用远程 Worker`。

### 搜索测试

- 断言搜索定义不包含 `experimental.remote-workers`。
- 断言搜索结果不会返回已删除 anchor。
- 保留 `endpoints.list` 在 enabled/disabled 状态下的既有过滤测试。

### 兼容回归测试

- 使用默认 `false` 渲染时，既有 endpoint disabled 状态继续显示。
- 使用显式 `true` 渲染时，`EndpointsSection` 继续按既有实现显示。
- AgentSettings 归一化与持久化测试无需改写，继续覆盖该字段。

## 风险与缓解

- **风险：只删 checkbox，搜索仍指向旧 anchor。** 同步删除搜索定义并增加负向测试。
- **风险：误删 enabled 状态消费逻辑。** 保留 `remoteWorkersEnabled` 只读 prop 和 SettingsPanel/Sidebar gating。
- **风险：简单清理扩散到底层远程实现。** 以保留清单和 diff 扫描锁定范围。
- **风险：旧配置为 true 时仍能使用远程能力。** 这是明确接受的兼容结果；本变更只移除 toggle，不执行策略迁移。

## 复核门槛

- `rg` 在生产 Settings UI 中不再命中 toggle test id、章节 anchor 和 callback prop。
- `rg` 仍应在 AgentSettings domain、defaults、normalizer、persistence 和功能 gating 中命中 `experimentalRemoteWorkersEnabled`。
- 定向 Settings 单测与搜索索引单测通过。
- 格式检查、类型检查或项目既有检查不产生新增错误。
