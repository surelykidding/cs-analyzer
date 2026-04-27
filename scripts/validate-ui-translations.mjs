import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootFolderPath = fileURLToPath(new URL('..', import.meta.url));

const requiredLocaleCatalogs = [
  {
    locale: 'zh-CN',
    filePath: path.join(rootFolderPath, 'src/ui/translations/zh-CN/messages.po'),
    languageHeader: 'Language: zh-CN\\n',
  },
];

const requiredTranslationRefPrefixes = [
  'src/ui/settings/analyze/',
  'src/ui/team/tactics/',
  'src/ui/downloads/faceit-scouting/',
  'src/ui/downloads/five-eplay/',
  'src/ui/downloads/perfect-world/',
];

function parsePoString(line) {
  const quoteIndex = line.indexOf('"');
  if (quoteIndex === -1) {
    return '';
  }

  return JSON.parse(line.slice(quoteIndex));
}

function parsePo(content) {
  const entries = [];
  let entry = { refs: [], msgctxt: '', msgid: '', msgstr: '' };
  let field = undefined;

  const pushEntry = () => {
    if (entry.msgid !== '' || entry.msgstr !== '' || entry.refs.length > 0) {
      entries.push(entry);
    }

    entry = { refs: [], msgctxt: '', msgid: '', msgstr: '' };
    field = undefined;
  };

  for (const line of content.split(/\r?\n/)) {
    if (line === '') {
      pushEntry();
      continue;
    }

    if (line.startsWith('#:')) {
      entry.refs.push(...line.slice(2).trim().split(/\s+/));
      continue;
    }

    if (line.startsWith('msgctxt ')) {
      field = 'msgctxt';
      entry.msgctxt = parsePoString(line);
      continue;
    }

    if (line.startsWith('msgid ')) {
      field = 'msgid';
      entry.msgid = parsePoString(line);
      continue;
    }

    if (line.startsWith('msgstr ')) {
      field = 'msgstr';
      entry.msgstr = parsePoString(line);
      continue;
    }

    if (line.startsWith('"') && field !== undefined) {
      entry[field] += JSON.parse(line);
    }
  }

  pushEntry();

  return entries;
}

function getPlaceholderTokens(message) {
  return [
    ...message.matchAll(/\{[A-Za-z0-9_.]+\}/g),
    ...message.matchAll(/<\/?\d+>/g),
  ].map((match) => match[0]);
}

function sortTokens(tokens) {
  return [...tokens].sort((a, b) => a.localeCompare(b));
}

function hasProtectedRef(entry) {
  return entry.refs.some((ref) => {
    return requiredTranslationRefPrefixes.some((prefix) => ref.startsWith(prefix));
  });
}

function describeEntry(entry) {
  const context = entry.msgctxt === '' ? '' : ` context="${entry.msgctxt}"`;

  return `${entry.refs.join(', ')}:${context} "${entry.msgid}"`;
}

const errors = [];

for (const catalog of requiredLocaleCatalogs) {
  const content = fs.readFileSync(catalog.filePath, 'utf8');

  if (!content.includes(catalog.languageHeader)) {
    errors.push(`${catalog.filePath} must declare ${catalog.languageHeader.trim()}`);
  }

  const entries = parsePo(content);

  for (const entry of entries) {
    if (!hasProtectedRef(entry)) {
      continue;
    }

    if (entry.msgstr.trim() === '') {
      errors.push(`${catalog.locale} missing translation for ${describeEntry(entry)}`);
      continue;
    }

    if (/[\uFFFD]|Ã|Â/.test(entry.msgstr)) {
      errors.push(`${catalog.locale} translation looks garbled for ${describeEntry(entry)}`);
    }

    const msgidTokens = sortTokens(getPlaceholderTokens(entry.msgid));
    const msgstrTokens = sortTokens(getPlaceholderTokens(entry.msgstr));
    if (msgidTokens.join('\n') !== msgstrTokens.join('\n')) {
      errors.push(`${catalog.locale} placeholder mismatch for ${describeEntry(entry)}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('UI translations are valid.');
