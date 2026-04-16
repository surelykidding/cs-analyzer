import { describe, expect, it, vi } from 'vite-plus/test';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { Game } from 'csdm/common/types/counter-strike';
import { discoverPerfectWorldScoutingTargets } from './discover-perfect-world-scouting-targets';
import { fetchCurrentPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-current-perfect-world-account';
import { fetchPerfectWorldMatch } from './fetch-perfect-world-match';
import { fetchPerfectWorldMatchHistoryMatches } from './fetch-last-perfect-world-matches';
import { validatePerfectWorldAccount } from './validate-perfect-world-account';
import { getSettings } from 'csdm/node/settings/get-settings';

vi.mock('csdm/node/database/perfect-world-account/fetch-current-perfect-world-account', () => {
  return {
    fetchCurrentPerfectWorldAccount: vi.fn(),
  };
});

vi.mock('./fetch-perfect-world-match', () => {
  return {
    fetchPerfectWorldMatch: vi.fn(),
  };
});

vi.mock('./fetch-last-perfect-world-matches', () => {
  return {
    fetchPerfectWorldMatchHistoryMatches: vi.fn(),
  };
});

vi.mock('./validate-perfect-world-account', () => {
  return {
    validatePerfectWorldAccount: vi.fn(),
  };
});

vi.mock('csdm/node/settings/get-settings', () => {
  return {
    getSettings: vi.fn(),
  };
});

describe('discoverPerfectWorldScoutingTargets', () => {
  it('should discover same-map opponent samples with roster overlap', async () => {
    vi.mocked(fetchCurrentPerfectWorldAccount).mockResolvedValue({
      id: '58072600',
      userId: 58072600,
      steamId: 'our-1',
      token: 'token',
      nickname: 'Our account',
      avatarUrl: '',
      maskedPhoneNumber: '138****1234',
      isValid: true,
      lastValidatedAt: '2026-04-12T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    });
    vi.mocked(validatePerfectWorldAccount).mockImplementation(async (account) => account);
    vi.mocked(getSettings).mockResolvedValue({
      download: {
        folderPath: 'D:/open/cs-demo-manager/downloads',
      },
    } as never);

    vi.mocked(fetchPerfectWorldMatch).mockResolvedValue({
      id: 'PVP@source',
      game: Game.CS2,
      date: '2026-04-12T00:00:00.000Z',
      durationInSeconds: 1800,
      demoUrl: 'https://example.com/source.dem',
      mapName: 'de_nuke',
      url: null,
      cupId: '0',
      dataSource: 3,
      mode: '天梯组排对局',
      downloadStatus: 'not-downloaded',
      teams: [
        {
          name: 'Team 1',
          score: 13,
          playerSteamIds: ['our-1', 'our-2', 'our-3', 'our-4', 'our-5'],
        },
        {
          name: 'Team 2',
          score: 10,
          playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'opp-4', 'opp-5'],
        },
      ],
      players: [
        { steamId: 'our-1', userId: 1, name: 'Our 1', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'our-2', userId: 2, name: 'Our 2', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'our-3', userId: 3, name: 'Our 3', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'our-4', userId: 4, name: 'Our 4', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'our-5', userId: 5, name: 'Our 5', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'opp-1', userId: 6, name: 'Opp 1', avatarUrl: '', team: 2, hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'opp-2', userId: 7, name: 'Opp 2', avatarUrl: '', team: 2, hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'opp-3', userId: 8, name: 'Opp 3', avatarUrl: '', team: 2, hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'opp-4', userId: 9, name: 'Opp 4', avatarUrl: '', team: 2, hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
        { steamId: 'opp-5', userId: 10, name: 'Opp 5', avatarUrl: '', team: 2, hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
      ],
    });

    vi.mocked(fetchPerfectWorldMatchHistoryMatches).mockImplementation(async ({ toSteamId }) => {
      if (!toSteamId.startsWith('opp-')) {
        return [];
      }

      return [
        {
          id: 'PVP@candidate',
          game: Game.CS2,
          date: '2026-04-11T00:00:00.000Z',
          durationInSeconds: 1800,
          demoUrl: 'https://example.com/candidate.dem',
          mapName: 'de_nuke',
          url: null,
          cupId: '0',
          dataSource: 3,
          mode: '天梯组排对局',
          downloadStatus: 'not-downloaded',
          teams: [
            {
              name: 'Team 1',
              score: 13,
              playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'guest-1', 'guest-2'],
            },
            {
              name: 'Team 2',
              score: 7,
              playerSteamIds: ['other-1', 'other-2', 'other-3', 'other-4', 'other-5'],
            },
          ],
          players: [
            { steamId: 'opp-1', userId: 21, name: 'Opp 1', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'opp-2', userId: 22, name: 'Opp 2', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'opp-3', userId: 23, name: 'Opp 3', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'guest-1', userId: 24, name: 'Guest 1', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'guest-2', userId: 25, name: 'Guest 2', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
          ],
        },
      ];
    });

    const discovery = await discoverPerfectWorldScoutingTargets({
      matchId: 'source',
    });

    expect(discovery.sourceMatch.mapName).toBe('de_nuke');
    expect(discovery.targets).toHaveLength(1);
    expect(discovery.targets[0]).toMatchObject({
      rosterOverlapCount: 3,
      sharedHistoryPlayerCount: 5,
      matchedPlayerSteamIds: ['opp-1', 'opp-2', 'opp-3'],
    });
    expect(discovery.targets[0].match.id).toBe('PVP@candidate');
  });

  it('should throw when the current account is not part of the source match', async () => {
    vi.mocked(fetchCurrentPerfectWorldAccount).mockResolvedValue({
      id: '58072600',
      userId: 58072600,
      steamId: 'our-1',
      token: 'token',
      nickname: 'Our account',
      avatarUrl: '',
      maskedPhoneNumber: '138****1234',
      isValid: true,
      lastValidatedAt: '2026-04-12T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    });
    vi.mocked(validatePerfectWorldAccount).mockImplementation(async (account) => account);

    vi.mocked(fetchPerfectWorldMatch).mockResolvedValue({
      id: 'PVP@source',
      game: Game.CS2,
      date: '2026-04-12T00:00:00.000Z',
      durationInSeconds: 1800,
      demoUrl: 'https://example.com/source.dem',
      mapName: 'de_nuke',
      url: null,
      cupId: '0',
      dataSource: 3,
      mode: '天梯组排对局',
      downloadStatus: 'not-downloaded',
      teams: [
        {
          name: 'Team 1',
          score: 13,
          playerSteamIds: ['guest-1', 'guest-2', 'guest-3', 'guest-4', 'guest-5'],
        },
        {
          name: 'Team 2',
          score: 10,
          playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'opp-4', 'opp-5'],
        },
      ],
      players: [],
    });

    await expect(
      discoverPerfectWorldScoutingTargets({
        matchId: 'source',
      }),
    ).rejects.toThrow('The current Perfect World account is not part of this room.');
  });

  it('should use the provided participant Steam ID to select the reference team', async () => {
    vi.mocked(fetchCurrentPerfectWorldAccount).mockResolvedValue({
      id: '58072600',
      userId: 58072600,
      steamId: 'current-account',
      token: 'token',
      nickname: 'Our account',
      avatarUrl: '',
      maskedPhoneNumber: '138****1234',
      isValid: true,
      lastValidatedAt: '2026-04-12T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    });
    vi.mocked(validatePerfectWorldAccount).mockImplementation(async (account) => account);
    vi.mocked(getSettings).mockResolvedValue({
      download: {
        folderPath: 'D:/open/cs-demo-manager/downloads',
      },
    } as never);

    vi.mocked(fetchPerfectWorldMatch).mockResolvedValue({
      id: 'PVP@source',
      game: Game.CS2,
      date: '2026-04-12T00:00:00.000Z',
      durationInSeconds: 1800,
      demoUrl: '',
      mapName: 'de_nuke',
      url: null,
      cupId: '0',
      dataSource: 3,
      mode: '澶╂缁勬帓瀵瑰眬',
      downloadStatus: 'not-downloaded',
      teams: [
        {
          name: 'Reference Team',
          score: 13,
          playerSteamIds: ['ref-1', 'ref-2', 'ref-3', 'ref-4', 'ref-5'],
        },
        {
          name: 'Opponent Team',
          score: 9,
          playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'opp-4', 'opp-5'],
        },
      ],
      players: [],
    });

    vi.mocked(fetchPerfectWorldMatchHistoryMatches).mockImplementation(async ({ toSteamId }) => {
      if (!toSteamId.startsWith('opp-')) {
        return [];
      }

      return [
        {
          id: 'PVP@candidate',
          game: Game.CS2,
          date: '2026-04-11T00:00:00.000Z',
          durationInSeconds: 1800,
          demoUrl: 'https://example.com/candidate.dem',
          mapName: 'de_nuke',
          url: null,
          cupId: '0',
          dataSource: 3,
          mode: '澶╂缁勬帓瀵瑰眬',
          downloadStatus: 'not-downloaded',
          teams: [
            {
              name: 'Team 1',
              score: 13,
              playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'guest-1', 'guest-2'],
            },
            {
              name: 'Team 2',
              score: 7,
              playerSteamIds: ['other-1', 'other-2', 'other-3', 'other-4', 'other-5'],
            },
          ],
          players: [
            { steamId: 'opp-1', userId: 21, name: 'Opp 1', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'opp-2', userId: 22, name: 'Opp 2', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'opp-3', userId: 23, name: 'Opp 3', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'guest-1', userId: 24, name: 'Guest 1', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
            { steamId: 'guest-2', userId: 25, name: 'Guest 2', avatarUrl: '', team: 1, hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, rating: null, pwRating: null },
          ],
        },
      ];
    });

    const discovery = await discoverPerfectWorldScoutingTargets({
      matchId: 'source',
      participantSteamId: 'ref-1',
    });

    expect(fetchPerfectWorldMatch).toHaveBeenCalledWith(
      'source',
      expect.objectContaining({ steamId: 'current-account' }),
      'ref-1',
    );
    expect(discovery.sourceMatch.ourTeamName).toBe('Reference Team');
    expect(discovery.sourceMatch.opponentTeamName).toBe('Opponent Team');
    expect(discovery.targets).toHaveLength(1);
  });

  it('should propagate the participant Steam ID required error for ongoing matches', async () => {
    vi.mocked(fetchCurrentPerfectWorldAccount).mockResolvedValue({
      id: '58072600',
      userId: 58072600,
      steamId: 'current-account',
      token: 'token',
      nickname: 'Our account',
      avatarUrl: '',
      maskedPhoneNumber: '138****1234',
      isValid: true,
      lastValidatedAt: '2026-04-12T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    });
    vi.mocked(validatePerfectWorldAccount).mockImplementation(async (account) => account);
    vi.mocked(fetchPerfectWorldMatch).mockRejectedValue(PerfectWorldErrorCode.ParticipantSteamIdRequired);

    await expect(
      discoverPerfectWorldScoutingTargets({
        matchId: 'source',
      }),
    ).rejects.toBe(PerfectWorldErrorCode.ParticipantSteamIdRequired);
  });

  it('should return a dedicated error when the provided participant Steam ID is not in the room', async () => {
    vi.mocked(fetchCurrentPerfectWorldAccount).mockResolvedValue({
      id: '58072600',
      userId: 58072600,
      steamId: 'current-account',
      token: 'token',
      nickname: 'Our account',
      avatarUrl: '',
      maskedPhoneNumber: '138****1234',
      isValid: true,
      lastValidatedAt: '2026-04-12T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    });
    vi.mocked(validatePerfectWorldAccount).mockImplementation(async (account) => account);
    vi.mocked(fetchPerfectWorldMatch).mockResolvedValue({
      id: 'PVP@source',
      game: Game.CS2,
      date: '2026-04-12T00:00:00.000Z',
      durationInSeconds: 1800,
      demoUrl: '',
      mapName: 'de_nuke',
      url: null,
      cupId: '0',
      dataSource: 3,
      mode: 'ladder',
      downloadStatus: 'not-downloaded',
      teams: [
        {
          name: 'Reference Team',
          score: 13,
          playerSteamIds: ['ref-2', 'ref-3', 'ref-4', 'ref-5', 'ref-6'],
        },
        {
          name: 'Opponent Team',
          score: 9,
          playerSteamIds: ['opp-1', 'opp-2', 'opp-3', 'opp-4', 'opp-5'],
        },
      ],
      players: [],
    });

    await expect(
      discoverPerfectWorldScoutingTargets({
        matchId: 'source',
        participantSteamId: 'ref-1',
      }),
    ).rejects.toBe(PerfectWorldErrorCode.ParticipantSteamIdNotInRoom);
  });
});
