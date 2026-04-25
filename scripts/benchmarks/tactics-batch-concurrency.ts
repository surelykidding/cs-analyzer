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

type BatchBenchmarkMode = 'serial' | 'parallel2';

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
  checksums: string[],
) {
  return Promise.all(
    checksums.map(async (checksum) => {
      const result = await databaseModule.db
        .selectFrom('matches')
        .select((eb) => {
          return [
            eb
              .selectFrom('team_tactics_player_positions')
              .select((eb) => eb.fn.count<number>('id').as('count'))
              .whereRef('team_tactics_player_positions.match_checksum', '=', 'matches.checksum')
              .as('tacticsPositionCount'),
          ];
        })
        .where('matches.checksum', '=', checksum)
        .executeTakeFirstOrThrow();

      return {
        checksum,
        tacticsPositionCount: result.tacticsPositionCount,
      };
    }),
  );
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
}

async function destroyDatabaseConnection(databaseModule: Awaited<typeof import('csdm/node/database/database')>) {
  if (databaseModule.db) {
    await databaseModule.db.destroy();
  }
}

async function runTacticsBatch(
  mode: BatchBenchmarkMode,
  matches: MatchRow[],
  tacticsPositionsModule: Awaited<typeof import('csdm/node/database/matches/generate-match-tactics-positions')>,
) {
  const startedAt = performance.now();

  if (mode === 'serial') {
    for (const match of matches) {
      await tacticsPositionsModule.generateMatchTacticsPositions({
        checksum: match.checksum,
        demoPath: match.demoPath,
        source: match.source,
        onInsertionStart: () => {},
      });
    }
  } else {
    const pendingMatches = [...matches];
    const workerCount = Math.min(2, pendingMatches.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (pendingMatches.length > 0) {
        const match = pendingMatches.shift();
        if (match === undefined) {
          return;
        }

        await tacticsPositionsModule.generateMatchTacticsPositions({
          checksum: match.checksum,
          demoPath: match.demoPath,
          source: match.source,
          onInsertionStart: () => {},
        });
      }
    });

    await Promise.all(workers);
  }

  return performance.now() - startedAt;
}

async function benchmarkBatchMode({
  adminDatabaseSettings,
  databaseModule,
  matches,
  migrationsModule,
  mode,
  originalSettings,
  tacticsPositionsModule,
  settingsFilePath,
}: {
  adminDatabaseSettings: DatabaseSettings;
  databaseModule: Awaited<typeof import('csdm/node/database/database')>;
  matches: MatchRow[];
  migrationsModule: Awaited<typeof import('csdm/node/database/migrations/migrate-database')>;
  mode: BatchBenchmarkMode;
  originalSettings: Settings;
  tacticsPositionsModule: Awaited<typeof import('csdm/node/database/matches/generate-match-tactics-positions')>;
  settingsFilePath: string;
}) {
  const benchmarkDatabaseName = await createBenchmarkDatabase(
    adminDatabaseSettings,
    originalSettings.database.database,
    `${mode}_batch`,
  );

  try {
    await writeSettings(settingsFilePath, originalSettings, benchmarkDatabaseName);
    databaseModule.createDatabaseConnection({
      ...originalSettings.database,
      database: benchmarkDatabaseName,
    });
    await migrationsModule.migrateDatabase();

    const beforeCounts = await fetchPositionCounts(
      databaseModule,
      matches.map((match) => match.checksum),
    );
    const durationMs = await runTacticsBatch(mode, matches, tacticsPositionsModule);
    const afterCounts = await fetchPositionCounts(
      databaseModule,
      matches.map((match) => match.checksum),
    );

    return {
      mode,
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

  const iterations = [];

  try {
    for (let iteration = 1; iteration <= 2; iteration++) {
      const serialResult = await benchmarkBatchMode({
        adminDatabaseSettings,
        databaseModule,
        matches,
        migrationsModule,
        mode: 'serial',
        originalSettings,
        tacticsPositionsModule,
        settingsFilePath,
      });
      const parallelResult = await benchmarkBatchMode({
        adminDatabaseSettings,
        databaseModule,
        matches,
        migrationsModule,
        mode: 'parallel2',
        originalSettings,
        tacticsPositionsModule,
        settingsFilePath,
      });

      iterations.push({
        iteration,
        serialMs: serialResult.durationMs,
        parallel2Ms: parallelResult.durationMs,
        speedup: serialResult.durationMs / parallelResult.durationMs,
        serialCounts: serialResult.afterCounts,
        parallel2Counts: parallelResult.afterCounts,
      });
    }
  } finally {
    await fs.writeFile(settingsFilePath, JSON.stringify(originalSettings, null, 2));
  }

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const averageSerialMs = average(iterations.map((iteration) => iteration.serialMs));
  const averageParallel2Ms = average(iterations.map((iteration) => iteration.parallel2Ms));

  console.log(
    JSON.stringify(
      {
        sourceDatabase: originalSettings.database.database,
        matches,
        iterations,
        summary: {
          averageSerialMs,
          averageParallel2Ms,
          speedup: averageSerialMs / averageParallel2Ms,
        },
      },
      null,
      2,
    ),
  );
}

void main();
