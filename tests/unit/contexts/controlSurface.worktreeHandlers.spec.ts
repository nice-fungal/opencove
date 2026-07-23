import { describe, expect, it } from 'vitest'
import { createControlSurface } from '../../../src/app/main/controlSurface/controlSurface'
import type { ControlSurfaceContext } from '../../../src/app/main/controlSurface/types'
import { registerGitWorktreeMountHandlers } from '../../../src/app/main/controlSurface/handlers/gitWorktreeMountHandlers'
import { registerWorktreeHandlers } from '../../../src/app/main/controlSurface/handlers/worktreeHandlers'
import type {
  CreateGitWorktreeInput,
  GitWorktreeInfo,
  ListGitWorktreesInput,
  ListGitWorktreesResult,
  RemoveGitWorktreeInput,
  RemoveGitWorktreeResult,
} from '../../../src/shared/contracts/dto'

const ctx: ControlSurfaceContext = {
  now: () => new Date('2026-03-27T00:00:00.000Z'),
}

function createStubStore(state: unknown) {
  let writtenState: unknown | null = null

  return {
    store: {
      readWorkspaceStateRaw: async () => null,
      writeWorkspaceStateRaw: async () => ({ ok: true, level: 'full', bytes: 0 }),
      readAppState: async () => state,
      readAppStateRevision: async () => 0,
      writeAppState: async (next: unknown) => {
        writtenState = next
        return { ok: true, level: 'full', bytes: 1 }
      },
      readNodeScrollback: async () => null,
      writeNodeScrollback: async () => ({ ok: true, level: 'full', bytes: 0 }),
      consumeRecovery: () => null,
      dispose: () => undefined,
    },
    getWrittenState: () => writtenState,
  }
}

describe('control surface worktree handlers', () => {
  it('registers with the default Git port without invoking deleted creation validation', async () => {
    const controlSurface = createControlSurface()
    const { store } = createStubStore(null)
    registerWorktreeHandlers(controlSurface, {
      approvedWorkspaces: {
        registerRoot: async () => undefined,
        isPathApproved: async () => true,
      },
      getPersistenceStore: async () => store,
    })
    const result = await controlSurface.invoke(ctx, {
      kind: 'command',
      id: 'worktree.create',
      payload: { spaceId: 'space' },
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'common.invalid_input' } })
  })

  it('lists worktrees for a project', async () => {
    const appState = {
      formatVersion: 1,
      activeWorkspaceId: 'ws1',
      workspaces: [
        {
          id: 'ws1',
          name: 'Workspace',
          path: '/repo',
          worktreesRoot: '',
          viewport: { x: 0, y: 0, zoom: 1 },
          isMinimapVisible: true,
          spaces: [],
          activeSpaceId: null,
          nodes: [],
          spaceArchiveRecords: [],
        },
      ],
      settings: {},
    }

    const { store } = createStubStore(appState)

    const controlSurface = createControlSurface()
    registerWorktreeHandlers(controlSurface, {
      approvedWorkspaces: {
        registerRoot: async () => undefined,
        isPathApproved: async () => true,
      },
      getPersistenceStore: async () => store,
      gitWorktreePort: {
        listBranches: async () => ({ current: null, branches: [] }),
        listWorktrees: async (_input: ListGitWorktreesInput): Promise<ListGitWorktreesResult> => ({
          worktrees: [{ path: '/repo', head: null, branch: 'main' }],
        }),
        getStatusSummary: async () => ({ changedFileCount: 0 }),
        getDefaultBranch: async () => 'main',
        createWorktree: async (_input: CreateGitWorktreeInput): Promise<GitWorktreeInfo> => ({
          path: '/worktrees/wt1',
          head: null,
          branch: 'feature-a',
        }),
        removeWorktree: async (
          _input: RemoveGitWorktreeInput,
        ): Promise<RemoveGitWorktreeResult> => ({
          deletedBranchName: null,
          branchDeleteError: null,
          directoryCleanupError: null,
        }),
        renameBranch: async () => undefined,
        suggestNames: async () => ({
          branchName: 'feature-a',
          worktreeName: 'worktree',
          provider: 'codex',
          effectiveModel: null,
        }),
      },
    })

    const result = await controlSurface.invoke(ctx, {
      kind: 'query',
      id: 'worktree.list',
      payload: null,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.projectId).toBe('ws1')
      expect(result.value.repoPath).toBe('/repo')
      expect(result.value.worktrees.length).toBe(1)
    }
  })

  it('does not register the removed worktree.create command', async () => {
    const appState = {
      formatVersion: 1,
      activeWorkspaceId: 'ws1',
      workspaces: [
        {
          id: 'ws1',
          name: 'Workspace',
          path: '/repo',
          worktreesRoot: '',
          viewport: { x: 0, y: 0, zoom: 1 },
          isMinimapVisible: true,
          spaces: [
            {
              id: 's1',
              name: 'Space A',
              directoryPath: '/repo',
              labelColor: null,
              nodeIds: [],
              rect: null,
            },
          ],
          activeSpaceId: null,
          nodes: [],
          spaceArchiveRecords: [],
        },
      ],
      settings: {},
    }

    const { store } = createStubStore(appState)

    const controlSurface = createControlSurface()
    registerWorktreeHandlers(controlSurface, {
      approvedWorkspaces: {
        registerRoot: async () => undefined,
        isPathApproved: async () => true,
      },
      getPersistenceStore: async () => store,
      gitWorktreePort: {
        listBranches: async () => ({ current: null, branches: [] }),
        listWorktrees: async () => ({ worktrees: [] }),
        getStatusSummary: async () => ({ changedFileCount: 0 }),
        getDefaultBranch: async () => 'main',
        createWorktree: async (): Promise<GitWorktreeInfo> => ({
          path: '/worktrees/wt1',
          head: null,
          branch: 'feature-a',
        }),
        removeWorktree: async (): Promise<RemoveGitWorktreeResult> => ({
          deletedBranchName: null,
          branchDeleteError: null,
          directoryCleanupError: null,
        }),
        renameBranch: async () => undefined,
        suggestNames: async () => ({
          branchName: 'feature-a',
          worktreeName: 'worktree',
          provider: 'codex',
          effectiveModel: null,
        }),
      },
    })

    const result = await controlSurface.invoke(ctx, {
      kind: 'command',
      id: 'worktree.create',
      payload: { spaceId: 's1', name: 'feature-a' },
    })

    expect(result).toMatchObject({ ok: false, error: { code: 'common.invalid_input' } })
  })

  it('rejects the removed mount worktree creation command', async () => {
    const registerRootCalls: string[] = []
    const controlSurface = createControlSurface()
    registerGitWorktreeMountHandlers(controlSurface, {
      approvedWorkspaces: {
        registerRoot: async rootPath => {
          registerRootCalls.push(rootPath)
        },
        isPathApproved: async path => path === '/repo' || path === '/repo/.opencove/worktrees',
      },
      topology: {
        resolveMountTarget: async () => ({
          mountId: 'mount-1',
          targetId: 'target-1',
          endpointId: 'local',
          rootPath: '/repo',
          rootUri: 'file:///repo',
        }),
      } as never,
      gitWorktreePort: {
        listBranches: async () => ({ current: null, branches: [] }),
        listWorktrees: async () => ({ worktrees: [] }),
        getStatusSummary: async () => ({ changedFileCount: 0 }),
        getDefaultBranch: async () => 'main',
        createWorktree: async (): Promise<GitWorktreeInfo> => ({
          path: '/external/worktrees/wt1',
          head: null,
          branch: 'feature-a',
        }),
        removeWorktree: async (): Promise<RemoveGitWorktreeResult> => ({
          deletedBranchName: null,
          branchDeleteError: null,
          directoryCleanupError: null,
        }),
        renameBranch: async () => undefined,
        suggestNames: async () => ({
          branchName: 'feature-a',
          worktreeName: 'worktree',
          provider: 'codex',
          effectiveModel: null,
        }),
      },
    })

    const result = await controlSurface.invoke(ctx, {
      kind: 'command',
      id: 'gitWorktree.createInMount',
      payload: {
        mountId: 'mount-1',
        worktreesRootUri: 'file:///repo/.opencove/worktrees',
        branchMode: { kind: 'existing', name: 'feature-a' },
      },
    })

    expect(result).toMatchObject({ ok: false, error: { code: 'common.invalid_input' } })
    expect(registerRootCalls).toEqual([])
  })

  it('does not register worktree.create regardless of payload', async () => {
    const { store } = createStubStore({
      formatVersion: 1,
      activeWorkspaceId: null,
      workspaces: [],
      settings: {},
    })

    const controlSurface = createControlSurface()
    registerWorktreeHandlers(controlSurface, {
      approvedWorkspaces: {
        registerRoot: async () => undefined,
        isPathApproved: async () => true,
      },
      getPersistenceStore: async () => store,
      gitWorktreePort: {
        listBranches: async () => ({ current: null, branches: [] }),
        listWorktrees: async () => ({ worktrees: [] }),
        getStatusSummary: async () => ({ changedFileCount: 0 }),
        getDefaultBranch: async () => 'main',
        createWorktree: async (): Promise<GitWorktreeInfo> => ({
          path: '/worktrees/wt1',
          head: null,
          branch: 'feature-a',
        }),
        removeWorktree: async (): Promise<RemoveGitWorktreeResult> => ({
          deletedBranchName: null,
          branchDeleteError: null,
          directoryCleanupError: null,
        }),
        renameBranch: async () => undefined,
        suggestNames: async () => ({
          branchName: 'feature-a',
          worktreeName: 'worktree',
          provider: 'codex',
          effectiveModel: null,
        }),
      },
    })

    const result = await controlSurface.invoke(ctx, {
      kind: 'command',
      id: 'worktree.create',
      payload: null,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('common.invalid_input')
    }
  })
})
