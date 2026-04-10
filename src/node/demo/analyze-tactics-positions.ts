import path from 'node:path';
import { exec } from 'node:child_process';
import fs from 'fs-extra';
import type { DemoSource } from 'csdm/common/types/counter-strike';
import {
  TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS,
  TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS,
} from 'csdm/common/types/team-tactics';
import { assertDemoExists } from 'csdm/node/counter-strike/launcher/assert-demo-exists';
import { CorruptedDemoError } from 'csdm/node/demo-analyzer/corrupted-demo-error';
import { getStaticFolderPath } from 'csdm/node/filesystem/get-static-folder-path';
import { isWindows } from 'csdm/node/os/is-windows';

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

const positionEntities = 'players';

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

  return new Promise<void>((resolve, reject) => {
    const executablePath = path.join(getStaticFolderPath(), isWindows ? 'csda.exe' : 'csda');
    const args = [
      `"${executablePath}"`,
      `-demo-path="${demoPath}"`,
      `-output="${outputFolderPath}"`,
      '-format="csdm"',
      '-positions="true"',
      `-position-entities="${positionEntities}"`,
      `-position-window-start-seconds="${TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS}"`,
      `-position-window-end-seconds="${TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS}"`,
    ];

    if (roundNumbers !== undefined && roundNumbers.length > 0) {
      args.push(`-rounds="${roundNumbers.join(',')}"`);
    }

    args.push(`-source="${source}"`);

    const command = args.join(' ');
    onStart?.(command);

    const child = exec(command, {
      windowsHide: true,
      maxBuffer: undefined,
    });

    let hasCorruptedDemoError = false;

    child.stdout?.on('data', (data) => {
      onStdout?.(data.toString());
    });

    child.stderr?.on('data', (data) => {
      const message = data.toString();
      onStderr?.(message);
      if (message.includes('ErrUnexpectedEndOfDemo')) {
        hasCorruptedDemoError = true;
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      onEnd?.(code);
      if (code === 0) {
        resolve();
        return;
      }

      if (hasCorruptedDemoError) {
        reject(new CorruptedDemoError());
        return;
      }

      reject(new Error(`demo analyzer exited with code ${code}`));
    });
  });
}
