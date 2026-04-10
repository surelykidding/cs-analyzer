import { RadarLevel } from 'csdm/ui/maps/radar-level';

// oxlint-disable-next-line typescript/no-explicit-any
export function applyTeamTacticsRadarLevelFilter(query: any, zColumn: string, radarLevel: RadarLevel, thresholdZ: number | null) {
  if (thresholdZ === null) {
    return query;
  }

  return query.where(zColumn, radarLevel === RadarLevel.Upper ? '>=' : '<', thresholdZ);
}
