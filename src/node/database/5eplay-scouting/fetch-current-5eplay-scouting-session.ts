import { db } from 'csdm/node/database/database';
import { fiveEPlayScoutingRowsToSession } from './5eplay-scouting-row-to-session';

export async function fetchCurrent5EPlayScoutingSession() {
  const sessionRow = await db
    .selectFrom('5eplay_scouting_sessions')
    .selectAll()
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (sessionRow === undefined) {
    return undefined;
  }

  const targetRows = await db
    .selectFrom('5eplay_scouting_targets')
    .selectAll()
    .where('session_id', '=', sessionRow.id)
    .orderBy('sequence')
    .execute();

  return fiveEPlayScoutingRowsToSession(sessionRow, targetRows);
}
