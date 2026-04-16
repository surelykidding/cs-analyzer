import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { updatePerfectWorldAccountValidation } from 'csdm/node/database/perfect-world-account/update-perfect-world-account-validation';
import { fetchPerfectWorldSelfProfile, PerfectWorldSessionValidationError } from './perfect-world-api';

const defaultExpiredMessage = 'The saved Perfect World session has expired. Re-import it from the client or sign in again.';

export async function validatePerfectWorldAccount(account: PerfectWorldAccount) {
  try {
    const profile = await fetchPerfectWorldSelfProfile({
      token: account.token,
      mySteamId: account.steamId,
      userId: account.userId,
    });
    const validatedAt = new Date();

    return (
      (await updatePerfectWorldAccountValidation({
        accountId: account.id,
        isValid: true,
        lastValidatedAt: validatedAt,
        lastError: null,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      })) ?? {
        ...account,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        isValid: true,
        lastValidatedAt: validatedAt.toISOString(),
        lastError: null,
      }
    );
  } catch (error) {
    if (!(error instanceof PerfectWorldSessionValidationError)) {
      throw error;
    }

    const validatedAt = new Date();
    await updatePerfectWorldAccountValidation({
      accountId: account.id,
      isValid: false,
      lastValidatedAt: validatedAt,
      lastError: error.message === '' ? defaultExpiredMessage : error.message,
    });

    throw PerfectWorldErrorCode.AccountExpired;
  }
}
