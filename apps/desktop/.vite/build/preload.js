"use strict";
const electron = require("electron");
const THEME_MODE_CURRENT_CHANNEL = "theme-mode:current";
const THEME_MODE_TOGGLE_CHANNEL = "theme-mode:toggle";
const THEME_MODE_DARK_CHANNEL = "theme-mode:dark";
const THEME_MODE_LIGHT_CHANNEL = "theme-mode:light";
const THEME_MODE_SYSTEM_CHANNEL = "theme-mode:system";
function exposeThemeContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("themeMode", {
    current: () => ipcRenderer.invoke(THEME_MODE_CURRENT_CHANNEL),
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
    dark: () => ipcRenderer.invoke(THEME_MODE_DARK_CHANNEL),
    light: () => ipcRenderer.invoke(THEME_MODE_LIGHT_CHANNEL),
    system: () => ipcRenderer.invoke(THEME_MODE_SYSTEM_CHANNEL)
  });
}
const WIN_MINIMIZE_CHANNEL = "window:minimize";
const WIN_MAXIMIZE_CHANNEL = "window:maximize";
const WIN_CLOSE_CHANNEL = "window:close";
function exposeWindowContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL)
  });
}
function exposeTerminalContext() {
  electron.contextBridge.exposeInMainWorld("terminal", {
    create: () => electron.ipcRenderer.invoke("terminal-create"),
    sendInput: (terminalId, data) => electron.ipcRenderer.send("terminal-input", terminalId, data),
    resize: (terminalId, cols, rows) => electron.ipcRenderer.send("terminal-resize", terminalId, cols, rows),
    executeCommand: (terminalId, command) => electron.ipcRenderer.send("terminal-execute-command", terminalId, command),
    kill: (terminalId) => electron.ipcRenderer.send("terminal-kill", terminalId),
    getHistory: (terminalId) => electron.ipcRenderer.invoke("terminal-get-history", terminalId),
    onData: (terminalId, callback) => {
      const subscription = (_, id, data) => {
        if (id === terminalId) {
          callback(data);
        }
      };
      electron.ipcRenderer.on("terminal-data", subscription);
      return () => {
        electron.ipcRenderer.removeListener("terminal-data", subscription);
      };
    }
  });
}
function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeTerminalContext();
}
exposeContexts();
