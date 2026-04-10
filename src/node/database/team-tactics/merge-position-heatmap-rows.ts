import type { PositionHeatmapRow } from './build-position-heatmap-points';

function compareRows(rowA: PositionHeatmapRow, rowB: PositionHeatmapRow) {
  if (rowA.matchChecksum !== rowB.matchChecksum) {
    return rowA.matchChecksum.localeCompare(rowB.matchChecksum);
  }

  if (rowA.roundNumber !== rowB.roundNumber) {
    return rowA.roundNumber - rowB.roundNumber;
  }

  if (rowA.playerSteamId !== rowB.playerSteamId) {
    return rowA.playerSteamId.localeCompare(rowB.playerSteamId);
  }

  if (rowA.tick !== rowB.tick) {
    return rowA.tick - rowB.tick;
  }

  return rowA.windowEndTick - rowB.windowEndTick;
}

export function mergePositionHeatmapRows(primaryRows: PositionHeatmapRow[], fallbackRows: PositionHeatmapRow[]) {
  const primaryRoundKeys = new Set(
    primaryRows.map((row) => {
      return `${row.matchChecksum}:${row.roundNumber}`;
    }),
  );

  const mergedRows = [...primaryRows];
  for (const fallbackRow of fallbackRows) {
    const roundKey = `${fallbackRow.matchChecksum}:${fallbackRow.roundNumber}`;
    if (primaryRoundKeys.has(roundKey)) {
      continue;
    }

    mergedRows.push(fallbackRow);
  }

  return mergedRows.sort(compareRows);
}
