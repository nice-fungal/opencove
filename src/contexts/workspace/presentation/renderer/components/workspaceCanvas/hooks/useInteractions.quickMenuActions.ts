import { useCallback } from 'react'
import { resolvePaneNodeCreationAnchor } from './useInteractions.creationAnchor'
import type { QuickPhrase } from '@contexts/settings/domain/agentSettings'
import { createNoteNodeAtFlowPosition } from './useInteractions.paneNodeCreation'
import type { UseWorkspaceCanvasInteractionsParams } from './useInteractions.types'

export function useWorkspaceCanvasQuickMenuActions(
  options: Pick<
    UseWorkspaceCanvasInteractionsParams,
    | 'contextMenu'
    | 'setContextMenu'
    | 'workspaceId'
    | 'standardWindowSizeBucket'
    | 'createNoteNode'
    | 'spacesRef'
    | 'nodesRef'
    | 'setNodes'
    | 'onSpacesChange'
  >,
): {
  insertQuickPhrase: (phrase: QuickPhrase) => void
} {
  const {
    contextMenu,
    setContextMenu,
    workspaceId,
    standardWindowSizeBucket,
    createNoteNode,
    spacesRef,
    nodesRef,
    setNodes,
    onSpacesChange,
  } = options

  const insertQuickPhrase = useCallback(
    (phrase: QuickPhrase): void => {
      if (contextMenu?.kind === 'pane') {
        setContextMenu(null)

        createNoteNodeAtFlowPosition({
          workspaceId,
          anchor: resolvePaneNodeCreationAnchor(contextMenu),
          standardWindowSizeBucket,
          createNoteNode: (anchor, placementOptions) =>
            createNoteNode(anchor, {
              ...placementOptions,
              initialText: phrase.content,
            }),
          spacesRef,
          nodesRef,
          setNodes,
          onSpacesChange,
        })
        return
      }

      const text = phrase.content
      const writeText = window.opencoveApi?.clipboard?.writeText
      if (typeof writeText === 'function') {
        void writeText(text)
        return
      }

      try {
        const clipboard =
          typeof navigator === 'undefined' ? null : (navigator as Navigator).clipboard
        if (clipboard && typeof clipboard.writeText === 'function') {
          void clipboard.writeText(text)
        }
      } catch {
        // ignore clipboard failures
      }
    },
    [
      workspaceId,
      contextMenu,
      createNoteNode,
      nodesRef,
      onSpacesChange,
      setContextMenu,
      setNodes,
      spacesRef,
      standardWindowSizeBucket,
    ],
  )

  return { insertQuickPhrase }
}
