import type { EconomyType, TeamNumber } from 'csdm/common/types/counter-strike';
import { Game } from 'csdm/common/types/counter-strike';
import { db } from 'csdm/node/database/database';
import type { TeamTacticsRound } from './team-tactics-round';

export async function fetchTeamTacticsRounds(
  matchChecksums: string[],
  teamName: string,
  mapName: string,
  side: TeamNumber,
  economyType: EconomyType,
): Promise<TeamTacticsRound[]> {
  if (matchChecksums.length === 0) {
    return [];
  }

  const rows = await db
    .selectFrom('rounds')
    .innerJoin('demos', 'demos.checksum', 'rounds.match_checksum')
    .select([
      'rounds.match_checksum as matchChecksum',
      'rounds.number as roundNumber',
      'rounds.start_tick as startTick',
      'rounds.freeze_time_end_tick as freezeTimeEndTick',
      'demos.tickrate as tickrate',
    ])
    .where('rounds.match_checksum', 'in', matchChecksums)
    .where('demos.map_name', '=', mapName)
    .where('demos.game', '=', Game.CS2)
    .where((eb) => {
      return eb.or([
        eb.and([
          eb('rounds.team_a_name', '=', teamName),
          eb('rounds.team_a_side', '=', side),
          eb('rounds.team_a_economy_type', '=', economyType),
        ]),
        eb.and([
          eb('rounds.team_b_name', '=', teamName),
          eb('rounds.team_b_side', '=', side),
          eb('rounds.team_b_economy_type', '=', economyType),
        ]),
      ]);
    })
    .orderBy('rounds.match_checksum')
    .orderBy('rounds.number')
    .execute();

  return rows;
}
