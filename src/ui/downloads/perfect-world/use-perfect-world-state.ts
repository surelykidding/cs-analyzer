import { useDownloadsState } from 'csdm/ui/downloads/use-downloads-state';

export function usePerfectWorldState() {
  const state = useDownloadsState();

  return state.perfectWorld;
}
