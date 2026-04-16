import type { AddPerfectWorldAccountPayload } from 'csdm/common/types/perfect-world-account';
import { loginPerfectWorldAccount } from 'csdm/node/perfect-world/login-perfect-world-account';
import { upsertPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/upsert-perfect-world-account';
import { fetchPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-account';
import { handleError } from '../../handle-error';

export async function addPerfectWorldAccountHandler(payload: AddPerfectWorldAccountPayload) {
  try {
    const account = await loginPerfectWorldAccount(payload);
    await upsertPerfectWorldAccount(account);
    const savedAccount = await fetchPerfectWorldAccount(account.id);
    if (savedAccount === undefined) {
      throw new Error('Failed to save the Perfect World account.');
    }

    return savedAccount;
  } catch (error) {
    if (typeof error === 'string') {
      logger.error(`Error while adding Perfect World account for user ${payload.mobilePhone}`);
      logger.error(error);
      throw error;
    }

    if (error instanceof Error && error.message !== '') {
      logger.error(`Error while adding Perfect World account for user ${payload.mobilePhone}`);
      logger.error(error);
      throw error.message;
    }

    handleError(error, `Error while adding Perfect World account for user ${payload.mobilePhone}`);
  }
}
