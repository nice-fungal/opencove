import { expect, test } from '@playwright/test'
import { clearAndSeedWorkspace, launchApp } from './workspace-canvas.helpers'

test.describe('Workspace Canvas - Notes (Double Click Disabled)', () => {
  test('double-clicking pane does not create a note node', async () => {
    const { electronApp, window } = await launchApp()
    const clickPosition = { x: 340, y: 240 }

    try {
      await clearAndSeedWorkspace(window, [])

      const pane = window.locator('.workspace-canvas .react-flow__pane')
      await expect(pane).toBeVisible()

      await pane.dblclick({ position: clickPosition })
      await window.waitForTimeout(100)

      await expect(window.locator('.note-node')).toHaveCount(0)
    } finally {
      await electronApp.close()
    }
  })
})
