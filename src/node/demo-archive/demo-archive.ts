import fs from 'fs-extra';
import zlib from 'node:zlib';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';
import b2 from 'unbzip2-stream';

export type DemoArchiveFormat = 'dem' | 'gz' | 'bz2' | 'zip' | 'zst';
export type CompressedDemoArchiveFormat = Exclude<DemoArchiveFormat, 'dem'>;

export function isPotentialDemoDownloadPath(filePath: string) {
  const lowerPath = filePath.toLowerCase();

  return (
    lowerPath.endsWith('.dem') ||
    lowerPath.endsWith('.gz') ||
    lowerPath.endsWith('.bz2') ||
    lowerPath.endsWith('.zip') ||
    lowerPath.endsWith('.zst')
  );
}

export function detectDemoArchiveFormat(filePathOrUrl: string, contentType: string | null = null): DemoArchiveFormat | null {
  const lowerContentType = contentType?.toLowerCase() ?? '';
  let pathname = filePathOrUrl;
  try {
    pathname = new URL(filePathOrUrl).pathname;
  } catch {
    pathname = filePathOrUrl;
  }

  const lowerPathname = pathname.toLowerCase();
  if (lowerPathname.endsWith('.dem.gz') || lowerPathname.endsWith('.gz') || lowerContentType.includes('gzip')) {
    return 'gz';
  }

  if (lowerPathname.endsWith('.dem.bz2') || lowerPathname.endsWith('.bz2') || lowerContentType.includes('bzip2')) {
    return 'bz2';
  }

  if (lowerPathname.endsWith('.zip') || lowerContentType.includes('zip')) {
    return 'zip';
  }

  if (lowerPathname.endsWith('.dem.zst') || lowerPathname.endsWith('.zst') || lowerContentType.includes('zstd')) {
    return 'zst';
  }

  if (lowerPathname.endsWith('.dem')) {
    return 'dem';
  }

  return null;
}

export function isCompressedDemoArchiveFormat(
  archiveFormat: DemoArchiveFormat | null,
): archiveFormat is CompressedDemoArchiveFormat {
  return archiveFormat !== null && archiveFormat !== 'dem';
}

export function createDemoArchiveExtractStream(archiveFormat: DemoArchiveFormat): NodeJS.ReadWriteStream {
  switch (archiveFormat) {
    case 'dem':
      return new PassThrough();
    case 'gz':
      return zlib.createGunzip();
    case 'bz2':
      return b2();
    case 'zip':
      return unzipper.ParseOne();
    case 'zst':
      return zlib.createZstdDecompress();
  }
}

export async function extractDemoArchiveToFile(archivePath: string, demoPath: string, archiveFormat: DemoArchiveFormat) {
  await pipeline(fs.createReadStream(archivePath), createDemoArchiveExtractStream(archiveFormat), fs.createWriteStream(demoPath));
}
