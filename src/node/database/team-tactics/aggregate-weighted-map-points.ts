import type { WeightedMapPoint } from 'csdm/common/types/team-tactics';

type AggregateBucket = {
  count: number;
  totalX: number;
  totalY: number;
};

export function aggregateWeightedMapPoints(points: WeightedMapPoint[], gridSize: number): WeightedMapPoint[] {
  const buckets = new Map<string, AggregateBucket>();

  for (const point of points) {
    const bucketX = Math.floor(point.x / gridSize);
    const bucketY = Math.floor(point.y / gridSize);
    const key = `${bucketX}:${bucketY}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.count += point.count;
      existing.totalX += point.x * point.count;
      existing.totalY += point.y * point.count;
      continue;
    }

    buckets.set(key, {
      count: point.count,
      totalX: point.x * point.count,
      totalY: point.y * point.count,
    });
  }

  return [...buckets.values()]
    .map((bucket) => {
      return {
        x: bucket.totalX / bucket.count,
        y: bucket.totalY / bucket.count,
        count: bucket.count,
      };
    })
    .sort((pointA, pointB) => pointB.count - pointA.count);
}
