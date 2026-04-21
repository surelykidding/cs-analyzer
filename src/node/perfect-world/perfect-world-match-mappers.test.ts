import { describe, expect, it } from 'vite-plus/test';
import { createPerfectWorldMatchSeed, mergePerfectWorldMatchSeeds } from './perfect-world-match-mappers';

describe('perfectWorldMatchMappers', () => {
  it('should map a history entry into a Perfect World match seed', () => {
    const seed = createPerfectWorldMatchSeed(
      {
        matchId: 'PVP@9215803944321072908',
        mapName: '荒漠迷城',
        score1: 13,
        score2: 10,
        timeStamp: 1710000000,
        duration: 30,
        cupId: 0,
        mode: '天梯组排对局',
        playerInfoList: [
          {
            steamId: '76561198000000001',
            userId: 1,
            name: 'Player 1',
            avatar: 'https://example.com/1.png',
            team: 1,
            kill: 20,
            assist: 6,
            death: 15,
            rating: 1.2,
            pwRating: 1.1,
          },
          {
            steamId: '76561198000000002',
            userId: 2,
            name: 'Player 2',
            avatar: 'https://example.com/2.png',
            team: 2,
            kill: 15,
            assist: 3,
            death: 17,
            rating: 0.9,
            pwRating: 0.85,
          },
        ],
      },
      '9215803944321072908',
    );

    expect(seed).toMatchObject({
      id: 'PVP@9215803944321072908',
      mapName: 'de_mirage',
      demoUrl: 'https://pwaweblogin.wmpvp.com/csgo/demo/9215803944321072908_0.dem',
      mode: '天梯组排对局',
    });
    expect(seed.teams[0]).toEqual({
      name: 'Team 1',
      score: 13,
      playerSteamIds: ['76561198000000001'],
    });
    expect(seed.teams[1]).toEqual({
      name: 'Team 2',
      score: 10,
      playerSteamIds: ['76561198000000002'],
    });
  });

  it('should merge history and detail seeds while keeping roster data', () => {
    const historySeed = createPerfectWorldMatchSeed(
      {
        matchId: 'PVP@1',
        mapName: 'inferno',
        score1: 8,
        score2: 13,
        playerInfoList: [
          {
            steamId: '76561198000000001',
            name: 'History Player',
            team: 1,
          },
        ],
      },
      '1',
    );
    const detailSeed = createPerfectWorldMatchSeed(
      {
        matchId: '1',
        mapLogo: 'https://www.csgo.com.cn/images/maps/logo/inferno.png',
        cupId: 123,
      },
      '1',
    );

    const mergedSeed = mergePerfectWorldMatchSeeds(historySeed, detailSeed);

    expect(mergedSeed.id).toBe('PVP@1');
    expect(mergedSeed.mapName).toBe('de_inferno');
    expect(mergedSeed.cupId).toBe('123');
    expect(mergedSeed.players).toHaveLength(1);
    expect(mergedSeed.players[0].name).toBe('History Player');
  });

  it('should map a live websocket payload into teams and scores', () => {
    const seed = createPerfectWorldMatchSeed(
      {
        matchId: '9219960560245258665',
        startTime: '04/15/2026 - 11:03:14',
        duration: '20',
        map: 'de_dust2',
        ctScore: 9,
        terroristScore: 8,
        playerList: [
          {
            steamId: '76561198741643064',
            side: 'CT',
            kill: 12,
            assist: 4,
            death: 13,
          },
          {
            steamId: '76561198828728079',
            side: 'TERRORIST',
            kill: 7,
            assist: 5,
            death: 14,
          },
        ],
      },
      '9219960560245258665',
    );

    expect(seed.id).toBe('PVP@9219960560245258665');
    expect(seed.mapName).toBe('de_dust2');
    expect(seed.durationInSeconds).toBe(20 * 60);
    expect(seed.teams[0]).toEqual({
      name: 'Team 1',
      score: 9,
      playerSteamIds: ['76561198741643064'],
    });
    expect(seed.teams[1]).toEqual({
      name: 'Team 2',
      score: 8,
      playerSteamIds: ['76561198828728079'],
    });
    expect(seed.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          steamId: '76561198741643064',
          team: 1,
          killCount: 12,
          assistCount: 4,
          deathCount: 13,
        }),
        expect.objectContaining({
          steamId: '76561198828728079',
          team: 2,
          killCount: 7,
          assistCount: 5,
          deathCount: 14,
        }),
      ]),
    );
  });

  it('should ignore non-map status strings when merging detail seeds', () => {
    const liveSeed = createPerfectWorldMatchSeed(
      {
        matchId: '9219960560245258665',
        map: 'de_dust2',
        ctScore: 9,
        terroristScore: 8,
        playerList: [
          {
            steamId: '76561198741643064',
            side: 'CT',
          },
        ],
      },
      '9219960560245258665',
    );
    const detailSeed = createPerfectWorldMatchSeed(
      {
        status: 'success',
        result: [],
      },
      '9219960560245258665',
    );

    const mergedSeed = mergePerfectWorldMatchSeeds(
      {
        ...liveSeed,
        demoUrl: '',
      },
      detailSeed,
    );

    expect(detailSeed.mapName).toBe('');
    expect(mergedSeed.mapName).toBe('de_dust2');
    expect(mergedSeed.demoUrl).toBe('');
  });
});
