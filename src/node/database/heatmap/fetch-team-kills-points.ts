import { sql } from 'kysely';
import type { TeamHeatmapFilter } from 'csdm/common/types/heatmap-filters';
import type { Point } from 'csdm/common/types/point';
import { HeatmapEvent } from 'csdm/common/types/heatmap-event';
import { db } from 'csdm/node/database/database';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { applyMatchRoundsFilter } from './apply-match-rounds-filter';

function buildBaseQuery(filters: TeamHeatmapFilter) {
  let query = db
    .selectFrom('kills')
    .innerJoin('matches', 'checksum', 'match_checksum')
    .innerJoin('demos', 'demos.checksum', 'matches.checksum')
    .where('demos.map_name', '=', filters.mapName);

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

  if (filters.tagIds.length > 0) {
    query = query
      .innerJoin('checksum_tags', 'checksum_tags.checksum', 'matches.checksum')
      .where('checksum_tags.tag_id', 'in', filters.tagIds);
  }

  if (filters.matchChecksums !== undefined && filters.matchChecksums.length > 0) {
    query = query.where('matches.checksum', 'in', filters.matchChecksums);
  }

  if (filters.matchRounds !== undefined && filters.matchRounds.length > 0) {
    query = applyMatchRoundsFilter(query, filters.matchRounds, 'kills.match_checksum', 'kills.round_number');
  }

  return query;
}

export async function fetchTeamKillsPoints(filters: TeamHeatmapFilter): Promise<Point[]> {
  switch (filters.event) {
    case HeatmapEvent.Kills: {
      let query = buildBaseQuery(filters)
        .select(['killer_x as x', 'killer_y as y'])
        .where('killer_team_name', '=', filters.teamName);

      if (filters.thresholdZ) {
        query = query.where('killer_z', filters.radarLevel === RadarLevel.Upper ? '>=' : '<', filters.thresholdZ);
      }

      if (filters.sides.length > 0) {
        query = query.where('killer_side', 'in', filters.sides);
      }

      if (filters.players.length > 0) {
        query = query.where(
          'kills.killer_steam_id',
          'in',
          filters.players.map((player) => player.steamId),
        );
      }

      const points = await query.execute();

      return points;
    }
    case HeatmapEvent.Deaths: {
      let query = buildBaseQuery(filters)
        .select(['victim_x as x', 'victim_y as y'])
        .where('victim_team_name', '=', filters.teamName);

      if (filters.thresholdZ) {
        query = query.where('victim_z', filters.radarLevel === RadarLevel.Upper ? '>=' : '<', filters.thresholdZ);
      }

      if (filters.sides.length > 0) {
        query = query.where('victim_side', 'in', filters.sides);
      }

      if (filters.players.length > 0) {
        query = query.where(
          'kills.victim_steam_id',
          'in',
          filters.players.map((player) => player.steamId),
        );
      }

      const points = await query.execute();

      return points;
    }
    default:
      throw new Error(`Unsupported kills points event: ${filters.event}`);
  }
}
