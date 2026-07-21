import { useCallback, useEffect, useRef } from 'react'
import { translate } from '@app/renderer/i18n'
import { toErrorMessage } from '../helpers'
import { resolvePaneNodeCreationAnchor } from './useInteractions.creationAnchor'
import type { QuickCommand, QuickPhrase } from '@contexts/settings/domain/agentSettings'
import {
  createNoteNodeAtFlowPosition,
  createTerminalNodeAtFlowPosition,
  createWebsiteNodeAtFlowPosition,
} from './useInteractions.paneNodeCreation'
import type { UseWorkspaceCanvasInteractionsParams } from './useInteractions.types'

export function useWorkspaceCanvasQuickMenuActions(
  options: Pick<
    UseWorkspaceCanvasInteractionsParams,
    | 'contextMenu'
    | 'setContextMenu'
    | 'workspaceId'
    | 'websiteWindowsEnabled'
    | 'standardWindowSizeBucket'
    | 'browserDefaultMode'
    | 'createWebsiteNode'
    | 'createNoteNode'
    | 'spacesRef'
    | 'nodesRef'
    | 'setNodes'
    | 'onSpacesChange'
    | 'defaultTerminalProfileId'
    | 'terminalFontSize'
    | 'terminalDisplayMetrics'
    | 'workspacePath'
    | 'createNodeForSession'
    | 'onShowMessage'
  >,
): {
  runQuickCommand: (command: QuickCommand) => Promise<void>
  insertQuickPhrase: (phrase: QuickPhrase) => void
} {
  const {
    contextMenu,
    setContextMenu,
    workspaceId,
    websiteWindowsEnabled,
    standardWindowSizeBucket,
    browserDefaultMode,
    createWebsiteNode,
    createNoteNode,
    spacesRef,
    nodesRef,
    setNodes,
    onSpacesChange,
    defaultTerminalProfileId,
    terminalFontSize,
    terminalDisplayMetrics,
    workspacePath,
    createNodeForSession,
    onShowMessage,
  } = options

  const launchScopeRef = useRef({ active: true })
  useEffect(() => {
    const scope = { active: true }
    launchScopeRef.current = scope
    return () => {
      scope.active = false
    }
  }, [workspaceId])

  const insertQuickPhrase = useCallback(
    (phrase: QuickPhrase): void => {
      if (contextMenu?.kind === 'pane') {
        setContextMenu(null)

        createNoteNodeAtFlowPosition({
          anchor: {
            x: contextMenu.flowX,
            y: contextMenu.flowY,
          },
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

  return { runQuickCommand, insertQuickPhrase }
}
