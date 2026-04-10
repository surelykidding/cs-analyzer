import {
  type FaceitScoutingSession,
  type FaceitScoutingTarget,
} from 'csdm/common/types/faceit-scouting';
import type { FaceitScoutingSessionRow } from './faceit-scouting-session-row';
import type { FaceitScoutingTargetRow } from './faceit-scouting-target-row';

function rowToTarget(row: FaceitScoutingTargetRow): FaceitScoutingTarget {
  return {
    id: row.id,
    order: row.sequence,
    faceitMatchId: row.faceit_match_id,
    url: row.faceit_match_url,
    mapName: row.map_name,
    status: row.status as FaceitScoutingTarget['status'],
    failureMessage: row.failure_message,
    localTeamName: row.local_team_name,
    demoChecksum: row.demo_checksum,
    demoFilePath: row.demo_file_path,
    ownsDatabaseMatch: row.owns_database_match,
    ownedDownloadFilePath: row.owned_download_file_path,
    ownedArchiveFilePath: row.owned_archive_file_path,
    resourceUrlAvailable: row.resource_url_available,
    rosterOverlapCount: row.roster_overlap_count,
    sharedHistoryPlayerCount: row.shared_history_player_count,
  };
}

export function faceitScoutingRowsToSession(
  sessionRow: FaceitScoutingSessionRow,
  targetRows: FaceitScoutingTargetRow[],
): FaceitScoutingSession {
  const targets = targetRows
    .map(rowToTarget)
    .sort((targetA, targetB) => targetA.order - targetB.order);

  return {
    id: sessionRow.id,
    status: sessionRow.status as FaceitScoutingSession['status'],
    sourceMatch: {
      id: sessionRow.source_match_id,
      url: sessionRow.source_match_url,
      mapName: sessionRow.map_name,
      ourTeamName: sessionRow.our_team_name,
      opponentTeamName: sessionRow.opponent_team_name,
      ourTeamScore: sessionRow.our_team_score,
      opponentTeamScore: sessionRow.opponent_team_score,
    },
    currentAccountId: sessionRow.current_faceit_account_id,
    currentAccountNickname: sessionRow.current_faceit_account_nickname,
    createdAt: sessionRow.created_at.toISOString(),
    updatedAt: sessionRow.updated_at.toISOString(),
    errorMessage: sessionRow.error_message,
    targets,
    readyTargetCount: targets.filter((target) => target.status === 'ready').length,
    awaitingDownloadTargetCount: targets.filter((target) => target.status === 'awaiting-download').length,
    processingTargetCount: targets.filter((target) => target.status === 'processing').length,
    errorTargetCount: targets.filter((target) => target.status === 'error').length,
  };
}
