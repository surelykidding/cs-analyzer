import type { PerfectWorldMatch } from 'csdm/common/types/perfect-world-match';
import { fetchLastPerfectWorldMatches } from 'csdm/node/perfect-world/fetch-last-perfect-world-matches';
import { handleError } from '../../handle-error';

export async function fetchLastPerfectWorldMatchesHandler(accountId: string): Promise<PerfectWorldMatch[]> {
  try {
    return await fetchLastPerfectWorldMatches(accountId);
  } catch (error) {
    if (typeof error === 'string') {
      logger.error(`Error while fetching last Perfect World matches for account ${accountId}`);
      logger.error(error);
      throw error;
    }

    if (error instanceof Error && error.message !== '') {
      logger.error(`Error while fetching last Perfect World matches for account ${accountId}`);
      logger.error(error);
      throw error.message;
    }

    handleError(error, 'Error while fetching last Perfect World matches');
  }
}
