import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Node } from '@xyflow/react'
import type {
  TerminalNodeData,
  WorkspaceSpaceState,
} from '../../../src/contexts/workspace/presentation/renderer/types'
import type { MountDto } from '../../../src/shared/contracts/dto'
import { DEFAULT_AGENT_SETTINGS } from '../../../src/contexts/settings/domain/agentSettings'
import { SPACE_MIN_SIZE, SPACE_NODE_PADDING } from '../../../src/contexts/workspace/domain/workspaceSpaceLayout'
import { useWorkspaceCanvasSpaces } from '../../../src/contexts/workspace/presentation/renderer/components/workspaceCanvas/hooks/useSpaces'
import { resolveDefaultAgentWindowSize } from '../../../src/contexts/workspace/presentation/renderer/components/workspaceCanvas/constants'
import { SpaceTargetMountPickerWindow } from '../../../src/contexts/workspace/presentation/renderer/components/workspaceCanvas/windows/SpaceTargetMountPickerWindow'

vi.mock('@xyflow/react', () => {
  return {
    getViewportForBounds: (
      _bounds: { x: number; y: number; width: number; height: number },
      _width: number,
      _height: number,
      _minZoom: number,
      maxZoom: number,
      _padding: number,
    ) => ({ x: 0, y: 0, zoom: maxZoom }),
    useStore: (selector: (state: unknown) => unknown) =>
      selector({ width: 1440, height: 900, minZoom: 0.1, maxZoom: 2 }),
  }
})

vi.mock('@app/renderer/i18n', () => {
  const t = (key: string, params?: { message?: string; count?: number }) => {
    if (params?.message) {
      return `${key}: ${params.message}`
    }
    if (params?.count !== undefined) {
      return `${key}-${params.count}`
    }
    return key
  }

  return {
    translate: t,
    useTranslation: () => ({ t, i18n: { language: 'en' } }),
  }
})

const WORKSPACE_ID = 'workspace-1'
const WORKSPACE_PATH = '/tmp/workspace-root'

const MOUNT_A: MountDto = {
  mountId: 'mount-a',
  projectId: WORKSPACE_ID,
  name: 'Local',
  sortOrder: 0,
  endpointId: 'local',
  targetId: 'target-a',
  rootPath: WORKSPACE_PATH,
  rootUri: 'file:///tmp/workspace-root',
} as MountDto

const MOUNT_B: MountDto = {
  mountId: 'mount-b',
  projectId: WORKSPACE_ID,
  name: 'Second',
  sortOrder: 1,
  endpointId: 'local',
  targetId: 'target-b',
  rootPath: '/tmp/second-location',
  rootUri: 'file:///tmp/second-location',
} as MountDto

type SpacesApi = ReturnType<typeof useWorkspaceCanvasSpaces>

function installControlSurface(
  invoke: (request: { kind: string; id: string; payload: unknown }) => Promise<unknown>,
) {
  Object.defineProperty(window, 'opencoveApi', {
    configurable: true,
    writable: true,
    value: {
      controlSurface: {
        invoke: vi.fn(invoke),
      },
    },
  })
}

function installMountListInvoke(mountsByCall: MountDto[][]) {
  let listCallCount = 0
  const createdMounts: unknown[] = []

  installControlSurface(async request => {
    if (request.id === 'mount.list') {
      const mounts = mountsByCall[Math.min(listCallCount, mountsByCall.length - 1)]
      listCallCount += 1
      return { projectId: WORKSPACE_ID, mounts }
    }
    if (request.id === 'mount.create') {
      createdMounts.push(request.payload)
      return {}
    }
    if (request.id === 'endpoint.list') {
      return { endpoints: [] }
    }
    throw new Error(`Unexpected control surface request: ${request.id}`)
  })

  return { createdMounts }
}

function setupHarness(options?: { spaces?: WorkspaceSpaceState[] }) {
  const nodesRef = { current: [] as Node<TerminalNodeData>[] }
  const spacesRef = { current: options?.spaces ?? [] }
  const onSpacesChange = vi.fn((nextSpaces: WorkspaceSpaceState[]) => {
    spacesRef.current = nextSpaces
  })
  const onRequestPersistFlush = vi.fn()
  const setContextMenu = vi.fn()
  const setEmptySelectionPrompt = vi.fn()
  const onShowMessage = vi.fn()
  const setViewport = vi.fn(async () => undefined)
  const reactFlow = {
    setViewport,
    fitView: vi.fn(async () => undefined),
    getNodes: () => nodesRef.current,
    flowToScreenPosition: (point: { x: number; y: number }) => point,
  }

  let api!: SpacesApi

  function Harness(): React.JSX.Element {
    const spacesApi = useWorkspaceCanvasSpaces({
      workspaceId: WORKSPACE_ID,
      activeSpaceId: null,
      onActiveSpaceChange: () => undefined,
      workspacePath: WORKSPACE_PATH,
      focusNodeTargetZoom: 0.75,
      standardWindowSizeBucket: DEFAULT_AGENT_SETTINGS.standardWindowSizeBucket,
      reactFlow: reactFlow as never,
      nodes: nodesRef.current,
      nodesRef,
      setNodes: ((updater: (prev: Node<TerminalNodeData>[]) => Node<TerminalNodeData>[]) => {
        nodesRef.current = updater(nodesRef.current)
      }) as never,
      spaces: spacesRef.current,
      spacesRef,
      selectedNodeIds: [],
      selectedNodeIdsRef: { current: [] },
      onSpacesChange,
      onRequestPersistFlush,
      setContextMenu: setContextMenu as never,
      setEmptySelectionPrompt: setEmptySelectionPrompt as never,
      onShowMessage,
    })
    api = spacesApi

    return (
      <SpaceTargetMountPickerWindow
        picker={spacesApi.contextMenuSpaceTargetMountPicker}
        setPicker={spacesApi.setContextMenuSpaceTargetMountPicker}
        onCancel={spacesApi.cancelContextMenuSpaceTargetMountPicker}
        onConfirm={spacesApi.confirmContextMenuSpaceTargetMountPicker}
      />
    )
  }

  render(<Harness />)

  return {
    getApi: () => api,
    nodesRef,
    spacesRef,
    onSpacesChange,
    onRequestPersistFlush,
    setContextMenu,
    setEmptySelectionPrompt,
    onShowMessage,
    setViewport,
  }
}

function expectedEmptySpaceSize() {
  const agentSize = resolveDefaultAgentWindowSize(DEFAULT_AGENT_SETTINGS.standardWindowSizeBucket)
  return {
    width: Math.max(SPACE_MIN_SIZE.width, agentSize.width + SPACE_NODE_PADDING * 2),
    height: Math.max(SPACE_MIN_SIZE.height, agentSize.height + SPACE_NODE_PADDING * 2),
  }
}

function expectedEmptySpaceRect(point: { x: number; y: number }) {
  const size = expectedEmptySpaceSize()
  return {
    x: Math.round(point.x - size.width / 2),
    y: Math.round(point.y - size.height / 2),
    width: size.width,
    height: size.height,
  }
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

beforeEach(() => {
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    },
  })
})

describe('根画布右键创建 Space 基线', () => {
  it('在点击位置创建空 Space，保持默认命名、尺寸、清理、聚焦与持久化', () => {
    const harness = setupHarness()
    const point = { x: 1000, y: 800 }

    act(() => {
      harness.getApi().createEmptySpaceAtPoint(point)
    })

    expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces).toHaveLength(1)

    const created = nextSpaces[0]
    expect(created.name).toBe('space.defaultName-1')
    expect(created.directoryPath).toBe(WORKSPACE_PATH)
    expect(created.targetMountId).toBeNull()
    expect(created.nodeIds).toEqual([])
    expect(created.rect).toEqual(expectedEmptySpaceRect(point))

    expect(harness.onRequestPersistFlush).toHaveBeenCalledTimes(1)
    expect(harness.setContextMenu).toHaveBeenCalledWith(null)
    expect(harness.setEmptySelectionPrompt).toHaveBeenCalledWith(null)
    expect(harness.setViewport).toHaveBeenCalledTimes(1)
  })

  it('与现有 Space 重叠时避让新 Space 的 rect', () => {
    const existingRect = expectedEmptySpaceRect({ x: 1000, y: 800 })
    const harness = setupHarness({
      spaces: [
        {
          id: 'space-existing',
          name: 'Existing',
          directoryPath: WORKSPACE_PATH,
          targetMountId: null,
          nodeIds: [],
          rect: existingRect,
        },
      ],
    })

    act(() => {
      harness.getApi().createEmptySpaceAtPoint({ x: 1000, y: 800 })
    })

    expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    const created = nextSpaces.find(space => space.id !== 'space-existing')
    expect(created).toBeDefined()
    expect(created?.rect).toBeDefined()
    expect(rectsIntersect(created!.rect!, existingRect)).toBe(false)
  })

  it('Parent Space 内创建 Child Space 时继承 directoryPath 与 targetMountId', () => {
    const harness = setupHarness({
      spaces: [
        {
          id: 'parent-1',
          name: 'Parent',
          directoryPath: '/parent/dir',
          targetMountId: 'mount-parent',
          nodeIds: [],
          rect: { x: 0, y: 0, width: 1200, height: 900 },
        },
      ],
    })

    act(() => {
      harness.getApi().createChildSpaceInParent('parent-1', { anchor: { x: 200, y: 200 } })
    })

    expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces).toHaveLength(2)

    const child = nextSpaces.find(space => space.id !== 'parent-1')
    expect(child).toBeDefined()
    expect(child?.parentSpaceId).toBe('parent-1')
    expect(child?.directoryPath).toBe('/parent/dir')
    expect(child?.targetMountId).toBe('mount-parent')
    expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
  })
})

describe('根画布右键创建 Space 的 Directory 选择', () => {
  it('多 Mount 时打开现有 Picker，确认前不创建 Space', async () => {
    installMountListInvoke([[MOUNT_A, MOUNT_B]])
    const harness = setupHarness()
    const flowPoint = { x: 1000, y: 800 }

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint,
        anchor: { x: 220, y: 160 },
      })
    })

    const pickerWindow = await screen.findByTestId('workspace-space-target-mount-window')
    expect(pickerWindow).toBeInTheDocument()
    expect(harness.onSpacesChange).not.toHaveBeenCalled()

    const picker = harness.getApi().contextMenuSpaceTargetMountPicker
    expect(picker).not.toBeNull()
    expect(picker?.mounts.map(mount => mount.mountId)).toEqual(['mount-a', 'mount-b'])
    expect(picker?.selectedMountId).toBe('mount-a')
    expect(picker?.anchor).toEqual({ x: 220, y: 160 })
  })

  it('选择非默认 Mount 并确认后写入同一 Mount，位置来自右键 flow point，且只创建一个 Space', async () => {
    installMountListInvoke([[MOUNT_A, MOUNT_B]])
    const harness = setupHarness()
    const flowPoint = { x: 1000, y: 800 }

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint,
        anchor: { x: 220, y: 160 },
      })
    })

    await screen.findByTestId('workspace-space-target-mount-window')

    fireEvent.click(screen.getByTestId('workspace-space-target-mount-mount-b'))
    expect(harness.getApi().contextMenuSpaceTargetMountPicker?.selectedMountId).toBe('mount-b')

    fireEvent.click(screen.getByTestId('workspace-space-target-mount-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
    })

    expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces).toHaveLength(1)

    const created = nextSpaces[0]
    expect(created.targetMountId).toBe('mount-b')
    expect(created.directoryPath).toBe('/tmp/second-location')
    expect(created.nodeIds).toEqual([])
    expect(created.rect).toEqual(expectedEmptySpaceRect(flowPoint))
    expect(harness.onRequestPersistFlush).toHaveBeenCalledTimes(1)
    expect(harness.setViewport).toHaveBeenCalledTimes(1)
  })

  it('取消后 Picker 关闭且不创建 Space，再次打开仍可正常选择', async () => {
    installMountListInvoke([[MOUNT_A, MOUNT_B]])
    const harness = setupHarness()
    const flowPoint = { x: 1000, y: 800 }

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint,
        anchor: { x: 220, y: 160 },
      })
    })

    await screen.findByTestId('workspace-space-target-mount-window')
    fireEvent.click(screen.getByTestId('workspace-space-target-mount-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
    })
    expect(harness.onSpacesChange).not.toHaveBeenCalled()

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint,
        anchor: { x: 220, y: 160 },
      })
    })

    await screen.findByTestId('workspace-space-target-mount-window')
    fireEvent.click(screen.getByTestId('workspace-space-target-mount-mount-b'))
    fireEvent.click(screen.getByTestId('workspace-space-target-mount-confirm'))

    await waitFor(() => {
      expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    })
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces).toHaveLength(1)
    expect(nextSpaces[0].targetMountId).toBe('mount-b')
  })

  it('单 Mount 时不显示 Picker，新 Space 直接绑定唯一 Mount', async () => {
    installMountListInvoke([[MOUNT_A]])
    const harness = setupHarness()
    const flowPoint = { x: 1000, y: 800 }

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint,
        anchor: { x: 220, y: 160 },
      })
    })

    await waitFor(() => {
      expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces).toHaveLength(1)
    expect(nextSpaces[0].targetMountId).toBe('mount-a')
    expect(nextSpaces[0].directoryPath).toBe(WORKSPACE_PATH)
    expect(nextSpaces[0].rect).toEqual(expectedEmptySpaceRect(flowPoint))
  })

  it('Mount 准备流程补建 Mount 后正常创建', async () => {
    const { createdMounts } = installMountListInvoke([[], [MOUNT_A]])
    const harness = setupHarness()

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint: { x: 1000, y: 800 },
        anchor: { x: 220, y: 160 },
      })
    })

    await waitFor(() => {
      expect(harness.onSpacesChange).toHaveBeenCalledTimes(1)
    })

    expect(createdMounts).toHaveLength(1)
    expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
    const nextSpaces = harness.onSpacesChange.mock.calls[0][0] as WorkspaceSpaceState[]
    expect(nextSpaces[0].targetMountId).toBe('mount-a')
  })

  it('补建后仍无 Mount 时显示既有警告且不创建', async () => {
    installMountListInvoke([[], []])
    const harness = setupHarness()

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint: { x: 1000, y: 800 },
        anchor: { x: 220, y: 160 },
      })
    })

    await waitFor(() => {
      expect(harness.onShowMessage).toHaveBeenCalledWith('messages.projectHasNoMounts', 'warning')
    })
    expect(harness.onSpacesChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
  })

  it('Mount 查询失败时显示既有错误消息且不创建', async () => {
    installControlSurface(async request => {
      if (request.id === 'mount.list') {
        throw new Error('boom')
      }
      if (request.id === 'endpoint.list') {
        return { endpoints: [] }
      }
      throw new Error(`Unexpected control surface request: ${request.id}`)
    })
    const harness = setupHarness()

    act(() => {
      harness.getApi().createEmptySpaceFromContextMenu({
        flowPoint: { x: 1000, y: 800 },
        anchor: { x: 220, y: 160 },
      })
    })

    await waitFor(() => {
      expect(harness.onShowMessage).toHaveBeenCalledWith('messages.mountListFailed: boom', 'error')
    })
    expect(harness.onSpacesChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('workspace-space-target-mount-window')).not.toBeInTheDocument()
  })
})
