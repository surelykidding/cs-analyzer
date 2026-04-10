import { describe, expect, it } from 'vite-plus/test';
import { mergePositionHeatmapRows } from './merge-position-heatmap-rows';
import type { PositionHeatmapRow } from './build-position-heatmap-points';

function createRow(overrides: Partial<PositionHeatmapRow> = {}): PositionHeatmapRow {
  return {
    matchChecksum: 'match-a',
    roundNumber: 1,
    playerSteamId: 'steam-1',
    tick: 64,
    x: 10,
    y: 20,
    z: 30,
    isAlive: true,
    tickrate: 64,
    windowEndTick: 128,
    ...overrides,
  };
}

describe('mergePositionHeatmapRows', () => {
  it('should prefer full-match rows for rounds that already exist there', () => {
    const rows = mergePositionHeatmapRows(
      [createRow({ matchChecksum: 'match-a', roundNumber: 1, x: 100 })],
      [
        createRow({ matchChecksum: 'match-a', roundNumber: 1, x: 200 }),
        createRow({ matchChecksum: 'match-a', roundNumber: 13, x: 300 }),
      ],
    );

    expect(rows).toEqual([
      createRow({ matchChecksum: 'match-a', roundNumber: 1, x: 100 }),
      createRow({ matchChecksum: 'match-a', roundNumber: 13, x: 300 }),
    ]);
  });

  it('should sort merged rows by match, round, player and tick', () => {
    const rows = mergePositionHeatmapRows(
      [createRow({ matchChecksum: 'match-b', roundNumber: 13, playerSteamId: 'steam-2', tick: 128 })],
      [
        createRow({ matchChecksum: 'match-a', roundNumber: 13, playerSteamId: 'steam-2', tick: 256 }),
        createRow({ matchChecksum: 'match-a', roundNumber: 13, playerSteamId: 'steam-1', tick: 128 }),
      ],
    );

    expect(rows).toEqual([
      createRow({ matchChecksum: 'match-a', roundNumber: 13, playerSteamId: 'steam-1', tick: 128 }),
      createRow({ matchChecksum: 'match-a', roundNumber: 13, playerSteamId: 'steam-2', tick: 256 }),
      createRow({ matchChecksum: 'match-b', roundNumber: 13, playerSteamId: 'steam-2', tick: 128 }),
    ]);
  });
});
