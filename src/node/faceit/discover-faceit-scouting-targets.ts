import { Game } from 'csdm/common/types/counter-strike';
import { extractFaceitMatchId } from './extract-faceit-match-id';
import { fetchFaceitMatchWithRoster } from './fetch-faceit-match-with-roster';
import { fetchPlayerMatchesHistory } from 'csdm/node/faceit-web-api/fetch-player-last-matches';
import { FaceitUnauthorized } from 'csdm/node/faceit-web-api/errors/faceit-unauthorized';
import { FaceitInvalidRequest } from 'csdm/node/faceit-web-api/errors/faceit-invalid-request';

type DiscoveredFaceitScoutingTarget = {
  faceitMatchId: string;
  url: string;
  mapName: string;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
  resourceUrlAvailable: boolean;
};

type DiscoveredSourceMatch = {
  id: string;
  url: string;
  mapName: string;
  ourTeamName: string;
  opponentTeamName: string;
  ourTeamScore: number;
  opponentTeamScore: number;
};

export type FaceitScoutingDiscovery = {
  sourceMatch: DiscoveredSourceMatch;
  opponentFaceitPlayerIds: string[];
  opponentSteamIds: string[];
  targets: DiscoveredFaceitScoutingTarget[];
};

type CandidateMatch = {
  matchId: string;
  startedAt: number;
  sharedPlayerIds: Set<string>;
};

const desiredTargetCount = 5;
const minimumTargetCount = 3;
const historyPageSize = 10;
const maxHistoryMatchCountPerPlayer = 60;
const maxHistoryPageCount = Math.ceil(maxHistoryMatchCountPerPlayer / historyPageSize);
const minimumSharedHistoryPlayerCount = 2;
const minimumRosterOverlapCount = 3;

function buildCandidateMatchComparator(candidateA: CandidateMatch, candidateB: CandidateMatch) {
  if (candidateA.startedAt !== candidateB.startedAt) {
    return candidateB.startedAt - candidateA.startedAt;
  }

  return candidateB.sharedPlayerIds.size - candidateA.sharedPlayerIds.size;
}

function getTeamOverlapCount(teamPlayerIds: string[], referencePlayerIds: string[]) {
  const referencePlayerIdsSet = new Set(referencePlayerIds);

  return teamPlayerIds.reduce((count, playerId) => {
    return count + (referencePlayerIdsSet.has(playerId) ? 1 : 0);
  }, 0);
}

function normalizeSteamIds(steamIds: string[]) {
  return [...new Set(steamIds.filter((steamId) => steamId !== ''))];
}

function shouldRethrowCandidateFetchError(error: unknown) {
  return error instanceof FaceitUnauthorized || error instanceof FaceitInvalidRequest;
}

export async function discoverFaceitScoutingTargets({
  apiKey,
  currentAccountId,
  matchIdOrUrl,
}: {
  apiKey: string;
  currentAccountId: string;
  matchIdOrUrl: string;
}): Promise<FaceitScoutingDiscovery> {
  const sourceMatchId = extractFaceitMatchId(matchIdOrUrl);
  if (sourceMatchId === '') {
    throw new Error('Invalid FACEIT match URL or match ID.');
  }

  const sourceMatch = await fetchFaceitMatchWithRoster(sourceMatchId, apiKey);
  if (sourceMatch.game !== Game.CS2) {
    throw new Error('FACEIT scouting currently supports CS2 matches only.');
  }

  const ourTeam = sourceMatch.teams.find((team) => {
    return team.players.some((player) => player.faceitPlayerId === currentAccountId);
  });
  if (ourTeam === undefined) {
    throw new Error('The current FACEIT account is not part of this room.');
  }

  const opponentTeam = sourceMatch.teams.find((team) => {
    return team.id !== ourTeam.id;
  });
  if (opponentTeam === undefined) {
    throw new Error('Could not identify the opponent team in this room.');
  }

  const opponentFaceitPlayerIds = opponentTeam.players.map((player) => player.faceitPlayerId);
  const opponentSteamIds = normalizeSteamIds(opponentTeam.players.map((player) => player.steamId));
  const candidates = new Map<string, CandidateMatch>();
  const checkedCandidateMatchIds = new Set<string>();
  const targets: DiscoveredFaceitScoutingTarget[] = [];

  for (let pageIndex = 0; pageIndex < maxHistoryPageCount; pageIndex += 1) {
    const histories = await Promise.all(
      opponentFaceitPlayerIds.map(async (playerId) => {
        const history = await fetchPlayerMatchesHistory({
          playerId,
          apiKey,
          game: 'cs2',
          limit: historyPageSize,
          offset: pageIndex * historyPageSize,
        });

        return {
          playerId,
          history,
        };
      }),
    );

    for (const { playerId, history } of histories) {
      for (const match of history) {
        if (match.match_id === sourceMatch.id) {
          continue;
        }

        const candidate = candidates.get(match.match_id) ?? {
          matchId: match.match_id,
          startedAt: match.started_at,
          sharedPlayerIds: new Set<string>(),
        };
        candidate.sharedPlayerIds.add(playerId);
        candidate.startedAt = Math.max(candidate.startedAt, match.started_at);
        candidates.set(match.match_id, candidate);
      }
    }

    const sortedCandidates = [...candidates.values()]
      .filter((candidate) => {
        return (
          candidate.sharedPlayerIds.size >= minimumSharedHistoryPlayerCount &&
          !checkedCandidateMatchIds.has(candidate.matchId)
        );
      })
      .sort(buildCandidateMatchComparator);

    for (const candidate of sortedCandidates) {
      if (targets.length >= desiredTargetCount) {
        break;
      }

      checkedCandidateMatchIds.add(candidate.matchId);

      let candidateMatch;
      try {
        candidateMatch = await fetchFaceitMatchWithRoster(candidate.matchId, apiKey);
      } catch (error) {
        if (shouldRethrowCandidateFetchError(error)) {
          throw error;
        }

        continue;
      }

      if (candidateMatch.game !== Game.CS2 || candidateMatch.mapName !== sourceMatch.mapName) {
        continue;
      }

      const matchedTeam = [...candidateMatch.teams]
        .map((team) => {
          return {
            team,
            overlapCount: getTeamOverlapCount(
              team.players.map((player) => player.faceitPlayerId),
              opponentFaceitPlayerIds,
            ),
          };
        })
        .sort((teamA, teamB) => teamB.overlapCount - teamA.overlapCount)[0];

      if (matchedTeam === undefined || matchedTeam.overlapCount < minimumRosterOverlapCount) {
        continue;
      }

      targets.push({
        faceitMatchId: candidateMatch.id,
        url: candidateMatch.url,
        mapName: candidateMatch.mapName,
        rosterOverlapCount: matchedTeam.overlapCount,
        sharedHistoryPlayerCount: candidate.sharedPlayerIds.size,
        resourceUrlAvailable: candidateMatch.resourceUrlAvailable,
      });
    }

    if (targets.length >= minimumTargetCount || histories.every(({ history }) => history.length < historyPageSize)) {
      break;
    }
  }

  if (targets.length === 0) {
    throw new Error('No recent opponent samples were found on this map.');
  }

  return {
    sourceMatch: {
      id: sourceMatch.id,
      url: sourceMatch.url,
      mapName: sourceMatch.mapName,
      ourTeamName: ourTeam.name,
      opponentTeamName: opponentTeam.name,
      ourTeamScore: ourTeam.score,
      opponentTeamScore: opponentTeam.score,
    },
    opponentFaceitPlayerIds,
    opponentSteamIds,
    targets,
  };
}
