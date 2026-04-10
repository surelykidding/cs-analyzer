import { TeamNumber } from 'csdm/common/types/counter-strike';
import { HeatmapEvent } from 'csdm/common/types/heatmap-event';
import type { TeamHeatmapFilter } from 'csdm/common/types/heatmap-filters';
import type { Point } from 'csdm/common/types/point';
import type { TeamTacticsPayload, WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { fetchTeamKillsPoints } from 'csdm/node/database/heatmap/fetch-team-kills-points';
import type { TeamTacticsRound } from './team-tactics-round';

export async function fetchTKillPositions(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  _mapScale: number,
): Promise<WeightedMapPoint[]> {
  if (rounds.length === 0) {
    return [];
  }

  const filter: TeamHeatmapFilter = {
    demoTypes: [],
    endDate: undefined,
    event: HeatmapEvent.Kills,
    gameModes: [],
    games: [],
    mapName: payload.mapName,
    maxRounds: [],
    sides: [TeamNumber.T],
    sources: [],
    startDate: undefined,
    tagIds: [],
    teamName: payload.teamName,
    radarLevel: payload.radarLevel,
    thresholdZ: payload.thresholdZ,
    players: payload.players ?? [],
    matchChecksums: payload.matchChecksums,
    matchRounds: rounds.map((round) => {
      return {
        matchChecksum: round.matchChecksum,
        roundNumber: round.roundNumber,
      };
    }),
  };
  const points: Point[] = await fetchTeamKillsPoints(filter);

  return points.map((point) => {
    return {
      ...point,
      count: 1,
    };
  });
}
