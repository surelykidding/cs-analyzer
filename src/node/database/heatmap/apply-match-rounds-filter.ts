import { sql } from 'kysely';
import type { MatchRoundFilter } from 'csdm/common/types/heatmap-filters';

// oxlint-disable-next-line typescript/no-explicit-any
export function applyMatchRoundsFilter(query: any, rounds: MatchRoundFilter[], matchChecksumColumn: string, roundNumberColumn: string) {
  if (rounds.length === 0) {
    return query.where(sql<boolean>`false`);
  }

  // oxlint-disable-next-line typescript/no-explicit-any
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
