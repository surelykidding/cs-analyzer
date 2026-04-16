import { db } from 'csdm/node/database/database';
import { fetchPerfectWorldScoutingSession } from './fetch-perfect-world-scouting-session';

export async function fetchCurrentPerfectWorldScoutingSession() {
  const row = await db
    .selectFrom('perfect_world_scouting_sessions')
    .select('id')
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (row === undefined) {
    return undefined;
  }

  return fetchPerfectWorldScoutingSession(row.id);
}
