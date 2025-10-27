import { BrowserWindow } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { registerTerminalIPCs } from '../lib/terminal-ipcs'

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: displayName,
    width: 1200,
    height: 800,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // Register terminal IPC handlers
  const cleanupTerminal = registerTerminalIPCs(window)

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    window.show()
  })

  window.on('close', () => {
    // Clean up terminal processes
    cleanupTerminal()

    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  return window
}
