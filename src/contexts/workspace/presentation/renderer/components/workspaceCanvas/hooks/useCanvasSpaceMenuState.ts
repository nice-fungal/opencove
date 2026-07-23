import React from 'react'
import type { Node } from '@xyflow/react'
import type { TerminalNodeData, WorkspaceSpaceState } from '../../../types'
import type { SpaceActionMenuState } from '../types'

export function useWorkspaceCanvasSpaceMenuState({
  spaceActionMenu,
  spaces,
  nodes,
}: {
  spaceActionMenu: SpaceActionMenuState | null
  spaces: WorkspaceSpaceState[]
  nodes: Node<TerminalNodeData>[]
}): {
  activeMenuSpace: WorkspaceSpaceState | null
  canArrangeAll: boolean
  canArrangeCanvas: boolean
  canArrangeActiveSpace: boolean
} {
  const activeMenuSpace = React.useMemo(
    () =>
      spaceActionMenu
        ? (spaces.find(candidate => candidate.id === spaceActionMenu.spaceId) ?? null)
        : null,
    [spaceActionMenu, spaces],
  )

  const ownedNodeIdSet = React.useMemo(
    () => new Set(spaces.flatMap(space => space.nodeIds)),
    [spaces],
  )
  const rootNodeCount = React.useMemo(
    () => nodes.filter(node => !ownedNodeIdSet.has(node.id)).length,
    [nodes, ownedNodeIdSet],
  )
  const hasArrangeableSpace = spaces.some(space => space.nodeIds.length >= 1)
  const canArrangeCanvas = spaces.length + rootNodeCount >= 2
  const canArrangeAll = canArrangeCanvas || hasArrangeableSpace
  const canArrangeActiveSpace = Boolean(activeMenuSpace && activeMenuSpace.nodeIds.length >= 1)

  return {
    activeMenuSpace,
    canArrangeAll,
    canArrangeCanvas,
    canArrangeActiveSpace,
  }
}
