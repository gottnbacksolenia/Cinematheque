const { app, BrowserWindow, shell, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");

let mainWindow;
let server;

/** filename → absolute disk path, populated by renderer on each scan */
const filePathRegistry = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const PLAYER_PATHS = {
  vlc: [
    "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
    "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe",
  ],
  mpc: [
    "C:\\Program Files\\MPC-HC\\mpc-hc64.exe",
    "C:\\Program Files\\MPC-HC\\mpc-hc.exe",
    "C:\\Program Files (x86)\\MPC-HC\\mpc-hc.exe",
    "C:\\Program Files\\MPC-BE x64\\mpc-be64.exe",
    "C:\\Program Files (x86)\\MPC-BE\\mpc-be.exe",
  ],
  potplayer: [
    "C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe",
    "C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe",
    "C:\\Program Files\\PotPlayer\\PotPlayerMini64.exe",
  ],
};

function getAppDir() {
  return __dirname;
}

function getFoldersFilePath() {
  return path.join(app.getPath("userData"), "folders.json");
}

function findFileInFolders(fileName) {
  try {
    const foldersFile = getFoldersFilePath();
    if (!fs.existsSync(foldersFile)) return null;
    const folders = JSON.parse(fs.readFileSync(foldersFile, "utf8"));
    for (const folderPath of folders) {
      const candidate = path.join(folderPath, fileName);
      if (fs.existsSync(candidate)) return candidate;
      // Search recursively one level deep
      try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subCandidate = path.join(folderPath, entry.name, fileName);
            if (fs.existsSync(subCandidate)) return subCandidate;
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

async function findFreePort(start = 9234) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(start, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", () => resolve(findFreePort(start + 1)));
  });
}

function startServer(appDir, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let urlPath = req.url.split("?")[0].split("#")[0];
      if (urlPath === "/") urlPath = "/index.html";

      const fullPath = path.join(appDir, urlPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mime = MIME[ext] || "application/octet-stream";

      try {
        const data = fs.readFileSync(fullPath);
        res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
        res.end(data);
      } catch {
        try {
          const html = fs.readFileSync(path.join(appDir, "index.html"));
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        } catch {
          res.writeHead(404);
          res.end("Not found");
        }
      }
    });

    srv.listen(port, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
}

ipcMain.on("register-file-path", (_event, { fileUrl, filePath }) => {
  if (fileUrl && filePath) {
    filePathRegistry.set(fileUrl, filePath);
  }
});

ipcMain.handle("get-file-path", (_event, { fileUrl }) => {
  return filePathRegistry.get(fileUrl) ?? null;
});

ipcMain.handle("save-folder-paths", (_event, paths) => {
  try {
    const foldersFile = getFoldersFilePath();
    fs.writeFileSync(foldersFile, JSON.stringify(paths || []), "utf8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("get-folder-paths", (_event) => {
  try {
    const foldersFile = getFoldersFilePath();
    if (!fs.existsSync(foldersFile)) return [];
    const data = fs.readFileSync(foldersFile, "utf8");
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
});

ipcMain.handle("resolve-file-path", (_event, folder, filename) => {
  try {
    const candidate = path.join(folder, filename);
    if (fs.existsSync(candidate)) return candidate;
  } catch {}
  return null;
});

ipcMain.handle("open-in-player", async (_event, { filePath, fileName, playerKey }) => {
  let resolvedPath = filePath;

  if (!resolvedPath && fileName) {
    resolvedPath = findFileInFolders(fileName);
  }

  if (!resolvedPath) {
    return { success: false, error: "Disk yolu bulunamadı" };
  }

  if (playerKey === "default" || !PLAYER_PATHS[playerKey]) {
    const err = await shell.openPath(resolvedPath);
    return { success: !err, error: err || null };
  }

  const paths = PLAYER_PATHS[playerKey];
  for (const playerExe of paths) {
    if (fs.existsSync(playerExe)) {
      spawn(playerExe, [resolvedPath], { detached: true, stdio: "ignore" }).unref();
      return { success: true };
    }
  }

  const err = await shell.openPath(resolvedPath);
  return { success: !err, fallback: true, error: err || null };
});

async function createWindow() {
  const appDir = getAppDir();
  const port = await findFreePort();
  server = await startServer(appDir, port);

  const preloadPath = path.join(__dirname, "preload.js");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Cinémathèque",
    backgroundColor: "#0a0a0f",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (server) server.close();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
