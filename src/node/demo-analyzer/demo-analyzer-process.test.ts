import { describe, expect, it } from 'vite-plus/test';
import { ErrorCode } from 'csdm/common/error-code';
import { DemoSource } from 'csdm/common/types/counter-strike';
import { buildAnalyzeDemoArgs, buildAnalyzeTacticsPositionsArgs } from './demo-analyzer-arguments';
import {
  getMissingDemoAnalyzerFlags,
  parseSupportedDemoAnalyzerFlags,
  tacticsDemoAnalyzerFlags,
} from './demo-analyzer-capabilities';
import { DemoAnalyzerIncompatibleError } from './demo-analyzer-incompatible-error';
import { getDemoAnalyzerExecutableName } from './demo-analyzer-path';
import { CorruptedDemoError } from './corrupted-demo-error';
import { buildDemoAnalyzerError } from './demo-analyzer-process';

describe('demo analyzer process helpers', () => {
  it('should resolve the analyzer executable name for each platform', () => {
    expect(getDemoAnalyzerExecutableName('win32')).toBe('csda.exe');
    expect(getDemoAnalyzerExecutableName('darwin')).toBe('csda');
    expect(getDemoAnalyzerExecutableName('linux')).toBe('csda');
  });

  it('should parse supported analyzer flags from help output', () => {
    const supportedFlags = parseSupportedDemoAnalyzerFlags(`
      -demo-path string
      -output string
      -format string
      -source string
      -positions
      -position-entities string
      -position-window-start-seconds int
      -position-window-end-seconds int
      -rounds string
    `);

    expect(getMissingDemoAnalyzerFlags(supportedFlags, tacticsDemoAnalyzerFlags)).toEqual([]);
  });

  it('should detect missing analyzer flags', () => {
    const supportedFlags = parseSupportedDemoAnalyzerFlags(`
      -demo-path string
      -output string
      -format string
      -source string
      -positions
    `);

    expect(getMissingDemoAnalyzerFlags(supportedFlags, tacticsDemoAnalyzerFlags)).toEqual([
      'position-entities',
      'position-window-start-seconds',
      'position-window-end-seconds',
      'rounds',
    ]);
  });

  it('should build standard analyzer args', () => {
    expect(
      buildAnalyzeDemoArgs({
        demoPath: '/demos/match.dem',
        outputFolderPath: '/output',
        source: DemoSource.FaceIt,
        analyzePositions: true,
      }),
    ).toEqual(['-demo-path=/demos/match.dem', '-output=/output', '-format=csdm', '-source=faceit', '-positions=true']);
  });

  it('should build tactics analyzer args', () => {
    expect(
      buildAnalyzeTacticsPositionsArgs({
        demoPath: '/demos/match.dem',
        outputFolderPath: '/output',
        source: DemoSource.FaceIt,
        roundNumbers: [1, 13],
        useEnhancedPositionOptions: true,
      }),
    ).toEqual([
      '-demo-path=/demos/match.dem',
      '-output=/output',
      '-format=csdm',
      '-positions=true',
      '-position-entities=players',
      '-position-window-start-seconds=10',
      '-position-window-end-seconds=20',
      '-rounds=1,13',
      '-source=faceit',
    ]);
  });

  it('should build fallback tactics analyzer args for analyzers without enhanced position flags', () => {
    expect(
      buildAnalyzeTacticsPositionsArgs({
        demoPath: '/demos/match.dem',
        outputFolderPath: '/output',
        source: DemoSource.FaceIt,
        roundNumbers: [1, 13],
        useEnhancedPositionOptions: false,
      }),
    ).toEqual(['-demo-path=/demos/match.dem', '-output=/output', '-format=csdm', '-positions=true', '-source=faceit']);
  });

  it('should convert unexpected end failures into CorruptedDemoError', () => {
    const error = buildDemoAnalyzerError('panic: ErrUnexpectedEndOfDemo', 1);

    expect(error).toBeInstanceOf(CorruptedDemoError);
  });

  it('should convert flag parser failures into incompatible analyzer errors', () => {
    const error = buildDemoAnalyzerError('flag provided but not defined: -position-entities\nUsage of csda:', 2);

    expect(error).toBeInstanceOf(DemoAnalyzerIncompatibleError);
    expect((error as DemoAnalyzerIncompatibleError).code).toBe(ErrorCode.DemoAnalyzerIncompatible);
  });

  it('should surface a readable message for sendtables parser crashes', () => {
    const error = buildDemoAnalyzerError('unable to find existing entity -2130706232\nstacktrace:\n...', 1);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('The bundled demo analyzer crashed while parsing this demo');
    expect(error.message).not.toContain('undefined');
  });

  it('should fall back to the first stderr line when available', () => {
    const error = buildDemoAnalyzerError('invalid output folder\nextra details', 1);

    expect(error.message).toBe('invalid output folder');
  });
});
