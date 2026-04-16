import { usePerfectWorldState } from './use-perfect-world-state';

export function usePerfectWorldAccounts() {
  const state = usePerfectWorldState();

  return state.accounts;
}
