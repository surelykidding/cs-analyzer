import { describe, expect, it } from 'vite-plus/test';
import { CorruptedDemoError } from './corrupted-demo-error';
import { buildDemoAnalyzerError } from './demo-analyzer-process';

describe('demo analyzer process helpers', () => {
  it('should convert unexpected end failures into CorruptedDemoError', () => {
    const error = buildDemoAnalyzerError('panic: ErrUnexpectedEndOfDemo', 1);

    expect(error).toBeInstanceOf(CorruptedDemoError);
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
