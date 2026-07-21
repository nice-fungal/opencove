# 移除 Settings 中的 Remote Worker 启用开关

> updated_by: HBR - GPT-5
> updated_at: 2026-07-24 22:10:44

## 为什么

Settings 的「Worker 与连接」页面当前展示一个独立的「启用远程 Worker」实验开关。当前产品前提是不向用户开放 Remote Connection / Worker，因此这个开关不应继续展示或允许用户操作。

本变更是入口级收敛，只删除 Settings presentation 层中的可见开关章节及其搜索入口。远程 Worker 的设置字段、默认值、持久化、endpoint gating、连接能力和其他实际实现全部保留，避免把简单 UI 清理扩展为功能删除或数据迁移。

## 变更内容

1. 从 `WorkerConnectionsSection` 删除 `settings-section-worker-connections` 设置分组，以及其中的 `settings-experimental-remote-workers-enabled` toggle。
2. 删除 `experimental.remote-workers` Settings 搜索定义，避免搜索结果跳转到已删除章节。
3. 清理只服务于该 toggle 的 UI callback prop、`SettingsPanel` 局部接线和中英文展示文案。
4. 更新 Settings UI 与搜索测试，锁定开关和章节不再出现。
5. 保留 `experimentalRemoteWorkersEnabled` 的类型、默认值、归一化、持久化和 updater 能力；保留所有 Remote Worker / endpoint 实现。

## 能力

### 新增能力

- `remote-worker-settings-toggle-removal`：规定 Settings 不再展示或索引 Remote Worker 启用开关，同时保持底层兼容实现不变。

### 变更能力

- 「Worker 与连接」页面不再提供切换 `experimentalRemoteWorkersEnabled` 的人工入口。
- Settings 搜索不再返回该实验开关章节。

## 影响范围

- Settings UI：`WorkerConnectionsSection.tsx`、`SettingsPanel.tsx`。
- Settings 搜索：`settingsSearchIndex.ts`。
- 展示文案：中英文 `settingsPanel.experimental.remoteWorkers*` 条目。
- 测试：Settings 面板 toggle 测试与搜索索引测试。

## 保留不动

- `AgentSettings.experimentalRemoteWorkersEnabled` 类型字段。
- `DEFAULT_AGENT_SETTINGS.experimentalRemoteWorkersEnabled = false`。
- 设置归一化、序列化、持久化与旧数据读取。
- `useSettingsPanelUpdaters` 中更新该字段的通用 updater；它不再由这个可见开关调用，但作为兼容实现保留。
- `WorkerSection`、`EndpointsSection`、endpoint 注册与连接、Project Wizard gating、AppShell gating，以及所有 Remote Worker runtime / Control Surface 实现。
- `remoteWorkersEnabled === true` 与 `false` 时既有条件渲染语义。

## 非目标

- 不删除或重构 Remote Worker、Remote Connection、endpoint、mount 或远程执行实现。
- 不删除设置字段，不改变默认值，不强制覆盖用户已有配置，不增加迁移。
- 不新增替代开关、禁用提示、环境变量或隐藏快捷方式。
- 不删除 Worker 页面、Local Worker 设置、Worker Web UI 或 endpoint 相关组件。
- 不承诺形成安全边界；本变更只移除正常 Settings UI 中的人工 toggle 入口。

## 验收边界

- 打开 Settings → Worker 与连接时，不存在「启用远程 Worker」章节、toggle、label 或 help 文案。
- DOM 中不存在 `settings-section-experimental-remote-workers` 与 `settings-experimental-remote-workers-enabled`。
- Settings 搜索不返回 `experimental.remote-workers` 条目，也不尝试滚动到已删除 anchor。
- `experimentalRemoteWorkersEnabled` 的领域字段、默认值、持久化和既有消费逻辑保持不变。
- diff 不包含 Remote Worker runtime、endpoint、mount、Control Surface、数据库 schema 或设置归一化实现的删除。

