import { describe, expect, it, vi } from 'vite-plus/test';
import { Game } from 'csdm/common/types/counter-strike';
import { discover5EPlayScoutingTargets } from './discover-5eplay-scouting-targets';
import { fetch5EPlayMatch } from './fetch-5eplay-match';
import { fetchLast5EPlayMatches } from './fetch-last-5eplay-matches';

vi.mock('./fetch-5eplay-match', () => {
  return {
    fetch5EPlayMatch: vi.fn(),
  };
});

vi.mock('./fetch-last-5eplay-matches', () => {
  return {
    fetchLast5EPlayMatches: vi.fn(),
  };
});

describe('discover5EPlayScoutingTargets', () => {
  it('should discover same-map opponent samples with roster overlap', async () => {
    vi.mocked(fetch5EPlayMatch).mockResolvedValue({
      id: '1-source-match',
      game: Game.CS2,
      date: '2026-04-12T00:00:00.000Z',
      durationInSeconds: 1800,
      demoUrl: 'https://example.com/source.zip',
      mapName: 'de_nuke',
      url: 'https://arena.5eplay.com/data/match/1-source-match',
      downloadStatus: 'not-downloaded',
      teams: [
        {
          name: 'Team 1',
          score: 13,
          firstHalfScore: 7,
          secondHalfScore: 6,
          playerIds: [1, 2, 3, 4, 5],
        },
        {
          name: 'Team 2',
          score: 10,
          firstHalfScore: 5,
          secondHalfScore: 5,
          playerIds: [6, 7, 8, 9, 10],
        },
      ],
      players: [
        { id: 'our-1', uid: 1, domainId: '1', name: 'Our 1', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'our-2', uid: 2, domainId: '2', name: 'Our 2', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'our-3', uid: 3, domainId: '3', name: 'Our 3', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'our-4', uid: 4, domainId: '4', name: 'Our 4', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'our-5', uid: 5, domainId: '5', name: 'Our 5', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'opp-1', uid: 6, domainId: '6', name: 'Opp 1', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'opp-2', uid: 7, domainId: '7', name: 'Opp 2', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'opp-3', uid: 8, domainId: '8', name: 'Opp 3', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'opp-4', uid: 9, domainId: '9', name: 'Opp 4', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
        { id: 'opp-5', uid: 10, domainId: '10', name: 'Opp 5', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
      ],
    });

    vi.mocked(fetchLast5EPlayMatches).mockImplementation(async (playerId: string) => {
      if (!playerId.startsWith('opp-')) {
        return [];
      }

      return [
        {
          id: '1-candidate-match',
          game: Game.CS2,
          date: '2026-04-11T00:00:00.000Z',
          durationInSeconds: 1800,
          demoUrl: 'https://example.com/candidate.zip',
          mapName: 'de_nuke',
          url: 'https://arena.5eplay.com/data/match/1-candidate-match',
          downloadStatus: 'not-downloaded',
          teams: [
            {
              name: 'Team 1',
              score: 13,
              firstHalfScore: 8,
              secondHalfScore: 5,
              playerIds: [21, 22, 23, 24, 25],
            },
            {
              name: 'Team 2',
              score: 7,
              firstHalfScore: 4,
              secondHalfScore: 3,
              playerIds: [26, 27, 28, 29, 30],
            },
          ],
          players: [
            { id: 'opp-1', uid: 21, domainId: '21', name: 'Opp 1', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'opp-2', uid: 22, domainId: '22', name: 'Opp 2', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'opp-3', uid: 23, domainId: '23', name: 'Opp 3', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'guest-1', uid: 24, domainId: '24', name: 'Guest 1', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'guest-2', uid: 25, domainId: '25', name: 'Guest 2', avatarUrl: '', hasWon: true, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'other-1', uid: 26, domainId: '26', name: 'Other 1', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'other-2', uid: 27, domainId: '27', name: 'Other 2', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'other-3', uid: 28, domainId: '28', name: 'Other 3', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'other-4', uid: 29, domainId: '29', name: 'Other 4', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
            { id: 'other-5', uid: 30, domainId: '30', name: 'Other 5', avatarUrl: '', hasWon: false, killCount: 0, assistCount: 0, deathCount: 0, headshotCount: 0, headshotPercentage: 0, killDeathRatio: 0, killPerRound: 0, kast: 0, threeKillCount: 0, fourKillCount: 0, fiveKillCount: 0, firstKillCount: 0, firstDeathCount: 0, bombDefusedCount: 0, bombPlantedCount: 0, averageDamagePerRound: 0 },
          ],
        },
      ];
    });

    const discovery = await discover5EPlayScoutingTargets({
      currentAccountId: 'our-1',
      matchIdOrUrl: '1-source-match',
    });

    expect(discovery.sourceMatch.mapName).toBe('de_nuke');
    expect(discovery.targets).toHaveLength(1);
    expect(discovery.targets[0]).toMatchObject({
      rosterOverlapCount: 3,
      sharedHistoryPlayerCount: 5,
      matchedPlayerNames: ['Opp 1', 'Opp 2', 'Opp 3', 'Guest 1', 'Guest 2'],
    });
    expect(discovery.targets[0].match.id).toBe('1-candidate-match');
  });
});
