import type { DemoSource } from 'csdm/common/types/counter-strike';
import { generateMatchTacticsPositions } from 'csdm/node/database/matches/generate-match-tactics-positions';
import { RendererServerMessageName } from 'csdm/server/renderer-server-message-name';
import { server } from 'csdm/server/server';
import { runTacticsPositionsTask } from 'csdm/server/tactics-positions-task-runner';
import { handleError } from '../../handle-error';

export type GenerateMatchTacticsPositionsPayload = {
  checksum: string;
  demoPath: string;
  source: DemoSource;
};

export async function generateMatchTacticsPositionsHandler({
  checksum,
  demoPath,
  source,
}: GenerateMatchTacticsPositionsPayload) {
  try {
    await runTacticsPositionsTask(checksum, 'all', async () => {
      await generateMatchTacticsPositions({
        demoPath,
        checksum,
        source,
        onInsertionStart: () => {
          server.sendMessageToRendererProcess({
            name: RendererServerMessageName.InsertingMatchTacticsPositions,
          });
        },
      });
    });
  } catch (error) {
    handleError(error, 'Error while generating match tactics positions');
  }
}
