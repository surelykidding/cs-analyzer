import { describe, expect, it } from 'vite-plus/test';
import { detectDemoArchiveFormat, isCompressedDemoArchiveFormat, isPotentialDemoDownloadPath } from './demo-archive';

describe('demo archive helpers', () => {
  it('should detect zst archives from file names and content types', () => {
    expect(detectDemoArchiveFormat('match.dem.zst')).toBe('zst');
    expect(detectDemoArchiveFormat('https://example.com/download', 'application/zstd')).toBe('zst');
  });

  it('should include zst files in potential demo download paths', () => {
    expect(isPotentialDemoDownloadPath('D:/downloads/match.dem.zst')).toBe(true);
  });

  it('should treat plain dem files as already extracted demos', () => {
    expect(isCompressedDemoArchiveFormat(detectDemoArchiveFormat('match.dem'))).toBe(false);
    expect(isCompressedDemoArchiveFormat(detectDemoArchiveFormat('match.dem.gz'))).toBe(true);
  });
});
