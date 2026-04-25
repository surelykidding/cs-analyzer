import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import type { FSWatcher } from 'chokidar';
import { watch } from 'chokidar';
import { DemoSource } from 'csdm/common/types/counter-strike';
import {
  FaceitScoutingSessionStatus,
  FaceitScoutingTargetStatus,
  type StartFaceitScoutingSessionPayload,
} from 'csdm/common/types/faceit-scouting';
import { db } from 'csdm/node/database/database';
import { deleteDemos as deleteOrphanDemos } from 'csdm/node/database/demos/delete-demos';
import { deleteFaceitScoutingSession } from 'csdm/node/database/faceit-scouting/delete-faceit-scouting-session';
import { fetchCurrentFaceitScoutingSession } from 'csdm/node/database/faceit-scouting/fetch-current-faceit-scouting-session';
import { fetchFaceitScoutingSession } from 'csdm/node/database/faceit-scouting/fetch-faceit-scouting-session';
import { deleteMatchesByChecksums } from 'csdm/node/database/matches/delete-matches-by-checksums';
import { discoverFaceitScoutingTargets } from 'csdm/node/faceit/discover-faceit-scouting-targets';
import { getFaceitApiKey } from 'csdm/node/faceit-web-api/get-faceit-api-key';
import { getSettings } from 'csdm/node/settings/get-settings';
import { fetchCurrentFaceitAccount } from 'csdm/node/database/faceit-account/fetch-current-faceit-account';
import {
  detectDemoArchiveFormatFromFile,
  extractDemoArchiveToFile,
  getEmbeddedDemoEntryName,
  isCompressedDemoArchiveFormat,
} from 'csdm/node/demo-archive/demo-archive';
import {
  DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS,
  MAX_CONCURRENT_ANALYSES,
} from 'csdm/common/analyses';
import { RendererServerMessageName } from './renderer-server-message-name';
import { server } from './server';
import { processScoutingImportedDemo } from './process-scouting-imported-demo';

function buildTargetOutputFolderPath(sessionId: string, faceitMatchId: string) {
  return path.join(os.tmpdir(), 'cs-demo-manager', 'faceit-scouting', sessionId, faceitMatchId);
}

function getFileNameWithoutKnownArchiveExtensions(fileName: string) {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('.dem.gz')) {
    return fileName.slice(0, -'.dem.gz'.length);
  }

  if (lowerFileName.endsWith('.dem.bz2')) {
    return fileName.slice(0, -'.dem.bz2'.length);
  }

  if (lowerFileName.endsWith('.dem.zst')) {
    return fileName.slice(0, -'.dem.zst'.length);
  }

  if (lowerFileName.endsWith('.zip')) {
    return fileName.slice(0, -'.zip'.length);
  }

  if (lowerFileName.endsWith('.gz')) {
    return fileName.slice(0, -'.gz'.length);
  }

  if (lowerFileName.endsWith('.bz2')) {
    return fileName.slice(0, -'.bz2'.length);
  }

  if (lowerFileName.endsWith('.zst')) {
    return fileName.slice(0, -'.zst'.length);
  }

  if (lowerFileName.endsWith('.dem')) {
    return fileName.slice(0, -'.dem'.length);
  }

  return fileName;
}

function getNormalizedDownloadNameCandidates(filePath: string, embeddedEntryName: string | null) {
  const candidates = [path.basename(filePath)];
  if (embeddedEntryName !== null && embeddedEntryName !== '') {
    candidates.push(path.basename(embeddedEntryName));
  }

  return [...new Set(candidates.map((candidate) => getFileNameWithoutKnownArchiveExtensions(candidate).toLowerCase()))];
}

async function buildExtractedDemoPath(filePath: string, embeddedEntryName: string | null) {
  const directoryPath = path.dirname(filePath);
  const archiveFormat = await detectDemoArchiveFormatFromFile(filePath);
  if (!isCompressedDemoArchiveFormat(archiveFormat)) {
    return filePath;
  }

  const baseName =
    embeddedEntryName !== null && embeddedEntryName !== ''
      ? path.basename(embeddedEntryName)
      : path.basename(filePath);
  const extractedBaseName = getFileNameWithoutKnownArchiveExtensions(baseName);

  let candidatePath = path.join(directoryPath, `${extractedBaseName}.dem`);
  if (!(await fs.pathExists(candidatePath))) {
    return candidatePath;
  }

  let index = 1;
  while (true) {
    candidatePath = path.join(directoryPath, `${extractedBaseName}-${index}.dem`);
    if (!(await fs.pathExists(candidatePath))) {
      return candidatePath;
    }
    index += 1;
  }
}

async function deleteOwnedFile(filePath: string) {
  await fs.remove(filePath);

  if (filePath.toLowerCase().endsWith('.dem')) {
    await fs.remove(`${filePath}.info`);
    await fs.remove(`${filePath}.vdm`);
  }
}

function shouldIgnoreDownloadFile(filePath: string) {
  const fileName = path.basename(filePath).toLowerCase();

  return fileName.endsWith('.crdownload') || fileName.endsWith('.part');
}

function normalizeFilePathForComparison(filePath: string | null) {
  return filePath === null ? null : path.normalize(filePath).toLowerCase();
}

function canRetryErroredTarget(
  target: {
    status: FaceitScoutingTargetStatus;
    ownedArchiveFilePath: string | null;
    ownedDownloadFilePath: string | null;
    demoFilePath: string | null;
  },
  filePath: string,
) {
  if (target.status !== FaceitScoutingTargetStatus.Error) {
    return false;
  }

  const normalizedFilePath = normalizeFilePathForComparison(filePath);

  return ![
    normalizeFilePathForComparison(target.ownedArchiveFilePath),
    normalizeFilePathForComparison(target.ownedDownloadFilePath),
    normalizeFilePathForComparison(target.demoFilePath),
  ].includes(normalizedFilePath);
}

function shouldDeleteTargetDemoFile(target: {
  demoFilePath: string | null;
  ownedDownloadFilePath: string | null;
  ownedArchiveFilePath: string | null;
  ownsDatabaseMatch: boolean;
}) {
  return (
    target.demoFilePath !== null &&
    (target.ownsDatabaseMatch || target.ownedDownloadFilePath !== null || target.ownedArchiveFilePath !== null)
  );
}

class FaceitScoutingSessionManager {
  private watcher: FSWatcher | null = null;
  private watchedFolderPath: string | null = null;
  private queuedFilePaths = new Set<string>();
  private activeQueueWorkerCount = 0;
  private processingTargetIds = new Set<number>();

  public fetchCurrentSession = async () => {
    const recoveredInterruptedTargets = await this.recoverInterruptedProcessingTargets();
    await this.ensureWatcherForCurrentSession(!recoveredInterruptedTargets);

    return fetchCurrentFaceitScoutingSession();
  };

  public startSession = async ({ matchIdOrUrl }: StartFaceitScoutingSessionPayload) => {
    const existingSession = await fetchCurrentFaceitScoutingSession();
    if (existingSession !== undefined) {
      throw new Error('Delete the current scouting session before starting a new one.');
    }

    const currentAccount = await fetchCurrentFaceitAccount();
    if (currentAccount === undefined) {
      throw new Error('A current FACEIT account is required.');
    }

    const apiKey = await getFaceitApiKey();
    if (apiKey === '') {
      throw new Error('A FACEIT API key is required.');
    }

    const discovery = await discoverFaceitScoutingTargets({
      apiKey,
      currentAccountId: currentAccount.id,
      matchIdOrUrl,
    });

    const sessionRow = await db
      .insertInto('faceit_scouting_sessions')
      .values({
        status: FaceitScoutingSessionStatus.AwaitingDownloads,
        source_match_id: discovery.sourceMatch.id,
        source_match_url: discovery.sourceMatch.url,
        map_name: discovery.sourceMatch.mapName,
        our_team_name: discovery.sourceMatch.ourTeamName,
        opponent_team_name: discovery.sourceMatch.opponentTeamName,
        our_team_score: discovery.sourceMatch.ourTeamScore,
        opponent_team_score: discovery.sourceMatch.opponentTeamScore,
        current_faceit_account_id: currentAccount.id,
        current_faceit_account_nickname: currentAccount.nickname,
        opponent_faceit_player_ids_json: JSON.stringify(discovery.opponentFaceitPlayerIds),
        opponent_steam_ids_json: JSON.stringify(discovery.opponentSteamIds),
        error_message: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('faceit_scouting_targets')
      .values(
        discovery.targets.map((target, index) => {
          return {
            session_id: sessionRow.id,
            sequence: index,
            faceit_match_id: target.faceitMatchId,
            faceit_match_url: target.url,
            map_name: target.mapName,
            status: FaceitScoutingTargetStatus.AwaitingDownload,
            failure_message: null,
            local_team_name: null,
            demo_checksum: null,
            demo_file_path: null,
            owns_database_match: false,
            owned_download_file_path: null,
            owned_archive_file_path: null,
            resource_url_available: target.resourceUrlAvailable,
            roster_overlap_count: target.rosterOverlapCount,
            shared_history_player_count: target.sharedHistoryPlayerCount,
          };
        }),
      )
      .execute();

    await this.ensureWatcherForCurrentSession(true);

    return fetchFaceitScoutingSession(sessionRow.id);
  };

  public deleteSession = async (sessionId: string) => {
    await this.recoverInterruptedProcessingTargets(sessionId);

    const session = await fetchFaceitScoutingSession(sessionId);
    if (session === undefined) {
      return;
    }

    if (session.targets.some((target) => target.status === FaceitScoutingTargetStatus.Processing)) {
      throw new Error('Wait for the current demo import to finish before deleting the scouting session.');
    }

    await db
      .updateTable('faceit_scouting_sessions')
      .set({
        status: FaceitScoutingSessionStatus.Deleting,
        error_message: null,
        updated_at: new Date(),
      })
      .where('id', '=', sessionId)
      .execute();
    await this.emitSessionUpdate(sessionId);

    try {
      const ownedChecksums = [...new Set(
        session.targets
          .filter((target) => target.ownsDatabaseMatch && target.demoChecksum !== null)
          .map((target) => target.demoChecksum as string),
      )];
      if (ownedChecksums.length > 0) {
        await deleteMatchesByChecksums(ownedChecksums);
        await deleteOrphanDemos();
      }

      const ownedFilePaths = [
        ...new Set(
          session.targets.flatMap((target) => {
            const filePaths = [target.ownedArchiveFilePath, target.ownedDownloadFilePath];
            if (shouldDeleteTargetDemoFile(target)) {
              filePaths.push(target.demoFilePath);
            }

            return filePaths.filter((filePath) => filePath !== null);
          }),
        ),
      ] as string[];
      for (const filePath of ownedFilePaths) {
        await deleteOwnedFile(filePath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db
        .updateTable('faceit_scouting_sessions')
        .set({
          status: FaceitScoutingSessionStatus.Error,
          error_message: errorMessage,
          updated_at: new Date(),
        })
        .where('id', '=', sessionId)
        .execute();
      await this.emitSessionUpdate(sessionId);
      throw error;
    }

    await deleteFaceitScoutingSession(sessionId);
    await this.stopWatcher();
    this.processingTargetIds.clear();
    this.queuedFilePaths.clear();
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.FaceitScoutingSessionUpdated,
      payload: undefined,
    });
  };

  private ensureWatcherForCurrentSession = async (shouldRescan: boolean) => {
    const session = await fetchCurrentFaceitScoutingSession();
    if (session === undefined) {
      await this.stopWatcher();
      return;
    }

    const settings = await getSettings();
    const downloadFolderPath = settings.download.folderPath;
    if (downloadFolderPath === undefined || downloadFolderPath === '') {
      await this.stopWatcher();
      return;
    }

    if (this.watcher === null || this.watchedFolderPath !== downloadFolderPath) {
      await this.stopWatcher();
      this.watcher = watch(downloadFolderPath, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 1500,
          pollInterval: 100,
        },
      });
      this.watchedFolderPath = downloadFolderPath;
      this.watcher.on('add', this.onFileAdded);
      this.watcher.on('change', this.onFileAdded);
    }

    if (shouldRescan) {
      void this.rescanCurrentDownloadFolder(downloadFolderPath);
    }
  };

  private stopWatcher = async () => {
    await this.watcher?.close();
    this.watcher = null;
    this.watchedFolderPath = null;
  };

  private recoverInterruptedProcessingTargets = async (sessionId?: string) => {
    let query = db
      .selectFrom('faceit_scouting_targets')
      .select(['id', 'session_id as sessionId'])
      .where('status', '=', FaceitScoutingTargetStatus.Processing);
    if (sessionId !== undefined) {
      query = query.where('session_id', '=', sessionId);
    }

    const processingTargets = await query.execute();
    const interruptedTargets = processingTargets.filter((target) => {
      return !this.processingTargetIds.has(target.id);
    });
    if (interruptedTargets.length === 0) {
      return false;
    }

    const interruptedTargetIds = interruptedTargets.map((target) => target.id);
    await db
      .updateTable('faceit_scouting_targets')
      .set({
        status: FaceitScoutingTargetStatus.Error,
        failure_message: 'Demo processing was interrupted. You can delete this scouting session or re-download the demo to retry.',
      })
      .where('id', 'in', interruptedTargetIds)
      .execute();

    const sessionIds = [...new Set(interruptedTargets.map((target) => target.sessionId))];
    for (const sessionId of sessionIds) {
      await this.updateSessionStatusFromTargets(sessionId);
      await this.emitSessionUpdate(sessionId);
    }

    return true;
  };

  private onFileAdded = (filePath: string) => {
    this.queuedFilePaths.add(filePath);
    void this.startQueueWorkers();
  };

  private getMaxConcurrentProcessingCount = async () => {
    const settings = await getSettings();
    const maxConcurrentAnalyses = Math.min(
      MAX_CONCURRENT_ANALYSES,
      settings.analyze.maxConcurrentAnalyses ?? MAX_CONCURRENT_ANALYSES / 2,
    );
    const maxConcurrentTacticsPositionGenerations =
      settings.analyze.maxConcurrentTacticsPositionGenerations ?? DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS;

    return Math.max(1, Math.min(maxConcurrentAnalyses, maxConcurrentTacticsPositionGenerations));
  };

  private startQueueWorkers = async () => {
    const maxConcurrentProcessingCount = await this.getMaxConcurrentProcessingCount();

    while (
      this.activeQueueWorkerCount < maxConcurrentProcessingCount &&
      this.queuedFilePaths.size > 0
    ) {
      this.activeQueueWorkerCount += 1;
      void this.processQueueWorker();
    }
  };

  private processQueueWorker = async () => {
    try {
      while (this.queuedFilePaths.size > 0) {
        const [filePath] = this.queuedFilePaths;
        if (filePath === undefined) {
          break;
        }

        this.queuedFilePaths.delete(filePath);
        try {
          await this.processDownloadedFile(filePath);
        } catch (error) {
          logger.error('Error while processing FACEIT scouting download');
          logger.error(error);
        }
      }
    } finally {
      this.activeQueueWorkerCount = Math.max(0, this.activeQueueWorkerCount - 1);
      if (this.queuedFilePaths.size > 0) {
        void this.startQueueWorkers();
      }
    }
  };

  private processDownloadedFile = async (filePath: string) => {
    if (shouldIgnoreDownloadFile(filePath)) {
      return;
    }

    const session = await fetchCurrentFaceitScoutingSession();
    if (session === undefined) {
      return;
    }

    const archiveFormat = await detectDemoArchiveFormatFromFile(filePath);
    const embeddedEntryName = isCompressedDemoArchiveFormat(archiveFormat)
      ? await getEmbeddedDemoEntryName(filePath, archiveFormat)
      : null;
    const fileNameCandidates = getNormalizedDownloadNameCandidates(filePath, embeddedEntryName);
    const target = session.targets.find((target) => {
      return (
        (target.status === FaceitScoutingTargetStatus.AwaitingDownload ||
          canRetryErroredTarget(target, filePath)) &&
        fileNameCandidates.some((fileName) => fileName.includes(target.faceitMatchId.toLowerCase()))
      );
    });
    if (target === undefined || this.processingTargetIds.has(target.id)) {
      return;
    }

    this.processingTargetIds.add(target.id);
    let ownedArchiveFilePath: string | null = null;
    let ownedDownloadFilePath: string | null = null;
    let demoFilePath: string | null = null;
    try {
      await db
        .updateTable('faceit_scouting_targets')
        .set({
          status: FaceitScoutingTargetStatus.Processing,
          failure_message: null,
        })
        .where('id', '=', target.id)
        .execute();
      await this.updateSessionStatusFromTargets(session.id);
      await this.emitSessionUpdate(session.id);

      const sessionRow = await db
        .selectFrom('faceit_scouting_sessions')
        .selectAll()
        .where('id', '=', session.id)
        .executeTakeFirstOrThrow();
      const opponentSteamIds: string[] = JSON.parse(sessionRow.opponent_steam_ids_json);
      demoFilePath = filePath;
      if (isCompressedDemoArchiveFormat(archiveFormat)) {
        const extractedDemoPath = await buildExtractedDemoPath(filePath, embeddedEntryName);
        await extractDemoArchiveToFile(filePath, extractedDemoPath, archiveFormat);
        demoFilePath = extractedDemoPath;
        ownedDownloadFilePath = extractedDemoPath;
        ownedArchiveFilePath = filePath;
      } else {
        ownedDownloadFilePath = filePath;
      }

      const result = await processScoutingImportedDemo({
        demoPath: demoFilePath,
        outputFolderPath: buildTargetOutputFolderPath(session.id, target.faceitMatchId),
        source: DemoSource.FaceIt,
        resolveLocalTeamName: async (checksum) => {
          return this.resolveLocalTeamName(checksum, opponentSteamIds, session.sourceMatch.opponentTeamName);
        },
        onInsertionStart: () => {
          server.sendMessageToRendererProcess({
            name: RendererServerMessageName.InsertingMatchTacticsPositions,
          });
        },
      });

      await db
        .updateTable('faceit_scouting_targets')
        .set({
          status: FaceitScoutingTargetStatus.Ready,
          failure_message: null,
          local_team_name: result.localTeamName,
          demo_checksum: result.demoChecksum,
          demo_file_path: demoFilePath,
          owns_database_match: result.ownsDatabaseMatch,
          owned_download_file_path: ownedDownloadFilePath,
          owned_archive_file_path: ownedArchiveFilePath,
        })
        .where('id', '=', target.id)
        .execute();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db
        .updateTable('faceit_scouting_targets')
        .set({
          status: FaceitScoutingTargetStatus.Error,
          failure_message: errorMessage,
          demo_file_path: demoFilePath,
          owned_download_file_path: ownedDownloadFilePath,
          owned_archive_file_path: ownedArchiveFilePath,
        })
        .where('id', '=', target.id)
        .execute();
    } finally {
      this.processingTargetIds.delete(target.id);
      await this.updateSessionStatusFromTargets(session.id);
      await this.emitSessionUpdate(session.id);
    }
  };

  private updateSessionStatusFromTargets = async (sessionId: string) => {
    const targetRows = await db
      .selectFrom('faceit_scouting_targets')
      .select(['status'])
      .where('session_id', '=', sessionId)
      .execute();
    const hasReadyTargets = targetRows.some((target) => target.status === FaceitScoutingTargetStatus.Ready);
    const hasProcessingTargets = targetRows.some((target) => target.status === FaceitScoutingTargetStatus.Processing);
    const hasAwaitingTargets = targetRows.some((target) => target.status === FaceitScoutingTargetStatus.AwaitingDownload);
    let status: FaceitScoutingSessionStatus = FaceitScoutingSessionStatus.Error;
    if (hasProcessingTargets) {
      status = FaceitScoutingSessionStatus.Processing;
    } else if (hasReadyTargets) {
      status = FaceitScoutingSessionStatus.Ready;
    } else if (hasAwaitingTargets) {
      status = FaceitScoutingSessionStatus.AwaitingDownloads;
    }

    await db
      .updateTable('faceit_scouting_sessions')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', sessionId)
      .execute();
  };

  private emitSessionUpdate = async (sessionId: string) => {
    const session = await fetchFaceitScoutingSession(sessionId);
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.FaceitScoutingSessionUpdated,
      payload: session,
    });
  };

  private rescanCurrentDownloadFolder = async (downloadFolderPath: string) => {
    const downloadFolderExists = await fs.pathExists(downloadFolderPath);
    if (!downloadFolderExists) {
      return;
    }

    const entries = await fs.readdir(downloadFolderPath);
    for (const entry of entries) {
      const filePath = path.join(downloadFolderPath, entry);
      const stat = await fs.stat(filePath).catch(() => undefined);
      if (stat?.isFile()) {
        this.queuedFilePaths.add(filePath);
      }
    }

    if (this.queuedFilePaths.size > 0) {
      void this.startQueueWorkers();
    }
  };

  private resolveLocalTeamName = async (
    checksum: string,
    opponentSteamIds: string[],
    fallbackTeamName: string,
  ): Promise<string | null> => {
    const rows = await db
      .selectFrom('players')
      .select(['team_name as teamName', 'steam_id as steamId'])
      .where('match_checksum', '=', checksum)
      .execute();

    const steamIdSet = new Set(opponentSteamIds);
    const teamToOverlapCount = new Map<string, number>();
    for (const row of rows) {
      const currentCount = teamToOverlapCount.get(row.teamName) ?? 0;
      teamToOverlapCount.set(row.teamName, currentCount + (steamIdSet.has(row.steamId) ? 1 : 0));
    }

    const bestTeamEntry = [...teamToOverlapCount.entries()].sort((entryA, entryB) => entryB[1] - entryA[1])[0];
    if (bestTeamEntry !== undefined && bestTeamEntry[1] >= 2) {
      return bestTeamEntry[0];
    }

    const fallbackRow = rows.find((row) => row.teamName === fallbackTeamName);
    if (fallbackRow !== undefined) {
      return fallbackRow.teamName;
    }

    return null;
  };
}

export const faceitScoutingSessionManager = new FaceitScoutingSessionManager();
