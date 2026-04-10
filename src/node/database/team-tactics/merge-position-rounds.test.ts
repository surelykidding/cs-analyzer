import { describe, expect, it } from 'vite-plus/test';
import { mergePositionRounds } from './merge-position-rounds';

describe('mergePositionRounds', () => {
  it('should keep full-match rounds first and add missing tactics rounds', () => {
    const rounds = mergePositionRounds(
      [
        { matchChecksum: 'match-a', roundNumber: 1 },
        { matchChecksum: 'match-b', roundNumber: 13 },
      ],
      [
        { matchChecksum: 'match-a', roundNumber: 1 },
        { matchChecksum: 'match-a', roundNumber: 13 },
        { matchChecksum: 'match-c', roundNumber: 1 },
      ],
    );

    expect(rounds).toEqual([
      { matchChecksum: 'match-a', roundNumber: 1 },
      { matchChecksum: 'match-a', roundNumber: 13 },
      { matchChecksum: 'match-b', roundNumber: 13 },
      { matchChecksum: 'match-c', roundNumber: 1 },
    ]);
  });
});
