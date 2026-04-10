import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client } from 'pg';
import {
  FaceitDownloadProbeFailure,
  FaceitDownloadProbeSource,
  type FaceitDownloadProbeFailure as FaceitDownloadProbeFailureType,
  type FaceitDownloadProbeHttpResult,
  type FaceitDownloadProbeReport,
  type FaceitDownloadProbeResult,
  type FaceitDownloadProbeSource as FaceitDownloadProbeSourceType,
} from 'csdm/common/types/faceit-download-probe';
import { DemoSource } from 'csdm/common/types/counter-strike';
import { getSettings } from 'csdm/node/settings/get-settings';
import { migrateSettings } from 'csdm/node/settings/migrate-settings';
import { fetchCurrentFaceitAccount } from 'csdm/node/database/faceit-account/fetch-current-faceit-account';
import { fetchPlayerLastMatches } from 'csdm/node/faceit-web-api/fetch-player-last-matches';
import { getFaceitApiKey } from 'csdm/node/faceit-web-api/get-faceit-api-key';
import { fetchFaceitMatchStats } from 'csdm/node/faceit-web-api/fetch-match-stats';
import { fetchMatch } from 'csdm/node/faceit-web-api/fetch-match';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import { analyzeDemo } from 'csdm/node/demo/analyze-demo';
import { processMatchInsertion } from 'csdm/node/database/matches/process-match-insertion';
import { migrateDatabase } from 'csdm/node/database/migrations/migrate-database';
import { createDatabaseConnection, db } from 'csdm/node/database/database';
import type { DatabaseSettings } from 'csdm/node/settings/settings';
import { detectDemoArchiveFormat, extractDemoArchiveToFile } from 'csdm/node/demo-archive/demo-archive';
import { extractFaceitMatchId } from './extract-faceit-match-id';
import { summarizeFaceitDownloadProbeReport } from './summarize-faceit-download-probe-report';

type ProbeSample = {
  matchId: string;
  mapName: string;
  demoUrl: string;
};

type ProbeOptions = {
  currentAccountMatchCount: number;
  manualMatchIdsOrUrls: string[];
  onProgress?: (message: string) => void;
};

type ImportSmokeResult =
  | {
      success: true;
    }
  | {
      success: false;
      failureCode: FaceitDownloadProbeFailureType;
      failureMessage: string;
    };

function emptyHttpResult(error: string | null = null): FaceitDownloadProbeHttpResult {
  return {
    ok: false,
    statusCode: null,
    contentType: null,
    finalUrl: null,
    error,
  };
}

function buildHttpResultFromResponse(response: Response): FaceitDownloadProbeHttpResult {
  return {
    ok: response.ok,
    statusCode: response.status,
    contentType: response.headers.get('content-type'),
    finalUrl: response.url,
    error: null,
  };
}

function buildHttpResultFromError(error: unknown): FaceitDownloadProbeHttpResult {
  return emptyHttpResult(error instanceof Error ? error.message : String(error));
}

function getProbeWorkspaceRoot() {
  return path.join(os.tmpdir(), 'csdm-faceit-download-probe');
}

function sanitizeIdentifier(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeDatabaseName(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_]/g, '_');
}

function createTemporaryDatabaseName(matchId: string) {
  return sanitizeDatabaseName(`csdm_faceit_probe_${matchId}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`);
}

function normalizeMapName(mapName: string) {
  const workshopRegex = /workshop\/(\d+\/)(?<mapName>.*)/;
  const matches = mapName.match(workshopRegex);

  return matches?.groups?.mapName || mapName;
}

function setFailure(
  result: FaceitDownloadProbeResult,
  failureCode: FaceitDownloadProbeFailureType,
  failureMessage: string,
) {
  result.failureCode = failureCode;
  result.failureMessage = failureMessage;

  return result;
}

async function destroyDatabaseConnection() {
  if (db !== undefined) {
    await db.destroy();
  }
}

async function createPgClient(databaseSettings: DatabaseSettings, databaseName: string) {
  const client = new Client({
    host: databaseSettings.hostname,
    port: databaseSettings.port,
    user: databaseSettings.username,
    password: databaseSettings.password,
    database: databaseName,
  });
  await client.connect();

  return client;
}

async function createTemporaryDatabase(databaseSettings: DatabaseSettings, databaseName: string) {
  const client = await createPgClient(databaseSettings, 'postgres');

  try {
    await client.query(`CREATE DATABASE ${databaseName} WITH ENCODING 'UTF8'`);
  } finally {
    await client.end();
  }
}

async function dropTemporaryDatabase(databaseSettings: DatabaseSettings, databaseName: string) {
  const client = await createPgClient(databaseSettings, 'postgres');

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  } finally {
    await client.end();
  }
}

async function fetchProbeSample(matchId: string, apiKey: string): Promise<ProbeSample> {
  const [match, stats] = await Promise.all([fetchMatch(matchId, apiKey), fetchFaceitMatchStats(matchId, apiKey)]);
  if (stats.rounds.length === 0) {
    throw new Error('No rounds found for the match');
  }

  return {
    matchId,
    mapName: normalizeMapName(stats.rounds[0].round_stats.Map),
    demoUrl: match.demo_url?.[0] ?? '',
  };
}

async function performHeadRequest(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });

    return buildHttpResultFromResponse(response);
  } catch (error) {
    return buildHttpResultFromError(error);
  }
}

async function downloadArchive(url: string, destinationPath: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    const result = buildHttpResultFromResponse(response);

    if (!response.ok || response.body === null) {
      return {
        response: null,
        result,
      };
    }

    await pipeline(
      Readable.fromWeb(response.body as any),
      fs.createWriteStream(destinationPath),
    );

    return {
      response,
      result,
    };
  } catch (error) {
    return {
      response: null,
      result: buildHttpResultFromError(error),
    };
  }
}

async function runImportSmoke(
  databaseSettings: DatabaseSettings,
  matchId: string,
  demoPath: string,
  checksum: string,
  workspaceRoot: string,
): Promise<ImportSmokeResult> {
  const databaseName = createTemporaryDatabaseName(matchId);
  try {
    await createTemporaryDatabase(databaseSettings, databaseName);
  } catch (error) {
    return {
      success: false,
      failureCode: FaceitDownloadProbeFailure.TemporaryDatabaseFailed,
      failureMessage: error instanceof Error ? error.message : String(error),
    };
  }

  const temporaryDatabaseSettings: DatabaseSettings = {
    ...databaseSettings,
    database: databaseName,
  };

  try {
    createDatabaseConnection(temporaryDatabaseSettings);
    await migrateDatabase();

    const outputFolderPath = path.join(workspaceRoot, sanitizeIdentifier(matchId), 'analysis');
    await fs.ensureDir(outputFolderPath);

    try {
      await analyzeDemo({
        demoPath,
        outputFolderPath,
        source: DemoSource.FaceIt,
        analyzePositions: false,
      });
    } catch (error) {
      return {
        success: false,
        failureCode: FaceitDownloadProbeFailure.AnalyzeFailed,
        failureMessage: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      await processMatchInsertion({
        checksum,
        demoPath,
        outputFolderPath,
      });
    } catch (error) {
      return {
        success: false,
        failureCode: FaceitDownloadProbeFailure.MatchInsertionFailed,
        failureMessage: error instanceof Error ? error.message : String(error),
      };
    }

    return { success: true };
  } finally {
    await destroyDatabaseConnection();
    await dropTemporaryDatabase(databaseSettings, databaseName);
  }
}

async function probeMatch({
  apiKey,
  databaseSettings,
  matchId,
  sampleSources,
  workspaceRoot,
}: {
  apiKey: string;
  databaseSettings: DatabaseSettings;
  matchId: string;
  sampleSources: FaceitDownloadProbeSourceType[];
  workspaceRoot: string;
}): Promise<FaceitDownloadProbeResult> {
  const result: FaceitDownloadProbeResult = {
    matchId,
    mapName: null,
    demoUrlPresent: false,
    sampleSources,
    headRequest: emptyHttpResult(),
    getRequest: emptyHttpResult(),
    archiveFormat: null,
    extractedDemo: false,
    demoHeaderValidated: false,
    importSmokeSucceeded: false,
    failureCode: null,
    failureMessage: null,
  };

  let sample: ProbeSample;
  try {
    sample = await fetchProbeSample(matchId, apiKey);
    result.mapName = sample.mapName;
  } catch (error) {
    return setFailure(
      result,
      FaceitDownloadProbeFailure.MatchFetchFailed,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (sample.demoUrl === '') {
    result.demoUrlPresent = false;
    result.headRequest = emptyHttpResult('Missing demo URL');
    result.getRequest = emptyHttpResult('Missing demo URL');

    return setFailure(result, FaceitDownloadProbeFailure.MissingDemoUrl, 'Missing demo URL');
  }

  result.demoUrlPresent = true;
  result.headRequest = await performHeadRequest(sample.demoUrl);

  const matchWorkspacePath = path.join(workspaceRoot, sanitizeIdentifier(matchId));
  await fs.ensureDir(matchWorkspacePath);

  const getResponse = await downloadArchive(sample.demoUrl, path.join(matchWorkspacePath, 'download.tmp'));
  result.getRequest = getResponse.result;
  if (getResponse.response === null) {
    return setFailure(
      result,
      FaceitDownloadProbeFailure.GetRequestFailed,
      getResponse.result.error ?? `GET request failed with status ${getResponse.result.statusCode ?? 'unknown'}`,
    );
  }

  const archiveFormat = detectDemoArchiveFormat(getResponse.result.finalUrl ?? sample.demoUrl, getResponse.result.contentType);
  result.archiveFormat = archiveFormat;
  if (archiveFormat === null) {
    return setFailure(
      result,
      FaceitDownloadProbeFailure.UnsupportedArchiveFormat,
      `Unsupported archive format from ${getResponse.result.finalUrl ?? sample.demoUrl}`,
    );
  }

  const archivePath = path.join(matchWorkspacePath, `download.${archiveFormat}`);
  const temporaryArchivePath = path.join(matchWorkspacePath, 'download.tmp');
  await fs.move(temporaryArchivePath, archivePath, { overwrite: true });

  const demoPath = path.join(matchWorkspacePath, `${sanitizeIdentifier(matchId)}.dem`);
  try {
    await extractDemoArchiveToFile(archivePath, demoPath, archiveFormat);
  } catch (error) {
    return setFailure(
      result,
      FaceitDownloadProbeFailure.ExtractionFailed,
      error instanceof Error ? error.message : String(error),
    );
  }

  const demoExists = await fs.pathExists(demoPath);
  if (!demoExists) {
    return setFailure(result, FaceitDownloadProbeFailure.ExtractionFailed, 'No .dem file was extracted');
  }

  result.extractedDemo = true;

  let demo;
  try {
    demo = await getDemoFromFilePath(demoPath);
    result.demoHeaderValidated = true;
  } catch (error) {
    return setFailure(
      result,
      FaceitDownloadProbeFailure.DemoHeaderReadFailed,
      error instanceof Error ? error.message : String(error),
    );
  }

  const importSmokeResult = await runImportSmoke(databaseSettings, matchId, demoPath, demo.checksum, workspaceRoot);
  if (!importSmokeResult.success) {
    return setFailure(result, importSmokeResult.failureCode, importSmokeResult.failureMessage);
  }

  result.importSmokeSucceeded = true;

  return result;
}

export async function probeFaceitDownloads({
  currentAccountMatchCount,
  manualMatchIdsOrUrls,
  onProgress,
}: ProbeOptions): Promise<FaceitDownloadProbeReport> {
  await migrateSettings();
  const settings = await getSettings();
  const apiKey = await getFaceitApiKey();
  const requestedMatchIds = new Map<string, Set<FaceitDownloadProbeSourceType>>();
  let currentAccountMatchCountResolved = 0;

  createDatabaseConnection(settings.database);
  try {
    await migrateDatabase();

    if (currentAccountMatchCount > 0) {
      const currentAccount = await fetchCurrentFaceitAccount();
      if (currentAccount === undefined) {
        throw new Error('No current FACEIT account found.');
      }

      onProgress?.(`Fetching the last ${currentAccountMatchCount} FACEIT matches for ${currentAccount.nickname}...`);
      const history = await fetchPlayerLastMatches(currentAccount.id, apiKey);
      const selectedHistory = history.slice(0, currentAccountMatchCount);
      currentAccountMatchCountResolved = selectedHistory.length;

      for (const match of selectedHistory) {
        const sources = requestedMatchIds.get(match.match_id) ?? new Set<FaceitDownloadProbeSourceType>();
        sources.add(FaceitDownloadProbeSource.CurrentAccountLatest);
        requestedMatchIds.set(match.match_id, sources);
      }
    }
  } finally {
    await destroyDatabaseConnection();
  }

  for (const matchIdOrUrl of manualMatchIdsOrUrls) {
    const matchId = extractFaceitMatchId(matchIdOrUrl);
    if (matchId === '') {
      continue;
    }

    const sources = requestedMatchIds.get(matchId) ?? new Set<FaceitDownloadProbeSourceType>();
    sources.add(FaceitDownloadProbeSource.ManualMatch);
    requestedMatchIds.set(matchId, sources);
  }

  if (requestedMatchIds.size === 0) {
    throw new Error('No FACEIT matches to probe.');
  }

  await fs.ensureDir(getProbeWorkspaceRoot());
  const workspaceRoot = await fs.mkdtemp(path.join(getProbeWorkspaceRoot(), 'run-'));
  const results: FaceitDownloadProbeResult[] = [];

  try {
    let index = 0;
    for (const [matchId, sources] of requestedMatchIds.entries()) {
      index += 1;
      onProgress?.(`Probing FACEIT match ${matchId} (${index}/${requestedMatchIds.size})...`);
      const result = await probeMatch({
        apiKey,
        databaseSettings: settings.database,
        matchId,
        sampleSources: [...sources],
        workspaceRoot,
      });
      results.push(result);
    }
  } finally {
    await destroyDatabaseConnection();
    await fs.remove(workspaceRoot);
  }

  return {
    generatedAt: new Date().toISOString(),
    currentAccountMatchCountRequested: currentAccountMatchCount,
    currentAccountMatchCountResolved,
    manualMatchCountRequested: manualMatchIdsOrUrls.length,
    results,
    summary: summarizeFaceitDownloadProbeReport(results),
  };
}
