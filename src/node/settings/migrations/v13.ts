import { DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS } from 'csdm/common/analyses';
import type { Settings } from '../settings';
import type { Migration } from '../migration';

const v13: Migration = {
  schemaVersion: 13,
  run: (settings: Settings) => {
    settings.analyze.maxConcurrentTacticsPositionGenerations =
      settings.analyze.maxConcurrentTacticsPositionGenerations ?? DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS;

    return Promise.resolve(settings);
  },
};

export default v13;
