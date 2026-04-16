import type { Migration } from '../migration';

const v15: Migration = {
  schemaVersion: 15,
  run: (settings) => {
    settings.download.downloadPerfectWorldDemosAtStartup = true;
    settings.download.downloadPerfectWorldDemosInBackground = true;

    return Promise.resolve(settings);
  },
};

export default v15;
