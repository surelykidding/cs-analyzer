import {
  type FiveEPlayScoutingSession,
  type FiveEPlayScoutingTarget,
} from 'csdm/common/types/5eplay-scouting';
import type { FiveEPlayScoutingSessionRow } from './5eplay-scouting-session-row';
import type { FiveEPlayScoutingTargetRow } from './5eplay-scouting-target-row';

function rowToTarget(row: FiveEPlayScoutingTargetRow): FiveEPlayScoutingTarget {
  return {
    id: row.id,
    order: row.sequence,
    fiveEPlayMatchId: row.match_id,
    url: row.match_url,
    mapName: row.map_name,
    status: row.status as FiveEPlayScoutingTarget['status'],
    failureMessage: row.failure_message,
    localTeamName: row.local_team_name,
    demoChecksum: row.demo_checksum,
    demoFilePath: row.demo_file_path,
    ownsDatabaseMatch: row.owns_database_match,
    ownedDownloadFilePath: row.owned_download_file_path,
    rosterOverlapCount: row.roster_overlap_count,
    sharedHistoryPlayerCount: row.shared_history_player_count,
  };
}

export function fiveEPlayScoutingRowsToSession(
  sessionRow: FiveEPlayScoutingSessionRow,
  targetRows: FiveEPlayScoutingTargetRow[],
): FiveEPlayScoutingSession {
  const targets = targetRows
    .map(rowToTarget)
    .sort((targetA, targetB) => targetA.order - targetB.order);

  return {
    id: sessionRow.id,
    status: sessionRow.status as FiveEPlayScoutingSession['status'],
    sourceMatch: {
      id: sessionRow.source_match_id,
      url: sessionRow.source_match_url,
      mapName: sessionRow.map_name,
      ourTeamName: sessionRow.our_team_name,
      opponentTeamName: sessionRow.opponent_team_name,
      ourTeamScore: sessionRow.our_team_score,
      opponentTeamScore: sessionRow.opponent_team_score,
    },
    currentAccountId: sessionRow.current_5eplay_account_id,
    currentAccountNickname: sessionRow.current_5eplay_account_nickname,
    createdAt: sessionRow.created_at.toISOString(),
    updatedAt: sessionRow.updated_at.toISOString(),
    errorMessage: sessionRow.error_message,
    targets,
    readyTargetCount: targets.filter((target) => target.status === 'ready').length,
    awaitingDownloadTargetCount: targets.filter((target) => target.status === 'awaiting-download').length,
    downloadingTargetCount: targets.filter((target) => target.status === 'downloading').length,
    processingTargetCount: targets.filter((target) => target.status === 'processing').length,
    errorTargetCount: targets.filter((target) => target.status === 'error').length,
  };
}
