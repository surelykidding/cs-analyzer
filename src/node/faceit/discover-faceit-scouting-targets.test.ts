import { describe, expect, it, vi } from 'vite-plus/test';
import { Game } from 'csdm/common/types/counter-strike';
import { FaceitResourceNotFound } from 'csdm/node/faceit-web-api/errors/faceit-resource-not-found';
import { discoverFaceitScoutingTargets } from './discover-faceit-scouting-targets';
import { fetchFaceitMatchWithRoster } from './fetch-faceit-match-with-roster';
import { fetchPlayerMatchesHistory } from 'csdm/node/faceit-web-api/fetch-player-last-matches';

vi.mock('./fetch-faceit-match-with-roster', () => {
  return {
    fetchFaceitMatchWithRoster: vi.fn(),
  };
});

vi.mock('csdm/node/faceit-web-api/fetch-player-last-matches', () => {
  return {
    fetchPlayerMatchesHistory: vi.fn(),
  };
});

describe('discoverFaceitScoutingTargets', () => {
  it('should skip candidate matches that cannot be fetched', async () => {
    const mockedFetchFaceitMatchWithRoster = vi.mocked(fetchFaceitMatchWithRoster);
    const mockedFetchPlayerMatchesHistory = vi.mocked(fetchPlayerMatchesHistory);

    mockedFetchFaceitMatchWithRoster.mockImplementation(async (matchId: string) => {
      if (matchId === '1-source-match') {
        return {
          id: matchId,
          url: 'https://www.faceit.com/en/cs2/room/1-source-match',
          game: Game.CS2,
          mapName: 'de_dust2',
          resourceUrlAvailable: true,
          teams: [
            {
              id: 'team-our',
              name: 'Our Team',
              score: 13,
              players: [
                {
                  faceitPlayerId: 'current-account',
                  nickname: 'god1knows',
                  steamId: '76561198000000001',
                },
              ],
            },
            {
              id: 'team-opponent',
              name: 'Opponent Team',
              score: 8,
              players: [
                {
                  faceitPlayerId: 'opponent-1',
                  nickname: 'Opponent 1',
                  steamId: '76561198000000002',
                },
                {
                  faceitPlayerId: 'opponent-2',
                  nickname: 'Opponent 2',
                  steamId: '76561198000000003',
                },
                {
                  faceitPlayerId: 'opponent-3',
                  nickname: 'Opponent 3',
                  steamId: '76561198000000004',
                },
              ],
            },
          ],
        };
      }

      if (matchId === '1-missing-candidate') {
        throw new FaceitResourceNotFound();
      }

      if (matchId === '1-valid-candidate') {
        return {
          id: matchId,
          url: 'https://www.faceit.com/en/cs2/room/1-valid-candidate',
          game: Game.CS2,
          mapName: 'de_dust2',
          resourceUrlAvailable: true,
          teams: [
            {
              id: 'team-candidate-opponent',
              name: 'Opponent Team',
              score: 13,
              players: [
                {
                  faceitPlayerId: 'opponent-1',
                  nickname: 'Opponent 1',
                  steamId: '76561198000000002',
                },
                {
                  faceitPlayerId: 'opponent-2',
                  nickname: 'Opponent 2',
                  steamId: '76561198000000003',
                },
                {
                  faceitPlayerId: 'opponent-3',
                  nickname: 'Opponent 3',
                  steamId: '76561198000000004',
                },
              ],
            },
            {
              id: 'team-candidate-other',
              name: 'Other Team',
              score: 11,
              players: [],
            },
          ],
        };
      }

      throw new Error(`Unexpected match id: ${matchId}`);
    });

    mockedFetchPlayerMatchesHistory.mockImplementation(async ({ playerId, offset }: { playerId: string; offset?: number }) => {
      if (offset !== 0) {
        return [];
      }

      return [
        {
          competition_id: '',
          competition_name: '',
          competition_type: '',
          faceit_url: '',
          finished_at: 0,
          game_id: 'cs2',
          game_mode: '5v5',
          match_id: '1-missing-candidate',
          match_type: 'matchmaking',
          max_players: 10,
          organizer_id: '',
          playing_players: [],
          region: 'EU',
          results: {
            winner: 'faction1',
            score: {
              faction1: 13,
              faction2: 8,
            },
          },
          started_at: 200,
          status: 'finished',
          teams: [],
          teams_size: 5,
        },
        {
          competition_id: '',
          competition_name: '',
          competition_type: '',
          faceit_url: '',
          finished_at: 0,
          game_id: 'cs2',
          game_mode: '5v5',
          match_id: '1-valid-candidate',
          match_type: 'matchmaking',
          max_players: 10,
          organizer_id: '',
          playing_players: [],
          region: 'EU',
          results: {
            winner: 'faction1',
            score: {
              faction1: 13,
              faction2: 11,
            },
          },
          started_at: 100,
          status: 'finished',
          teams: [],
          teams_size: 5,
        },
      ];
    });

    const discovery = await discoverFaceitScoutingTargets({
      apiKey: 'faceit-key',
      currentAccountId: 'current-account',
      matchIdOrUrl: '1-source-match',
    });

    expect(discovery.sourceMatch.id).toBe('1-source-match');
    expect(discovery.targets).toEqual([
      {
        faceitMatchId: '1-valid-candidate',
        url: 'https://www.faceit.com/en/cs2/room/1-valid-candidate',
        mapName: 'de_dust2',
        rosterOverlapCount: 3,
        sharedHistoryPlayerCount: 3,
        resourceUrlAvailable: true,
      },
    ]);
  });

  it('should fetch additional history pages when the first 6 matches are not enough', async () => {
    const mockedFetchFaceitMatchWithRoster = vi.mocked(fetchFaceitMatchWithRoster);
    const mockedFetchPlayerMatchesHistory = vi.mocked(fetchPlayerMatchesHistory);

    mockedFetchFaceitMatchWithRoster.mockImplementation(async (matchId: string) => {
      if (matchId === '1-source-match') {
        return {
          id: matchId,
          url: 'https://www.faceit.com/en/cs2/room/1-source-match',
          game: Game.CS2,
          mapName: 'de_inferno',
          resourceUrlAvailable: true,
          teams: [
            {
              id: 'team-our',
              name: 'Our Team',
              score: 13,
              players: [{ faceitPlayerId: 'current-account', nickname: 'god1knows', steamId: '1' }],
            },
            {
              id: 'team-opponent',
              name: 'Opponent Team',
              score: 9,
              players: [
                { faceitPlayerId: 'opponent-1', nickname: 'Opponent 1', steamId: '2' },
                { faceitPlayerId: 'opponent-2', nickname: 'Opponent 2', steamId: '3' },
                { faceitPlayerId: 'opponent-3', nickname: 'Opponent 3', steamId: '4' },
              ],
            },
          ],
        };
      }

      if (matchId === '1-target-on-second-page') {
        return {
          id: matchId,
          url: 'https://www.faceit.com/en/cs2/room/1-target-on-second-page',
          game: Game.CS2,
          mapName: 'de_inferno',
          resourceUrlAvailable: true,
          teams: [
            {
              id: 'team-candidate-opponent',
              name: 'Opponent Team',
              score: 13,
              players: [
                { faceitPlayerId: 'opponent-1', nickname: 'Opponent 1', steamId: '2' },
                { faceitPlayerId: 'opponent-2', nickname: 'Opponent 2', steamId: '3' },
                { faceitPlayerId: 'opponent-3', nickname: 'Opponent 3', steamId: '4' },
              ],
            },
            {
              id: 'team-candidate-other',
              name: 'Other Team',
              score: 10,
              players: [],
            },
          ],
        };
      }

      return {
        id: matchId,
        url: `https://www.faceit.com/en/cs2/room/${matchId}`,
        game: Game.CS2,
        mapName: 'de_mirage',
        resourceUrlAvailable: true,
        teams: [
          {
            id: 'other-team-a',
            name: 'Other Team A',
            score: 13,
            players: [],
          },
          {
            id: 'other-team-b',
            name: 'Other Team B',
            score: 3,
            players: [],
          },
        ],
      };
    });

    mockedFetchPlayerMatchesHistory.mockImplementation(
      async ({ playerId, offset, limit }: { playerId: string; offset?: number; limit: number }) => {
      if (offset === 0) {
        return Array.from({ length: limit }, (_, index) => {
            return {
              competition_id: '',
              competition_name: '',
              competition_type: '',
              faceit_url: '',
              finished_at: 0,
              game_id: 'cs2',
              game_mode: '5v5',
              match_id: `1-first-page-${playerId}-${index}`,
              match_type: 'matchmaking',
              max_players: 10,
              organizer_id: '',
              playing_players: [],
              region: 'EU',
              results: {
                winner: 'faction1',
                score: {
                  faction1: 13,
                  faction2: 7,
                },
              },
              started_at: 300 - index,
              status: 'finished',
              teams: [],
              teams_size: 5,
            };
          });
        }

        if (offset === 10) {
          return [
            {
              competition_id: '',
              competition_name: '',
              competition_type: '',
              faceit_url: '',
              finished_at: 0,
              game_id: 'cs2',
              game_mode: '5v5',
              match_id: '1-target-on-second-page',
              match_type: 'matchmaking',
              max_players: 10,
              organizer_id: '',
              playing_players: [],
              region: 'EU',
              results: {
                winner: 'faction1',
                score: {
                  faction1: 13,
                  faction2: 10,
                },
              },
              started_at: 200,
              status: 'finished',
              teams: [],
              teams_size: 5,
            },
          ];
        }

        return [];
      },
    );

    const discovery = await discoverFaceitScoutingTargets({
      apiKey: 'faceit-key',
      currentAccountId: 'current-account',
      matchIdOrUrl: '1-source-match',
    });

    expect(discovery.targets).toEqual([
      {
        faceitMatchId: '1-target-on-second-page',
        url: 'https://www.faceit.com/en/cs2/room/1-target-on-second-page',
        mapName: 'de_inferno',
        rosterOverlapCount: 3,
        sharedHistoryPlayerCount: 3,
        resourceUrlAvailable: true,
      },
    ]);
    expect(mockedFetchPlayerMatchesHistory).toHaveBeenCalledWith({
      playerId: 'opponent-1',
      apiKey: 'faceit-key',
      game: 'cs2',
      limit: 10,
      offset: 10,
    });
  });
});
