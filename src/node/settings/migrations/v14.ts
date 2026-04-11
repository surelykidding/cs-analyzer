import type { Migration } from '../migration';

const v14: Migration = {
  schemaVersion: 14,
  run: (settings) => {
    delete (settings.analyze as { analyzePositions?: boolean }).analyzePositions;

    return Promise.resolve(settings);
  },
};

export default v14;
