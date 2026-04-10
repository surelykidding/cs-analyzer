import { sql } from 'kysely';
import type { TeamTacticsRound } from './team-tactics-round';

// oxlint-disable-next-line typescript/no-explicit-any
export function applyTeamTacticsRoundsFilter(query: any, rounds: TeamTacticsRound[], matchChecksumColumn: string, roundNumberColumn: string) {
  if (rounds.length === 0) {
    return query.where(sql<boolean>`false`);
  }

  return query.where((eb: any) => {
    return eb.or(
      rounds.map((round) => {
        return eb.and([
          eb(matchChecksumColumn, '=', round.matchChecksum),
          eb(roundNumberColumn, '=', round.roundNumber),
        ]);
      }),
    );
  });
}
