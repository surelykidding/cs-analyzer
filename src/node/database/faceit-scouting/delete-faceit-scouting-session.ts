import { db } from 'csdm/node/database/database';

export async function deleteFaceitScoutingSession(sessionId: string) {
  await db.transaction().execute(async (transaction) => {
    await transaction.deleteFrom('faceit_scouting_sessions').where('id', '=', sessionId).execute();
  });
}
