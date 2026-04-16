import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { Notification } from 'electron';
import { i18n } from '@lingui/core';
import { windowManager } from './window-manager';
import { IPCChannel } from 'csdm/common/ipc-channel';
import { isPrereleaseVersion } from 'csdm/common/branding';

autoUpdater.logger = {
  error: logger.error,
  info: logger.log,
  warn: logger.warn,
  debug: logger.log,
};
autoUpdater.disableWebInstaller = true;
autoUpdater.autoDownload = false;

export async function initialize(autoDownloadUpdates: boolean) {
  let lastDownloadedVersion: string | null = null;
  let isDownloading = false;
  let shouldDownloadUpdatesAutomatically = autoDownloadUpdates;
  const isPrerelease = isPrereleaseVersion(app.getVersion());

  ipcMain.removeHandler(IPCChannel.InstallUpdate);
  ipcMain.removeHandler(IPCChannel.HasUpdateReadyToInstall);
  ipcMain.removeHandler(IPCChannel.ToggleAutoUpdate);

  if (isPrerelease) {
    ipcMain.handle(IPCChannel.InstallUpdate, () => {});
    ipcMain.handle(IPCChannel.HasUpdateReadyToInstall, () => false);
    ipcMain.handle(IPCChannel.ToggleAutoUpdate, () => {});
    return;
  }

  ipcMain.handle(IPCChannel.InstallUpdate, () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle(IPCChannel.HasUpdateReadyToInstall, () => {
    return lastDownloadedVersion !== null;
  });

  ipcMain.handle(IPCChannel.ToggleAutoUpdate, (event, isEnabled: boolean) => {
    shouldDownloadUpdatesAutomatically = isEnabled;
  });

  autoUpdater.on('update-available', async (event) => {
    const isAlreadyDownloadedVersion = lastDownloadedVersion !== null && lastDownloadedVersion === event.version;
    if (isAlreadyDownloadedVersion) {
      return;
    }

    if (shouldDownloadUpdatesAutomatically) {
      isDownloading = true;
      await autoUpdater.downloadUpdate();
      return;
    }

    const notification = new Notification({
      title: i18n.t({
        id: 'notification.downloadAvailable.title',
        message: `A new update is available!`,
      }),
      body: i18n.t({
        id: 'notification.downloadAvailable.body',
        message: 'Click here to download it.',
      }),
    });
    notification.on('click', async () => {
      await autoUpdater.downloadUpdate();
    });
    notification.show();
  });

  autoUpdater.on('update-downloaded', (event) => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPCChannel.UpdateDownloaded);
    }

    lastDownloadedVersion = event.version;
    isDownloading = false;
  });

  const checkInterval = 1000 * 60 * 60 * 12; // 12 hours
  setInterval(async () => {
    if (!isDownloading) {
      await autoUpdater.checkForUpdates();
    }
  }, checkInterval);

  await autoUpdater.checkForUpdates();
}
