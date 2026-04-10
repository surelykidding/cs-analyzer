export const FACEIT_DOWNLOAD_PROBE_MIN_HEADER_VALIDATION_RATE = 0.7;
export const FACEIT_DOWNLOAD_PROBE_MIN_IMPORT_SMOKE_SUCCESS_COUNT = 3;

export const FaceitDownloadProbeSource = {
  CurrentAccountLatest: 'current-account-latest',
  ManualMatch: 'manual-match',
} as const;
export type FaceitDownloadProbeSource =
  (typeof FaceitDownloadProbeSource)[keyof typeof FaceitDownloadProbeSource];

export const FaceitDownloadProbeFailure = {
  MatchFetchFailed: 'match-fetch-failed',
  MissingDemoUrl: 'missing-demo-url',
  GetRequestFailed: 'get-request-failed',
  UnsupportedArchiveFormat: 'unsupported-archive-format',
  DownloadFailed: 'download-failed',
  ExtractionFailed: 'extraction-failed',
  DemoHeaderReadFailed: 'demo-header-read-failed',
  TemporaryDatabaseFailed: 'temporary-database-failed',
  AnalyzeFailed: 'analyze-failed',
  MatchInsertionFailed: 'match-insertion-failed',
} as const;
export type FaceitDownloadProbeFailure =
  (typeof FaceitDownloadProbeFailure)[keyof typeof FaceitDownloadProbeFailure];

export type FaceitDownloadProbeHttpResult = {
  ok: boolean;
  statusCode: number | null;
  contentType: string | null;
  finalUrl: string | null;
  error: string | null;
};

export type FaceitDownloadProbeResult = {
  matchId: string;
  mapName: string | null;
  demoUrlPresent: boolean;
  sampleSources: FaceitDownloadProbeSource[];
  headRequest: FaceitDownloadProbeHttpResult;
  getRequest: FaceitDownloadProbeHttpResult;
  archiveFormat: string | null;
  extractedDemo: boolean;
  demoHeaderValidated: boolean;
  importSmokeSucceeded: boolean;
  failureCode: FaceitDownloadProbeFailure | null;
  failureMessage: string | null;
};

export type FaceitDownloadProbeSummary = {
  totalSampleCount: number;
  demoUrlPresentCount: number;
  demoHeaderValidatedCount: number;
  importSmokeSucceededCount: number;
  headerValidationSuccessRate: number;
  meetsHeaderValidationThreshold: boolean;
  meetsImportSmokeThreshold: boolean;
  passed: boolean;
};

export type FaceitDownloadProbeReport = {
  generatedAt: string;
  currentAccountMatchCountRequested: number;
  currentAccountMatchCountResolved: number;
  manualMatchCountRequested: number;
  results: FaceitDownloadProbeResult[];
  summary: FaceitDownloadProbeSummary;
};
