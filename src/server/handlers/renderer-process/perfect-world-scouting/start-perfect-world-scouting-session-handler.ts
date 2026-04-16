import type { StartPerfectWorldScoutingSessionPayload } from 'csdm/common/types/perfect-world-scouting';
import { perfectWorldScoutingSessionManager } from 'csdm/server/perfect-world-scouting-session-manager';

export async function startPerfectWorldScoutingSessionHandler(payload: StartPerfectWorldScoutingSessionPayload) {
  try {
    return await perfectWorldScoutingSessionManager.startSession(payload);
  } catch (error) {
    logger.error('Error while starting Perfect World scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
