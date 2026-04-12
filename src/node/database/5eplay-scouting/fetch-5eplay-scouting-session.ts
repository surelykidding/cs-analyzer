import { db } from 'csdm/node/database/database';
import { fiveEPlayScoutingRowsToSession } from './5eplay-scouting-row-to-session';

export async function fetch5EPlayScoutingSession(sessionId: string) {
  const sessionRow = await db
    .selectFrom('5eplay_scouting_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (sessionRow === undefined) {
    return undefined;
  }

  const targetRows = await db
    .selectFrom('5eplay_scouting_targets')
    .selectAll()
    .where('session_id', '=', sessionId)
    .orderBy('sequence')
    .execute();

  return fiveEPlayScoutingRowsToSession(sessionRow, targetRows);
}
