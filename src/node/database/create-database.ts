import type { DatabaseSettings } from 'csdm/node/settings/settings';
import { executePsql } from './psql/execute-psql';
import { formatHostnameForUri } from './format-hostname-for-uri';

export async function createDatabase(databaseSettings: DatabaseSettings) {
  const { database, hostname, username, port, password } = databaseSettings;
  const connectionUri = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${formatHostnameForUri(
    hostname,
  )}:${port}`;
  await executePsql(['-c', `CREATE DATABASE ${database} WITH ENCODING 'UTF8'`, connectionUri], { timeoutMs: 6000 });
}
