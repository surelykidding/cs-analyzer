import { db } from 'csdm/node/database/database';
import { faceitScoutingRowsToSession } from './faceit-scouting-row-to-session';

export async function fetchFaceitScoutingSession(sessionId: string) {
  const sessionRow = await db
    .selectFrom('faceit_scouting_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (sessionRow === undefined) {
    return undefined;
  }

  const targetRows = await db
    .selectFrom('faceit_scouting_targets')
    .selectAll()
    .where('session_id', '=', sessionId)
    .orderBy('sequence')
    .execute();

  return faceitScoutingRowsToSession(sessionRow, targetRows);
}
