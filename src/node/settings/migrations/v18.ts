import {
  DEFAULT_TACTICS_WINDOW_END_SECONDS,
  DEFAULT_TACTICS_WINDOW_START_SECONDS,
} from 'csdm/common/types/team-tactics';
import type { Migration } from '../migration';

const v18: Migration = {
  schemaVersion: 18,
  run: (settings) => {
    settings.analyze.defaultTacticsWindowStartSeconds = DEFAULT_TACTICS_WINDOW_START_SECONDS;
    settings.analyze.defaultTacticsWindowEndSeconds = DEFAULT_TACTICS_WINDOW_END_SECONDS;

    return Promise.resolve(settings);
  },
};

export default v18;
