import fs from 'fs-extra';
import { DemoSource } from 'csdm/common/types/counter-strike';
import { db } from 'csdm/node/database/database';
import { processMatchInsertion } from 'csdm/node/database/matches/process-match-insertion';
import { generateMatchTacticsPositions } from 'csdm/node/database/matches/generate-match-tactics-positions';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import { analyzeDemo } from 'csdm/node/demo/analyze-demo';
import { CorruptedDemoError } from 'csdm/node/demo-analyzer/corrupted-demo-error';
import { runTacticsPositionsTask } from './tactics-positions-task-runner';

type Options = {
  demoPath: string;
  outputFolderPath: string;
  source: DemoSource;
  resolveLocalTeamName: (checksum: string) => Promise<string | null>;
  onInsertionStart?: () => void;
};

export async function processScoutingImportedDemo({
  demoPath,
  outputFolderPath,
  source,
  resolveLocalTeamName,
  onInsertionStart,
}: Options) {
  const demo = await getDemoFromFilePath(demoPath);
  const matchExists = await db
    .selectFrom('matches')
    .select('checksum')
    .where('checksum', '=', demo.checksum)
    .executeTakeFirst();

  let ownsDatabaseMatch = false;
  if (matchExists === undefined) {
    await fs.ensureDir(outputFolderPath);
    try {
      try {
        await analyzeDemo({
          demoPath,
          outputFolderPath,
          source,
          analyzePositions: false,
        });
      } catch (error) {
        if (!(error instanceof CorruptedDemoError)) {
          throw error;
        }
      }

      await processMatchInsertion({
        checksum: demo.checksum,
        demoPath,
        outputFolderPath,
      });
      ownsDatabaseMatch = true;
    } finally {
      await fs.remove(outputFolderPath);
    }
  }

  const localTeamName = await resolveLocalTeamName(demo.checksum);
  if (localTeamName === null) {
    throw new Error('Could not match the opponent team inside the imported demo.');
  }

  await runTacticsPositionsTask(demo.checksum, 'all', async () => {
    await generateMatchTacticsPositions({
      checksum: demo.checksum,
      demoPath,
      source,
      onInsertionStart: onInsertionStart ?? (() => {}),
    });
  });

  return {
    demoChecksum: demo.checksum,
    localTeamName,
    ownsDatabaseMatch,
  };
}
