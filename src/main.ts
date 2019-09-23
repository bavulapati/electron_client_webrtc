// Copyright © 2018 IDrive Inc, all rights reserved.

import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { revertResolutionChange } from './changeResolutionForSessionIfRequired';
import { logger } from './logger';

const pidPath: string = path.join(os.homedir(), 'remotepc.pid');
logger.info(`pidPath: ${pidPath}`);
// tslint:disable-next-line: non-literal-fs-path
fs.writeFile(pidPath, process.pid, (err: NodeJS.ErrnoException | null): void => {
  if (err !== null) {
    logger.error('failed to write process id');
  } else {
    logger.info(`written the remotepc process id to ${pidPath}`);
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received.');
  revertResolutionChange();
  fs.truncateSync(pidPath);
  process.exit(0);
});

let hostWindow: Electron.BrowserWindow;
// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance(): void {
  const gotTheLock: boolean = app.requestSingleInstanceLock();

  logger.debug('got the lock: ', gotTheLock);

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event: Electron.Event, commandLine: string[], workingDirectory: string) => {
      // Someone tried to run a second instance, we should focus our window.
      if (hostWindow !== undefined) {
        hostWindow.show();
      }
    });
  }
}

makeSingleInstance();

function createHostWindow(): void {
  logger.debug('Creating Login window');
  // Create the browser window.
  hostWindow = new BrowserWindow({
    frame: true,
    fullscreenable: true,
    height: 580,
    maximizable: true,
    minHeight: 580,
    minWidth: 820,
    resizable: true,
    show: false,
    // useContentSize: true,
    width: 820
  });

  // loading index.html
  hostWindow.loadFile(path.join(__dirname, '../html/index.html'));

  // Open the DevTools.
  // hostWindow.webContents.openDevTools();

  // hostWindow.on('close', (event: Electron.Event) => {
  //   event.preventDefault();
  //   minimizeHostWindow();
  // });

  // Emitted when the window is closed.
  hostWindow.on('closed', () => {
    logger.debug('Closing Login window');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    // mainWindow = null;
  });
}

// function minimizeHostWindow(): void {
//   if (hostWindow !== undefined) {
//     logger.debug('minimizing the host Window');
//     hostWindow.minimize();
//   }
// }

ipcMain.on('show-main-window', () => {
  logger.info('received show-main-window ipc');
  if (hostWindow !== undefined) {
    hostWindow.show();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => { createHostWindow(); });

app.on('window-all-closed', () => {
  logger.debug('All windows closed');
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  logger.debug('App is active');
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (hostWindow === null) {
    logger.debug('There is no main window');
    createHostWindow();
  }
});

app.on('before-quit', () => {
  logger.info('quitting the app');
  fs.truncateSync(pidPath);
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
