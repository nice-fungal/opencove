# 右键创建 Space 的 Directory 选择规范

> updated_by: Kilo - k3
> updated_at: 2026-07-24 23:36:00

## ADDED Requirements

### Requirement: 根画布右键创建必须解析 Project Directory

系统必须在根画布右键“创建 Space”时，根据当前 Project 注册的 Mount 决定新空 Space 的 Directory，而不是无条件写入 `workspace.path` 和空 `targetMountId`。

#### Scenario: 多个 Location 时打开既有选择窗口

- **Given** 当前 Project 注册了两个或更多可用 Mount
- **And** 用户在任一 Parent Space 之外的根画布打开右键菜单
- **When** 用户点击“创建 Space”
- **Then** 系统必须打开现有 Space Target Mount Picker
- **And** 确认前不得创建 Space
- **And** 系统不得打开新的或重复实现的 Directory 选择组件

#### Scenario: 单个 Location 时直接创建

- **Given** 当前 Project 只有一个可用 Mount
- **When** 用户从根画布右键创建 Space
- **Then** 系统必须直接创建一个空 Space
- **And** 不显示 Directory 选择窗口
- **And** 新 Space 必须绑定该唯一 Mount

#### Scenario: 无 Mount 时沿用既有修复行为

- **Given** 当前 Project 查询不到 Mount
- **And** `workspace.path` 是可用的绝对路径
- **When** 用户从根画布右键创建 Space
- **Then** 系统必须按既有 Space 创建参数尝试补建 Local Mount 并重新查询
- **And** 补建成功时按最终 Mount 数量继续创建或选择流程

#### Scenario: 无法获得 Mount 时不创建

- **Given** 当前 Project 没有可用 Mount
- **And** 既有补建规则执行后仍无法获得 Mount
- **When** 用户从根画布右键创建 Space
- **Then** 系统必须显示既有 `projectHasNoMounts` 警告
- **And** 不得创建 Space

#### Scenario: Mount 查询失败

- **Given** Mount 查询抛出错误
- **When** 用户从根画布右键创建 Space
- **Then** 系统必须显示既有 `mountListFailed` 错误消息
- **And** 不得创建 Space

### Requirement: 确认的 Directory 必须写入新 Space

系统必须把用户确认的 Mount 一致地写入新空 Space 的 `targetMountId` 和 `directoryPath`，并保留原右键创建的布局语义。

#### Scenario: 选择非默认 Directory 并确认

- **Given** Picker 中列出了默认 Mount 和至少一个非默认 Mount
- **And** 用户选择了非默认 Mount
- **When** 用户确认创建
- **Then** 系统必须只创建一个空 Space
- **And** 新 Space 的 `targetMountId` 必须等于所选 Mount 的 `mountId`
- **And** 新 Space 的 `directoryPath` 必须等于同一 Mount 的 `rootPath`
- **And** 新 Space 必须使用打开右键菜单时保存的 flow point 计算位置
- **And** 创建后必须沿用既有聚焦与持久化行为

#### Scenario: 取消 Directory 选择

- **Given** 根画布右键创建已打开 Directory Picker
- **When** 用户取消选择
- **Then** Picker 必须关闭
- **And** Space 数量必须保持不变
- **And** 不得持久化临时 Space 或目录绑定

### Requirement: 变更必须严格限定于右键 Create Space

系统必须只为右键 Create Space 增加 Directory 选择能力。系统可以复用现有 Directory Picker 组件，但不得以此为由修改“用所选节点创建 Space”的任何现有行为。

#### Scenario: 原选中节点功能不属于变更范围

- **Given** “用所选节点创建 Space”在变更前具有既定的单选、多选和其他条件分支
- **When** 实施本变更
- **Then** 不得改变 `createSpaceFromSelectedNodesWithMounts`、`SpaceTargetMountPickerState` 或 `confirmSpaceTargetMountPicker` 的现有行为
- **And** 不得补充或修改原功能测试
- **And** 原功能对任意节点数量的现有弹窗与创建行为必须原样保留
- **And** Mount 查询与补建逻辑必须只存在一份共享实现，由选中节点入口与右键入口共同复用

#### Scenario: Parent Space 内右键创建 Child Space

- **Given** 用户右键点击的位置位于一个现有 Parent Space 内
- **When** 用户点击“创建 Space”
- **Then** 系统必须创建 Child Space
- **And** Child Space 必须继承 Parent Space 的 `directoryPath` 与 `targetMountId`
- **And** 系统不得打开跨 Mount 的 Directory Picker

#### Scenario: 右键入口复用现有 Directory Picker 组件

- **Given** 根画布右键创建需要用户选择 Mount
- **When** 系统展示选择界面
- **Then** 右键入口必须渲染现有 `SpaceTargetMountPickerWindow`
- **And** 窗口的文案、选项、确认、取消和测试标识必须保持一致
- **And** 右键入口必须使用独立状态和独立确认回调，不得接入原选中节点控制流
