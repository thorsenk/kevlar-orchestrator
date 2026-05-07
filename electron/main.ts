import {app, BrowserWindow, shell} from 'electron';
import path from 'node:path';
import {closeDB, getDB} from './db';
import {registerIpc} from './ipc';

app.setName('Kevlar Codex Desktop');

if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'Kevlar Codex Desktop',
    applicationVersion: app.getVersion(),
  });
}

registerIpc();

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  getDB();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: 'Kevlar Codex Desktop',
    backgroundColor: '#0f0f11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    void shell.openExternal(url);
    return {action: 'deny'};
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDB();
});
