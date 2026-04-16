const REPOSITORY_URL = 'https://github.com/surelykidding/cs-analyzer';

export const APP_DISPLAY_NAME = 'CS Analyzer';
export const APP_BASED_ON_LABEL = 'Based on CS Demo Manager';
export const APP_RELEASE_TAG_PREFIX = 'cs-analyzer-v';
export const APP_REPOSITORY_URL = REPOSITORY_URL;
export const APP_RELEASES_URL = `${REPOSITORY_URL}/releases`;
export const APP_ISSUES_URL = `${REPOSITORY_URL}/issues`;
export const APP_TESTING_GUIDE_EN_URL = `${REPOSITORY_URL}/blob/main/TESTING-GUIDE.en.md`;
export const APP_TESTING_GUIDE_ZH_CN_URL = `${REPOSITORY_URL}/blob/main/TESTING-GUIDE.zh-CN.md`;
export const APP_DOCUMENTATION_URL = APP_TESTING_GUIDE_EN_URL;

export function isPrereleaseVersion(version: string) {
  return version.includes('-beta.') || version.includes('-rc.');
}

export function buildReleaseTag(version: string) {
  return `${APP_RELEASE_TAG_PREFIX}${version}`;
}

export function buildReleaseUrl(version: string) {
  return `${APP_RELEASES_URL}/tag/${buildReleaseTag(version)}`;
}

export function rewriteLegacyAppUrl(href: string) {
  if (href.startsWith('https://cs-demo-manager.com/docs')) {
    return APP_DOCUMENTATION_URL;
  }

  if (href.startsWith('https://cs-demo-manager.com/download')) {
    return APP_RELEASES_URL;
  }

  if (href.startsWith('https://cs-demo-manager.com/changelog')) {
    return APP_RELEASES_URL;
  }

  if (href === 'https://cs-demo-manager.com' || href.startsWith('https://cs-demo-manager.com/')) {
    return APP_RELEASES_URL;
  }

  return href;
}
