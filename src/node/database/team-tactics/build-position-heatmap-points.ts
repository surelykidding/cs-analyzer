import type { WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { RadarLevel } from 'csdm/ui/maps/radar-level';

const defaultTickrate = 64;

export type PositionHeatmapRow = {
  matchChecksum: string;
  roundNumber: number;
  playerSteamId: string;
  tick: number;
  x: number;
  y: number;
  z: number;
  isAlive: boolean;
  tickrate: number;
  windowEndTick: number;
};

function getEffectiveTickrate(tickrate: number) {
  return tickrate > 0 ? tickrate : defaultTickrate;
}

function isRowVisibleOnRadarLevel(row: PositionHeatmapRow, radarLevel: RadarLevel, thresholdZ: number | null) {
  if (thresholdZ === null) {
    return true;
  }

  return radarLevel === RadarLevel.Upper ? row.z >= thresholdZ : row.z < thresholdZ;
}

function compareRows(a: PositionHeatmapRow, b: PositionHeatmapRow) {
  if (a.matchChecksum !== b.matchChecksum) {
    return a.matchChecksum.localeCompare(b.matchChecksum);
  }

  if (a.roundNumber !== b.roundNumber) {
    return a.roundNumber - b.roundNumber;
  }

  if (a.playerSteamId !== b.playerSteamId) {
    return a.playerSteamId.localeCompare(b.playerSteamId);
  }

  return a.tick - b.tick;
}

function isSamePlayerPositionStream(a: PositionHeatmapRow, b: PositionHeatmapRow) {
  return a.matchChecksum === b.matchChecksum && a.roundNumber === b.roundNumber && a.playerSteamId === b.playerSteamId;
}

function dedupeRowsPerTick(rows: PositionHeatmapRow[]) {
  const dedupedRows: PositionHeatmapRow[] = [];

  for (const row of rows) {
    const previousRow = dedupedRows[dedupedRows.length - 1];
    if (previousRow && isSamePlayerPositionStream(previousRow, row) && previousRow.tick === row.tick) {
      continue;
    }

    dedupedRows.push(row);
  }

  return dedupedRows;
}

function mergeExactWeightedPoints(points: WeightedMapPoint[]) {
  const mergedPoints = new Map<string, WeightedMapPoint>();

  for (const point of points) {
    const key = `${point.x}:${point.y}`;
    const existingPoint = mergedPoints.get(key);

    if (existingPoint) {
      existingPoint.count += point.count;
      continue;
    }

    mergedPoints.set(key, { ...point });
  }

  return [...mergedPoints.values()].sort((pointA, pointB) => {
    if (pointA.count !== pointB.count) {
      return pointB.count - pointA.count;
    }

    if (pointA.x !== pointB.x) {
      return pointA.x - pointB.x;
    }

    return pointA.y - pointB.y;
  });
}

export function buildPositionHeatmapPoints(
  rows: PositionHeatmapRow[],
  radarLevel: RadarLevel,
  thresholdZ: number | null,
  _mapScale: number,
): WeightedMapPoint[] {
  if (rows.length === 0) {
    return [];
  }

  const sortedRows = [...rows].sort(compareRows);
  const dedupedRows = dedupeRowsPerTick(sortedRows);
  const weightedPoints: WeightedMapPoint[] = [];

  for (let index = 0; index < dedupedRows.length; index++) {
    const row = dedupedRows[index];
    const nextRow = dedupedRows[index + 1];
    const nextTick = nextRow && isSamePlayerPositionStream(row, nextRow) ? nextRow.tick : row.windowEndTick;
    const durationTicks = Math.max(0, Math.min(nextTick, row.windowEndTick) - row.tick);

    if (durationTicks === 0 || !row.isAlive || !isRowVisibleOnRadarLevel(row, radarLevel, thresholdZ)) {
      continue;
    }

    weightedPoints.push({
      x: row.x,
      y: row.y,
      count: durationTicks / getEffectiveTickrate(row.tickrate),
    });
  }

  return mergeExactWeightedPoints(weightedPoints);
}
