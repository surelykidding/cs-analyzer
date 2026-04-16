import { db } from 'csdm/node/database/database';
import { fetchPerfectWorldAccounts } from './fetch-perfect-world-accounts';
import { updateCurrentPerfectWorldAccount } from './update-current-perfect-world-account';

export async function deletePerfectWorldAccount(accountId: string) {
  await db.deleteFrom('perfect_world_accounts').where('id', '=', accountId).execute();
  const accounts = await fetchPerfectWorldAccounts();

  if (accounts.length > 0) {
    await updateCurrentPerfectWorldAccount(accounts[0].id);
  }
}
