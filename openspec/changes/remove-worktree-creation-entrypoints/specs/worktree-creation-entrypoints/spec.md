# Worktree 创建入口规范

> updated_by: HBR - GPT-5
> updated_at: 2026-07-22 23:13:59

## ADDED Requirements

### Requirement: 人工界面不得暴露 Worktree 创建入口

系统必须从生产 UI 中移除创建 Git linked worktree 的正式入口，同时保留已有 Worktree 的非创建操作。

#### Scenario: Space 操作菜单不显示创建动作

- **WHEN** 用户打开任意 Space 的操作菜单
- **THEN** 菜单不得显示“创建 Worktree”动作
- **AND** 菜单不得提供可打开 Worktree 创建弹窗的等价动作

#### Scenario: 创建操作不能进入生产 UI 状态

- **WHEN** 用户通过生产 UI 操作 Space
- **THEN** 系统不得向 Canvas operation state 加入 create 模式的 Worktree 操作
- **AND** archive 模式的 Space 操作必须继续可用

#### Scenario: 设置页不展示 Worktree 创建目录

- **WHEN** 用户查看或搜索 Workspace 设置
- **THEN** 系统不得展示 Worktree Root 配置行或指向“新 Worktree 创建位置”的说明
- **AND** 隐藏展示不得删除 `worktreesRoot` 的兼容数据字段

### Requirement: Agent 和 CLI 不得调用 Worktree 创建命令

系统必须删除面向 Agent、CLI 和外部 Control Surface 客户端的 Worktree 创建入口。

#### Scenario: CLI 不声明创建命令

- **WHEN** 用户或 Agent 查看 CLI 帮助或执行命令分发
- **THEN** CLI 不得声明或分发 `opencove worktree create`
- **AND** CLI 不得发出 `worktree.create` 请求

#### Scenario: 高层创建命令未注册

- **WHEN** Control Surface 客户端查询或调用 `worktree.create`
- **THEN** 该命令必须按未知或未注册命令处理
- **AND** 系统不得调用 Worktree 创建 use case

#### Scenario: 底层创建命令未注册

- **WHEN** Control Surface 客户端查询或调用 `gitWorktree.create`
- **THEN** 该命令必须按未知或未注册命令处理
- **AND** 系统不得产生目录、branch 或 Worktree 副作用

#### Scenario: Mount 创建命令未注册

- **WHEN** Control Surface 客户端查询或调用 `gitWorktree.createInMount`
- **THEN** 该命令必须按未知或未注册命令处理
- **AND** 系统不得向本地或远程 Worker 转发创建请求

### Requirement: Web Browser 不得桥接 Worktree 创建

Browser runtime 必须停止把 Worktree 创建请求映射到 Control Surface。

#### Scenario: Browser API 不发送创建请求

- **WHEN** Web UI 初始化 Browser OpenCove API
- **THEN** Browser API 不得提供可用的 Worktree 创建桥接
- **AND** 任何兼容占位实现不得发送 `gitWorktree.create` 请求

### Requirement: IPC 创建契约必须保留兼容

系统必须保留桌面 Electron IPC 创建契约及其 Preload 暴露，以控制兼容风险。

#### Scenario: IPC channel 继续注册

- **WHEN** Desktop 主进程注册 Worktree IPC handlers
- **THEN** `worktree:create` channel 必须继续注册
- **AND** payload 必须继续使用既有 validator 与 DTO

#### Scenario: Preload 创建方法保持签名

- **WHEN** Desktop Preload 构造 `window.opencoveApi.worktree`
- **THEN** `create` 方法必须继续存在并调用 `worktree:create` IPC
- **AND** 输入和输出类型不得发生破坏性变化

### Requirement: 底层创建实现和持久化结构必须保留

入口清理不得删除 Worktree 创建的领域、基础设施和持久化兼容层。

#### Scenario: 创建实现仍受单元测试覆盖

- **WHEN** 测试直接调用 `createGitWorktreeUseCase` 或 `createGitWorktree`
- **THEN** 既有创建行为必须继续工作
- **AND** DTO、port、错误码与路径校验必须保持兼容

#### Scenario: Workspace 旧数据继续加载

- **WHEN** 系统加载包含 `worktreesRoot` 或 `worktrees_root` 的历史状态
- **THEN** 状态必须继续成功读取和保存
- **AND** 本变更不得要求数据库迁移或表重建

### Requirement: 已有 Worktree 的非创建能力不得回归

系统必须继续支持已有 Worktree 的观察和生命周期收尾能力。

#### Scenario: 已有 Worktree 仍可观察

- **WHEN** Workspace 已经包含 linked worktree
- **THEN** 系统必须继续提供 Worktree 枚举、Git 状态、branch 和 PR 信息

#### Scenario: 已有 Worktree 仍可归档

- **WHEN** 用户或 Agent 归档已绑定 Worktree 的 Space
- **THEN** 既有 archive、remove、branch cleanup 与恢复语义必须保持不变
- **AND** `worktree.list`、`worktree.archive` 及非创建 Git Worktree commands 必须继续注册

### Requirement: 入口缺失必须由自动化测试锁定

系统必须同时验证正式入口不可用和底层兼容层可用。

#### Scenario: 负向入口回归测试

- **WHEN** 测试套件运行 UI、CLI、Control Surface 和 Browser 入口测试
- **THEN** 测试必须断言所有正式创建入口缺失或未注册
- **AND** 测试必须断言创建 service 未被这些入口调用

#### Scenario: 兼容层回归测试

- **WHEN** 测试套件运行 IPC、use case 与 Git service 测试
- **THEN** 底层创建兼容测试必须继续通过
- **AND** 测试不得为了通过而重新暴露产品创建入口
