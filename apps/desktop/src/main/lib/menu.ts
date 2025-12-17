import { join } from "node:path";
import { app, type BrowserWindow, Menu } from "electron";
import { createWindow } from "lib/electron-app/factories/windows/create";
import { productName } from "~/package.json";
import { checkForUpdatesInteractive } from "./auto-updater";

export function createApplicationMenu(mainWindow: BrowserWindow) {
	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: "File",
			submenu: [
				{
					label: "New Window",
					accelerator: "CmdOrCtrl+Shift+N",
					click: () => {
						// Get the current window's bounds and offset the new window
						const bounds = mainWindow.getBounds();
						const offset = 30;
						const newWindow = createWindow({
							id: "main",
							title: productName,
							x: bounds.x + offset,
							y: bounds.y + offset,
							width: bounds.width,
							height: bounds.height,
							minWidth: 400,
							minHeight: 400,
							show: false,
							movable: true,
							resizable: true,
							alwaysOnTop: false,
							autoHideMenuBar: true,
							frame: false,
							titleBarStyle: "hidden",
							trafficLightPosition: { x: 16, y: 16 },
							webPreferences: {
								preload: join(__dirname, "../preload/index.js"),
								webviewTag: true,
							},
						});
						createApplicationMenu(newWindow);
						// Mark this as a fresh window so renderer shows StartView
						newWindow.webContents.on("did-finish-load", () => {
							newWindow.webContents.executeJavaScript(
								"window.__FRESH_WINDOW__ = true",
							);
							newWindow.show();
						});
					},
				},
				{ type: "separator" },
				{ role: "quit" },
			],
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" },
			],
		},
		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
		{
			label: "Window",
			submenu: [
				{ role: "minimize" },
				{ role: "zoom" },
				{ type: "separator" },
				{
					label: "Close Window",
					accelerator: "CmdOrCtrl+Shift+W",
					click: () => {
						mainWindow.close();
					},
				},
			],
		},
	];

	// Add About menu on macOS
	if (process.platform === "darwin") {
		template.unshift({
			label: app.name,
			submenu: [
				{ role: "about" },
				{
					label: "Check for Updates...",
					click: () => {
						checkForUpdatesInteractive();
					},
				},
				{ type: "separator" },
				{ role: "services" },
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit" },
			],
		});
	}

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}
