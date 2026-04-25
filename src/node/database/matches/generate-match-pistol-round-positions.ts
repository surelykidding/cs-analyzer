import type { DemoSource } from 'csdm/common/types/counter-strike';
import { generateMatchTacticsPositions } from './generate-match-tactics-positions';

type Parameters = {
  checksum: string;
  demoPath: string;
  source: DemoSource;
  onInsertionStart: () => void;
};

export async function generateMatchPistolRoundPositions({ checksum, demoPath, source, onInsertionStart }: Parameters) {
  logger.warn('generateMatchPistolRoundPositions is deprecated; generating enhanced tactics positions instead');

  return generateMatchTacticsPositions({
    checksum,
    demoPath,
    source,
    onInsertionStart,
  });
}
