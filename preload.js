const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  openInPlayer: (filePath, playerKey, fileName) =>
    ipcRenderer.invoke("open-in-player", { filePath, playerKey, fileName }),

  /** Register a fileUrl (blob URL) → disk path mapping so getFilePath can resolve it. */
  registerFilePath: (fileUrl, filePath) =>
    ipcRenderer.send("register-file-path", { fileUrl, filePath }),

  /** Resolve a fileUrl (blob URL) back to the original disk path. */
  getFilePath: (fileUrl) =>
    ipcRenderer.invoke("get-file-path", { fileUrl }),

  /** Save folder paths to persistent storage (userData/folders.json). */
  saveFolderPaths: (paths) =>
    ipcRenderer.invoke("save-folder-paths", paths),

  /** Get saved folder paths from persistent storage. */
  getFolderPaths: () =>
    ipcRenderer.invoke("get-folder-paths"),

  /** Resolve a file path given a folder path and filename. */
  resolveFilePath: (folder, filename) =>
    ipcRenderer.invoke("resolve-file-path", folder, filename),

  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_e, info) => cb(info)),
  openDownloadUrl: (url) => ipcRenderer.send("open-download-url", url),
});
