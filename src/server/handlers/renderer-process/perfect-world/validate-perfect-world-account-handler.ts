import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { fetchPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-account';
import { fetchPerfectWorldAccounts } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-accounts';
import { validatePerfectWorldAccount } from 'csdm/node/perfect-world/validate-perfect-world-account';
import { handleError } from '../../handle-error';

export async function validatePerfectWorldAccountHandler(accountId: string) {
  try {
    const account = await fetchPerfectWorldAccount(accountId);
    if (account === undefined) {
      throw PerfectWorldErrorCode.AccountMissing;
    }

    await validatePerfectWorldAccount(account);

    return await fetchPerfectWorldAccounts();
  } catch (error) {
    if (typeof error === 'string') {
      logger.error(`Error while validating Perfect World account with id ${accountId}`);
      logger.error(error);
      throw error;
    }

    if (error instanceof Error && error.message !== '') {
      logger.error(`Error while validating Perfect World account with id ${accountId}`);
      logger.error(error);
      throw error.message;
    }

    handleError(error, `Error while validating Perfect World account with id ${accountId}`);
  }
}
