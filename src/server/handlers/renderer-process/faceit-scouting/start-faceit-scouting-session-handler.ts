import type { StartFaceitScoutingSessionPayload } from 'csdm/common/types/faceit-scouting';
import { faceitScoutingSessionManager } from 'csdm/server/faceit-scouting-session-manager';

export async function startFaceitScoutingSessionHandler(payload: StartFaceitScoutingSessionPayload) {
  try {
    return await faceitScoutingSessionManager.startSession(payload);
  } catch (error) {
    logger.error('Error while starting FACEIT scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
