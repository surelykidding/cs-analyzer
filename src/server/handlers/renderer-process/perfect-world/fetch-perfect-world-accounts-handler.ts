import { fetchPerfectWorldAccounts } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-accounts';
import { handleError } from '../../handle-error';

export async function fetchPerfectWorldAccountsHandler() {
  try {
    return await fetchPerfectWorldAccounts();
  } catch (error) {
    handleError(error, 'Error while fetching Perfect World accounts');
  }
}
