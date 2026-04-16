import type { DeletePerfectWorldScoutingSessionPayload } from 'csdm/common/types/perfect-world-scouting';
import { perfectWorldScoutingSessionManager } from 'csdm/server/perfect-world-scouting-session-manager';

export async function deletePerfectWorldScoutingSessionHandler(payload: DeletePerfectWorldScoutingSessionPayload) {
  try {
    await perfectWorldScoutingSessionManager.deleteSession(payload.sessionId);
  } catch (error) {
    logger.error('Error while deleting Perfect World scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
