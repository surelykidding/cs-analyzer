import type { DemoSource } from 'csdm/common/types/counter-strike';
import {
  TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS,
  TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS,
} from 'csdm/common/types/team-tactics';

type AnalyzeDemoArgsOptions = {
  outputFolderPath: string;
  demoPath: string;
  source?: DemoSource;
  analyzePositions?: boolean;
  minify?: boolean;
};

type AnalyzeTacticsPositionsArgsOptions = {
  outputFolderPath: string;
  demoPath: string;
  source: DemoSource;
  roundNumbers?: number[];
  useEnhancedPositionOptions: boolean;
};

const positionEntities = 'players';

export function buildAnalyzeDemoArgs(options: AnalyzeDemoArgsOptions) {
  const args = [`-demo-path=${options.demoPath}`, `-output=${options.outputFolderPath}`, '-format=csdm'];

  if (options.source !== undefined) {
    args.push(`-source=${options.source}`);
  }

  if (options.analyzePositions !== undefined) {
    args.push(`-positions=${options.analyzePositions}`);
  }

  if (options.minify) {
    args.push('-minify');
  }

  return args;
}

export function buildAnalyzeTacticsPositionsArgs({
  outputFolderPath,
  demoPath,
  source,
  roundNumbers,
  useEnhancedPositionOptions,
}: AnalyzeTacticsPositionsArgsOptions) {
  const args = [`-demo-path=${demoPath}`, `-output=${outputFolderPath}`, '-format=csdm', '-positions=true'];

  if (useEnhancedPositionOptions) {
    args.push(
      `-position-entities=${positionEntities}`,
      `-position-window-start-seconds=${TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS}`,
      `-position-window-end-seconds=${TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS}`,
    );
  }

  if (useEnhancedPositionOptions && roundNumbers !== undefined && roundNumbers.length > 0) {
    args.push(`-rounds=${roundNumbers.join(',')}`);
  }

  args.push(`-source=${source}`);

  return args;
}
