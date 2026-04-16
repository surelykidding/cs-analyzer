import { usePerfectWorldState } from './use-perfect-world-state';

export function useCurrentPerfectWorldMatch() {
  const { matches, selectedMatchId } = usePerfectWorldState();
  const currentMatch = matches.find((match) => {
    return match.id === selectedMatchId;
  });

  if (currentMatch === undefined) {
    throw new Error('Selected Perfect World match not found');
  }

  return currentMatch;
}
