import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Options as AnalyzeOptions } from '@akiver/cs-demo-analyzer';
import { getStaticFolderPath } from 'csdm/node/filesystem/get-static-folder-path';
import { isWindows } from 'csdm/node/os/is-windows';
import { buildDemoAnalyzerCommand, buildDemoAnalyzerError } from './demo-analyzer-process';

type RunDemoAnalyzerOptions = Omit<AnalyzeOptions, 'format' | 'executablePath'>;

export async function runDemoAnalyzer(
  options: Omit<RunDemoAnalyzerOptions, 'format' | 'executablePath'>,
): Promise<void> {
  const executablePath = path.join(getStaticFolderPath(), isWindows ? 'csda.exe' : 'csda');
  const args = [
    `-demo-path=${options.demoPath}`,
    `-output=${options.outputFolderPath}`,
    '-format=csdm',
  ];
  if (options.source !== undefined) {
    args.push(`-source=${options.source}`);
  }

  if (options.analyzePositions !== undefined) {
    args.push(`-positions=${options.analyzePositions}`);
  }

  if (options.minify) {
    args.push('-minify');
  }

  const command = buildDemoAnalyzerCommand(executablePath, args);
  options.onStart?.(command);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executablePath, args, {
      windowsHide: true,
    });
    let stderrOutput = '';

    child.stdout?.on('data', (data) => {
      options.onStdout?.(data.toString());
    });

    child.stderr?.on('data', (data) => {
      const message = data.toString();
      stderrOutput += message;
      options.onStderr?.(message);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      options.onEnd?.(code ?? -1);
      if (code === 0) {
        resolve();
        return;
      }

      reject(buildDemoAnalyzerError(stderrOutput, code));
    });
  });
}
