import { RadarLevel } from 'csdm/ui/maps/radar-level';

type QueryWithRadarLevelWhere<Query> = {
  where(column: string, operator: '>=' | '<', value: number): Query;
};

export function applyTeamTacticsRadarLevelFilter<Query extends QueryWithRadarLevelWhere<Query>>(
  query: Query,
  zColumn: string,
  radarLevel: RadarLevel,
  thresholdZ: number | null,
) {
  if (thresholdZ === null) {
    return query;
  }

  return query.where(zColumn, radarLevel === RadarLevel.Upper ? '>=' : '<', thresholdZ);
}
