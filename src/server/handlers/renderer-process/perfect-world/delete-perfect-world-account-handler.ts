import { handleError } from '../../handle-error';
import { fetchPerfectWorldAccounts } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-accounts';
import { deletePerfectWorldAccount } from 'csdm/node/database/perfect-world-account/delete-perfect-world-account';

export async function deletePerfectWorldAccountHandler(accountId: string) {
  try {
    await deletePerfectWorldAccount(accountId);
    const accounts = await fetchPerfectWorldAccounts();

    return accounts;
  } catch (error) {
    handleError(error, `Error while deleting Perfect World account with id ${accountId}`);
  }
}
