import { sql } from 'kysely';
import { GrenadeName } from 'csdm/common/types/counter-strike';
import type { Point } from 'csdm/common/types/point';
import type { TeamHeatmapFilter } from 'csdm/common/types/heatmap-filters';
import { db } from 'csdm/node/database/database';
import { HeatmapEvent } from 'csdm/common/types/heatmap-event';
import { applyMatchRoundsFilter } from './apply-match-rounds-filter';

export async function fetchTeamGrenadePoints(filters: TeamHeatmapFilter): Promise<Point[]> {
  const grenadeNames: GrenadeName[] =
    filters.grenadeNames ??
    (() => {
      switch (filters.event) {
        case HeatmapEvent.Smoke:
          return [GrenadeName.Smoke];
        case HeatmapEvent.Decoy:
          return [GrenadeName.Decoy];
        case HeatmapEvent.Flashbang:
          return [GrenadeName.Flashbang];
        case HeatmapEvent.HeGrenade:
          return [GrenadeName.HE];
        case HeatmapEvent.Molotov:
          return [GrenadeName.Molotov, GrenadeName.Incendiary];
        default:
          throw new Error(`Unsupported grenade event: ${filters.event}`);
      }
    })();

  let query = db
    .selectFrom('grenade_projectiles_destroy')
    .select(['x', 'y'])
    .innerJoin('matches', 'checksum', 'match_checksum')
    .innerJoin('demos', 'demos.checksum', 'matches.checksum')
    .where('demos.map_name', '=', filters.mapName)
    .where('thrower_team_name', '=', filters.teamName)
    .where('grenade_name', 'in', grenadeNames);

  if (filters.startDate !== undefined && filters.endDate !== undefined) {
    query = query.where(sql<boolean>`demos.date between ${filters.startDate} and ${filters.endDate}`);
  }

  if (filters.sources.length > 0) {
    query = query.where('demos.source', 'in', filters.sources);
  }

  if (filters.games.length > 0) {
    query = query.where('demos.game', 'in', filters.games);
  }

  if (filters.demoTypes.length > 0) {
    query = query.where('demos.type', 'in', filters.demoTypes);
  }

  if (filters.gameModes.length > 0) {
    query = query.where('matches.game_mode_str', 'in', filters.gameModes);
  }

  if (filters.maxRounds.length > 0) {
    query = query.where('max_rounds', 'in', filters.maxRounds);
  }

  if (filters.sides.length > 0) {
    query = query.where('thrower_side', 'in', filters.sides);
  }

  if (filters.players.length > 0) {
    query = query.where(
      'thrower_steam_id',
      'in',
      filters.players.map((player) => player.steamId),
    );
  }

  if (filters.tagIds.length > 0) {
    query = query
      .innerJoin('checksum_tags', 'checksum_tags.checksum', 'matches.checksum')
      .where('checksum_tags.tag_id', 'in', filters.tagIds);
  }

  if (filters.matchChecksums !== undefined && filters.matchChecksums.length > 0) {
    query = query.where('matches.checksum', 'in', filters.matchChecksums);
  }

  if (filters.matchRounds !== undefined && filters.matchRounds.length > 0) {
    query = applyMatchRoundsFilter(query, filters.matchRounds, 'match_checksum', 'round_number');
  }

  const points = query.execute();

  return points;
}
