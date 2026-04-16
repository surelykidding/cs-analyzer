import { describe, expect, it, vi } from 'vite-plus/test';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { fetchPerfectWorldMatch } from './fetch-perfect-world-match';
import {
  fetchPerfectWorldLiveMatchPayload,
  fetchPerfectWorldPublicMatchDetail,
} from './perfect-world-api';
import { fetchPerfectWorldMatchHistoryMatches } from './fetch-last-perfect-world-matches';
import { getSettings } from 'csdm/node/settings/get-settings';
import { getDownloadStatus } from 'csdm/node/download/get-download-status';

vi.mock('./perfect-world-api', () => {
  return {
    fetchPerfectWorldPublicMatchDetail: vi.fn(),
    fetchPerfectWorldLiveMatchPayload: vi.fn(),
  };
});

vi.mock('./fetch-last-perfect-world-matches', () => {
  return {
    fetchPerfectWorldMatchHistoryMatches: vi.fn(),
  };
});

vi.mock('csdm/node/settings/get-settings', () => {
  return {
    getSettings: vi.fn(),
  };
});

vi.mock('csdm/node/download/get-download-status', () => {
  return {
    getDownloadStatus: vi.fn(),
  };
});

describe('fetchPerfectWorldMatch', () => {
  it('should fall back to the live websocket payload when public detail is empty', async () => {
    vi.mocked(fetchPerfectWorldPublicMatchDetail).mockResolvedValue({
      status: 'success',
      result: [],
    });
    vi.mocked(fetchPerfectWorldMatchHistoryMatches).mockResolvedValue([]);
    vi.mocked(fetchPerfectWorldLiveMatchPayload).mockResolvedValue({
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
    });
    vi.mocked(getSettings).mockResolvedValue({
      download: {
        folderPath: 'D:/open/cs-demo-manager/downloads',
      },
    } as never);
    vi.mocked(getDownloadStatus).mockResolvedValue('not-downloaded');

    const currentAccount: PerfectWorldAccount = {
      id: '1600005',
      userId: 1600005,
      steamId: '76561198828728079',
      token: 'token',
      jt: 'jt',
      nickname: 'god knows',
      avatarUrl: '',
      maskedPhoneNumber: '180****3830',
      isValid: true,
      lastValidatedAt: '2026-04-15T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    };

    const participantSteamId = '76561198741643064';
    const match = await fetchPerfectWorldMatch('9219960560245258665', currentAccount, participantSteamId);

    expect(fetchPerfectWorldLiveMatchPayload).toHaveBeenCalledWith({
      steamId: participantSteamId,
      expectedMatchId: '9219960560245258665',
    });
    expect(match.mapName).toBe('de_dust2');
    expect(match.demoUrl).toBe('');
    expect(match.teams[0].playerSteamIds).toEqual(['76561198741643064']);
    expect(match.teams[1].playerSteamIds).toEqual(['76561198828728079']);
  });

  it('should require a participant Steam ID when only the live room can resolve the match', async () => {
    vi.mocked(fetchPerfectWorldPublicMatchDetail).mockResolvedValue({
      status: 'success',
      result: [],
    });
    vi.mocked(fetchPerfectWorldMatchHistoryMatches).mockResolvedValue([]);
    vi.mocked(getSettings).mockResolvedValue({
      download: {
        folderPath: 'D:/open/cs-demo-manager/downloads',
      },
    } as never);
    vi.mocked(getDownloadStatus).mockResolvedValue('not-downloaded');

    const currentAccount: PerfectWorldAccount = {
      id: '1600005',
      userId: 1600005,
      steamId: '76561198828728079',
      token: 'token',
      jt: 'jt',
      nickname: 'god knows',
      avatarUrl: '',
      maskedPhoneNumber: '180****3830',
      isValid: true,
      lastValidatedAt: '2026-04-15T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    };

    await expect(fetchPerfectWorldMatch('9219960560245258665', currentAccount)).rejects.toBe(
      PerfectWorldErrorCode.ParticipantSteamIdRequired,
    );
  });

  it('should return a dedicated error when the provided participant Steam ID is not in the room', async () => {
    vi.mocked(fetchPerfectWorldPublicMatchDetail).mockResolvedValue({
      status: 'success',
      result: [],
    });
    vi.mocked(fetchPerfectWorldMatchHistoryMatches).mockResolvedValue([]);
    vi.mocked(fetchPerfectWorldLiveMatchPayload).mockResolvedValue(undefined);
    vi.mocked(getSettings).mockResolvedValue({
      download: {
        folderPath: 'D:/open/cs-demo-manager/downloads',
      },
    } as never);
    vi.mocked(getDownloadStatus).mockResolvedValue('not-downloaded');

    const currentAccount: PerfectWorldAccount = {
      id: '1600005',
      userId: 1600005,
      steamId: '76561198828728079',
      token: 'token',
      jt: 'jt',
      nickname: 'god knows',
      avatarUrl: '',
      maskedPhoneNumber: '180****3830',
      isValid: true,
      lastValidatedAt: '2026-04-15T00:00:00.000Z',
      lastError: null,
      isCurrent: true,
    };

    await expect(
      fetchPerfectWorldMatch('9219960560245258665', currentAccount, '76561198741643064'),
    ).rejects.toBe(PerfectWorldErrorCode.ParticipantSteamIdNotInRoom);
  });
});
