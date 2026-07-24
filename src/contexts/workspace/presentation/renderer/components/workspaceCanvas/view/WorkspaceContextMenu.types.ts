import type {
  AgentExecutablePathOverrideByProvider,
  AgentProvider,
  ProjectRoleDefinition,
  QuickPhrase,
} from '@contexts/settings/domain/agentSettings'
import type { NodeLabelColorOverride } from '@shared/types/labelColor'
import type { WorkspaceSpaceState } from '../../../types'
import type { ContextMenuState } from '../types'
import type { WorkspaceArrangeStyle } from '../../../utils/workspaceArrange'

export type OpenSubmenu =
  'arrangeBy' | 'agent-providers' | 'label-color' | 'project-roles' | 'quick-phrases' | null

export interface WorkspaceContextMenuProps {
  contextMenu: ContextMenuState | null
  closeContextMenu: () => void
  createNoteNodeFromContextMenu: () => void
  createWebsiteNodeFromContextMenu: () => void
  websiteWindowsEnabled: boolean
  openTaskCreator: () => void
  openRoleCreator: () => void
  openAgentLauncher: () => void
  agentProviderOrder: AgentProvider[]
  agentExecutablePathOverrideByProvider: AgentExecutablePathOverrideByProvider<AgentProvider>
  openAgentLauncherForProvider: (provider: AgentProvider) => void
  projectRoles: ProjectRoleDefinition[]
  runProjectRoleFromContextMenu: (roleId: string) => void
  openRoleEditor: (roleId: string) => void
  deleteProjectRole: (roleId: string) => void
  quickPhrases: QuickPhrase[]
  insertQuickPhrase: (phrase: QuickPhrase) => void
  openQuickMenuSettings: () => void
  spaces: WorkspaceSpaceState[]
  magneticSnappingEnabled: boolean
  onToggleMagneticSnapping: () => void
  arrangePreserveWindowSizes: boolean
  onChangeArrangePreserveWindowSizes: (enabled: boolean) => void
  canArrangeAll: boolean
  canArrangeCanvas: boolean
  arrangeAll: (style?: WorkspaceArrangeStyle) => void
  arrangeCanvas: (style?: WorkspaceArrangeStyle) => void
  arrangeInSpace: (spaceId: string, style?: WorkspaceArrangeStyle) => void
  createSpaceFromSelectedNodes: () => void
  createChildSpaceInParent: (
    parentSpaceId: string,
    options?: { anchor?: { x: number; y: number } | null; nodeIds?: string[] },
  ) => string | null
  createEmptySpaceFromContextMenu: (options: {
    flowPoint: { x: number; y: number }
    anchor: { x: number; y: number }
  }) => void
  clearNodeSelection: () => void
  canConvertSelectedNoteToTask: boolean
  isConvertSelectedNoteToTaskDisabled: boolean
  convertSelectedNoteToTask: () => void
  setSelectedNodeLabelColorOverride: (labelColorOverride: NodeLabelColorOverride) => void
}
