import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vite-plus/test';
import {
  detectDemoArchiveFormat,
  detectDemoArchiveFormatFromFile,
  isCompressedDemoArchiveFormat,
  isPotentialDemoDownloadPath,
} from './demo-archive';

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

  it('should detect archive formats from file contents when the file has no extension', async () => {
    const temporaryFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-archive-test-'));

    try {
      const gzipArchivePath = path.join(temporaryFolderPath, 'faceit-download');
      await fs.writeFile(gzipArchivePath, zlib.gzipSync(Buffer.from('demo')));
      expect(await detectDemoArchiveFormatFromFile(gzipArchivePath)).toBe('gz');

      const source2FixturePath = path.resolve('src/node/demo/fixtures/source_2_1.dem.data');
      const demoPath = path.join(temporaryFolderPath, 'downloaded-demo');
      await fs.copyFile(source2FixturePath, demoPath);
      expect(await detectDemoArchiveFormatFromFile(demoPath)).toBe('dem');
    } finally {
      await fs.remove(temporaryFolderPath);
    }
  });
});
