import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { DemoSource } from 'csdm/common/types/counter-strike';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import {
  PerfectWorldScoutingSessionStatus,
  PerfectWorldScoutingTargetStatus,
  type StartPerfectWorldScoutingSessionPayload,
} from 'csdm/common/types/perfect-world-scouting';
import { DownloadSource, type PerfectWorldDownload } from 'csdm/common/download/download-types';
import { db } from 'csdm/node/database/database';
import { deleteDemos as deleteOrphanDemos } from 'csdm/node/database/demos/delete-demos';
import { deletePerfectWorldScoutingSession } from 'csdm/node/database/perfect-world-scouting/delete-perfect-world-scouting-session';
import { fetchCurrentPerfectWorldScoutingSession } from 'csdm/node/database/perfect-world-scouting/fetch-current-perfect-world-scouting-session';
import { fetchPerfectWorldScoutingSession } from 'csdm/node/database/perfect-world-scouting/fetch-perfect-world-scouting-session';
import { deleteMatchesByChecksums } from 'csdm/node/database/matches/delete-matches-by-checksums';
import { discoverPerfectWorldScoutingTargets } from 'csdm/node/perfect-world/discover-perfect-world-scouting-targets';
import { fetchCurrentPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-current-perfect-world-account';
import { getSettings } from 'csdm/node/settings/get-settings';
import { assertDownloadFolderIsValid } from 'csdm/node/download/assert-download-folder-is-valid';
import { MatchAlreadyDownloaded } from 'csdm/node/download/errors/match-already-downloaded';
import { MatchAlreadyInDownloadQueue } from 'csdm/node/download/errors/match-already-in-download-queue';
import { DownloadLinkExpired } from 'csdm/node/download/errors/download-link-expired';
import { downloadDemoQueue, type DownloadQueueEvent } from './download-queue';
import { RendererServerMessageName } from './renderer-server-message-name';
import { server } from './server';
import { processScoutingImportedDemo } from './process-scouting-imported-demo';

function buildTargetOutputFolderPath(sessionId: string, matchId: string) {
  return path.join(os.tmpdir(), 'cs-demo-manager', 'perfect-world-scouting', sessionId, matchId);
}

async function deleteOwnedFile(filePath: string) {
  await fs.remove(filePath);

  if (filePath.toLowerCase().endsWith('.dem')) {
    await fs.remove(`${filePath}.info`);
    await fs.remove(`${filePath}.vdm`);
  }
}

class PerfectWorldScoutingSessionManager {
  private processingTargetIds = new Set<number>();

  public constructor() {
    downloadDemoQueue.addListener(this.onDownloadQueueEvent);
  }

  public fetchCurrentSession = async () => {
    await this.recoverInterruptedTargets();

    return fetchCurrentPerfectWorldScoutingSession();
  };

  public startSession = async ({ matchId, participantSteamId }: StartPerfectWorldScoutingSessionPayload) => {
    const existingSession = await fetchCurrentPerfectWorldScoutingSession();
    if (existingSession !== undefined) {
      throw new Error('Delete the current Perfect World scouting session before starting a new one.');
    }

    await assertDownloadFolderIsValid();

    const discovery = await discoverPerfectWorldScoutingTargets({
      matchId,
      participantSteamId,
    });
    const currentAccount = await fetchCurrentPerfectWorldAccount();
    if (currentAccount === undefined) {
      throw PerfectWorldErrorCode.AccountMissing;
    }

    const sessionRow = await db
      .insertInto('perfect_world_scouting_sessions')
      .values({
        status: PerfectWorldScoutingSessionStatus.AwaitingDownloads,
        source_match_id: discovery.sourceMatch.id,
        source_match_url: discovery.sourceMatch.url,
        map_name: discovery.sourceMatch.mapName,
        our_team_name: discovery.sourceMatch.ourTeamName,
        opponent_team_name: discovery.sourceMatch.opponentTeamName,
        our_team_score: discovery.sourceMatch.ourTeamScore,
        opponent_team_score: discovery.sourceMatch.opponentTeamScore,
        cup_id: discovery.sourceMatch.cupId,
        current_perfect_world_account_id: currentAccount.id,
        current_perfect_world_account_nickname: currentAccount.nickname,
        opponent_steam_ids_json: JSON.stringify(discovery.opponentSteamIds),
        error_message: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const insertedTargets = await Promise.all(
      discovery.targets.map(async (target, index) => {
        return db
          .insertInto('perfect_world_scouting_targets')
          .values({
            session_id: sessionRow.id,
            sequence: index,
            match_id: target.match.id,
            match_url: target.match.url,
            cup_id: target.match.cupId,
            map_name: target.match.mapName,
            status: PerfectWorldScoutingTargetStatus.AwaitingDownload,
            failure_message: null,
            local_team_name: null,
            demo_checksum: null,
            demo_file_path: null,
            owns_database_match: false,
            owned_download_file_path: null,
            roster_overlap_count: target.rosterOverlapCount,
            shared_history_player_count: target.sharedHistoryPlayerCount,
            matched_player_steam_ids_json: JSON.stringify(target.matchedPlayerSteamIds),
          })
          .returning(['id', 'match_id as matchId'])
          .executeTakeFirstOrThrow();
      }),
    );

    for (const insertedTarget of insertedTargets) {
      const target = discovery.targets.find((candidateTarget) => candidateTarget.match.id === insertedTarget.matchId);
      if (target === undefined) {
        continue;
      }

      await this.enqueueTargetDownload({
        sessionId: sessionRow.id,
        targetId: insertedTarget.id,
        match: target.match,
      });
    }

    await this.updateSessionStatusFromTargets(sessionRow.id);

    return fetchPerfectWorldScoutingSession(sessionRow.id);
  };

  public deleteSession = async (sessionId: string) => {
    await this.recoverInterruptedTargets(sessionId);

    const session = await fetchPerfectWorldScoutingSession(sessionId);
    if (session === undefined) {
      return;
    }

    if (
      session.targets.some((target) => {
        return (
          target.status === PerfectWorldScoutingTargetStatus.Downloading ||
          target.status === PerfectWorldScoutingTargetStatus.Processing
        );
      })
    ) {
      throw new Error('Wait for the current demo download or import to finish before deleting the scouting session.');
    }

    await db
      .updateTable('perfect_world_scouting_sessions')
      .set({
        status: PerfectWorldScoutingSessionStatus.Deleting,
        error_message: null,
        updated_at: new Date(),
      })
      .where('id', '=', sessionId)
      .execute();
    await this.emitSessionUpdate(sessionId);

    try {
      const ownedChecksums = [
        ...new Set(
          session.targets
            .filter((target) => target.ownsDatabaseMatch && target.demoChecksum !== null)
            .map((target) => target.demoChecksum as string),
        ),
      ];
      if (ownedChecksums.length > 0) {
        await deleteMatchesByChecksums(ownedChecksums);
        await deleteOrphanDemos();
      }

      const ownedFilePaths = [
        ...new Set(
          session.targets.flatMap((target) => {
            const filePaths = [target.ownedDownloadFilePath];
            if (target.demoFilePath !== null && (target.ownsDatabaseMatch || target.ownedDownloadFilePath !== null)) {
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
        .updateTable('perfect_world_scouting_sessions')
        .set({
          status: PerfectWorldScoutingSessionStatus.Error,
          error_message: errorMessage,
          updated_at: new Date(),
        })
        .where('id', '=', sessionId)
        .execute();
      await this.emitSessionUpdate(sessionId);
      throw error;
    }

    await deletePerfectWorldScoutingSession(sessionId);
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.PerfectWorldScoutingSessionUpdated,
      payload: undefined,
    });
  };

  private enqueueTargetDownload = async ({
    sessionId,
    targetId,
    match,
  }: {
    sessionId: string;
    targetId: number;
    match: Awaited<ReturnType<typeof discoverPerfectWorldScoutingTargets>>['targets'][number]['match'];
  }) => {
    const settings = await getSettings();
    const downloadFolderPath = settings.download.folderPath;
    const demoFilePath = downloadFolderPath ? path.join(downloadFolderPath, `${match.id}.dem`) : '';
    const download: PerfectWorldDownload = {
      matchId: match.id,
      game: match.game,
      demoUrl: match.demoUrl,
      fileName: match.id,
      source: DownloadSource.PerfectWorld,
      match,
    };

    try {
      await downloadDemoQueue.addDownload(download);
      await this.updateTargetStatus(targetId, PerfectWorldScoutingTargetStatus.Downloading);
    } catch (error) {
      if (error instanceof MatchAlreadyInDownloadQueue) {
        await this.updateTargetStatus(targetId, PerfectWorldScoutingTargetStatus.Downloading);
      } else if (error instanceof MatchAlreadyDownloaded && demoFilePath !== '' && (await fs.pathExists(demoFilePath))) {
        await this.processDownloadedTarget(sessionId, targetId, match.id, demoFilePath);
        return;
      } else if (error instanceof DownloadLinkExpired) {
        await this.updateTargetError(targetId, 'Demo link expired.');
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.updateTargetError(targetId, errorMessage);
      }
    }

    await this.updateSessionStatusFromTargets(sessionId);
    await this.emitSessionUpdate(sessionId);
  };

  private onDownloadQueueEvent = async (event: DownloadQueueEvent) => {
    await this.handleDownloadQueueEvent(event);
  };

  private handleDownloadQueueEvent = async (event: DownloadQueueEvent) => {
    if (event.payload.download.source !== DownloadSource.PerfectWorld) {
      return;
    }

    const session = await fetchCurrentPerfectWorldScoutingSession();
    if (session === undefined) {
      return;
    }

    const target = session.targets.find((target) => {
      return (
        target.perfectWorldMatchId === event.payload.download.matchId &&
        (target.status === PerfectWorldScoutingTargetStatus.AwaitingDownload ||
          target.status === PerfectWorldScoutingTargetStatus.Downloading ||
          target.status === PerfectWorldScoutingTargetStatus.Error)
      );
    });
    if (target === undefined) {
      return;
    }

    switch (event.type) {
      case 'success':
        await this.processDownloadedTarget(session.id, target.id, target.perfectWorldMatchId, event.payload.demoFilePath);
        break;
      case 'expired':
        await this.updateTargetError(target.id, 'Demo link expired.');
        await this.updateSessionStatusFromTargets(session.id);
        await this.emitSessionUpdate(session.id);
        break;
      case 'corrupted':
        await this.updateTargetError(target.id, 'The downloaded demo is corrupted.');
        await this.updateSessionStatusFromTargets(session.id);
        await this.emitSessionUpdate(session.id);
        break;
      case 'error':
        await this.updateTargetError(target.id, 'An error occurred while downloading the demo.');
        await this.updateSessionStatusFromTargets(session.id);
        await this.emitSessionUpdate(session.id);
        break;
    }
  };

  private processDownloadedTarget = async (sessionId: string, targetId: number, matchId: string, demoFilePath: string) => {
    if (this.processingTargetIds.has(targetId)) {
      return;
    }

    this.processingTargetIds.add(targetId);
    try {
      await db
        .updateTable('perfect_world_scouting_targets')
        .set({
          status: PerfectWorldScoutingTargetStatus.Processing,
          failure_message: null,
          demo_file_path: demoFilePath,
          owned_download_file_path: demoFilePath,
        })
        .where('id', '=', targetId)
        .execute();
      await this.updateSessionStatusFromTargets(sessionId);
      await this.emitSessionUpdate(sessionId);

      const targetRow = await db
        .selectFrom('perfect_world_scouting_targets')
        .selectAll()
        .where('id', '=', targetId)
        .executeTakeFirstOrThrow();

      const result = await processScoutingImportedDemo({
        demoPath: demoFilePath,
        outputFolderPath: buildTargetOutputFolderPath(sessionId, matchId),
        source: DemoSource.PerfectWorld,
        resolveLocalTeamName: async (checksum) => {
          return this.resolveLocalTeamName(checksum, JSON.parse(targetRow.matched_player_steam_ids_json));
        },
        onInsertionStart: () => {
          server.sendMessageToRendererProcess({
            name: RendererServerMessageName.InsertingMatchTacticsPositions,
          });
        },
      });

      await db
        .updateTable('perfect_world_scouting_targets')
        .set({
          status: PerfectWorldScoutingTargetStatus.Ready,
          failure_message: null,
          local_team_name: result.localTeamName,
          demo_checksum: result.demoChecksum,
          demo_file_path: demoFilePath,
          owns_database_match: result.ownsDatabaseMatch,
          owned_download_file_path: demoFilePath,
        })
        .where('id', '=', targetId)
        .execute();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db
        .updateTable('perfect_world_scouting_targets')
        .set({
          status: PerfectWorldScoutingTargetStatus.Error,
          failure_message: errorMessage,
          demo_file_path: demoFilePath,
          owned_download_file_path: demoFilePath,
        })
        .where('id', '=', targetId)
        .execute();
    } finally {
      this.processingTargetIds.delete(targetId);
      await this.updateSessionStatusFromTargets(sessionId);
      await this.emitSessionUpdate(sessionId);
    }
  };

  private recoverInterruptedTargets = async (sessionId?: string) => {
    const queueMatchIds = new Set(
      downloadDemoQueue
        .getDownloads()
        .filter((download) => download.source === DownloadSource.PerfectWorld)
        .map((download) => download.matchId),
    );

    let processingQuery = db
      .selectFrom('perfect_world_scouting_targets')
      .select(['id', 'session_id as sessionId'])
      .where('status', '=', PerfectWorldScoutingTargetStatus.Processing);
    let downloadingQuery = db
      .selectFrom('perfect_world_scouting_targets')
      .select(['id', 'session_id as sessionId', 'match_id as matchId'])
      .where('status', '=', PerfectWorldScoutingTargetStatus.Downloading);

    if (sessionId !== undefined) {
      processingQuery = processingQuery.where('session_id', '=', sessionId);
      downloadingQuery = downloadingQuery.where('session_id', '=', sessionId);
    }

    const [processingTargets, downloadingTargets] = await Promise.all([
      processingQuery.execute(),
      downloadingQuery.execute(),
    ]);

    const interruptedProcessingTargets = processingTargets.filter((target) => !this.processingTargetIds.has(target.id));
    const interruptedDownloadingTargets = downloadingTargets.filter((target) => !queueMatchIds.has(target.matchId));

    if (interruptedProcessingTargets.length > 0) {
      await db
        .updateTable('perfect_world_scouting_targets')
        .set({
          status: PerfectWorldScoutingTargetStatus.Error,
          failure_message: 'Demo processing was interrupted. You can delete this scouting session and start again to retry.',
        })
        .where(
          'id',
          'in',
          interruptedProcessingTargets.map((target) => target.id),
        )
        .execute();
    }

    if (interruptedDownloadingTargets.length > 0) {
      await db
        .updateTable('perfect_world_scouting_targets')
        .set({
          status: PerfectWorldScoutingTargetStatus.Error,
          failure_message: 'Demo download was interrupted. You can delete this scouting session and start again to retry.',
        })
        .where(
          'id',
          'in',
          interruptedDownloadingTargets.map((target) => target.id),
        )
        .execute();
    }

    const affectedSessionIds = [
      ...new Set([
        ...interruptedProcessingTargets.map((target) => target.sessionId),
        ...interruptedDownloadingTargets.map((target) => target.sessionId),
      ]),
    ];
    for (const affectedSessionId of affectedSessionIds) {
      await this.updateSessionStatusFromTargets(affectedSessionId);
      await this.emitSessionUpdate(affectedSessionId);
    }
  };

  private updateTargetStatus = async (targetId: number, status: PerfectWorldScoutingTargetStatus) => {
    await db
      .updateTable('perfect_world_scouting_targets')
      .set({
        status,
        failure_message: null,
      })
      .where('id', '=', targetId)
      .execute();
  };

  private updateTargetError = async (targetId: number, failureMessage: string) => {
    await db
      .updateTable('perfect_world_scouting_targets')
      .set({
        status: PerfectWorldScoutingTargetStatus.Error,
        failure_message: failureMessage,
      })
      .where('id', '=', targetId)
      .execute();
  };

  private updateSessionStatusFromTargets = async (sessionId: string) => {
    const targetRows = await db
      .selectFrom('perfect_world_scouting_targets')
      .select(['status'])
      .where('session_id', '=', sessionId)
      .execute();
    const hasReadyTargets = targetRows.some((target) => target.status === PerfectWorldScoutingTargetStatus.Ready);
    const hasDownloadingTargets = targetRows.some((target) => target.status === PerfectWorldScoutingTargetStatus.Downloading);
    const hasProcessingTargets = targetRows.some((target) => target.status === PerfectWorldScoutingTargetStatus.Processing);
    const hasAwaitingTargets = targetRows.some((target) => target.status === PerfectWorldScoutingTargetStatus.AwaitingDownload);
    let status: PerfectWorldScoutingSessionStatus = PerfectWorldScoutingSessionStatus.Error;
    if (hasDownloadingTargets || hasProcessingTargets) {
      status = PerfectWorldScoutingSessionStatus.Processing;
    } else if (hasReadyTargets) {
      status = PerfectWorldScoutingSessionStatus.Ready;
    } else if (hasAwaitingTargets) {
      status = PerfectWorldScoutingSessionStatus.AwaitingDownloads;
    }

    await db
      .updateTable('perfect_world_scouting_sessions')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', sessionId)
      .execute();
  };

  private emitSessionUpdate = async (sessionId: string) => {
    const session = await fetchPerfectWorldScoutingSession(sessionId);
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.PerfectWorldScoutingSessionUpdated,
      payload: session,
    });
  };

  private resolveLocalTeamName = async (checksum: string, opponentSteamIds: string[]): Promise<string | null> => {
    const rows = await db
      .selectFrom('players')
      .select(['team_name as teamName', 'steam_id as steamId'])
      .where('match_checksum', '=', checksum)
      .execute();

    const opponentSteamIdSet = new Set(opponentSteamIds);
    const teamToOverlapCount = new Map<string, number>();
    for (const row of rows) {
      const currentCount = teamToOverlapCount.get(row.teamName) ?? 0;
      teamToOverlapCount.set(row.teamName, currentCount + (opponentSteamIdSet.has(row.steamId) ? 1 : 0));
    }

    const bestTeamEntry = [...teamToOverlapCount.entries()].sort((entryA, entryB) => entryB[1] - entryA[1])[0];
    if (bestTeamEntry !== undefined && bestTeamEntry[1] >= 3) {
      return bestTeamEntry[0];
    }

    return null;
  };
}

export const perfectWorldScoutingSessionManager = new PerfectWorldScoutingSessionManager();
