import fs from 'fs-extra';
import { pipeline } from 'node:stream';
import { Client, interceptors } from 'undici';
import path from 'node:path';
import util from 'node:util';
import { createDemoArchiveExtractStream, detectDemoArchiveFormat } from 'csdm/node/demo-archive/demo-archive';
import { assertDownloadFolderIsValid } from 'csdm/node/download/assert-download-folder-is-valid';
import { RendererServerMessageName } from 'csdm/server/renderer-server-message-name';
import { server } from 'csdm/server/server';
import { loadDemoByPath } from 'csdm/node/demo/load-demo-by-path';
import { getSettings } from 'csdm/node/settings/get-settings';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import type { Download, DownloadDemoProgressPayload, DownloadDemoSuccess } from 'csdm/common/download/download-types';
import { DownloadSource } from 'csdm/common/download/download-types';
import { MatchAlreadyInDownloadQueue } from 'csdm/node/download/errors/match-already-in-download-queue';
import { MatchAlreadyDownloaded } from 'csdm/node/download/errors/match-already-downloaded';
import { DownloadLinkExpired } from 'csdm/node/download/errors/download-link-expired';
import { isDownloadLinkExpired } from 'csdm/node/download/is-download-link-expired';
import { WriteDemoInfoFileError } from 'csdm/node/download/errors/write-info-file-error';
import { insertDownloadHistory } from 'csdm/node/database/download-history/insert-download-history';
import { InvalidDemoHeader } from 'csdm/node/demo/errors/invalid-demo-header';
import { insertDemos } from 'csdm/node/database/demos/insert-demos';
const streamPipeline = util.promisify(pipeline);
const MAX_CONCURRENT_DOWNLOADS = 2;

export type DownloadQueueEvent =
  | {
      type: 'success';
      payload: DownloadDemoSuccess;
    }
  | {
      type: 'expired';
      payload: {
        download: Download;
      };
    }
  | {
      type: 'error';
      payload: {
        download: Download;
      };
    }
  | {
      type: 'corrupted';
      payload: {
        download: Download;
      };
    };

type DownloadQueueListener = (event: DownloadQueueEvent) => void | Promise<void>;

class DownloadDemoQueue {
  private downloads: Download[] = [];
  private activeDownloads = new Map<string, Download>();
  private abortControllersPerMatchId: { [matchId: string]: AbortController | undefined } = {};
  private listeners = new Set<DownloadQueueListener>();

  public addListener(listener: DownloadQueueListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public addDownload = async (download: Download) => {
    const downloadFolderPath = await this.getDownloadFolderPath();

    if (this.isMatchAlreadyInQueue(download.matchId)) {
      throw new MatchAlreadyInDownloadQueue();
    }

    if (await this.isMatchAlreadyDownloaded(downloadFolderPath, download)) {
      throw new MatchAlreadyDownloaded();
    }

    const downloadLinkExpired = await isDownloadLinkExpired(download.demoUrl);
    if (downloadLinkExpired) {
      throw new DownloadLinkExpired();
    }

    this.downloads.push(download);

    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.DownloadsAdded,
      payload: [download],
    });

    this.fillDownloadWorkers();
  };

  public addDownloads = async (downloads: Download[]) => {
    if (downloads.length === 0) {
      return [];
    }

    const downloadFolderPath = await this.getDownloadFolderPath();

    const knownMatchIds = new Set([
      ...this.downloads.map((download) => download.matchId),
      ...this.activeDownloads.keys(),
    ]);
    const validDownloads: Download[] = [];
    for (const download of downloads) {
      const isAlreadyInQueue = knownMatchIds.has(download.matchId);
      if (isAlreadyInQueue) {
        continue;
      }

      const isAlreadyDownloaded = await this.isMatchAlreadyDownloaded(downloadFolderPath, download);
      if (isAlreadyDownloaded) {
        continue;
      }

      const downloadLinkExpired = await isDownloadLinkExpired(download.demoUrl);
      if (downloadLinkExpired) {
        continue;
      }

      validDownloads.push(download);
      knownMatchIds.add(download.matchId);
    }

    if (validDownloads.length === 0) {
      return [];
    }

    this.downloads.push(...validDownloads);

    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.DownloadsAdded,
      payload: validDownloads,
    });

    this.fillDownloadWorkers();

    return validDownloads;
  };

  public getDownloads = () => {
    return [...this.downloads, ...this.activeDownloads.values()];
  };

  public abortDownload(matchId: string) {
    const controller = this.abortControllersPerMatchId[matchId];
    if (controller !== undefined) {
      controller.abort();
    }

    this.abortControllersPerMatchId[matchId] = undefined;
    this.downloads = this.downloads.filter((download) => download.matchId !== matchId);
    this.activeDownloads.delete(matchId);
    this.fillDownloadWorkers();
  }

  public abortDownloads() {
    for (const controller of Object.values(this.abortControllersPerMatchId)) {
      controller?.abort();
    }

    this.abortControllersPerMatchId = {};
    this.downloads = [];
    this.activeDownloads.clear();
  }

  private fillDownloadWorkers() {
    while (this.downloads.length > 0 && this.activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
      const nextDownload = this.downloads.shift();
      if (nextDownload === undefined) {
        break;
      }

      this.activeDownloads.set(nextDownload.matchId, nextDownload);
      void this.processDownload(nextDownload);
    }
  }

  private readonly processDownload = async (currentDownload: Download) => {
    let demoPath = '';
    let infoPath = '';

    try {
      if (!currentDownload.demoUrl) {
        return;
      }

      const downloadFolderPath = await this.getDownloadFolderPath();
      const controller = new AbortController();
      this.abortControllersPerMatchId[currentDownload.matchId] = controller;

      demoPath = this.buildDemoPath(downloadFolderPath, currentDownload.fileName);
      infoPath = this.buildDemoInfoFilePath(demoPath);
      const url = new URL(currentDownload.demoUrl);
      const client = new Client(url.origin).compose(interceptors.redirect({ maxRedirections: 1 }));
      const response = await client.request({
        path: url.pathname,
        signal: controller.signal,
        method: 'GET',
      });
      if (response.statusCode === 404) {
        server.sendMessageToRendererProcess({
          name: RendererServerMessageName.DownloadDemoExpired,
          payload: currentDownload.matchId,
        });
        this.emit({
          type: 'expired',
          payload: {
            download: currentDownload,
          },
        });
        return;
      }

      if (!response.body) {
        throw new Error('Error on request');
      }

      let receivedBytes = 0;
      let totalBytes = 1;

      const contentLength = response.headers['content-length'] as string;
      if (contentLength !== null) {
        totalBytes = Number.parseInt(contentLength, 10);
      }

      let currentProgress = 0;
      response.body.on('data', (chunk) => {
        receivedBytes += chunk.length;
        const progress = receivedBytes / totalBytes;
        // Send progress messages only every 1% to reduce messages
        if (progress - currentProgress >= 0.01 || progress === 1) {
          const payload: DownloadDemoProgressPayload = {
            matchId: currentDownload.matchId,
            progress,
          };
          server.sendMessageToRendererProcess({
            name: RendererServerMessageName.DownloadDemoProgress,
            payload,
          });
          currentProgress = progress;
        }
      });

      const out = fs.createWriteStream(demoPath);
      const { demoUrl } = currentDownload;
      const contentTypeHeader = response.headers['content-type'];
      const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader ?? null;
      const archiveFormat = detectDemoArchiveFormat(demoUrl, contentType);
      if (archiveFormat === null) {
        throw new Error('Unsupported demo archive');
      }
      const transformStream = createDemoArchiveExtractStream(archiveFormat);

      await streamPipeline(response.body, transformStream, out);
      if (currentDownload.source === DownloadSource.Valve) {
        const { protobufBytes } = currentDownload.match;
        if (protobufBytes !== undefined) {
          await this.writeMatchInfoFile(protobufBytes, infoPath);
        }
      }

      const demo = await getDemoFromFilePath(demoPath);
      demo.source = currentDownload.source;
      // for non-Valve demos, we update the demo's date with the one coming from the third-party API and insert it into
      // the database so that the date will be more accurate.
      // for Valve demos, the date is retrieved from the proto .info file.
      if (currentDownload.source !== DownloadSource.Valve) {
        demo.date = currentDownload.match.date;
        await insertDemos([demo]);
      }
      await insertDownloadHistory(currentDownload.matchId);

      server.sendMessageToRendererProcess({
        name: RendererServerMessageName.DownloadDemoSuccess,
        payload: {
          demoChecksum: demo.checksum,
          demoFilePath: demoPath,
          download: currentDownload,
        },
      });
      this.emit({
        type: 'success',
        payload: {
          demoChecksum: demo.checksum,
          demoFilePath: demoPath,
          download: currentDownload,
        },
      });

      const settings = await getSettings();
      const currentDemosFolderPath = settings.demos.currentFolderPath;
      if (currentDemosFolderPath === downloadFolderPath) {
        await this.loadDownloadedDemo(demoPath);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error(error);
        server.sendMessageToRendererProcess({
          name: RendererServerMessageName.DownloadDemoError,
          payload: currentDownload.matchId,
        });
        this.emit({
          type: 'error',
          payload: {
            download: currentDownload,
          },
        });
      }
      if (error instanceof InvalidDemoHeader) {
        logger.error('Invalid demo header from downloaded demo');
        logger.error(error);
        server.sendMessageToRendererProcess({
          name: RendererServerMessageName.DownloadDemoCorrupted,
          payload: currentDownload.matchId,
        });
        this.emit({
          type: 'corrupted',
          payload: {
            download: currentDownload,
          },
        });
      }
      if (demoPath !== '') {
        await fs.remove(demoPath);
      }
      if (infoPath !== '') {
        await fs.remove(infoPath);
      }
    } finally {
      this.activeDownloads.delete(currentDownload.matchId);
      delete this.abortControllersPerMatchId[currentDownload.matchId];
      this.fillDownloadWorkers();
    }
  };

  private writeMatchInfoFile = async (protobufBytes: Uint8Array, infoFilePath: string) => {
    try {
      // ! Sending an Uint8Array through WebSocket with JSON.stringify() becomes an object.
      // ! The Uint8Array creation is important to write a valid binary file, TS is not aware of this transformation.
      const bytes = new Uint8Array(Object.values(protobufBytes));
      await fs.writeFile(infoFilePath, bytes);
    } catch (error) {
      logger.error('Error while writing .info file');
      logger.error(error);
      throw new WriteDemoInfoFileError();
    }
  };

  private async getDownloadFolderPath() {
    await assertDownloadFolderIsValid();
    const settings = await getSettings();
    const downloadFolderPath = settings.download.folderPath;

    return downloadFolderPath as string;
  }

  private isMatchAlreadyInQueue(matchId: string): boolean {
    return (
      this.activeDownloads.has(matchId) ||
      this.downloads.some((download) => {
        return download.matchId === matchId;
      })
    );
  }

  private isMatchAlreadyDownloaded = async (downloadFolderPath: string, download: Download) => {
    const demoPath = this.buildDemoPath(downloadFolderPath, download.fileName);
    const demoFileExists = await fs.pathExists(demoPath);
    if (!demoFileExists) {
      return false;
    }

    if (download.source === DownloadSource.Valve) {
      const infoPath = this.buildDemoInfoFilePath(demoPath);
      const infoFileExists = await fs.pathExists(infoPath);

      return infoFileExists;
    }

    return true;
  };

  private buildDemoPath(downloadFolderPath: string, fileName: string) {
    const demoPath = path.join(downloadFolderPath, `${fileName}.dem`);

    return demoPath;
  }

  private buildDemoInfoFilePath(demoPath: string) {
    return `${demoPath}.info`;
  }

  private emit(event: DownloadQueueEvent) {
    for (const listener of this.listeners) {
      void Promise.resolve(listener(event)).catch((error) => {
        logger.error('Error while handling download queue event');
        logger.error(error);
      });
    }
  }

  private loadDownloadedDemo = async (demoPath: string) => {
    try {
      const demo = await loadDemoByPath(demoPath);
      server.sendMessageToRendererProcess({
        name: RendererServerMessageName.DownloadDemoInCurrentFolderLoaded,
        payload: demo,
      });
    } catch (error) {
      logger.error('Error while loading downloaded demo');
      logger.error(error);
    }
  };
}

export const downloadDemoQueue = new DownloadDemoQueue();
