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
import { generateMatchTacticsPositions } from 'csdm/node/database/matches/generate-match-tactics-positions';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import { analyzeDemo } from 'csdm/node/demo/analyze-demo';
import { CorruptedDemoError } from 'csdm/node/demo-analyzer/corrupted-demo-error';
import { discoverFaceitScoutingTargets } from 'csdm/node/faceit/discover-faceit-scouting-targets';
import { getFaceitApiKey } from 'csdm/node/faceit-web-api/get-faceit-api-key';
import { getSettings } from 'csdm/node/settings/get-settings';
import { fetchCurrentFaceitAccount } from 'csdm/node/database/faceit-account/fetch-current-faceit-account';
import { processMatchInsertion } from 'csdm/node/database/matches/process-match-insertion';
import {
  detectDemoArchiveFormat,
  extractDemoArchiveToFile,
  isPotentialDemoDownloadPath,
} from 'csdm/node/demo-archive/demo-archive';
import { RendererServerMessageName } from './renderer-server-message-name';
import { server } from './server';
import { runTacticsPositionsTask } from './tactics-positions-task-runner';

function buildTargetOutputFolderPath(sessionId: string, faceitMatchId: string) {
  return path.join(os.tmpdir(), 'cs-demo-manager', 'faceit-scouting', sessionId, faceitMatchId);
}

async function buildExtractedDemoPath(filePath: string) {
  const directoryPath = path.dirname(filePath);
  const archiveFormat = detectDemoArchiveFormat(filePath);
  if (archiveFormat === null) {
    return filePath;
  }

  let baseName = path.parse(filePath).name;
  if (baseName.toLowerCase().endsWith('.dem')) {
    let candidatePath = path.join(directoryPath, baseName);
    if (!(await fs.pathExists(candidatePath))) {
      return candidatePath;
    }

    let index = 1;
    while (true) {
      candidatePath = path.join(directoryPath, `${path.parse(baseName).name}-${index}.dem`);
      if (!(await fs.pathExists(candidatePath))) {
        return candidatePath;
      }
      index += 1;
    }
  }

  let candidatePath = path.join(directoryPath, `${baseName}.dem`);
  if (!(await fs.pathExists(candidatePath))) {
    return candidatePath;
  }

  let index = 1;
  while (true) {
    candidatePath = path.join(directoryPath, `${baseName}-${index}.dem`);
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

class FaceitScoutingSessionManager {
  private watcher: FSWatcher | null = null;
  private watchedFolderPath: string | null = null;
  private queuedFilePaths = new Set<string>();
  private isProcessingQueue = false;
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

      const ownedFilePaths = [...new Set(
        session.targets.flatMap((target) => {
          return [target.ownedArchiveFilePath, target.ownedDownloadFilePath].filter((filePath) => filePath !== null);
        }),
      )] as string[];
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
    if (!isPotentialDemoDownloadPath(filePath)) {
      return;
    }

    this.queuedFilePaths.add(filePath);
    if (!this.isProcessingQueue) {
      void this.processQueue();
    }
  };

  private processQueue = async () => {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
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
      this.isProcessingQueue = false;
    }
  };

  private processDownloadedFile = async (filePath: string) => {
    const session = await fetchCurrentFaceitScoutingSession();
    if (session === undefined) {
      return;
    }

    const fileName = path.basename(filePath).toLowerCase();
    const target = session.targets.find((target) => {
      return (
        (target.status === FaceitScoutingTargetStatus.AwaitingDownload ||
          target.status === FaceitScoutingTargetStatus.Error) &&
        fileName.includes(target.faceitMatchId.toLowerCase())
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
      const sessionCreatedAt = sessionRow.created_at.getTime();
      const opponentSteamIds: string[] = JSON.parse(sessionRow.opponent_steam_ids_json);
      const stat = await fs.stat(filePath);
      const isDownloadedForThisSession = stat.mtimeMs >= sessionCreatedAt;
      const archiveFormat = detectDemoArchiveFormat(filePath);
      demoFilePath = filePath;
      if (archiveFormat !== null) {
        const extractedDemoPath = await buildExtractedDemoPath(filePath);
        await extractDemoArchiveToFile(filePath, extractedDemoPath, archiveFormat);
        demoFilePath = extractedDemoPath;
        ownedDownloadFilePath = extractedDemoPath;
        ownedArchiveFilePath = isDownloadedForThisSession ? filePath : null;
      } else if (isDownloadedForThisSession) {
        ownedDownloadFilePath = filePath;
      }

      const demo = await getDemoFromFilePath(demoFilePath);
      const matchExists = await db
        .selectFrom('matches')
        .select('checksum')
        .where('checksum', '=', demo.checksum)
        .executeTakeFirst();
      let ownsDatabaseMatch = false;
      if (matchExists === undefined) {
        const outputFolderPath = buildTargetOutputFolderPath(session.id, target.faceitMatchId);
        await fs.ensureDir(outputFolderPath);
        try {
          try {
            await analyzeDemo({
              demoPath: demoFilePath,
              outputFolderPath,
              source: DemoSource.FaceIt,
              analyzePositions: false,
            });
          } catch (error) {
            if (!(error instanceof CorruptedDemoError)) {
              throw error;
            }
          }

          await processMatchInsertion({
            checksum: demo.checksum,
            demoPath: demoFilePath,
            outputFolderPath,
          });
          ownsDatabaseMatch = true;
        } finally {
          await fs.remove(outputFolderPath);
        }
      }

      const localTeamName = await this.resolveLocalTeamName(demo.checksum, opponentSteamIds, session.sourceMatch.opponentTeamName);
      if (localTeamName === null) {
        throw new Error('Could not match the opponent team inside the imported demo.');
      }

      await runTacticsPositionsTask(demo.checksum, 'all', async () => {
        await generateMatchTacticsPositions({
          checksum: demo.checksum,
          demoPath: demoFilePath!,
          source: DemoSource.FaceIt,
          onInsertionStart: () => {
            server.sendMessageToRendererProcess({
              name: RendererServerMessageName.InsertingMatchTacticsPositions,
            });
          },
        });
      });

      await db
        .updateTable('faceit_scouting_targets')
        .set({
          status: FaceitScoutingTargetStatus.Ready,
          failure_message: null,
          local_team_name: localTeamName,
          demo_checksum: demo.checksum,
          demo_file_path: demoFilePath,
          owns_database_match: ownsDatabaseMatch,
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
      if (stat?.isFile() && isPotentialDemoDownloadPath(filePath)) {
        this.queuedFilePaths.add(filePath);
      }
    }

    if (this.queuedFilePaths.size > 0 && !this.isProcessingQueue) {
      void this.processQueue();
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
