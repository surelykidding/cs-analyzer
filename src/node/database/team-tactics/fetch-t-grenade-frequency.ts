import { TeamNumber } from 'csdm/common/types/counter-strike';
import { HeatmapEvent } from 'csdm/common/types/heatmap-event';
import type { TeamHeatmapFilter } from 'csdm/common/types/heatmap-filters';
import type { Point } from 'csdm/common/types/point';
import type { TeamTacticsPayload, WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { TeamTacticsGrenadeType } from 'csdm/common/types/team-tactics';
import { fetchTeamGrenadePoints } from 'csdm/node/database/heatmap/fetch-team-grenade-points';
import { getGrenadeNamesFromType } from './get-grenade-names-from-type';
import type { TeamTacticsRound } from './team-tactics-round';

export async function fetchTeamGrenadeFrequency(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  _mapScale: number,
  grenadeType: TeamTacticsGrenadeType,
): Promise<WeightedMapPoint[]> {
  if (rounds.length === 0) {
    return [];
  }

  const filter: TeamHeatmapFilter = {
    demoTypes: [],
    endDate: undefined,
    event:
      grenadeType === TeamTacticsGrenadeType.All
        ? HeatmapEvent.Smoke
        : grenadeType === TeamTacticsGrenadeType.Smoke
        ? HeatmapEvent.Smoke
        : grenadeType === TeamTacticsGrenadeType.Flashbang
          ? HeatmapEvent.Flashbang
          : HeatmapEvent.Molotov,
    gameModes: [],
    games: [],
    mapName: payload.mapName,
    maxRounds: [],
    sides: [payload.side ?? TeamNumber.T],
    sources: [],
    startDate: undefined,
    tagIds: [],
    teamName: payload.teamName,
    radarLevel: payload.radarLevel,
    thresholdZ: payload.thresholdZ,
    players: payload.players ?? [],
    grenadeNames: getGrenadeNamesFromType(grenadeType),
    matchChecksums: payload.matchChecksums,
    matchRounds: rounds.map((round) => {
      return {
        matchChecksum: round.matchChecksum,
        roundNumber: round.roundNumber,
      };
    }),
  };
  const points: Point[] = await fetchTeamGrenadePoints(filter);

  return points.map((point) => {
    return {
      ...point,
      count: 1,
    };
  });
}
