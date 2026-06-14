import { sql, type RawBuilder } from 'kysely';
import type { TeamTacticsRound } from './team-tactics-round';

type RoundExpression = unknown;

type RoundExpressionBuilder = {
  (column: string, operator: '=', value: string | number): RoundExpression;
  and(expressions: RoundExpression[]): RoundExpression;
  or(expressions: RoundExpression[]): RoundExpression;
};

type QueryWithRoundWhere<Query> = {
  where(condition: RawBuilder<boolean>): Query;
  where(callback: (eb: RoundExpressionBuilder) => RoundExpression): Query;
};

export function applyTeamTacticsRoundsFilter<Query extends QueryWithRoundWhere<Query>>(
  query: Query,
  rounds: TeamTacticsRound[],
  matchChecksumColumn: string,
  roundNumberColumn: string,
) {
  if (rounds.length === 0) {
    return query.where(sql<boolean>`false`);
  }

  return query.where((eb) => {
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
