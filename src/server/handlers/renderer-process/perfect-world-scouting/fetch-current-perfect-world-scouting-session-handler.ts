import { perfectWorldScoutingSessionManager } from 'csdm/server/perfect-world-scouting-session-manager';

export async function fetchCurrentPerfectWorldScoutingSessionHandler() {
  try {
    return await perfectWorldScoutingSessionManager.fetchCurrentSession();
  } catch (error) {
    logger.error('Error while fetching current Perfect World scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
