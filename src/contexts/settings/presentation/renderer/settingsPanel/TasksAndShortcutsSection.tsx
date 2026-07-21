import React from 'react'
import {
  type AgentProvider,
  type TaskTitleAgentProvider,
  type QuickPhrase,
  type TaskTitleProvider,
} from '@contexts/settings/domain/agentSettings'
import type { KeybindingOverrides } from '@contexts/settings/domain/keybindings'
import { QuickMenuSection } from './QuickMenuSection'
import { ShortcutsSection } from './ShortcutsSection'
import { TaskConfigurationSection } from './TaskConfigurationSection'

export function TasksAndShortcutsSection({
  showTaskTitleGeneration,
  defaultProvider,
  taskTitleProvider,
  taskTitleModel,
  effectiveTaskTitleProvider,
  tags,
  addTaskTagInput,
  quickPhrases,
  disableAppShortcutsWhenTerminalFocused,
  keybindings,
  onChangeTaskTitleProvider,
  onChangeTaskTitleModel,
  onChangeAddTaskTagInput,
  onAddTag,
  onRemoveTag,
  onChangeQuickPhrases,
  onChangeDisableAppShortcutsWhenTerminalFocused,
  onChangeKeybindings,
}: {
  showTaskTitleGeneration: boolean
  defaultProvider: AgentProvider
  taskTitleProvider: TaskTitleProvider
  taskTitleModel: string
  effectiveTaskTitleProvider: TaskTitleAgentProvider
  tags: string[]
  addTaskTagInput: string
  quickPhrases: QuickPhrase[]
  disableAppShortcutsWhenTerminalFocused: boolean
  keybindings: KeybindingOverrides
  onChangeTaskTitleProvider: (provider: TaskTitleProvider) => void
  onChangeTaskTitleModel: (model: string) => void
  onChangeAddTaskTagInput: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onChangeQuickPhrases: (phrases: QuickPhrase[]) => void
  onChangeDisableAppShortcutsWhenTerminalFocused: (enabled: boolean) => void
  onChangeKeybindings: (keybindings: KeybindingOverrides) => void
}): React.JSX.Element {
  return (
    <>
      <TaskConfigurationSection
        showTaskTitleGeneration={showTaskTitleGeneration}
        defaultProvider={defaultProvider}
        taskTitleProvider={taskTitleProvider}
        taskTitleModel={taskTitleModel}
        effectiveTaskTitleProvider={effectiveTaskTitleProvider}
        tags={tags}
        addTaskTagInput={addTaskTagInput}
        onChangeTaskTitleProvider={onChangeTaskTitleProvider}
        onChangeTaskTitleModel={onChangeTaskTitleModel}
        onChangeAddTaskTagInput={onChangeAddTaskTagInput}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
      />
      <QuickMenuSection
        quickPhrases={quickPhrases}
        onChangeQuickPhrases={onChangeQuickPhrases}
      />
      <ShortcutsSection
        disableAppShortcutsWhenTerminalFocused={disableAppShortcutsWhenTerminalFocused}
        keybindings={keybindings}
        onChangeDisableAppShortcutsWhenTerminalFocused={
          onChangeDisableAppShortcutsWhenTerminalFocused
        }
        onChangeKeybindings={onChangeKeybindings}
      />
    </>
  )
}
