import { describe, expect, it } from 'vite-plus/test';
import { FaceitDownloadProbeFailure, FaceitDownloadProbeSource } from 'csdm/common/types/faceit-download-probe';
import { summarizeFaceitDownloadProbeReport } from './summarize-faceit-download-probe-report';

describe('summarizeFaceitDownloadProbeReport', () => {
  it('should pass when thresholds are met', () => {
    const summary = summarizeFaceitDownloadProbeReport([
      {
        matchId: '1',
        mapName: 'de_mirage',
        demoUrlPresent: true,
        sampleSources: [FaceitDownloadProbeSource.CurrentAccountLatest],
        headRequest: { ok: false, statusCode: 403, contentType: null, finalUrl: null, error: null },
        getRequest: { ok: true, statusCode: 200, contentType: 'application/gzip', finalUrl: 'https://test.local', error: null },
        archiveFormat: 'gz',
        extractedDemo: true,
        demoHeaderValidated: true,
        importSmokeSucceeded: true,
        failureCode: null,
        failureMessage: null,
      },
      {
        matchId: '2',
        mapName: 'de_mirage',
        demoUrlPresent: true,
        sampleSources: [FaceitDownloadProbeSource.ManualMatch],
        headRequest: { ok: true, statusCode: 200, contentType: 'application/gzip', finalUrl: 'https://test.local', error: null },
        getRequest: { ok: true, statusCode: 200, contentType: 'application/gzip', finalUrl: 'https://test.local', error: null },
        archiveFormat: 'gz',
        extractedDemo: true,
        demoHeaderValidated: true,
        importSmokeSucceeded: true,
        failureCode: null,
        failureMessage: null,
      },
      {
        matchId: '3',
        mapName: 'de_inferno',
        demoUrlPresent: true,
        sampleSources: [FaceitDownloadProbeSource.ManualMatch],
        headRequest: { ok: true, statusCode: 200, contentType: 'application/gzip', finalUrl: 'https://test.local', error: null },
        getRequest: { ok: true, statusCode: 200, contentType: 'application/gzip', finalUrl: 'https://test.local', error: null },
        archiveFormat: 'gz',
        extractedDemo: true,
        demoHeaderValidated: true,
        importSmokeSucceeded: true,
        failureCode: null,
        failureMessage: null,
      },
      {
        matchId: '4',
        mapName: 'de_ancient',
        demoUrlPresent: false,
        sampleSources: [FaceitDownloadProbeSource.ManualMatch],
        headRequest: { ok: false, statusCode: null, contentType: null, finalUrl: null, error: 'no demo url' },
        getRequest: { ok: false, statusCode: null, contentType: null, finalUrl: null, error: 'no demo url' },
        archiveFormat: null,
        extractedDemo: false,
        demoHeaderValidated: false,
        importSmokeSucceeded: false,
        failureCode: FaceitDownloadProbeFailure.MissingDemoUrl,
        failureMessage: 'Missing demo URL',
      },
    ]);

    expect(summary.headerValidationSuccessRate).toBe(0.75);
    expect(summary.meetsHeaderValidationThreshold).toBe(true);
    expect(summary.meetsImportSmokeThreshold).toBe(true);
    expect(summary.passed).toBe(true);
  });
});
