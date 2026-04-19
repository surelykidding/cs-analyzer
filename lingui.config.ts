import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'zh-CN'],
  sourceLocale: 'en',
  orderBy: 'origin',
  formatOptions: {
    lineNumbers: false,
  },
  catalogs: [
    {
      path: '<rootDir>/src/ui/translations/{locale}/messages',
      include: ['src/ui'],
    },
  ],
};

export default config;
