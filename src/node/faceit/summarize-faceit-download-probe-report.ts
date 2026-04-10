import {
  FACEIT_DOWNLOAD_PROBE_MIN_HEADER_VALIDATION_RATE,
  FACEIT_DOWNLOAD_PROBE_MIN_IMPORT_SMOKE_SUCCESS_COUNT,
  type FaceitDownloadProbeResult,
  type FaceitDownloadProbeSummary,
} from 'csdm/common/types/faceit-download-probe';

export function summarizeFaceitDownloadProbeReport(results: FaceitDownloadProbeResult[]): FaceitDownloadProbeSummary {
  const totalSampleCount = results.length;
  const demoUrlPresentCount = results.filter((result) => result.demoUrlPresent).length;
  const demoHeaderValidatedCount = results.filter((result) => result.demoHeaderValidated).length;
  const importSmokeSucceededCount = results.filter((result) => result.importSmokeSucceeded).length;
  const headerValidationSuccessRate = totalSampleCount === 0 ? 0 : demoHeaderValidatedCount / totalSampleCount;
  const meetsHeaderValidationThreshold = headerValidationSuccessRate >= FACEIT_DOWNLOAD_PROBE_MIN_HEADER_VALIDATION_RATE;
  const meetsImportSmokeThreshold = importSmokeSucceededCount >= FACEIT_DOWNLOAD_PROBE_MIN_IMPORT_SMOKE_SUCCESS_COUNT;

  return {
    totalSampleCount,
    demoUrlPresentCount,
    demoHeaderValidatedCount,
    importSmokeSucceededCount,
    headerValidationSuccessRate,
    meetsHeaderValidationThreshold,
    meetsImportSmokeThreshold,
    passed: meetsHeaderValidationThreshold && meetsImportSmokeThreshold,
  };
}
