import { usePerfectWorldAccounts } from './use-perfect-world-accounts';

export function useCurrentPerfectWorldAccount() {
  const accounts = usePerfectWorldAccounts();

  return accounts.find((account) => account.isCurrent);
}
