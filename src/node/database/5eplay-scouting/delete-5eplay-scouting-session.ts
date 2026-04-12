import { db } from 'csdm/node/database/database';

export async function delete5EPlayScoutingSession(sessionId: string) {
  await db.transaction().execute(async (transaction) => {
    await transaction.deleteFrom('5eplay_scouting_sessions').where('id', '=', sessionId).execute();
  });
}
