import type { PerfectWorldScoutingTacticsPayload } from 'csdm/common/types/perfect-world-scouting';
import { fetchPerfectWorldScoutingTactics } from 'csdm/node/database/perfect-world-scouting/fetch-perfect-world-scouting-tactics';

export async function fetchPerfectWorldScoutingTacticsHandler(payload: PerfectWorldScoutingTacticsPayload) {
  try {
    return await fetchPerfectWorldScoutingTactics(payload);
  } catch (error) {
    logger.error('Error while fetching Perfect World scouting tactics');
    logger.error(error);
    throw error instanceof Error ? error.message : error;
  }
}
