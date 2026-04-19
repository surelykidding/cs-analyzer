import type { Migration } from '../migration';

const v17: Migration = {
  schemaVersion: 17,
  run: (settings) => {
    settings.download.downloadValveDemosAtStartup = false;
    settings.download.downloadValveDemosInBackground = false;
    settings.download.downloadFaceitDemosAtStartup = false;
    settings.download.downloadFaceitDemosInBackground = false;
    settings.download.download5EPlayDemosAtStartup = false;
    settings.download.download5EPlayDemosInBackground = false;
    settings.download.downloadRenownDemosAtStartup = false;
    settings.download.downloadRenownDemosInBackground = false;
    settings.download.downloadPerfectWorldDemosAtStartup = false;
    settings.download.downloadPerfectWorldDemosInBackground = false;

    return Promise.resolve(settings);
  },
};

export default v17;
