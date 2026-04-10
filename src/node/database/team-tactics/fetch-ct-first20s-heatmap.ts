import { TeamNumber } from 'csdm/common/types/counter-strike';
import type { TeamTacticsPayload, WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { fetchTacticsPositionHeatmap } from './fetch-pistol-round-position-heatmap';
import type { TeamTacticsRound } from './team-tactics-round';

export async function fetchCtFirst20SecondsHeatmap(
  rounds: TeamTacticsRound[],
  payload: TeamTacticsPayload,
  mapScale: number,
): Promise<WeightedMapPoint[]> {
  return fetchTacticsPositionHeatmap(rounds, payload, mapScale, TeamNumber.CT);
}
