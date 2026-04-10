import type { TeamTacticsPayload } from 'csdm/common/types/team-tactics';
import { fetchTeamTactics } from 'csdm/node/database/team-tactics/fetch-team-tactics';
import { handleError } from '../../handle-error';

export async function fetchTeamTacticsHandler(payload: TeamTacticsPayload) {
  try {
    return await fetchTeamTactics(payload);
  } catch (error) {
    handleError(error, `Error while fetching team tactics for ${payload.teamName}`);
  }
}
