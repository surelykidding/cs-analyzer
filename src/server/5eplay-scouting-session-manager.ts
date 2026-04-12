import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { DemoSource } from 'csdm/common/types/counter-strike';
import {
  FiveEPlayScoutingSessionStatus,
  FiveEPlayScoutingTargetStatus,
  type Start5EPlayScoutingSessionPayload,
} from 'csdm/common/types/5eplay-scouting';
import { DownloadSource, type FiveEPlayDownload } from 'csdm/common/download/download-types';
import { db } from 'csdm/node/database/database';
import { deleteDemos as deleteOrphanDemos } from 'csdm/node/database/demos/delete-demos';
import { delete5EPlayScoutingSession } from 'csdm/node/database/5eplay-scouting/delete-5eplay-scouting-session';
import { fetchCurrent5EPlayScoutingSession } from 'csdm/node/database/5eplay-scouting/fetch-current-5eplay-scouting-session';
import { fetch5EPlayScoutingSession } from 'csdm/node/database/5eplay-scouting/fetch-5eplay-scouting-session';
import { deleteMatchesByChecksums } from 'csdm/node/database/matches/delete-matches-by-checksums';
import { discover5EPlayScoutingTargets } from 'csdm/node/5eplay/discover-5eplay-scouting-targets';
import { fetchCurrent5EPlayAccount } from 'csdm/node/database/5play-account/fetch-current-5eplay-account';
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
  return path.join(os.tmpdir(), 'cs-demo-manager', '5eplay-scouting', sessionId, matchId);
}

async function deleteOwnedFile(filePath: string) {
  await fs.remove(filePath);

  if (filePath.toLowerCase().endsWith('.dem')) {
    await fs.remove(`${filePath}.info`);
    await fs.remove(`${filePath}.vdm`);
  }
}

function normalizePlayerName(playerName: string) {
  return playerName.trim().toLowerCase();
}

class FiveEPlayScoutingSessionManager {
  private processingTargetIds = new Set<number>();

  public constructor() {
    downloadDemoQueue.addListener(this.onDownloadQueueEvent);
  }

  public fetchCurrentSession = async () => {
    await this.recoverInterruptedTargets();

    return fetchCurrent5EPlayScoutingSession();
  };

  public startSession = async ({ matchIdOrUrl }: Start5EPlayScoutingSessionPayload) => {
    const existingSession = await fetchCurrent5EPlayScoutingSession();
    if (existingSession !== undefined) {
      throw new Error('Delete the current 5EPlay scouting session before starting a new one.');
    }

    const currentAccount = await fetchCurrent5EPlayAccount();
    if (currentAccount === undefined) {
      throw new Error('A current 5EPlay account is required.');
    }

    await assertDownloadFolderIsValid();

    const discovery = await discover5EPlayScoutingTargets({
      currentAccountId: currentAccount.id,
      matchIdOrUrl,
    });

    const sessionRow = await db
      .insertInto('5eplay_scouting_sessions')
      .values({
        status: FiveEPlayScoutingSessionStatus.AwaitingDownloads,
        source_match_id: discovery.sourceMatch.id,
        source_match_url: discovery.sourceMatch.url,
        map_name: discovery.sourceMatch.mapName,
        our_team_name: discovery.sourceMatch.ourTeamName,
        opponent_team_name: discovery.sourceMatch.opponentTeamName,
        our_team_score: discovery.sourceMatch.ourTeamScore,
        opponent_team_score: discovery.sourceMatch.opponentTeamScore,
        current_5eplay_account_id: currentAccount.id,
        current_5eplay_account_nickname: currentAccount.nickname,
        opponent_5eplay_player_ids_json: JSON.stringify(discovery.opponentPlayerIds),
        error_message: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const insertedTargets = await Promise.all(
      discovery.targets.map(async (target, index) => {
        return db
          .insertInto('5eplay_scouting_targets')
          .values({
            session_id: sessionRow.id,
            sequence: index,
            match_id: target.match.id,
            match_url: target.match.url,
            map_name: target.match.mapName,
            status: FiveEPlayScoutingTargetStatus.AwaitingDownload,
            failure_message: null,
            local_team_name: null,
            demo_checksum: null,
            demo_file_path: null,
            owns_database_match: false,
            owned_download_file_path: null,
            roster_overlap_count: target.rosterOverlapCount,
            shared_history_player_count: target.sharedHistoryPlayerCount,
            matched_player_names_json: JSON.stringify(target.matchedPlayerNames),
          })
          .returning(['id', 'match_id as matchId'])
          .executeTakeFirstOrThrow();
      }),
    );

    for (const insertedTarget of insertedTargets) {
      const target = discovery.targets.find((target) => target.match.id === insertedTarget.matchId);
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

    return fetch5EPlayScoutingSession(sessionRow.id);
  };

  public deleteSession = async (sessionId: string) => {
    await this.recoverInterruptedTargets(sessionId);

    const session = await fetch5EPlayScoutingSession(sessionId);
    if (session === undefined) {
      return;
    }

    if (
      session.targets.some((target) => {
        return (
          target.status === FiveEPlayScoutingTargetStatus.Downloading ||
          target.status === FiveEPlayScoutingTargetStatus.Processing
        );
      })
    ) {
      throw new Error('Wait for the current demo download or import to finish before deleting the scouting session.');
    }

    await db
      .updateTable('5eplay_scouting_sessions')
      .set({
        status: FiveEPlayScoutingSessionStatus.Deleting,
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
        .updateTable('5eplay_scouting_sessions')
        .set({
          status: FiveEPlayScoutingSessionStatus.Error,
          error_message: errorMessage,
          updated_at: new Date(),
        })
        .where('id', '=', sessionId)
        .execute();
      await this.emitSessionUpdate(sessionId);
      throw error;
    }

    await delete5EPlayScoutingSession(sessionId);
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.FiveEPlayScoutingSessionUpdated,
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
    match: Awaited<ReturnType<typeof discover5EPlayScoutingTargets>>['targets'][number]['match'];
  }) => {
    const settings = await getSettings();
    const downloadFolderPath = settings.download.folderPath;
    const demoFilePath = downloadFolderPath ? path.join(downloadFolderPath, `${match.id}.dem`) : '';
    const download: FiveEPlayDownload = {
      matchId: match.id,
      game: match.game,
      demoUrl: match.demoUrl,
      fileName: match.id,
      source: DownloadSource['5EPlay'],
      match,
    };

    try {
      await downloadDemoQueue.addDownload(download);
      await this.updateTargetStatus(targetId, FiveEPlayScoutingTargetStatus.Downloading);
    } catch (error) {
      if (error instanceof MatchAlreadyInDownloadQueue) {
        await this.updateTargetStatus(targetId, FiveEPlayScoutingTargetStatus.Downloading);
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
    if (event.payload.download.source !== DownloadSource['5EPlay']) {
      return;
    }

    const session = await fetchCurrent5EPlayScoutingSession();
    if (session === undefined) {
      return;
    }

    const target = session.targets.find((target) => {
      return (
        target.fiveEPlayMatchId === event.payload.download.matchId &&
        (target.status === FiveEPlayScoutingTargetStatus.AwaitingDownload ||
          target.status === FiveEPlayScoutingTargetStatus.Downloading ||
          target.status === FiveEPlayScoutingTargetStatus.Error)
      );
    });
    if (target === undefined) {
      return;
    }

    switch (event.type) {
      case 'success':
        await this.processDownloadedTarget(session.id, target.id, target.fiveEPlayMatchId, event.payload.demoFilePath);
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
        .updateTable('5eplay_scouting_targets')
        .set({
          status: FiveEPlayScoutingTargetStatus.Processing,
          failure_message: null,
          demo_file_path: demoFilePath,
          owned_download_file_path: demoFilePath,
        })
        .where('id', '=', targetId)
        .execute();
      await this.updateSessionStatusFromTargets(sessionId);
      await this.emitSessionUpdate(sessionId);

      const targetRow = await db
        .selectFrom('5eplay_scouting_targets')
        .selectAll()
        .where('id', '=', targetId)
        .executeTakeFirstOrThrow();

      const result = await processScoutingImportedDemo({
        demoPath: demoFilePath,
        outputFolderPath: buildTargetOutputFolderPath(sessionId, matchId),
        source: DemoSource.FiveEPlay,
        resolveLocalTeamName: async (checksum) => {
          return this.resolveLocalTeamName(checksum, JSON.parse(targetRow.matched_player_names_json));
        },
        onInsertionStart: () => {
          server.sendMessageToRendererProcess({
            name: RendererServerMessageName.InsertingMatchTacticsPositions,
          });
        },
      });

      await db
        .updateTable('5eplay_scouting_targets')
        .set({
          status: FiveEPlayScoutingTargetStatus.Ready,
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
        .updateTable('5eplay_scouting_targets')
        .set({
          status: FiveEPlayScoutingTargetStatus.Error,
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
        .filter((download) => download.source === DownloadSource['5EPlay'])
        .map((download) => download.matchId),
    );

    let processingQuery = db
      .selectFrom('5eplay_scouting_targets')
      .select(['id', 'session_id as sessionId'])
      .where('status', '=', FiveEPlayScoutingTargetStatus.Processing);
    let downloadingQuery = db
      .selectFrom('5eplay_scouting_targets')
      .select(['id', 'session_id as sessionId', 'match_id as matchId'])
      .where('status', '=', FiveEPlayScoutingTargetStatus.Downloading);

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
        .updateTable('5eplay_scouting_targets')
        .set({
          status: FiveEPlayScoutingTargetStatus.Error,
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
        .updateTable('5eplay_scouting_targets')
        .set({
          status: FiveEPlayScoutingTargetStatus.Error,
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

  private updateTargetStatus = async (targetId: number, status: FiveEPlayScoutingTargetStatus) => {
    await db
      .updateTable('5eplay_scouting_targets')
      .set({
        status,
        failure_message: null,
      })
      .where('id', '=', targetId)
      .execute();
  };

  private updateTargetError = async (targetId: number, failureMessage: string) => {
    await db
      .updateTable('5eplay_scouting_targets')
      .set({
        status: FiveEPlayScoutingTargetStatus.Error,
        failure_message: failureMessage,
      })
      .where('id', '=', targetId)
      .execute();
  };

  private updateSessionStatusFromTargets = async (sessionId: string) => {
    const targetRows = await db
      .selectFrom('5eplay_scouting_targets')
      .select(['status'])
      .where('session_id', '=', sessionId)
      .execute();
    const hasReadyTargets = targetRows.some((target) => target.status === FiveEPlayScoutingTargetStatus.Ready);
    const hasDownloadingTargets = targetRows.some((target) => target.status === FiveEPlayScoutingTargetStatus.Downloading);
    const hasProcessingTargets = targetRows.some((target) => target.status === FiveEPlayScoutingTargetStatus.Processing);
    const hasAwaitingTargets = targetRows.some((target) => target.status === FiveEPlayScoutingTargetStatus.AwaitingDownload);
    let status: FiveEPlayScoutingSessionStatus = FiveEPlayScoutingSessionStatus.Error;
    if (hasDownloadingTargets || hasProcessingTargets) {
      status = FiveEPlayScoutingSessionStatus.Processing;
    } else if (hasReadyTargets) {
      status = FiveEPlayScoutingSessionStatus.Ready;
    } else if (hasAwaitingTargets) {
      status = FiveEPlayScoutingSessionStatus.AwaitingDownloads;
    }

    await db
      .updateTable('5eplay_scouting_sessions')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', sessionId)
      .execute();
  };

  private emitSessionUpdate = async (sessionId: string) => {
    const session = await fetch5EPlayScoutingSession(sessionId);
    server.sendMessageToRendererProcess({
      name: RendererServerMessageName.FiveEPlayScoutingSessionUpdated,
      payload: session,
    });
  };

  private resolveLocalTeamName = async (checksum: string, opponentPlayerNames: string[]): Promise<string | null> => {
    const rows = await db
      .selectFrom('players')
      .select(['team_name as teamName', 'name as playerName'])
      .where('match_checksum', '=', checksum)
      .execute();

    const normalizedOpponentPlayerNames = new Set(opponentPlayerNames.map(normalizePlayerName));
    const teamToOverlapCount = new Map<string, number>();
    for (const row of rows) {
      const currentCount = teamToOverlapCount.get(row.teamName) ?? 0;
      teamToOverlapCount.set(
        row.teamName,
        currentCount + (normalizedOpponentPlayerNames.has(normalizePlayerName(row.playerName)) ? 1 : 0),
      );
    }

    const bestTeamEntry = [...teamToOverlapCount.entries()].sort((entryA, entryB) => entryB[1] - entryA[1])[0];
    if (bestTeamEntry !== undefined && bestTeamEntry[1] >= 3) {
      return bestTeamEntry[0];
    }

    return null;
  };
}

export const fiveEPlayScoutingSessionManager = new FiveEPlayScoutingSessionManager();
