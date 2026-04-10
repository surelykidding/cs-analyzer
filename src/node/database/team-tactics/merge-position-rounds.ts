export type PositionRound = {
  matchChecksum: string;
  roundNumber: number;
};

function comparePositionRounds(positionRoundA: PositionRound, positionRoundB: PositionRound) {
  if (positionRoundA.matchChecksum !== positionRoundB.matchChecksum) {
    return positionRoundA.matchChecksum.localeCompare(positionRoundB.matchChecksum);
  }

  return positionRoundA.roundNumber - positionRoundB.roundNumber;
}

export function mergePositionRounds(primaryRounds: PositionRound[], fallbackRounds: PositionRound[]) {
  const primaryRoundKeys = new Set(
    primaryRounds.map((round) => {
      return `${round.matchChecksum}:${round.roundNumber}`;
    }),
  );

  const mergedRounds = [...primaryRounds];
  for (const fallbackRound of fallbackRounds) {
    const key = `${fallbackRound.matchChecksum}:${fallbackRound.roundNumber}`;
    if (primaryRoundKeys.has(key)) {
      continue;
    }

    mergedRounds.push(fallbackRound);
  }

  return mergedRounds.sort(comparePositionRounds);
}
