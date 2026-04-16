import { db } from 'csdm/node/database/database';

export async function deletePerfectWorldScoutingSession(sessionId: string) {
  await db.deleteFrom('perfect_world_scouting_sessions').where('id', '=', sessionId).execute();
}
