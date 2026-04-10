import { describe, expect, it } from 'vite-plus/test';
import { aggregateMapPoints } from './aggregate-map-points';

describe('aggregateMapPoints', () => {
  it('should aggregate points by grid cell and return cell centers', () => {
    const points = [
      { x: 10, y: 10 },
      { x: 19, y: 11 },
      { x: 35, y: 41 },
    ];

    expect(aggregateMapPoints(points, 20)).toEqual([
      { x: 10, y: 10, count: 2 },
      { x: 30, y: 50, count: 1 },
    ]);
  });

  it('should handle negative coordinates consistently', () => {
    const points = [
      { x: -1, y: -1 },
      { x: -10, y: -15 },
    ];

    expect(aggregateMapPoints(points, 20)).toEqual([{ x: -10, y: -10, count: 2 }]);
  });
});
