export const supportedLocales = ['en', 'zh-CN'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const CHINESE_LOCALE: SupportedLocale = 'zh-CN';

function getCanonicalLocale(locale: string) {
  try {
    return new Intl.Locale(locale).baseName;
  } catch {
    return locale.trim();
  }
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (locale === undefined || locale === null || locale === '') {
    return DEFAULT_LOCALE;
  }

  const normalizedLocale = getCanonicalLocale(locale).toLowerCase();
  if (normalizedLocale === 'zh' || normalizedLocale.startsWith('zh-')) {
    return CHINESE_LOCALE;
  }

  if (normalizedLocale === 'en' || normalizedLocale.startsWith('en-')) {
    return DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

export function isChineseLocale(locale: string | null | undefined) {
  return normalizeLocale(locale) === CHINESE_LOCALE;
}
