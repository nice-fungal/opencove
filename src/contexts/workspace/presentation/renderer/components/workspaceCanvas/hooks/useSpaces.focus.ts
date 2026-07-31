import { useCallback, useEffect, useRef } from 'react'
import type { Node, ReactFlowInstance } from '@xyflow/react'
import type { TerminalNodeData, WorkspaceSpaceState } from '../../../types'
import { resolveWorkspaceCanvasAnimationDuration } from '../helpers'

export function useWorkspaceCanvasSpaceFocus({
  workspaceId,
  activeSpaceId,
  onActiveSpaceChange,
  reactFlow,
  nodesRef,
  spacesRef,
  cancelSpaceRename,
}: {
  workspaceId: string
  activeSpaceId: string | null
  onActiveSpaceChange: (spaceId: string | null) => void
  reactFlow: ReactFlowInstance<Node<TerminalNodeData>>
  nodesRef: React.MutableRefObject<Node<TerminalNodeData>[]>
  spacesRef: React.MutableRefObject<WorkspaceSpaceState[]>
  cancelSpaceRename: () => void
}): {
  activateSpace: (spaceId: string) => void
  activateAllSpaces: () => void
  setActiveSpaceIdFromNodeNavigation: (spaceId: string | null) => void
  focusSpaceInViewport: (spaceId: string) => boolean
  focusAllInViewport: () => void
} {
  const lastAppliedWorkspaceIdRef = useRef<string | null>(null)
  const lastAppliedActiveSpaceIdRef = useRef<string | null | undefined>(undefined)
  const skipNextActiveSpaceViewportFocusRef = useRef(false)

  const focusSpaceInViewport = useCallback(
    (spaceId: string): boolean => {
      const space = spacesRef.current.find(item => item.id === spaceId) ?? null
      return Boolean(space)
    },
    [spacesRef],
  )

  const focusAllInViewport = useCallback((): void => {
    if (nodesRef.current.length === 0) {
      return
    }

    void reactFlow.fitView({
      padding: 0.16,
      duration: resolveWorkspaceCanvasAnimationDuration(220),
    })
  }, [nodesRef, reactFlow])

  const activateSpace = useCallback(
    (spaceId: string): void => {
      const targetSpace = spacesRef.current.find(space => space.id === spaceId) ?? null
      if (!targetSpace || targetSpace.parentSpaceId) {
        return
      }

      cancelSpaceRename()
      if (activeSpaceId === spaceId) {
        focusSpaceInViewport(spaceId)
        return
      }

      onActiveSpaceChange(spaceId)
    },
    [activeSpaceId, cancelSpaceRename, focusSpaceInViewport, onActiveSpaceChange, spacesRef],
  )

  const activateAllSpaces = useCallback((): void => {
    cancelSpaceRename()
    if (activeSpaceId === null) {
      focusAllInViewport()
      return
    }

    onActiveSpaceChange(null)
  }, [activeSpaceId, cancelSpaceRename, focusAllInViewport, onActiveSpaceChange])

  const setActiveSpaceIdFromNodeNavigation = useCallback(
    (spaceId: string | null): void => {
      const targetSpace = spaceId
        ? (spacesRef.current.find(space => space.id === spaceId) ?? null)
        : null
      const nextSpaceId = targetSpace && !targetSpace.parentSpaceId ? targetSpace.id : null
      if (activeSpaceId === nextSpaceId) {
        return
      }

      skipNextActiveSpaceViewportFocusRef.current = true
      onActiveSpaceChange(nextSpaceId)
    },
    [activeSpaceId, onActiveSpaceChange, spacesRef],
  )

  useEffect(() => {
    if (lastAppliedWorkspaceIdRef.current !== workspaceId) {
      lastAppliedWorkspaceIdRef.current = workspaceId
      lastAppliedActiveSpaceIdRef.current = undefined
    }

    const previousActiveSpaceId = lastAppliedActiveSpaceIdRef.current

    if (previousActiveSpaceId === undefined) {
      lastAppliedActiveSpaceIdRef.current = activeSpaceId
      return
    }

    if (previousActiveSpaceId === activeSpaceId) {
      return
    }

    lastAppliedActiveSpaceIdRef.current = activeSpaceId

    if (skipNextActiveSpaceViewportFocusRef.current) {
      skipNextActiveSpaceViewportFocusRef.current = false
      return
    }

    if (activeSpaceId) {
      focusSpaceInViewport(activeSpaceId)
      return
    }

    if (
      previousActiveSpaceId &&
      !spacesRef.current.some(space => space.id === previousActiveSpaceId)
    ) {
      return
    }

    focusAllInViewport()
  }, [activeSpaceId, focusAllInViewport, focusSpaceInViewport, spacesRef, workspaceId])

  return {
    activateSpace,
    activateAllSpaces,
    setActiveSpaceIdFromNodeNavigation,
    focusSpaceInViewport,
    focusAllInViewport,
  }
}
