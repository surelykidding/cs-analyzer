import { execFile, type ExecFileException } from 'node:child_process';
import { findPsqlBinaryPath } from './find-psql-binary-path';
import { PsqlTimeout } from './errors/psql-timeout';

function removeDatabaseInformationFromMessage(message: string) {
  const regex = /postgresql:\/\/(.*?):(.*?)@(.*):(\d+)\/?(.*)/g;

  return message.replace(regex, 'postgresql://*****:*****@*****:****/$5');
}

type Options = {
  timeoutMs: number;
};

export async function executePsql(args: string[], options?: Options) {
  const psqlBinaryPath = await findPsqlBinaryPath();

  return new Promise<void>((resolve, reject) => {
    execFile(
      psqlBinaryPath,
      args,
      {
        env: { ...process.env, PGCONNECT_TIMEOUT: '10' },
        timeout: options?.timeoutMs ?? 0,
        windowsHide: true,
      },
      (error: ExecFileException | null) => {
        if (error !== null) {
          const isTimeout =
            (error.code === null && error.signal === 'SIGTERM') ||
            (error instanceof Error && error.message.includes('timeout'));

          error.message = removeDatabaseInformationFromMessage(error.message);
          if (isTimeout) {
            return reject(new PsqlTimeout());
          }

          return reject(error);
        }

        resolve();
      },
    );
  });
}
