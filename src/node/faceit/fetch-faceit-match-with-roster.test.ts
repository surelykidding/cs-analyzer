import { describe, expect, it, vi } from 'vite-plus/test';
import { Game } from 'csdm/common/types/counter-strike';
import { FaceitResourceNotFound } from 'csdm/node/faceit-web-api/errors/faceit-resource-not-found';
import { fetchMatch } from 'csdm/node/faceit-web-api/fetch-match';
import { fetchFaceitMatchStats } from 'csdm/node/faceit-web-api/fetch-match-stats';
import { fetchFaceitMatchWithRoster } from './fetch-faceit-match-with-roster';

vi.mock('csdm/node/faceit-web-api/fetch-match', () => {
  return {
    fetchMatch: vi.fn(),
  };
});

vi.mock('csdm/node/faceit-web-api/fetch-match-stats', () => {
  return {
    fetchFaceitMatchStats: vi.fn(),
  };
});

describe('fetchFaceitMatchWithRoster', () => {
  it('should fall back to the match payload when stats are not available yet', async () => {
    const mockedFetchMatch = vi.mocked(fetchMatch);
    const mockedFetchFaceitMatchStats = vi.mocked(fetchFaceitMatchStats);

    mockedFetchMatch.mockResolvedValue({
      demo_url: [],
      faceit_url: 'https://www.faceit.com/{lang}/cs2/room/1-live-match',
      game: 'cs2',
      match_id: '1-live-match',
      results: {
        winner: '',
        score: {
          faction1: 0,
          faction2: 0,
        },
      },
      started_at: 0,
      finished_at: 0,
      status: 'ONGOING',
      teams: {
        faction1: {
          faction_id: 'team-1',
          avatar: '',
          leader: '',
          name: 'Our Team',
          roster: [
            {
              player_id: 'player-1',
              nickname: 'Player 1',
              avatar: '',
              game_player_id: '76561198000000001',
              game_player_name: 'Player 1',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
        faction2: {
          faction_id: 'team-2',
          avatar: '',
          leader: '',
          name: 'Opponent Team',
          roster: [
            {
              player_id: 'player-2',
              nickname: 'Player 2',
              avatar: '',
              game_player_id: '76561198000000002',
              game_player_name: 'Player 2',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
      },
      voting: {
        map: {
          pick: ['de_dust2'],
        },
      },
    });
    mockedFetchFaceitMatchStats.mockRejectedValue(new FaceitResourceNotFound());

    const match = await fetchFaceitMatchWithRoster('1-live-match', 'faceit-key');

    expect(match).toEqual({
      id: '1-live-match',
      url: 'https://www.faceit.com/en/cs2/room/1-live-match',
      game: Game.CS2,
      mapName: 'de_dust2',
      resourceUrlAvailable: false,
      teams: [
        {
          id: 'team-1',
          name: 'Our Team',
          score: 0,
          players: [
            {
              faceitPlayerId: 'player-1',
              nickname: 'Player 1',
              steamId: '76561198000000001',
            },
          ],
        },
        {
          id: 'team-2',
          name: 'Opponent Team',
          score: 0,
          players: [
            {
              faceitPlayerId: 'player-2',
              nickname: 'Player 2',
              steamId: '76561198000000002',
            },
          ],
        },
      ],
    });
  });

  it('should fall back to zero scores when the match payload has no results yet', async () => {
    const mockedFetchMatch = vi.mocked(fetchMatch);
    const mockedFetchFaceitMatchStats = vi.mocked(fetchFaceitMatchStats);

    mockedFetchMatch.mockResolvedValue({
      demo_url: [],
      faceit_url: 'https://www.faceit.com/{lang}/cs2/room/1-pending-results-match',
      game: 'cs2',
      match_id: '1-pending-results-match',
      started_at: 0,
      finished_at: 0,
      status: 'ONGOING',
      teams: {
        faction1: {
          faction_id: 'team-1',
          avatar: '',
          leader: '',
          name: 'Our Team',
          roster: [
            {
              player_id: 'player-1',
              nickname: 'Player 1',
              avatar: '',
              game_player_id: '76561198000000001',
              game_player_name: 'Player 1',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
        faction2: {
          faction_id: 'team-2',
          avatar: '',
          leader: '',
          name: 'Opponent Team',
          roster: [
            {
              player_id: 'player-2',
              nickname: 'Player 2',
              avatar: '',
              game_player_id: '76561198000000002',
              game_player_name: 'Player 2',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
      },
      voting: {
        map: {
          pick: ['de_mirage'],
        },
      },
    });
    mockedFetchFaceitMatchStats.mockRejectedValue(new FaceitResourceNotFound());

    const match = await fetchFaceitMatchWithRoster('1-pending-results-match', 'faceit-key');

    expect(match.teams).toEqual([
      {
        id: 'team-1',
        name: 'Our Team',
        score: 0,
        players: [
          {
            faceitPlayerId: 'player-1',
            nickname: 'Player 1',
            steamId: '76561198000000001',
          },
        ],
      },
      {
        id: 'team-2',
        name: 'Opponent Team',
        score: 0,
        players: [
          {
            faceitPlayerId: 'player-2',
            nickname: 'Player 2',
            steamId: '76561198000000002',
          },
        ],
      },
    ]);
  });

  it('should keep using stats when they are available', async () => {
    const mockedFetchMatch = vi.mocked(fetchMatch);
    const mockedFetchFaceitMatchStats = vi.mocked(fetchFaceitMatchStats);

    mockedFetchMatch.mockResolvedValue({
      demo_url: ['https://example.com/demo.dem.zst'],
      faceit_url: 'https://www.faceit.com/{lang}/cs2/room/1-finished-match',
      game: 'cs2',
      match_id: '1-finished-match',
      results: {
        winner: 'faction1',
        score: {
          faction1: 13,
          faction2: 9,
        },
      },
      started_at: 0,
      finished_at: 0,
      status: 'FINISHED',
      teams: {
        faction1: {
          faction_id: 'team-1',
          avatar: '',
          leader: '',
          name: 'Our Team',
          roster: [
            {
              player_id: 'player-1',
              nickname: 'Player 1',
              avatar: '',
              game_player_id: '76561198000000001',
              game_player_name: 'Player 1',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
        faction2: {
          faction_id: 'team-2',
          avatar: '',
          leader: '',
          name: 'Opponent Team',
          roster: [
            {
              player_id: 'player-2',
              nickname: 'Player 2',
              avatar: '',
              game_player_id: '76561198000000002',
              game_player_name: 'Player 2',
              game_skill_level: 10,
              anticheat_required: true,
            },
          ],
        },
      },
      voting: {
        map: {
          pick: ['de_inferno'],
        },
      },
    });
    mockedFetchFaceitMatchStats.mockResolvedValue({
      rounds: [
        {
          game_mode: '5v5',
          round_stats: {
            Map: 'de_anubis',
            Winner: 'team-1',
          },
          teams: [
            {
              team_id: 'team-1',
              team_stats: {
                'Final Score': '13',
                'First Half Score': '8',
                'Overtime score': '0',
                'Second Half Score': '5',
                Team: 'Stats Team 1',
                'Team Headshots': '0',
                'Team Win': '1',
              },
              players: [],
            },
            {
              team_id: 'team-2',
              team_stats: {
                'Final Score': '9',
                'First Half Score': '4',
                'Overtime score': '0',
                'Second Half Score': '5',
                Team: 'Stats Team 2',
                'Team Headshots': '0',
                'Team Win': '0',
              },
              players: [],
            },
          ],
        },
      ],
    });

    const match = await fetchFaceitMatchWithRoster('1-finished-match', 'faceit-key');

    expect(match.mapName).toBe('de_anubis');
    expect(match.resourceUrlAvailable).toBe(true);
    expect(match.teams).toEqual([
      {
        id: 'team-1',
        name: 'Stats Team 1',
        score: 13,
        players: [
          {
            faceitPlayerId: 'player-1',
            nickname: 'Player 1',
            steamId: '76561198000000001',
          },
        ],
      },
      {
        id: 'team-2',
        name: 'Stats Team 2',
        score: 9,
        players: [
          {
            faceitPlayerId: 'player-2',
            nickname: 'Player 2',
            steamId: '76561198000000002',
          },
        ],
      },
    ]);
  });
});
