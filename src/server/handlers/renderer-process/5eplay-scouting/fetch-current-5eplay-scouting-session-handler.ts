import { fiveEPlayScoutingSessionManager } from 'csdm/server/5eplay-scouting-session-manager';

export async function fetchCurrent5EPlayScoutingSessionHandler() {
  try {
    return await fiveEPlayScoutingSessionManager.fetchCurrentSession();
  } catch (error) {
    logger.error('Error while fetching current 5EPlay scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
