import { useUiSettings } from './use-ui-settings';
import { normalizeLocale } from 'csdm/common/locale';

export function useLocale() {
  const ui = useUiSettings();

  return normalizeLocale(ui.locale);
}
