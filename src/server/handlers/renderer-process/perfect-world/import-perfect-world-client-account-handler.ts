import { fetchPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-account';
import { upsertPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/upsert-perfect-world-account';
import { importPerfectWorldClientAccount } from 'csdm/node/perfect-world/import-perfect-world-client-account';
import { handleError } from '../../handle-error';

export async function importPerfectWorldClientAccountHandler() {
  try {
    const account = await importPerfectWorldClientAccount();
    await upsertPerfectWorldAccount(account);
    const savedAccount = await fetchPerfectWorldAccount(account.id);
    if (savedAccount === undefined) {
      throw new Error('Failed to save the imported Perfect World account.');
    }

    return savedAccount;
  } catch (error) {
    if (typeof error === 'string') {
      logger.error('Error while importing the current Perfect World client account.');
      logger.error(error);
      throw error;
    }

    if (error instanceof Error && error.message !== '') {
      logger.error('Error while importing the current Perfect World client account.');
      logger.error(error);
      throw error.message;
    }

    handleError(error, 'Error while importing the current Perfect World client account.');
  }
}
