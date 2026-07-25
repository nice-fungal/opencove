import { existsSync } from 'fs'
import { resolve } from 'path'
import { is } from '@electron-toolkit/utils'

function resolveIconCandidates(baseDir: string, platform: NodeJS.Platform): string[] {
  const rootBuildDir = resolve(baseDir, '../../build')

  if (platform === 'win32') {
    return [resolve(rootBuildDir, 'icon.ico'), resolve(rootBuildDir, 'icon.png')]
  }

  return [resolve(rootBuildDir, 'icon.png')]
}

export function resolveRuntimeIconPath(
  baseDir: string = __dirname,
  platform: NodeJS.Platform = process.platform,
): string | null {
  if (is.dev && process.env['NODE_ENV'] !== 'test') {
    return null
  }

  return resolveIconCandidates(baseDir, platform).find(candidate => existsSync(candidate)) ?? null
}
