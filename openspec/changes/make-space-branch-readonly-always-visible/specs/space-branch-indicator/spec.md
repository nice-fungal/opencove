# Space Branch 指示器规范

> updated_by: HBR - GPT-5
> updated_at: 2026-07-25 00:19:38

## ADDED Requirements

### Requirement: Space Branch 在可解析时必须始终显示

系统必须在 Space 已解析到 Git branch 或 detached HEAD 时，在 Space 右上角持续显示 branch 指示器，不得依赖 Space 的选中状态、Explorer 状态或是否绑定 Workspace 根仓库。

#### Scenario: Workspace 根仓库 Space 未选中

- **Given** Space 的目录解析到 Workspace 根仓库 Worktree
- **And** 系统已获得该 Worktree 的当前 branch
- **And** Space 当前未选中且 Explorer 关闭
- **When** Canvas 渲染该 Space
- **Then** Space 右上角必须显示 branch 指示器
- **And** 指示器必须包含当前 branch 名称
- **And** 指示器不得附加 Branch 等种类前缀

#### Scenario: linked worktree Space 未选中

- **Given** Space 的目录解析到 linked worktree
- **And** 系统已获得该 Worktree 的当前 branch
- **When** Canvas 渲染该 Space
- **Then** Space 右上角必须显示 branch 指示器
- **And** 指示器不得要求用户先选择该 Space

#### Scenario: 选中和 Explorer 状态变化

- **Given** Space 已显示 branch 指示器
- **When** 用户选择或取消选择 Space，或者打开或关闭 Space Explorer
- **Then** branch 指示器必须继续存在
- **And** 指示器展示的 branch 值不得因这些 UI 状态变化而改变

#### Scenario: detached HEAD

- **Given** Space 已解析到 Git Worktree
- **And** Worktree 没有 branch 但存在 HEAD SHA
- **When** Canvas 渲染该 Space
- **Then** Space 右上角必须显示 branch 指示器
- **And** 指示器必须显示既有规则生成的短 SHA，且不附加 Detached 种类前缀

#### Scenario: 无可解析 Git 上下文

- **Given** Space 未解析到 Worktree，或者 Worktree 同时缺少 branch 和 HEAD
- **When** Canvas 渲染该 Space
- **Then** 系统可以不显示 branch 指示器
- **And** 系统不得伪造 branch 名或占位值

### Requirement: Space Branch 指示器必须只读

Space 右上角 branch 指示器必须只承担 Git 上下文展示，不得提供 branch 修改能力。

#### Scenario: 指示器使用非交互语义

- **Given** Space 已显示 branch 指示器
- **When** 用户查看或聚焦该区域
- **Then** 指示器不得以 button 或其他编辑控件语义呈现
- **And** 指示器不得显示 hover、active 或 focus 的可修改反馈
- **And** 指示器必须继续提供完整 branch 名的 title 信息

#### Scenario: 点击指示器不打开改名界面

- **Given** Space 已显示 branch 指示器
- **When** 用户点击指示器
- **Then** 系统不得打开 branch rename 弹窗、popover 或菜单
- **And** Canvas 不得进入 branch rename 状态

#### Scenario: 点击指示器不产生写操作

- **Given** Space 已显示 branch 指示器
- **When** 用户点击或重复点击指示器
- **Then** 系统不得调用任何 `renameBranch` API
- **And** 不得修改 Git branch、Space 状态或 Worktree 状态

### Requirement: Branch 常显不得扩大其他 Repo Summary

系统必须把 branch 指示器的常显规则与 PR chip、Files change count 等其他 repo summary 的展示规则分离。

#### Scenario: Branch 常显但其他摘要保持原条件

- **Given** Workspace 根仓库 Space 未选中
- **And** 系统已解析到 branch
- **When** Canvas 渲染该 Space
- **Then** branch 指示器必须显示
- **And** PR chip 与 Files change count 必须继续遵循变更前的展示条件

### Requirement: 底层 Branch Rename 兼容能力必须保留

禁用 Space 右上角 branch 修改入口时，系统必须保留现有 branch rename 修改框及底层 Git branch rename 契约和实现；本变更只能禁用入口，不得修改修改框本身。

#### Scenario: Canvas 不暴露改名入口

- **When** 用户操作 Space 右上角 branch 指示器
- **Then** Canvas 不得调用 branch rename 能力
- **And** branch rename dialog 不得因该操作变为可见

#### Scenario: 修改框本身保持不变

- **Given** 系统已有 `WorkspaceSpaceBranchRenameDialog` 修改框及其状态、校验和提交逻辑
- **When** 实施 branch 指示器只读化
- **Then** 修改框组件、样式、文案和内部行为必须保持不变
- **And** 系统不得以入口不可达为理由删除或重构修改框

#### Scenario: 底层 rename 契约继续存在

- **When** 自动化测试直接验证 Preload、IPC、Control Surface、use case 或 Git service 的 branch rename 能力
- **Then** 既有契约和实现必须继续存在
- **And** 本变更不得删除或破坏其输入输出签名

### Requirement: 只读常显行为必须由自动化测试锁定

系统必须通过自动化测试同时验证 branch 常显、只读和底层兼容能力。

#### Scenario: Canvas branch 回归测试

- **When** Canvas overlay 单元测试和 Space Explorer E2E 运行
- **Then** 测试必须断言根仓库与 linked worktree Space 的 branch 在未选中时可见
- **And** 测试必须断言选择与 Explorer 状态变化不会隐藏 branch
- **And** 测试必须断言 branch 指示器不是按钮且不会打开改名界面

#### Scenario: 零写操作回归测试

- **When** 测试点击只读 branch 指示器
- **Then** `renameBranch` mock 调用次数必须为零
- **And** branch 文本必须保持不变

#### Scenario: 底层兼容回归测试

- **When** 底层 branch rename 定向测试运行
- **Then** Preload、IPC、Control Surface、use case 与 Git service 测试必须继续通过
- **And** 测试不得为了通过而重新暴露 Canvas 改名入口
