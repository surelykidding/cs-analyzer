import { executePsql } from './execute-psql';
import { PsqlNotFound } from './psql-error';

export async function ensurePsqlIsInstalled() {
  try {
    await executePsql('--version');
  } catch (error) {
    logger.log('psql not found');
    logger.log(error);
    logger.log({
      PATH: process.env.PATH,
      ProgramFiles: process.env.ProgramFiles,
      ProgramFilesX86: process.env['ProgramFiles(x86)'],
    });
    throw new PsqlNotFound();
  }
}
