import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SpaceVisual } from '../types'
import { WorkspaceSpaceRegionItem } from './WorkspaceSpaceRegionItem'

describe('WorkspaceSpaceRegionItem', () => {
  it('shows the final directory segment in the files button', () => {
    const directoryPath = '/Users/example/projects/opencove'
    const space: SpaceVisual = {
      id: 'space-1',
      name: 'Space 1',
      directoryPath,
      targetMountId: null,
      parentSpaceId: null,
      boundary: null,
      sortOrder: 0,
      labelColor: null,
      rect: { x: 0, y: 0, width: 640, height: 480 },
      hasExplicitRect: true,
    }

    render(
      <WorkspaceSpaceRegionItem
        space={space}
        resolvedRect={space.rect}
        isSelected={false}
        isExplorerOpen={false}
        isDragSurfaceSelectionMode={false}
        githubPullRequestsEnabled={false}
        busyOperationLabel={null}
        editingSpaceId={null}
        spaceRenameInputRef={React.createRef<HTMLInputElement>()}
        spaceRenameDraft=""
        setSpaceRenameDraft={vi.fn()}
        commitSpaceRename={vi.fn()}
        cancelSpaceRename={vi.fn()}
        startSpaceRename={vi.fn()}
        handleSpaceDragHandlePointerDown={vi.fn()}
        updateHandleCursor={vi.fn()}
        resolvedWorktreeInfo={null}
        resolvedChangedFileCount={null}
        resolvedBranchBadge={null}
        resolvedPullRequestSummary={null}
      />,
    )

    const filesButton = screen.getByTestId('workspace-space-files-space-1')
    expect(filesButton).toHaveTextContent('opencove')
    expect(filesButton.getAttribute('title')).toContain(directoryPath)

    const topDragHandle = screen.getByTestId('workspace-space-drag-space-1-top')
    expect(topDragHandle.querySelector('.workspace-space-region__drag-handle-icon')).not.toBeNull()
    expect(
      screen
        .getByTestId('workspace-space-drag-space-1-right')
        .querySelector('.workspace-space-region__drag-handle-icon'),
    ).toBeNull()
  })
})
