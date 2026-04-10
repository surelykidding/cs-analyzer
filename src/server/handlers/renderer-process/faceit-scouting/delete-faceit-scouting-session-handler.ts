import type { DeleteFaceitScoutingSessionPayload } from 'csdm/common/types/faceit-scouting';
import { faceitScoutingSessionManager } from 'csdm/server/faceit-scouting-session-manager';

export async function deleteFaceitScoutingSessionHandler(payload: DeleteFaceitScoutingSessionPayload) {
  try {
    await faceitScoutingSessionManager.deleteSession(payload.sessionId);
  } catch (error) {
    logger.error('Error while deleting FACEIT scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
