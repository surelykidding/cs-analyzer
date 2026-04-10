import type { Point } from 'csdm/common/types/point';
import type { WeightedMapPoint } from 'csdm/common/types/team-tactics';

export function aggregateMapPoints(points: Point[], gridSize: number): WeightedMapPoint[] {
  const buckets = new Map<string, WeightedMapPoint>();

  for (const point of points) {
    const bucketX = Math.floor(point.x / gridSize);
    const bucketY = Math.floor(point.y / gridSize);
    const key = `${bucketX}:${bucketY}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    buckets.set(key, {
      x: (bucketX + 0.5) * gridSize,
      y: (bucketY + 0.5) * gridSize,
      count: 1,
    });
  }

  return [...buckets.values()].sort((pointA, pointB) => pointB.count - pointA.count);
}
