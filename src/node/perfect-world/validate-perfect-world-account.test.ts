import { describe, expect, it, vi } from 'vite-plus/test';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { validatePerfectWorldAccount } from './validate-perfect-world-account';
import { fetchPerfectWorldSelfProfile, PerfectWorldSessionValidationError } from './perfect-world-api';
import { updatePerfectWorldAccountValidation } from 'csdm/node/database/perfect-world-account/update-perfect-world-account-validation';

vi.mock('./perfect-world-api', () => {
  return {
    fetchPerfectWorldSelfProfile: vi.fn(),
    PerfectWorldSessionValidationError: class PerfectWorldSessionValidationError extends Error {},
  };
});

vi.mock('csdm/node/database/perfect-world-account/update-perfect-world-account-validation', () => {
  return {
    updatePerfectWorldAccountValidation: vi.fn(),
  };
});

describe('validatePerfectWorldAccount', () => {
  it('should mark the account as valid after a successful profile check', async () => {
    vi.mocked(fetchPerfectWorldSelfProfile).mockResolvedValue({
      steamId: '76561198828728079',
      nickname: 'god knows',
      avatarUrl: 'https://example.com/avatar.png',
    });
    vi.mocked(updatePerfectWorldAccountValidation).mockImplementation(async ({ accountId, isValid, lastError }) => {
      return {
        id: accountId,
        userId: 1600005,
        steamId: '76561198828728079',
        token: 'token',
        jt: 'jt',
        nickname: 'god knows',
        avatarUrl: 'https://example.com/avatar.png',
        maskedPhoneNumber: '180****3830',
        isValid,
        lastValidatedAt: '2026-04-15T00:00:00.000Z',
        lastError,
        isCurrent: true,
      };
    });

    const account = await validatePerfectWorldAccount({
      id: '1600005',
      userId: 1600005,
      steamId: '76561198828728079',
      token: 'token',
      jt: 'jt',
      nickname: 'old nickname',
      avatarUrl: '',
      maskedPhoneNumber: '180****3830',
      isValid: true,
      lastValidatedAt: null,
      lastError: null,
      isCurrent: true,
    });

    expect(account.isValid).toBe(true);
    expect(account.nickname).toBe('god knows');
    expect(account.lastError).toBeNull();
  });

  it('should mark the account as stale and throw the account expired code when validation fails', async () => {
    vi.mocked(fetchPerfectWorldSelfProfile).mockRejectedValue(
      new PerfectWorldSessionValidationError('Token expired or no longer valid.'),
    );
    vi.mocked(updatePerfectWorldAccountValidation).mockResolvedValue(undefined);

    await expect(
      validatePerfectWorldAccount({
        id: '1600005',
        userId: 1600005,
        steamId: '76561198828728079',
        token: 'token',
        jt: 'jt',
        nickname: 'old nickname',
        avatarUrl: '',
        maskedPhoneNumber: '180****3830',
        isValid: true,
        lastValidatedAt: null,
        lastError: null,
        isCurrent: true,
      }),
    ).rejects.toBe(PerfectWorldErrorCode.AccountExpired);

    expect(updatePerfectWorldAccountValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: '1600005',
        isValid: false,
        lastError: 'Token expired or no longer valid.',
      }),
    );
  });
});
