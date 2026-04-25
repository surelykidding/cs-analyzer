import { spawn } from 'node:child_process';
import {
  assertDemoAnalyzerCompatibility,
  type DemoAnalyzerCapabilities,
} from 'csdm/node/demo-analyzer/demo-analyzer-capabilities';
import { getDemoAnalyzerExecutablePath } from 'csdm/node/demo-analyzer/demo-analyzer-path';
import { DemoAnalyzerIncompatibleError } from './demo-analyzer-incompatible-error';
import { buildDemoAnalyzerCommand, buildDemoAnalyzerError } from './demo-analyzer-process';

type Options = {
  args: string[] | ((capabilities: DemoAnalyzerCapabilities) => string[]);
  requiredFlags: string[];
  onStart?: (command: string) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onEnd?: (code: number | null) => void;
};

function logDemoAnalyzerFailure({
  command,
  executablePath,
  capabilities,
  stderrOutput,
  exitCode,
}: {
  command: string;
  executablePath: string;
  capabilities?: DemoAnalyzerCapabilities;
  stderrOutput: string;
  exitCode: number | null;
}) {
  const stderrFirstLine = stderrOutput
    .replaceAll('\u0000', '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '');

  logger.error('demo analyzer failed', {
    command,
    executablePath,
    platform: process.platform,
    arch: process.arch,
    capabilities,
    exitCode,
    stderrFirstLine,
  });
}

export async function runDemoAnalyzerProcess({ args, requiredFlags, onStart, onStdout, onStderr, onEnd }: Options) {
  const executablePath = getDemoAnalyzerExecutablePath();
  const capabilities = await assertDemoAnalyzerCompatibility({ executablePath, requiredFlags });
  const resolvedArgs = typeof args === 'function' ? args(capabilities) : args;
  const command = buildDemoAnalyzerCommand(executablePath, resolvedArgs);
  onStart?.(command);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executablePath, resolvedArgs, {
      windowsHide: true,
    });
    let stderrOutput = '';

    child.stdout?.on('data', (data) => {
      onStdout?.(data.toString());
    });

    child.stderr?.on('data', (data) => {
      const message = data.toString();
      stderrOutput += message;
      onStderr?.(message);
    });

    child.on('error', () => {
      reject(
        new DemoAnalyzerIncompatibleError(`Unable to start the bundled demo analyzer at "${executablePath}".`, {
          executablePath,
          command,
        }),
      );
    });

    child.on('exit', (code) => {
      onEnd?.(code);
      if (code === 0) {
        resolve();
        return;
      }

      logDemoAnalyzerFailure({
        command,
        executablePath,
        capabilities,
        stderrOutput,
        exitCode: code,
      });
      reject(buildDemoAnalyzerError(stderrOutput, code, { command, executablePath }));
    });
  });
}
