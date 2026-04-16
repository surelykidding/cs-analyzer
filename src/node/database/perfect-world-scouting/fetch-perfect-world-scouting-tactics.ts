import type {
  PerfectWorldScoutingTacticsPayload,
  PerfectWorldScoutingTacticsResponse,
} from 'csdm/common/types/perfect-world-scouting';
import { fetchTeamTactics } from '../team-tactics/fetch-team-tactics';
import { fetchPerfectWorldScoutingSession } from './fetch-perfect-world-scouting-session';

function emptyResponse(payload: PerfectWorldScoutingTacticsPayload): PerfectWorldScoutingTacticsResponse {
  return {
    side: payload.side,
    selectedMatchCount: 0,
    analyzedMatchCount: 0,
    roundCount: 0,
    skippedMatchesWithoutPositions: 0,
    skippedMatchChecksums: [],
    skippedRoundCount: 0,
    heGrenadePoints: [],
    ctAwpHeatmapPoints: [],
    fireGrenadePoints: [],
    smokeGrenadePoints: [],
    flashGrenadePoints: [],
    tHeatmapPoints: [],
    killPoints: [],
    deathPoints: [],
    ctHeatmapPoints: [],
  };
}

export async function fetchPerfectWorldScoutingTactics(
  payload: PerfectWorldScoutingTacticsPayload,
): Promise<PerfectWorldScoutingTacticsResponse> {
  const session = await fetchPerfectWorldScoutingSession(payload.sessionId);
  if (session === undefined) {
    return emptyResponse(payload);
  }

  const readyTargets = session.targets.filter((target) => {
    return target.status === 'ready' && target.demoChecksum !== null && target.localTeamName !== null;
  });
  if (readyTargets.length === 0) {
    return emptyResponse(payload);
  }

  const responses = await Promise.all(
    readyTargets.map((target) => {
      return fetchTeamTactics({
        teamName: target.localTeamName ?? '',
        matchChecksums: target.demoChecksum ? [target.demoChecksum] : [],
        mapName: session.sourceMatch.mapName,
        side: payload.side,
        economyType: payload.economyType,
        ctWindowStartSeconds: payload.ctWindowStartSeconds,
        ctWindowEndSeconds: payload.ctWindowEndSeconds,
        radarLevel: payload.radarLevel,
        thresholdZ: payload.thresholdZ,
      });
    }),
  );

  return {
    side: payload.side,
    selectedMatchCount: readyTargets.length,
    analyzedMatchCount: responses.reduce((count, response) => count + response.analyzedMatchCount, 0),
    roundCount: responses.reduce((count, response) => count + response.roundCount, 0),
    skippedMatchesWithoutPositions: new Set(
      responses.flatMap((response) => response.skippedMatchChecksums),
    ).size,
    skippedMatchChecksums: [...new Set(responses.flatMap((response) => response.skippedMatchChecksums))],
    skippedRoundCount: responses.reduce((count, response) => count + response.skippedRoundCount, 0),
    heGrenadePoints: responses.flatMap((response) => response.heGrenadePoints),
    ctAwpHeatmapPoints: responses.flatMap((response) => response.ctAwpHeatmapPoints),
    fireGrenadePoints: responses.flatMap((response) => response.fireGrenadePoints),
    smokeGrenadePoints: responses.flatMap((response) => response.smokeGrenadePoints),
    flashGrenadePoints: responses.flatMap((response) => response.flashGrenadePoints),
    tHeatmapPoints: responses.flatMap((response) => response.tHeatmapPoints),
    killPoints: responses.flatMap((response) => response.killPoints),
    deathPoints: responses.flatMap((response) => response.deathPoints),
    ctHeatmapPoints: responses.flatMap((response) => response.ctHeatmapPoints),
  };
}
