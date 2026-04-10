import type { FaceitScoutingTacticsPayload } from 'csdm/common/types/faceit-scouting';
import { fetchFaceitScoutingTactics } from 'csdm/node/database/faceit-scouting/fetch-faceit-scouting-tactics';

export async function fetchFaceitScoutingTacticsHandler(payload: FaceitScoutingTacticsPayload) {
  try {
    return await fetchFaceitScoutingTactics(payload);
  } catch (error) {
    logger.error('Error while fetching FACEIT scouting tactics');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
