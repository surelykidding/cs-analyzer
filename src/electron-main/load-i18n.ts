import path from 'node:path';
import fs from 'fs-extra';
import { i18n } from '@lingui/core';
import { DEFAULT_LOCALE, normalizeLocale } from 'csdm/common/locale';
import { getLocaleFolderName } from 'csdm/common/get-locale-folder-name';

async function loadLocale(locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  const folderName = getLocaleFolderName(normalizedLocale);
  const jsonPath = path.join(__dirname, 'translations', folderName, 'messages.json');
  const content = await fs.readFile(jsonPath, 'utf8');
  const messages = JSON.parse(content);
  i18n.loadAndActivate({ locale: normalizedLocale, messages });
}

export async function loadI18n(locale: string) {
  try {
    await loadLocale(locale);
  } catch (error) {
    await loadLocale(DEFAULT_LOCALE);
  }
}
