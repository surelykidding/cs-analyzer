import fs from 'fs-extra';
import type { DemoSource } from 'csdm/common/types/counter-strike';
import { assertDemoExists } from 'csdm/node/counter-strike/launcher/assert-demo-exists';
import { buildAnalyzeTacticsPositionsArgs } from 'csdm/node/demo-analyzer/demo-analyzer-arguments';
import {
  coreDemoAnalyzerFlags,
  getMissingDemoAnalyzerFlags,
  tacticsDemoAnalyzerFlags,
} from 'csdm/node/demo-analyzer/demo-analyzer-capabilities';
import { runDemoAnalyzerProcess } from 'csdm/node/demo-analyzer/run-demo-analyzer-process';

type Options = {
  outputFolderPath: string;
  demoPath: string;
  source: DemoSource;
  roundNumbers?: number[];
  onStart?: (command: string) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onEnd?: (code: number | null) => void;
};

export async function analyzeTacticsPositions({
  outputFolderPath,
  demoPath,
  source,
  roundNumbers,
  onStart,
  onStdout,
  onStderr,
  onEnd,
}: Options) {
  await assertDemoExists(demoPath);
  await fs.ensureDir(outputFolderPath);

  return runDemoAnalyzerProcess({
    args: (capabilities) => {
      const useEnhancedPositionOptions =
        getMissingDemoAnalyzerFlags(capabilities.supportedFlags, tacticsDemoAnalyzerFlags).length === 0;
      if (!useEnhancedPositionOptions) {
        logger.warn(
          'demo analyzer does not support enhanced tactics position flags, falling back to full positions analysis',
          {
            supportedFlags: capabilities.supportedFlags,
            missingFlags: getMissingDemoAnalyzerFlags(capabilities.supportedFlags, tacticsDemoAnalyzerFlags),
          },
        );
      }

      return buildAnalyzeTacticsPositionsArgs({
        demoPath,
        outputFolderPath,
        source,
        roundNumbers,
        useEnhancedPositionOptions,
      });
    },
    requiredFlags: coreDemoAnalyzerFlags,
    onStart,
    onStdout,
    onStderr,
    onEnd,
  });
}
