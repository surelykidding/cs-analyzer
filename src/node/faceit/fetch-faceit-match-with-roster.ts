import { Game } from 'csdm/common/types/counter-strike';
import { fetchMatch, type FaceitFactionDTO, type FaceitFactionV1DTO, type FaceitMatchDTO } from 'csdm/node/faceit-web-api/fetch-match';
import { fetchFaceitMatchStats, type FaceitMatchStatsDTO } from 'csdm/node/faceit-web-api/fetch-match-stats';
import { FaceitResourceNotFound } from 'csdm/node/faceit-web-api/errors/faceit-resource-not-found';

type FaceitRosterPlayer = {
  faceitPlayerId: string;
  nickname: string;
  steamId: string;
};

export type FaceitRosterTeam = {
  id: string;
  name: string;
  score: number;
  players: FaceitRosterPlayer[];
};

export type FaceitMatchWithRoster = {
  id: string;
  url: string;
  game: Game;
  mapName: string;
  resourceUrlAvailable: boolean;
  teams: FaceitRosterTeam[];
};

function isFactionV1(faction: FaceitFactionDTO | FaceitFactionV1DTO): faction is FaceitFactionV1DTO {
  return 'roster_v1' in faction;
}

function normalizeMapName(mapName: string) {
  const workshopRegex = /workshop\/(\d+\/)(?<normalizedMapName>.*)/;
  const matches = mapName.match(workshopRegex);

  return matches?.groups?.normalizedMapName ?? mapName;
}

function getPlayersPerTeamId(match: FaceitMatchDTO) {
  const playersPerTeamId = new Map<string, FaceitRosterPlayer[]>();
  const factions = [match.teams.faction1, match.teams.faction2];

  for (const faction of factions) {
    const players: FaceitRosterPlayer[] = [];
    if (isFactionV1(faction)) {
      for (const player of faction.roster_v1) {
        players.push({
          faceitPlayerId: player.guid,
          nickname: player.nickname,
          steamId: player.csgo_id ?? '',
        });
      }
    } else {
      for (const player of faction.roster) {
        players.push({
          faceitPlayerId: player.player_id,
          nickname: player.nickname,
          steamId: player.game_player_id ?? '',
        });
      }
    }

    playersPerTeamId.set(faction.faction_id, players);
  }

  return playersPerTeamId;
}

function buildTeams(match: FaceitMatchDTO, stats: FaceitMatchStatsDTO): FaceitRosterTeam[] {
  const playersPerTeamId = getPlayersPerTeamId(match);
  const round = stats.rounds[0];
  if (round === undefined) {
    return [];
  }

  return round.teams.map((team) => {
    return {
      id: team.team_id,
      name: team.team_stats.Team,
      score: Number(team.team_stats['Final Score']),
      players: playersPerTeamId.get(team.team_id) ?? [],
    };
  });
}

function buildFallbackTeams(match: FaceitMatchDTO): FaceitRosterTeam[] {
  const faction1Score = match.results?.score?.faction1 ?? 0;
  const faction2Score = match.results?.score?.faction2 ?? 0;
  const playersPerTeamId = getPlayersPerTeamId(match);

  return [
    {
      id: match.teams.faction1.faction_id,
      name: match.teams.faction1.name,
      score: faction1Score,
      players: playersPerTeamId.get(match.teams.faction1.faction_id) ?? [],
    },
    {
      id: match.teams.faction2.faction_id,
      name: match.teams.faction2.name,
      score: faction2Score,
      players: playersPerTeamId.get(match.teams.faction2.faction_id) ?? [],
    },
  ];
}

function getFallbackMapName(match: FaceitMatchDTO) {
  return normalizeMapName(match.voting?.map?.pick?.[0] ?? '');
}

export async function fetchFaceitMatchWithRoster(matchId: string, apiKey: string): Promise<FaceitMatchWithRoster> {
  const match = await fetchMatch(matchId, apiKey);

  let stats: FaceitMatchStatsDTO | undefined;
  try {
    stats = await fetchFaceitMatchStats(matchId, apiKey);
  } catch (error) {
    if (!(error instanceof FaceitResourceNotFound)) {
      throw error;
    }
  }

  const teamsFromStats = stats === undefined ? [] : buildTeams(match, stats);
  const teams = teamsFromStats.length > 0 ? teamsFromStats : buildFallbackTeams(match);
  const mapNameFromStats = stats?.rounds[0]?.round_stats.Map;

  return {
    id: match.match_id,
    url: match.faceit_url.replace('{lang}', 'en'),
    game: match.game === 'cs2' ? Game.CS2 : Game.CSGO,
    mapName: normalizeMapName(mapNameFromStats ?? getFallbackMapName(match)),
    resourceUrlAvailable: (match.demo_url?.length ?? 0) > 0,
    teams,
  };
}
