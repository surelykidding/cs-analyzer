import { handleError } from '../../handle-error';
import { updateCurrentPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/update-current-perfect-world-account';
import { fetchPerfectWorldAccounts } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-accounts';

export async function updateCurrentPerfectWorldAccountHandler(accountId: string) {
  try {
    await updateCurrentPerfectWorldAccount(accountId);
    const accounts = await fetchPerfectWorldAccounts();

    return accounts;
  } catch (error) {
    handleError(error, `Error while updating current Perfect World account with id ${accountId}`);
  }
}
