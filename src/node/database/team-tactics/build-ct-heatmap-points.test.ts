import { describe, expect, it } from 'vite-plus/test';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { buildCtHeatmapPoints, type CtHeatmapPositionRow } from './build-ct-heatmap-points';

function createRow(overrides: Partial<CtHeatmapPositionRow> = {}): CtHeatmapPositionRow {
  return {
    matchChecksum: 'checksum',
    roundNumber: 1,
    playerSteamId: 'steam-id',
    tick: 0,
    x: 0,
    y: 0,
    z: 10,
    isAlive: true,
    tickrate: 64,
    windowEndTick: 64,
    ...overrides,
  };
}

describe('buildCtHeatmapPoints', () => {
  it('should make long defensive holds hotter than short transit positions', () => {
    const points = buildCtHeatmapPoints(
      [
        createRow({ tick: 0, x: 0, windowEndTick: 448 }),
        createRow({ tick: 64, x: 100, windowEndTick: 448 }),
        createRow({ tick: 384, x: 200, windowEndTick: 448 }),
      ],
      RadarLevel.Upper,
      0,
      1,
    );

    expect(points).toEqual([
      { x: 100, y: 0, count: 5 },
      { x: 0, y: 0, count: 1 },
      { x: 200, y: 0, count: 1 },
    ]);
  });

  it('should keep dwell on real occupied cells instead of creating midpoint hotspots', () => {
    const points = buildCtHeatmapPoints(
      [
        createRow({ tick: 0, x: 0, windowEndTick: 64 }),
        createRow({ tick: 32, x: 100, windowEndTick: 64 }),
      ],
      RadarLevel.Upper,
      0,
      1,
    );

    expect(points).toHaveLength(2);
    expect(points.some((point) => point.x > 40 && point.x < 60)).toBe(false);
    expect(points).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0, count: 0.5 },
        { x: 100, y: 0, count: 0.5 },
      ]),
    );
  });

  it('should fallback to a 64 tickrate when demos tickrate is 0', () => {
    const points = buildCtHeatmapPoints(
      [createRow({ tick: 0, tickrate: 0, windowEndTick: 64 })],
      RadarLevel.Upper,
      0,
      1,
    );

    expect(points).toEqual([{ x: 0, y: 0, count: 1 }]);
  });

  it('should keep points from both z sides when the map has no lower radar', () => {
    const points = buildCtHeatmapPoints(
      [
        createRow({ tick: 0, x: 0, z: 10, windowEndTick: 64 }),
        createRow({ tick: 0, playerSteamId: 'steam-id-2', x: 100, z: -10, windowEndTick: 64 }),
      ],
      RadarLevel.Upper,
      null,
      1,
    );

    expect(points).toEqual([
      { x: 0, y: 0, count: 1 },
      { x: 100, y: 0, count: 1 },
    ]);
  });

  it('should dedupe duplicate ticks from the same player stream', () => {
    const points = buildCtHeatmapPoints(
      [
        createRow({ tick: 0, x: 0, windowEndTick: 64 }),
        createRow({ tick: 0, x: 0, windowEndTick: 64 }),
      ],
      RadarLevel.Upper,
      0,
      1,
    );

    expect(points).toEqual([{ x: 0, y: 0, count: 1 }]);
  });
});
