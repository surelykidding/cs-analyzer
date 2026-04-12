import type { FiveEPlayScoutingTacticsPayload } from 'csdm/common/types/5eplay-scouting';
import { fetch5EPlayScoutingTactics } from 'csdm/node/database/5eplay-scouting/fetch-5eplay-scouting-tactics';

export async function fetch5EPlayScoutingTacticsHandler(payload: FiveEPlayScoutingTacticsPayload) {
  try {
    return await fetch5EPlayScoutingTactics(payload);
  } catch (error) {
    logger.error('Error while fetching 5EPlay scouting tactics');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
