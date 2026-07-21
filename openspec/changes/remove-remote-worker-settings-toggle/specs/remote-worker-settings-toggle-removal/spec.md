# Remote Worker Settings 开关入口规范

> updated_by: HBR - GPT-5
> updated_at: 2026-07-24 22:10:44

## ADDED Requirements

### Requirement: Settings 不得展示 Remote Worker 启用开关

系统必须从生产 Settings 界面删除 Remote Worker 启用章节及其交互控件。

#### Scenario: Worker 页面不显示启用章节

- **WHEN** 用户打开 Settings 的「Worker 与连接」页面
- **THEN** 页面不得显示「启用远程 Worker」章节、label、help 或 toggle
- **AND** DOM 中不得存在 `settings-section-experimental-remote-workers`

#### Scenario: Toggle 无法通过界面操作

- **WHEN** 用户通过鼠标、键盘或辅助技术浏览 Worker 设置
- **THEN** 不得发现或操作 `settings-experimental-remote-workers-enabled`
- **AND** Settings UI 不得因用户交互调用 `onChangeRemoteWorkersEnabled`

### Requirement: Settings 搜索不得索引已删除章节

系统必须移除指向 Remote Worker 启用章节的搜索定义。

#### Scenario: 搜索不返回开关章节

- **WHEN** 用户在 Settings 搜索 Remote Worker、location 或 experimental 相关关键词
- **THEN** 搜索结果不得返回 `experimental.remote-workers`
- **AND** 搜索不得尝试定位 `settings-section-experimental-remote-workers`

#### Scenario: Endpoint 搜索规则保持不变

- **WHEN** Settings 根据 `endpointsEnabled` 构建搜索结果
- **THEN** `endpoints.list` 必须继续遵循既有 enabled/disabled 过滤规则
- **AND** 本变更不得删除 endpoint 搜索与页面实现

### Requirement: 底层设置与远程实现必须保持兼容

入口清理不得删除或改写 `experimentalRemoteWorkersEnabled` 的领域、持久化和消费语义。

#### Scenario: 默认设置保持关闭

- **WHEN** 系统创建默认 AgentSettings
- **THEN** `experimentalRemoteWorkersEnabled` 必须继续为 `false`
- **AND** 本变更不得新增迁移或覆盖逻辑

#### Scenario: 历史 true 值继续按原语义加载

- **WHEN** 系统加载已保存的 `experimentalRemoteWorkersEnabled: true`
- **THEN** 该值必须继续通过既有归一化和持久化流程
- **AND** Settings 打开时不得自动重置该值

#### Scenario: Remote Worker 实现保持不变

- **WHEN** 实现本变更
- **THEN** endpoint、mount、Remote Worker runtime、Control Surface 和连接实现不得被删除或修改
- **AND** 既有 `true` / `false` 条件消费逻辑必须保持不变

### Requirement: 入口缺失必须由自动化测试锁定

系统必须通过负向测试验证开关入口不可见，同时通过既有测试验证兼容逻辑未被破坏。

#### Scenario: UI 负向回归

- **WHEN** Settings 面板测试打开 Worker 页面
- **THEN** toggle test id 与章节 anchor 的匹配数量必须为零
- **AND** 测试不得通过其他可见控件重新暴露相同设置能力

#### Scenario: 兼容回归

- **WHEN** 测试分别使用 `experimentalRemoteWorkersEnabled: false` 与 `true` 渲染 Settings
- **THEN** endpoint 区域必须继续呈现既有 disabled/enabled 行为
- **AND** AgentSettings 字段的归一化与持久化测试必须继续通过

