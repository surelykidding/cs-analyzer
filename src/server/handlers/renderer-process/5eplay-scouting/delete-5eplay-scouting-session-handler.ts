import type { Delete5EPlayScoutingSessionPayload } from 'csdm/common/types/5eplay-scouting';
import { fiveEPlayScoutingSessionManager } from 'csdm/server/5eplay-scouting-session-manager';

export async function delete5EPlayScoutingSessionHandler(payload: Delete5EPlayScoutingSessionPayload) {
  try {
    await fiveEPlayScoutingSessionManager.deleteSession(payload.sessionId);
  } catch (error) {
    logger.error('Error while deleting 5EPlay scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
