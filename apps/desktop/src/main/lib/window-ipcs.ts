import { BrowserWindow, ipcMain } from "electron";

/**
 * Register window-related IPC handlers
 */
export function registerWindowHandlers() {
	ipcMain.handle("window-get-id", (event) => {
		const window = BrowserWindow.fromWebContents(event.sender);
		if (!window) {
			throw new Error("Could not determine window from IPC sender");
		}
		return String(window.id);
	});

	ipcMain.handle(
		"window-focus",
		(_event, input: { windowId: string }): { success: boolean } => {
			const windowId = Number.parseInt(input.windowId, 10);
			const allWindows = BrowserWindow.getAllWindows();
			const targetWindow = allWindows.find((w) => w.id === windowId);

			if (!targetWindow) {
				return { success: false };
			}

			// Restore if minimized, then focus
			if (targetWindow.isMinimized()) {
				targetWindow.restore();
			}
			targetWindow.focus();

			return { success: true };
		},
	);
}
