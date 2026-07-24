import type { TranslateFn } from '@app/renderer/i18n'
import type { ListMountsResult, MountDto } from '@shared/contracts/dto'
import type { Node, ReactFlowInstance } from '@xyflow/react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { TerminalNodeData, WorkspaceSpaceRect } from '../../../types'
import type {
  ContextMenuState,
  EmptySelectionPromptState,
  ShowWorkspaceCanvasMessage,
  SpaceTargetMountPickerState,
} from '../types'

type CreateSpacePayload = {
  nodeIds: string[]
  rect: WorkspaceSpaceRect | null
  targetMountId: string
  directoryPath: string
}

function isAbsolutePath(pathValue: string): boolean {
  return /^([a-zA-Z]:[\\/]|\/)/.test(pathValue)
}

export async function prepareSpaceTargetMounts({
  workspaceId,
  workspacePath,
  onShowMessage,
  t,
}: {
  workspaceId: string
  workspacePath: string
  onShowMessage?: ShowWorkspaceCanvasMessage
  t: TranslateFn
}): Promise<MountDto[] | null> {
  try {
    let mountResult = await window.opencoveApi.controlSurface.invoke<ListMountsResult>({
      kind: 'query',
      id: 'mount.list',
      payload: { projectId: workspaceId },
    })

    if (mountResult.mounts.length === 0) {
      const rootPath = workspacePath.trim()
      if (workspaceId.trim().length > 0 && rootPath.length > 0 && isAbsolutePath(rootPath)) {
        try {
          await window.opencoveApi.controlSurface.invoke({
            kind: 'command',
            id: 'mount.create',
            payload: {
              projectId: workspaceId,
              endpointId: 'local',
              rootPath,
              name: null,
            },
          })
          mountResult = await window.opencoveApi.controlSurface.invoke<ListMountsResult>({
            kind: 'query',
            id: 'mount.list',
            payload: { projectId: workspaceId },
          })
        } catch {
          // ignore
        }
      }
    }

    if (mountResult.mounts.length === 0) {
      onShowMessage?.(t('messages.projectHasNoMounts'), 'warning')
      return null
    }

    return mountResult.mounts
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    onShowMessage?.(t('messages.mountListFailed', { message }), 'error')
    return null
  }
}

export function createSpaceFromSelectedNodesWithMounts({
  selectedNodeIdsRef,
  reactFlow,
  workspaceId,
  workspacePath,
  createSpace,
  setContextMenu,
  setEmptySelectionPrompt,
  setSpaceTargetMountPicker,
  cancelSpaceRename,
  onShowMessage,
  t,
}: {
  selectedNodeIdsRef: MutableRefObject<string[]>
  reactFlow: ReactFlowInstance<Node<TerminalNodeData>>
  workspaceId: string
  workspacePath: string
  createSpace: (payload: CreateSpacePayload) => void
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>
  setEmptySelectionPrompt: Dispatch<SetStateAction<EmptySelectionPromptState | null>>
  setSpaceTargetMountPicker: Dispatch<SetStateAction<SpaceTargetMountPickerState | null>>
  cancelSpaceRename: () => void
  onShowMessage?: ShowWorkspaceCanvasMessage
  t: TranslateFn
}): void {
  const resolveSelectedIds = (): string[] => {
    const selectedIdsRefValue = selectedNodeIdsRef.current
    if (selectedIdsRefValue.length > 0) {
      return selectedIdsRefValue
    }

    return reactFlow
      .getNodes()
      .filter(node => node.selected)
      .map(node => node.id)
  }

  const commitSelectedNodes = (): boolean => {
    const selectedIds = resolveSelectedIds()
    if (selectedIds.length === 0) {
      return false
    }

    void (async () => {
      const mounts = await prepareSpaceTargetMounts({
        workspaceId,
        workspacePath,
        onShowMessage,
        t,
      })

      if (!mounts) {
        setContextMenu(null)
        setEmptySelectionPrompt(null)
        cancelSpaceRename()
        return
      }

      if (mounts.length === 1) {
        const mount = mounts[0]
        createSpace({
          nodeIds: selectedIds,
          rect: null,
          targetMountId: mount.mountId,
          directoryPath: mount.rootPath,
        })
        return
      }

      setSpaceTargetMountPicker({
        nodeIds: selectedIds,
        rect: null,
        mounts,
        selectedMountId: mounts[0].mountId,
        anchor: (() => {
          const firstSelectedNode = reactFlow
            .getNodes()
            .find(node => selectedIds.includes(node.id))
          if (!firstSelectedNode) {
            return { x: 24, y: 24 }
          }

          return reactFlow.flowToScreenPosition({
            x:
              firstSelectedNode.position.x +
              (firstSelectedNode.measured?.width ?? firstSelectedNode.width ?? 240) +
              8,
            y: firstSelectedNode.position.y,
          })
        })(),
      })
      setContextMenu(null)
      setEmptySelectionPrompt(null)
      cancelSpaceRename()
    })()

    return true
  }

  if (commitSelectedNodes()) {
    return
  }

  let attemptsRemaining = 3

  const retryCommitSelectedNodes = () => {
    if (commitSelectedNodes()) {
      return
    }

    attemptsRemaining -= 1
    if (attemptsRemaining <= 0) {
      setContextMenu(null)
      return
    }

    window.requestAnimationFrame(retryCommitSelectedNodes)
  }

  window.requestAnimationFrame(retryCommitSelectedNodes)
}
