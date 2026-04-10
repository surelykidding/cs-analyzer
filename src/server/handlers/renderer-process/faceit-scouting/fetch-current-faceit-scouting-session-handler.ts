import { faceitScoutingSessionManager } from 'csdm/server/faceit-scouting-session-manager';

export async function fetchCurrentFaceitScoutingSessionHandler() {
  try {
    return await faceitScoutingSessionManager.fetchCurrentSession();
  } catch (error) {
    logger.error('Error while fetching current FACEIT scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
