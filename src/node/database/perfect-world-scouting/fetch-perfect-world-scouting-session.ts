import { db } from 'csdm/node/database/database';
import { perfectWorldScoutingRowsToSession } from './perfect-world-scouting-row-to-session';

export async function fetchPerfectWorldScoutingSession(sessionId: string) {
  const sessionRow = await db
    .selectFrom('perfect_world_scouting_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (sessionRow === undefined) {
    return undefined;
  }

  const targetRows = await db
    .selectFrom('perfect_world_scouting_targets')
    .selectAll()
    .where('session_id', '=', sessionId)
    .orderBy('sequence')
    .execute();

  return perfectWorldScoutingRowsToSession(sessionRow, targetRows);
}
