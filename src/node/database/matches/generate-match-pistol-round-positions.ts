import path from 'node:path';
import fs from 'fs-extra';
import { analyzePistolRoundPositions } from 'csdm/node/demo/analyze-pistol-round-positions';
import { CorruptedDemoError } from 'csdm/node/demo-analyzer/corrupted-demo-error';
import type { DemoSource } from 'csdm/common/types/counter-strike';
import { getSettings } from 'csdm/node/settings/get-settings';
import {
  getDemoNameFromPath,
  getOutputFolderPath,
} from 'csdm/node/database/matches/match-insertion';
import { replaceTeamTacticsPlayerPositions } from './insert-match-pistol-round-positions';

type Parameters = {
  checksum: string;
  demoPath: string;
  source: DemoSource;
  onInsertionStart: () => void;
};

export async function generateMatchPistolRoundPositions({
  checksum,
  demoPath,
  source,
  onInsertionStart,
}: Parameters) {
  const outputFolderPath = path.join(getOutputFolderPath(), 'team-tactics-pistol-round-positions', checksum);
  const demoName = getDemoNameFromPath(demoPath);

  const processInsertion = async () => {
    const settings = await getSettings();

    onInsertionStart();
    await replaceTeamTacticsPlayerPositions({
      checksum,
      demoName,
      outputFolderPath,
      databaseSettings: settings.database,
    });
  };

  try {
    await fs.remove(outputFolderPath);
    await analyzePistolRoundPositions({
      demoPath,
      outputFolderPath,
      source,
      onStart: (command) => {
        logger.log('starting pistol-round positions demo analyzer with command', command);
      },
      onStdout: logger.log,
      onStderr: logger.error,
      onEnd: (code) => {
        logger.log('pistol-round positions demo analyzer exited with code', code);
      },
    });

    await processInsertion();
  } catch (error) {
    if (error instanceof CorruptedDemoError) {
      await processInsertion();
    } else {
      throw error;
    }
  } finally {
    await fs.remove(outputFolderPath);
  }
}
