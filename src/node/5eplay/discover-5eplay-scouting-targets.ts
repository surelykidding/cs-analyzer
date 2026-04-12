import { Game } from 'csdm/common/types/counter-strike';
import type { FiveEPlayMatch, FiveEPlayPlayer } from 'csdm/common/types/5eplay-match';
import { fetch5EPlayMatch } from './fetch-5eplay-match';
import { fetchLast5EPlayMatches } from './fetch-last-5eplay-matches';
import { extract5EPlayMatchId } from './extract-5eplay-match-id';

type Discovered5EPlayScoutingTarget = {
  match: FiveEPlayMatch;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
  matchedPlayerNames: string[];
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

export type FiveEPlayScoutingDiscovery = {
  sourceMatch: DiscoveredSourceMatch;
  opponentPlayerIds: string[];
  targets: Discovered5EPlayScoutingTarget[];
};

type CandidateMatch = {
  match: FiveEPlayMatch;
  sharedPlayerIds: Set<string>;
};

const desiredTargetCount = 5;
const minimumRosterOverlapCount = 3;

function getTeamPlayers(match: FiveEPlayMatch, playerUids: number[]) {
  const playerUidSet = new Set(playerUids);

  return match.players.filter((player) => playerUidSet.has(player.uid));
}

function getTeamOverlapCount(players: FiveEPlayPlayer[], referencePlayerIds: string[]) {
  const referencePlayerIdSet = new Set(referencePlayerIds);

  return players.reduce((count, player) => {
    return count + (referencePlayerIdSet.has(player.id) ? 1 : 0);
  }, 0);
}

export async function discover5EPlayScoutingTargets({
  currentAccountId,
  matchIdOrUrl,
}: {
  currentAccountId: string;
  matchIdOrUrl: string;
}): Promise<FiveEPlayScoutingDiscovery> {
  const sourceMatchId = extract5EPlayMatchId(matchIdOrUrl);
  if (sourceMatchId === '') {
    throw new Error('Invalid 5EPlay match URL or match ID.');
  }

  const sourceMatch = await fetch5EPlayMatch(sourceMatchId, undefined);
  if (sourceMatch.game !== Game.CS2) {
    throw new Error('5EPlay scouting currently supports CS2 matches only.');
  }

  const ourTeam = sourceMatch.teams.find((team) => {
    const players = getTeamPlayers(sourceMatch, team.playerIds);

    return players.some((player) => player.id === currentAccountId);
  });
  if (ourTeam === undefined) {
    throw new Error('The current 5EPlay account is not part of this room.');
  }

  const opponentTeam = sourceMatch.teams.find((team) => team.name !== ourTeam.name);
  if (opponentTeam === undefined) {
    throw new Error('Could not identify the opponent side in this room.');
  }

  const opponentPlayers = getTeamPlayers(sourceMatch, opponentTeam.playerIds);
  const opponentPlayerIds = opponentPlayers.map((player) => player.id);
  const candidateMatches = new Map<string, CandidateMatch>();

  const histories = await Promise.all(
    opponentPlayerIds.map(async (playerId) => {
      const matches = await fetchLast5EPlayMatches(playerId);

      return {
        playerId,
        matches,
      };
    }),
  );

  for (const { playerId, matches } of histories) {
    for (const match of matches) {
      if (match.id === sourceMatch.id) {
        continue;
      }

      if (match.game !== Game.CS2 || match.mapName !== sourceMatch.mapName || match.demoUrl === '') {
        continue;
      }

      const candidate = candidateMatches.get(match.id) ?? {
        match,
        sharedPlayerIds: new Set<string>(),
      };
      candidate.sharedPlayerIds.add(playerId);
      candidateMatches.set(match.id, candidate);
    }
  }

  const targets = [...candidateMatches.values()]
    .sort((candidateA, candidateB) => {
      const dateDifference = Date.parse(candidateB.match.date) - Date.parse(candidateA.match.date);
      if (dateDifference !== 0) {
        return dateDifference;
      }

      return candidateB.sharedPlayerIds.size - candidateA.sharedPlayerIds.size;
    })
    .flatMap<Discovered5EPlayScoutingTarget>((candidate) => {
      const matchedTeam = candidate.match.teams
        .map((team) => {
          const teamPlayers = getTeamPlayers(candidate.match, team.playerIds);

          return {
            players: teamPlayers,
            overlapCount: getTeamOverlapCount(teamPlayers, opponentPlayerIds),
          };
        })
        .sort((teamA, teamB) => teamB.overlapCount - teamA.overlapCount)[0];

      if (matchedTeam === undefined || matchedTeam.overlapCount < minimumRosterOverlapCount) {
        return [];
      }

      return [
        {
          match: candidate.match,
          rosterOverlapCount: matchedTeam.overlapCount,
          sharedHistoryPlayerCount: candidate.sharedPlayerIds.size,
          matchedPlayerNames: matchedTeam.players.map((player) => player.name),
        },
      ];
    })
    .slice(0, desiredTargetCount);

  if (targets.length === 0) {
    throw new Error('No recent opponent samples were found on this map.');
  }

  return {
    sourceMatch: {
      id: sourceMatch.id,
      url: sourceMatch.url,
      mapName: sourceMatch.mapName,
      ourTeamName: 'Our side',
      opponentTeamName: 'Opponent side',
      ourTeamScore: ourTeam.score,
      opponentTeamScore: opponentTeam.score,
    },
    opponentPlayerIds,
    targets,
  };
}
