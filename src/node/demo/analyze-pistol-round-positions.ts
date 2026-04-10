import type { DemoSource } from 'csdm/common/types/counter-strike';
import { analyzeTacticsPositions } from './analyze-tactics-positions';

type Options = {
  outputFolderPath: string;
  demoPath: string;
  source: DemoSource;
  onStart?: (command: string) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onEnd?: (code: number | null) => void;
};

const pistolRoundNumbers = [1, 13];

export async function analyzePistolRoundPositions({
  outputFolderPath,
  demoPath,
  source,
  onStart,
  onStdout,
  onStderr,
  onEnd,
}: Options) {
  return analyzeTacticsPositions({
    outputFolderPath,
    demoPath,
    source,
    roundNumbers: pistolRoundNumbers,
    onStart,
    onStdout,
    onStderr,
    onEnd,
  });
}
