import { db } from 'csdm/node/database/database';
import { mergePositionRounds, type PositionRound } from './merge-position-rounds';

async function fetchPositionRoundsFromTable(
  tableName: 'player_positions' | 'team_tactics_player_positions',
  checksums: string[],
  roundNumbers: number[],
): Promise<PositionRound[]> {
  return db
    .selectFrom(tableName)
    .distinctOn(['match_checksum', 'round_number'])
    .select(['match_checksum as matchChecksum', 'round_number as roundNumber'])
    .where('match_checksum', 'in', checksums)
    .where('round_number', 'in', roundNumbers)
    .orderBy('match_checksum')
    .orderBy('round_number')
    .execute();
}

export async function fetchEffectivePositionRounds(checksums: string[], roundNumbers: number[]) {
  if (checksums.length === 0 || roundNumbers.length === 0) {
    return [];
  }

  const [fullMatchRounds, tacticsRounds] = await Promise.all([
    fetchPositionRoundsFromTable('player_positions', checksums, roundNumbers),
    fetchPositionRoundsFromTable('team_tactics_player_positions', checksums, roundNumbers),
  ]);

  return mergePositionRounds(fullMatchRounds, tacticsRounds);
}
