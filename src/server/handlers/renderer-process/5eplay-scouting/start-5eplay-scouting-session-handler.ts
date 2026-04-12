import type { Start5EPlayScoutingSessionPayload } from 'csdm/common/types/5eplay-scouting';
import { fiveEPlayScoutingSessionManager } from 'csdm/server/5eplay-scouting-session-manager';

export async function start5EPlayScoutingSessionHandler(payload: Start5EPlayScoutingSessionPayload) {
  try {
    return await fiveEPlayScoutingSessionManager.startSession(payload);
  } catch (error) {
    logger.error('Error while starting 5EPlay scouting session');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
