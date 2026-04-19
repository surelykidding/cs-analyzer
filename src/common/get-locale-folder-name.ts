import { normalizeLocale } from './locale';

export function getLocaleFolderName(locale: string) {
  return normalizeLocale(locale);
}
