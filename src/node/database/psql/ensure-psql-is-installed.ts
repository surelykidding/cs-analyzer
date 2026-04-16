import { executePsql } from './execute-psql';
import { PsqlNotFound } from './psql-error';

function isPsqlBinaryNotFoundError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    (message.includes('psql') || message.includes('psql.exe')) &&
    (message.includes('is not recognized as an internal or external command') ||
      message.includes('command not found') ||
      message.includes('spawn') ||
      message.includes('enoent'))
  );
}

export async function ensurePsqlIsInstalled() {
  try {
    await executePsql('--version');
  } catch (error) {
    logger.log('psql check failed');
    logger.log(error);
    logger.log({
      PATH: process.env.PATH,
      ProgramFiles: process.env.ProgramFiles,
      ProgramFilesX86: process.env['ProgramFiles(x86)'],
    });
    if (isPsqlBinaryNotFoundError(error)) {
      throw new PsqlNotFound();
    }

    throw error;
  }
}
