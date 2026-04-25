import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { Client } from 'pg';

process.env.PROCESS_NAME = 'benchmark';

type DatabaseSettings = {
  hostname: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type Settings = {
  database: DatabaseSettings;
};

type MatchRow = {
  checksum: string;
  demoPath: string;
  source: string;
  demoName: string;
  mapName: string;
};

type BenchmarkMode = 'full' | 'tactics';

function toBenchmarkDatabaseName(sourceDatabaseName: string, benchmarkName: string) {
  return `${sourceDatabaseName}_bench_${benchmarkName}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`.replaceAll(
    /[^a-zA-Z0-9_]/g,
    '_',
  );
}

async function createPgClient(databaseSettings: DatabaseSettings) {
  const client = new Client({
    host: databaseSettings.hostname,
    port: databaseSettings.port,
    user: databaseSettings.username,
    password: databaseSettings.password,
    database: databaseSettings.database,
  });
  await client.connect();
  return client;
}

async function fetchCurrentMatches(databaseSettings: DatabaseSettings): Promise<MatchRow[]> {
  const client = await createPgClient(databaseSettings);
  try {
    const result = await client.query<MatchRow>(`
      SELECT
        matches.checksum AS "checksum",
        matches.demo_path AS "demoPath",
        demos.source AS "source",
        demos.name AS "demoName",
        demos.map_name AS "mapName"
      FROM matches
      INNER JOIN demos ON demos.checksum = matches.checksum
      WHERE demos.game = 'CS2'
      ORDER BY demos.date DESC NULLS LAST
      LIMIT 2
    `);

    return result.rows;
  } finally {
    await client.end();
  }
}

async function fetchPositionCounts(
  databaseModule: Awaited<typeof import('csdm/node/database/database')>,
  checksum: string,
) {
  const result = await databaseModule.db
    .selectFrom('matches')
    .select((eb) => {
      return [
        eb
          .selectFrom('player_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('player_positions.match_checksum', '=', 'matches.checksum')
          .as('fullPositionCount'),
        eb
          .selectFrom('team_tactics_player_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('team_tactics_player_positions.match_checksum', '=', 'matches.checksum')
          .as('tacticsPositionCount'),
        eb
          .selectFrom('grenade_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('grenade_positions.match_checksum', '=', 'matches.checksum')
          .as('grenadePositionCount'),
        eb
          .selectFrom('inferno_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('inferno_positions.match_checksum', '=', 'matches.checksum')
          .as('infernoPositionCount'),
        eb
          .selectFrom('hostage_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('hostage_positions.match_checksum', '=', 'matches.checksum')
          .as('hostagePositionCount'),
        eb
          .selectFrom('chicken_positions')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .whereRef('chicken_positions.match_checksum', '=', 'matches.checksum')
          .as('chickenPositionCount'),
      ];
    })
    .where('matches.checksum', '=', checksum)
    .executeTakeFirstOrThrow();

  return {
    fullPositionCount: result.fullPositionCount,
    tacticsPositionCount: result.tacticsPositionCount,
    grenadePositionCount: result.grenadePositionCount,
    infernoPositionCount: result.infernoPositionCount,
    hostagePositionCount: result.hostagePositionCount,
    chickenPositionCount: result.chickenPositionCount,
  };
}

async function clearPositionTablesForChecksum(
  databaseModule: Awaited<typeof import('csdm/node/database/database')>,
  checksum: string,
) {
  await databaseModule.db.transaction().execute(async (transaction) => {
    await transaction.deleteFrom('player_positions').where('match_checksum', '=', checksum).execute();
    await transaction.deleteFrom('team_tactics_player_positions').where('match_checksum', '=', checksum).execute();
    await transaction.deleteFrom('grenade_positions').where('match_checksum', '=', checksum).execute();
    await transaction.deleteFrom('inferno_positions').where('match_checksum', '=', checksum).execute();
    await transaction.deleteFrom('hostage_positions').where('match_checksum', '=', checksum).execute();
    await transaction.deleteFrom('chicken_positions').where('match_checksum', '=', checksum).execute();
  });
}

async function createBenchmarkDatabase(
  adminDatabaseSettings: DatabaseSettings,
  sourceDatabaseName: string,
  benchmarkName: string,
) {
  const benchmarkDatabaseName = toBenchmarkDatabaseName(sourceDatabaseName, benchmarkName);
  const client = await createPgClient(adminDatabaseSettings);

  try {
    await client.query(`CREATE DATABASE ${benchmarkDatabaseName} TEMPLATE ${sourceDatabaseName}`);
  } finally {
    await client.end();
  }

  return benchmarkDatabaseName;
}

async function dropBenchmarkDatabase(adminDatabaseSettings: DatabaseSettings, benchmarkDatabaseName: string) {
  const client = await createPgClient(adminDatabaseSettings);

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [benchmarkDatabaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS ${benchmarkDatabaseName}`);
  } finally {
    await client.end();
  }
}

async function writeSettings(settingsFilePath: string, originalSettings: Settings, databaseName: string) {
  const nextSettings: Settings = {
    ...originalSettings,
    database: {
      ...originalSettings.database,
      database: databaseName,
    },
  };

  await fs.writeFile(settingsFilePath, JSON.stringify(nextSettings, null, 2));

  return nextSettings;
}

async function destroyDatabaseConnection(databaseModule: Awaited<typeof import('csdm/node/database/database')>) {
  if (databaseModule.db) {
    await databaseModule.db.destroy();
  }
}

async function benchmarkMatch({
  adminDatabaseSettings,
  databaseModule,
  fullPositionsModule,
  migrationsModule,
  mode,
  match,
  originalSettings,
  settingsFilePath,
  tacticsPositionsModule,
}: {
  adminDatabaseSettings: DatabaseSettings;
  databaseModule: Awaited<typeof import('csdm/node/database/database')>;
  fullPositionsModule: Awaited<typeof import('csdm/node/database/matches/generate-match-positions')>;
  migrationsModule: Awaited<typeof import('csdm/node/database/migrations/migrate-database')>;
  mode: BenchmarkMode;
  match: MatchRow;
  originalSettings: Settings;
  settingsFilePath: string;
  tacticsPositionsModule: Awaited<typeof import('csdm/node/database/matches/generate-match-tactics-positions')>;
}) {
  const benchmarkDatabaseName = await createBenchmarkDatabase(
    adminDatabaseSettings,
    originalSettings.database.database,
    `${mode}_${match.checksum.slice(0, 8)}`,
  );

  try {
    const benchmarkSettings = await writeSettings(settingsFilePath, originalSettings, benchmarkDatabaseName);
    databaseModule.createDatabaseConnection(benchmarkSettings.database);
    await migrationsModule.migrateDatabase();
    await clearPositionTablesForChecksum(databaseModule, match.checksum);

    const beforeCounts = await fetchPositionCounts(databaseModule, match.checksum);
    const startedAt = performance.now();

    if (mode === 'full') {
      await fullPositionsModule.generateMatchPositions({
        checksum: match.checksum,
        demoPath: match.demoPath,
        source: match.source,
        onInsertionStart: () => {},
      });
    } else if (mode === 'tactics') {
      await tacticsPositionsModule.generateMatchTacticsPositions({
        checksum: match.checksum,
        demoPath: match.demoPath,
        source: match.source,
        onInsertionStart: () => {},
      });
    }

    const durationMs = performance.now() - startedAt;
    const afterCounts = await fetchPositionCounts(databaseModule, match.checksum);

    return {
      mode,
      checksum: match.checksum,
      demoName: match.demoName,
      mapName: match.mapName,
      durationMs,
      beforeCounts,
      afterCounts,
    };
  } finally {
    await destroyDatabaseConnection(databaseModule);
    await dropBenchmarkDatabase(adminDatabaseSettings, benchmarkDatabaseName);
  }
}

async function main() {
  await import('csdm/node/logger');

  globalThis.logger.log = () => {};
  globalThis.logger.warn = () => {};
  globalThis.logger.error = () => {};
  globalThis.logger.debug = () => {};

  const settingsModule = await import('csdm/node/settings/get-settings-file-path');
  const databaseModule = await import('csdm/node/database/database');
  const migrationsModule = await import('csdm/node/database/migrations/migrate-database');
  const fullPositionsModule = await import('csdm/node/database/matches/generate-match-positions');
  const tacticsPositionsModule = await import('csdm/node/database/matches/generate-match-tactics-positions');

  const settingsFilePath = settingsModule.getSettingsFilePath();
  const settingsContent = await fs.readFile(settingsFilePath, 'utf8');
  const originalSettings = JSON.parse(settingsContent) as Settings;
  const adminDatabaseSettings: DatabaseSettings = {
    ...originalSettings.database,
    database: 'postgres',
  };

  const matches = await fetchCurrentMatches(originalSettings.database);
  if (matches.length < 2) {
    throw new Error(`Expected at least 2 CS2 matches in the current database, found ${matches.length}`);
  }

  const results = [];

  try {
    for (const match of matches) {
      results.push(
        await benchmarkMatch({
          adminDatabaseSettings,
          databaseModule,
          fullPositionsModule,
          migrationsModule,
          mode: 'full',
          match,
          originalSettings,
          settingsFilePath,
          tacticsPositionsModule,
        }),
      );
      results.push(
        await benchmarkMatch({
          adminDatabaseSettings,
          databaseModule,
          fullPositionsModule,
          migrationsModule,
          mode: 'tactics',
          match,
          originalSettings,
          settingsFilePath,
          tacticsPositionsModule,
        }),
      );
    }
  } finally {
    await fs.writeFile(settingsFilePath, JSON.stringify(originalSettings, null, 2));
  }

  const fullResults = results.filter((result) => result.mode === 'full');
  const tacticsResults = results.filter((result) => result.mode === 'tactics');
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const averageFullMs = average(fullResults.map((result) => result.durationMs));
  const averageTacticsMs = average(tacticsResults.map((result) => result.durationMs));

  console.log(
    JSON.stringify(
      {
        sourceDatabase: originalSettings.database.database,
        matches: matches.map((match) => {
          return {
            checksum: match.checksum,
            demoName: match.demoName,
            mapName: match.mapName,
            demoPath: match.demoPath,
            source: match.source,
          };
        }),
        results,
        summary: {
          averageFullMs,
          averageTacticsMs,
          tacticsSpeedupVsFull: averageFullMs / averageTacticsMs,
        },
      },
      null,
      2,
    ),
  );
}

void main();
