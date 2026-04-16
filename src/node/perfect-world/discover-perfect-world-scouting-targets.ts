import type { PerfectWorldMatch } from 'csdm/common/types/perfect-world-match';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { Game } from 'csdm/common/types/counter-strike';
import { fetchCurrentPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-current-perfect-world-account';
import { fetchPerfectWorldMatch } from './fetch-perfect-world-match';
import { fetchPerfectWorldMatchHistoryMatches } from './fetch-last-perfect-world-matches';
import { normalizePerfectWorldComparableMatchId } from './extract-perfect-world-match-id';
import { validatePerfectWorldAccount } from './validate-perfect-world-account';
import { getSettings } from 'csdm/node/settings/get-settings';

type DiscoveredPerfectWorldScoutingTarget = {
  match: PerfectWorldMatch;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
  matchedPlayerSteamIds: string[];
};

type DiscoveredSourceMatch = {
  id: string;
  url: string | null;
  mapName: string;
  ourTeamName: string;
  opponentTeamName: string;
  ourTeamScore: number;
  opponentTeamScore: number;
  cupId: string | null;
};

export type PerfectWorldScoutingDiscovery = {
  sourceMatch: DiscoveredSourceMatch;
  opponentSteamIds: string[];
  targets: DiscoveredPerfectWorldScoutingTarget[];
};

type CandidateMatch = {
  match: PerfectWorldMatch;
  sharedPlayerIds: Set<string>;
};

const desiredTargetCount = 5;
const minimumRosterOverlapCount = 3;

function getTeamOverlapCount(match: PerfectWorldMatch, teamSteamIds: string[], referencePlayerIds: string[]) {
  const teamSteamIdSet = new Set(teamSteamIds);
  const referencePlayerIdSet = new Set(referencePlayerIds);
  const matchedPlayerSteamIds = match.players
    .filter((player) => {
      return teamSteamIdSet.has(player.steamId) && referencePlayerIdSet.has(player.steamId);
    })
    .map((player) => player.steamId);

  return {
    overlapCount: matchedPlayerSteamIds.length,
    matchedPlayerSteamIds,
  };
}

export async function discoverPerfectWorldScoutingTargets({
  matchId,
  participantSteamId,
}: {
  matchId: string;
  participantSteamId?: string;
}): Promise<PerfectWorldScoutingDiscovery> {
  const currentAccount = await fetchCurrentPerfectWorldAccount();
  if (currentAccount === undefined) {
    throw PerfectWorldErrorCode.AccountMissing;
  }
  const validatedAccount = await validatePerfectWorldAccount(currentAccount);

  const trimmedParticipantSteamId = participantSteamId?.trim();
  const referenceSteamId = trimmedParticipantSteamId || validatedAccount.steamId;
  const sourceMatch = await fetchPerfectWorldMatch(matchId, validatedAccount, trimmedParticipantSteamId);
  if (sourceMatch.game !== Game.CS2) {
    throw new Error('Perfect World scouting currently supports CS2 matches only.');
  }

  const ourTeam = sourceMatch.teams.find((team) => team.playerSteamIds.includes(referenceSteamId));
  if (ourTeam === undefined) {
    if (trimmedParticipantSteamId !== undefined && trimmedParticipantSteamId !== '') {
      throw PerfectWorldErrorCode.ParticipantSteamIdNotInRoom;
    }

    throw new Error('The current Perfect World account is not part of this room.');
  }

  const opponentTeam = sourceMatch.teams.find((team) => team.name !== ourTeam.name && team.playerSteamIds.length > 0);
  if (opponentTeam === undefined) {
    throw new Error('Could not identify the opponent side in this room.');
  }

  const opponentSteamIds = opponentTeam.playerSteamIds;
  if (opponentSteamIds.length < minimumRosterOverlapCount) {
    throw new Error('Could not resolve enough opponent players from this Perfect World match.');
  }

  const candidateMatches = new Map<string, CandidateMatch>();
  const settings = await getSettings();
  const histories = await Promise.all(
    opponentSteamIds.map(async (steamId) => {
      const matches = await fetchPerfectWorldMatchHistoryMatches({
        auth: {
          token: validatedAccount.token,
          mySteamId: validatedAccount.steamId,
          userId: validatedAccount.userId,
        },
        downloadFolderPath: settings.download.folderPath,
        pageSize: 20,
        toSteamId: steamId,
      });

      return {
        steamId,
        matches,
      };
    }),
  );

  for (const { steamId, matches } of histories) {
    for (const match of matches) {
      if (normalizePerfectWorldComparableMatchId(match.id) === normalizePerfectWorldComparableMatchId(sourceMatch.id)) {
        continue;
      }

      if (match.game !== Game.CS2 || match.mapName !== sourceMatch.mapName || match.demoUrl === '') {
        continue;
      }

      const candidateMatch = candidateMatches.get(match.id) ?? {
        match,
        sharedPlayerIds: new Set<string>(),
      };
      candidateMatch.sharedPlayerIds.add(steamId);
      candidateMatches.set(match.id, candidateMatch);
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
    .flatMap<DiscoveredPerfectWorldScoutingTarget>((candidate) => {
      const matchedTeam = candidate.match.teams
        .map((team) => {
          const overlap = getTeamOverlapCount(candidate.match, team.playerSteamIds, opponentSteamIds);

          return {
            team,
            ...overlap,
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
          matchedPlayerSteamIds: matchedTeam.matchedPlayerSteamIds,
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
      ourTeamName: ourTeam.name,
      opponentTeamName: opponentTeam.name,
      ourTeamScore: ourTeam.score,
      opponentTeamScore: opponentTeam.score,
      cupId: sourceMatch.cupId,
    },
    opponentSteamIds,
    targets,
  };
}
