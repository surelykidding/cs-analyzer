import { sql } from 'kysely';
import { type TeamNumber, type WeaponName } from 'csdm/common/types/counter-strike';
import type { TeamTacticsPayload, WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { db } from 'csdm/node/database/database';
import { applyTeamTacticsRoundsFilter } from './apply-team-tactics-rounds-filter';
import { buildPositionHeatmapPoints, type PositionHeatmapRow } from './build-position-heatmap-points';
import { mergePositionHeatmapRows } from './merge-position-heatmap-rows';
import type { TeamTacticsRound } from './team-tactics-round';

async function fetchPositionHeatmapRowsFromFullMatches(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  side: TeamNumber,
  weaponName?: WeaponName,
) {
  const windowStartSeconds = payload.ctWindowStartSeconds ?? 10;
  const windowEndSeconds = payload.ctWindowEndSeconds ?? 15;
  const effectiveTickrate = sql<number>`CASE WHEN demos.tickrate > 0 THEN demos.tickrate ELSE 64 END`;
  const windowStartTick = sql<number>`rounds.freeze_time_end_tick + (${effectiveTickrate} * ${windowStartSeconds})`;
  const windowEndTick = sql<number>`rounds.freeze_time_end_tick + (${effectiveTickrate} * ${windowEndSeconds})`;

  let query = db
    .selectFrom('player_positions')
    .distinctOn([
      'player_positions.match_checksum',
      'player_positions.round_number',
      'player_positions.player_steam_id',
      'player_positions.tick',
    ])
    .innerJoin('rounds', (join) => {
      return join
        .onRef('rounds.match_checksum', '=', 'player_positions.match_checksum')
        .onRef('rounds.number', '=', 'player_positions.round_number');
    })
    .innerJoin('demos', 'demos.checksum', 'player_positions.match_checksum')
    .select([
      'player_positions.match_checksum as matchChecksum',
      'player_positions.round_number as roundNumber',
      'player_positions.player_steam_id as playerSteamId',
      'player_positions.tick as tick',
      'player_positions.x as x',
      'player_positions.y as y',
      'player_positions.z as z',
      'player_positions.is_alive as isAlive',
      effectiveTickrate.as('tickrate'),
      windowEndTick.as('windowEndTick'),
    ])
    .where('player_positions.side', '=', side)
    .where(sql<boolean>`player_positions.tick >= ${windowStartTick}`)
    .where(sql<boolean>`player_positions.tick < ${windowEndTick}`);

  query = applyTeamTacticsRoundsFilter(query, rounds, 'player_positions.match_checksum', 'player_positions.round_number');
  if (payload.players !== undefined && payload.players.length > 0) {
    query = query.where(
      'player_positions.player_steam_id',
      'in',
      payload.players.map((player) => player.steamId),
    );
  }
  if (weaponName !== undefined) {
    query = query.where('player_positions.active_weapon_name', '=', weaponName);
  }

  return (await query.execute()) as PositionHeatmapRow[];
}

async function fetchPositionHeatmapRowsFromTacticsTable(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  side: TeamNumber,
  weaponName?: WeaponName,
) {
  const windowStartSeconds = payload.ctWindowStartSeconds ?? 10;
  const windowEndSeconds = payload.ctWindowEndSeconds ?? 15;
  const effectiveTickrate = sql<number>`CASE WHEN demos.tickrate > 0 THEN demos.tickrate ELSE 64 END`;
  const windowStartTick = sql<number>`rounds.freeze_time_end_tick + (${effectiveTickrate} * ${windowStartSeconds})`;
  const windowEndTick = sql<number>`rounds.freeze_time_end_tick + (${effectiveTickrate} * ${windowEndSeconds})`;

  let query = db
    .selectFrom('team_tactics_player_positions')
    .distinctOn([
      'team_tactics_player_positions.match_checksum',
      'team_tactics_player_positions.round_number',
      'team_tactics_player_positions.player_steam_id',
      'team_tactics_player_positions.tick',
    ])
    .innerJoin('rounds', (join) => {
      return join
        .onRef('rounds.match_checksum', '=', 'team_tactics_player_positions.match_checksum')
        .onRef('rounds.number', '=', 'team_tactics_player_positions.round_number');
    })
    .innerJoin('demos', 'demos.checksum', 'team_tactics_player_positions.match_checksum')
    .select([
      'team_tactics_player_positions.match_checksum as matchChecksum',
      'team_tactics_player_positions.round_number as roundNumber',
      'team_tactics_player_positions.player_steam_id as playerSteamId',
      'team_tactics_player_positions.tick as tick',
      'team_tactics_player_positions.x as x',
      'team_tactics_player_positions.y as y',
      'team_tactics_player_positions.z as z',
      'team_tactics_player_positions.is_alive as isAlive',
      effectiveTickrate.as('tickrate'),
      windowEndTick.as('windowEndTick'),
    ])
    .where('team_tactics_player_positions.side', '=', side)
    .where(sql<boolean>`team_tactics_player_positions.tick >= ${windowStartTick}`)
    .where(sql<boolean>`team_tactics_player_positions.tick < ${windowEndTick}`);

  query = applyTeamTacticsRoundsFilter(
    query,
    rounds,
    'team_tactics_player_positions.match_checksum',
    'team_tactics_player_positions.round_number',
  );
  if (payload.players !== undefined && payload.players.length > 0) {
    query = query.where(
      'team_tactics_player_positions.player_steam_id',
      'in',
      payload.players.map((player) => player.steamId),
    );
  }
  if (weaponName !== undefined) {
    query = query.where('team_tactics_player_positions.active_weapon_name', '=', weaponName);
  }

  return (await query.execute()) as PositionHeatmapRow[];
}

export async function fetchTacticsPositionHeatmap(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  mapScale: number,
  side: TeamNumber,
  weaponName?: WeaponName,
): Promise<WeightedMapPoint[]> {
  if (rounds.length === 0) {
    return [];
  }

  const [fullMatchRows, tacticsRows] = await Promise.all([
    fetchPositionHeatmapRowsFromFullMatches(rounds, payload, side, weaponName),
    fetchPositionHeatmapRowsFromTacticsTable(rounds, payload, side, weaponName),
  ]);
  const rows = mergePositionHeatmapRows(fullMatchRows, tacticsRows);

  return buildPositionHeatmapPoints(rows, payload.radarLevel, payload.thresholdZ, mapScale);
}
