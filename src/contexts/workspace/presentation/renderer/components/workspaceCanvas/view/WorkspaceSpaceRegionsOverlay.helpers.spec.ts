import { describe, expect, it } from 'vitest'
import { resolveLastPathSegment } from './WorkspaceSpaceRegionsOverlay.helpers'

describe('resolveLastPathSegment', () => {
  it('returns the final directory name from POSIX paths', () => {
    expect(resolveLastPathSegment('/Users/example/projects/opencove')).toBe('opencove')
    expect(resolveLastPathSegment('/Users/example/projects/opencove/')).toBe('opencove')
  })

  it('returns the final directory name from Windows paths', () => {
    expect(resolveLastPathSegment('C:\\Users\\example\\opencove')).toBe('opencove')
    expect(resolveLastPathSegment('C:\\Users\\example\\opencove\\')).toBe('opencove')
  })

  it('returns null when no directory name is available', () => {
    expect(resolveLastPathSegment('')).toBeNull()
    expect(resolveLastPathSegment(' / ')).toBeNull()
  })
})
