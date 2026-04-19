import { normalizeLocale } from 'csdm/common/locale';
import type { Migration } from '../migration';

const v16: Migration = {
  schemaVersion: 16,
  run: (settings) => {
    settings.ui.locale = normalizeLocale(settings.ui.locale);

    return Promise.resolve(settings);
  },
};

export default v16;
