import type { Options as AnalyzeOptions } from '@akiver/cs-demo-analyzer';
import { coreDemoAnalyzerFlags, optionalDemoAnalyzerFlags } from './demo-analyzer-capabilities';
import { buildAnalyzeDemoArgs } from './demo-analyzer-arguments';
import { runDemoAnalyzerProcess } from './run-demo-analyzer-process';

type RunDemoAnalyzerOptions = Omit<AnalyzeOptions, 'format' | 'executablePath'>;

export async function runDemoAnalyzer(
  options: Omit<RunDemoAnalyzerOptions, 'format' | 'executablePath'>,
): Promise<void> {
  await runDemoAnalyzerProcess({
    args: buildAnalyzeDemoArgs(options),
    requiredFlags: [...coreDemoAnalyzerFlags, ...(options.minify ? optionalDemoAnalyzerFlags : [])],
    onStart: options.onStart,
    onStdout: options.onStdout,
    onStderr: options.onStderr,
    onEnd: (code) => {
      options.onEnd?.(code ?? -1);
    },
  });
}
