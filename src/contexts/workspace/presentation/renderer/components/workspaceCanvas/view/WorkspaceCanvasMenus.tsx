import React from 'react'
import type { WorkspaceCanvasViewProps } from '../WorkspaceCanvasView.types'
import { WorkspaceContextMenu } from './WorkspaceContextMenu'
import { WorkspaceSpaceActionMenu } from './WorkspaceSpaceActionMenu'

export function WorkspaceCanvasMenus({
  contextMenu,
  closeContextMenu,
  createNoteNodeFromContextMenu,
  createWebsiteNodeFromContextMenu,
  openTaskCreator,
  openRoleCreator,
  openAgentLauncher,
  openAgentLauncherForProvider,
  projectRoles,
  runProjectRoleFromContextMenu,
  openRoleEditor,
  deleteProjectRole,
  insertQuickPhrase,
  openQuickMenuSettings,
  spaces,
  magneticSnappingEnabled,
  onToggleMagneticSnapping,
  canArrangeAll,
  canArrangeCanvas,
  canArrangeActiveSpace,
  arrangeAll,
  arrangeCanvas,
  arrangeInSpace,
  createSpaceFromSelectedNodes,
  createChildSpaceInParent,
  createEmptySpaceFromContextMenu,
  clearNodeSelection,
  canConvertSelectedNoteToTask,
  isConvertSelectedNoteToTaskDisabled,
  convertSelectedNoteToTask,
  setSelectedNodeLabelColorOverride,
  spaceActionMenu,
  availablePathOpeners,
  activeMenuSpace,
  closeSpaceActionMenu,
  setSpaceLabelColor,
  openSpaceArchive,
  copySpacePath,
  openSpacePath,
  agentSettings,
}: Pick<
  WorkspaceCanvasViewProps,
  | 'contextMenu'
  | 'closeContextMenu'
  | 'createNoteNodeFromContextMenu'
  | 'createWebsiteNodeFromContextMenu'
  | 'openTaskCreator'
  | 'openRoleCreator'
  | 'openAgentLauncher'
  | 'openAgentLauncherForProvider'
  | 'projectRoles'
  | 'runProjectRoleFromContextMenu'
  | 'openRoleEditor'
  | 'deleteProjectRole'
  | 'insertQuickPhrase'
  | 'openQuickMenuSettings'
  | 'spaces'
  | 'magneticSnappingEnabled'
  | 'onToggleMagneticSnapping'
  | 'arrangeAll'
  | 'arrangeCanvas'
  | 'arrangeInSpace'
  | 'createSpaceFromSelectedNodes'
  | 'createChildSpaceInParent'
  | 'createEmptySpaceFromContextMenu'
  | 'clearNodeSelection'
  | 'canConvertSelectedNoteToTask'
  | 'isConvertSelectedNoteToTaskDisabled'
  | 'convertSelectedNoteToTask'
  | 'setSelectedNodeLabelColorOverride'
  | 'spaceActionMenu'
  | 'availablePathOpeners'
  | 'closeSpaceActionMenu'
  | 'setSpaceLabelColor'
  | 'openSpaceArchive'
  | 'copySpacePath'
  | 'openSpacePath'
  | 'agentSettings'
> & {
  activeMenuSpace: WorkspaceCanvasViewProps['spaces'][number] | null
  canArrangeAll: boolean
  canArrangeCanvas: boolean
  canArrangeActiveSpace: boolean
}): React.JSX.Element {
  const [arrangePreserveWindowSizes, setArrangePreserveWindowSizes] = React.useState(false)
  const arrangeStyle = React.useMemo(
    () => ({ alignCanonicalSizes: !arrangePreserveWindowSizes }),
    [arrangePreserveWindowSizes],
  )

  return (
    <>
      <WorkspaceContextMenu
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
        createNoteNodeFromContextMenu={createNoteNodeFromContextMenu}
        createWebsiteNodeFromContextMenu={createWebsiteNodeFromContextMenu}
        websiteWindowsEnabled={agentSettings.websiteWindowPolicy.enabled}
        openTaskCreator={openTaskCreator}
        openRoleCreator={openRoleCreator}
        openAgentLauncher={openAgentLauncher}
        agentProviderOrder={agentSettings.agentProviderOrder}
        agentExecutablePathOverrideByProvider={agentSettings.agentExecutablePathOverrideByProvider}
        openAgentLauncherForProvider={openAgentLauncherForProvider}
        projectRoles={projectRoles}
        runProjectRoleFromContextMenu={runProjectRoleFromContextMenu}
        openRoleEditor={openRoleEditor}
        deleteProjectRole={deleteProjectRole}
        quickPhrases={agentSettings.quickPhrases}
        insertQuickPhrase={insertQuickPhrase}
        openQuickMenuSettings={openQuickMenuSettings}
        spaces={spaces}
        magneticSnappingEnabled={magneticSnappingEnabled}
        onToggleMagneticSnapping={onToggleMagneticSnapping}
        arrangePreserveWindowSizes={arrangePreserveWindowSizes}
        onChangeArrangePreserveWindowSizes={setArrangePreserveWindowSizes}
        canArrangeAll={canArrangeAll}
        canArrangeCanvas={canArrangeCanvas}
        arrangeAll={arrangeAll}
        arrangeCanvas={arrangeCanvas}
        arrangeInSpace={arrangeInSpace}
        createSpaceFromSelectedNodes={createSpaceFromSelectedNodes}
        createChildSpaceInParent={createChildSpaceInParent}
        createEmptySpaceFromContextMenu={createEmptySpaceFromContextMenu}
        clearNodeSelection={clearNodeSelection}
        canConvertSelectedNoteToTask={canConvertSelectedNoteToTask}
        isConvertSelectedNoteToTaskDisabled={isConvertSelectedNoteToTaskDisabled}
        convertSelectedNoteToTask={convertSelectedNoteToTask}
        setSelectedNodeLabelColorOverride={setSelectedNodeLabelColorOverride}
      />
      <WorkspaceSpaceActionMenu
        menu={spaceActionMenu}
        availableOpeners={availablePathOpeners}
        canArrange={canArrangeActiveSpace}
        canArchive={activeMenuSpace !== null}
        currentLabelColor={activeMenuSpace?.labelColor ?? null}
        closeMenu={closeSpaceActionMenu}
        setSpaceLabelColor={setSpaceLabelColor}
        preserveWindowSizes={arrangePreserveWindowSizes}
        onChangePreserveWindowSizes={setArrangePreserveWindowSizes}
        onArrange={spaceId => arrangeInSpace(spaceId, arrangeStyle)}
        onArchive={anchor => {
          if (activeMenuSpace) {
            openSpaceArchive(activeMenuSpace.id, anchor)
          }
        }}
        onCopyPath={() => {
          if (activeMenuSpace) {
            return copySpacePath(activeMenuSpace.id)
          }
        }}
        onOpenPath={openerId => {
          if (activeMenuSpace) {
            return openSpacePath(activeMenuSpace.id, openerId)
          }
        }}
      />
    </>
  )
}
