import { db } from 'csdm/node/database/database';
import { faceitScoutingRowsToSession } from './faceit-scouting-row-to-session';

export async function fetchCurrentFaceitScoutingSession() {
  const sessionRow = await db
    .selectFrom('faceit_scouting_sessions')
    .selectAll()
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (sessionRow === undefined) {
    return undefined;
  }

  const targetRows = await db
    .selectFrom('faceit_scouting_targets')
    .selectAll()
    .where('session_id', '=', sessionRow.id)
    .orderBy('sequence')
    .execute();

  return faceitScoutingRowsToSession(sessionRow, targetRows);
}
