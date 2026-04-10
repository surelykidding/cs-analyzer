import { Game } from 'csdm/common/types/counter-strike';
import { fetchMatch, type FaceitFactionDTO, type FaceitFactionV1DTO, type FaceitMatchDTO } from 'csdm/node/faceit-web-api/fetch-match';
import { fetchFaceitMatchStats, type FaceitMatchStatsDTO } from 'csdm/node/faceit-web-api/fetch-match-stats';

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
  if (stats.rounds.length === 0) {
    throw new Error('No rounds found');
  }

  const playersPerTeamId = getPlayersPerTeamId(match);

  return stats.rounds[0].teams.map((team) => {
    return {
      id: team.team_id,
      name: team.team_stats.Team,
      score: Number(team.team_stats['Final Score']),
      players: playersPerTeamId.get(team.team_id) ?? [],
    };
  });
}

export async function fetchFaceitMatchWithRoster(matchId: string, apiKey: string): Promise<FaceitMatchWithRoster> {
  const [match, stats] = await Promise.all([fetchMatch(matchId, apiKey), fetchFaceitMatchStats(matchId, apiKey)]);
  const teams = buildTeams(match, stats);

  return {
    id: match.match_id,
    url: match.faceit_url.replace('{lang}', 'en'),
    game: match.game === 'cs2' ? Game.CS2 : Game.CSGO,
    mapName: normalizeMapName(stats.rounds[0]?.round_stats.Map ?? ''),
    resourceUrlAvailable: (match.demo_url?.length ?? 0) > 0,
    teams,
  };
}
