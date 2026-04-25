import fs from 'fs-extra';
import zlib from 'node:zlib';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';
import b2 from 'unbzip2-stream';

export type DemoArchiveFormat = 'dem' | 'gz' | 'bz2' | 'zip' | 'zst';
export type CompressedDemoArchiveFormat = Exclude<DemoArchiveFormat, 'dem'>;

const gzipMagicBytes = [0x1f, 0x8b];
const zipMagicBytes = [0x50, 0x4b];
const bzip2MagicBytes = [0x42, 0x5a, 0x68];
const zstdMagicBytes = [0x28, 0xb5, 0x2f, 0xfd];
const source1DemoFilestamp = 'HL2DEMO';
const source2DemoFilestamp = 'PBDEMS2';

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

function hasPrefix(buffer: Buffer, prefix: number[]) {
  return prefix.every((byte, index) => buffer[index] === byte);
}

async function readFilePrefix(filePath: string, byteLength: number) {
  const buffer = await fs.readFile(filePath);

  return buffer.subarray(0, byteLength);
}

export async function detectDemoArchiveFormatFromFile(filePath: string): Promise<DemoArchiveFormat | null> {
  const archiveFormatFromPath = detectDemoArchiveFormat(filePath);
  if (archiveFormatFromPath !== null) {
    return archiveFormatFromPath;
  }

  const header = await readFilePrefix(filePath, 8);
  if (header.length >= gzipMagicBytes.length && hasPrefix(header, gzipMagicBytes)) {
    return 'gz';
  }

  if (header.length >= bzip2MagicBytes.length && hasPrefix(header, bzip2MagicBytes)) {
    return 'bz2';
  }

  if (header.length >= zipMagicBytes.length && hasPrefix(header, zipMagicBytes)) {
    return 'zip';
  }

  if (header.length >= zstdMagicBytes.length && hasPrefix(header, zstdMagicBytes)) {
    return 'zst';
  }

  const filestamp = header.toString('utf8', 0, 8).replaceAll('\0', '');
  if (filestamp === source1DemoFilestamp || filestamp === source2DemoFilestamp) {
    return 'dem';
  }

  return null;
}

function readNullTerminatedLatin1String(buffer: Buffer, startIndex: number) {
  const endIndex = buffer.indexOf(0, startIndex);
  if (endIndex === -1) {
    return null;
  }

  return buffer.toString('latin1', startIndex, endIndex);
}

async function readGzipOriginalFileName(filePath: string) {
  const header = await readFilePrefix(filePath, 512);
  if (header.length < 10 || !hasPrefix(header, gzipMagicBytes)) {
    return null;
  }

  const flags = header[3] ?? 0;
  let offset = 10;
  const hasExtraField = (flags & 0x04) !== 0;
  const hasOriginalFileName = (flags & 0x08) !== 0;
  const hasComment = (flags & 0x10) !== 0;
  const hasHeaderCrc = (flags & 0x02) !== 0;

  if (hasExtraField) {
    if (header.length < offset + 2) {
      return null;
    }

    const extraFieldLength = header.readUInt16LE(offset);
    offset += 2 + extraFieldLength;
    if (header.length < offset) {
      return null;
    }
  }

  if (hasOriginalFileName) {
    return readNullTerminatedLatin1String(header, offset);
  }

  if (hasComment) {
    const comment = readNullTerminatedLatin1String(header, offset);
    if (comment !== null) {
      offset += Buffer.byteLength(comment, 'latin1') + 1;
    }
  }

  if (hasHeaderCrc) {
    offset += 2;
  }

  return null;
}

export async function getEmbeddedDemoEntryName(
  archivePath: string,
  archiveFormat: CompressedDemoArchiveFormat,
): Promise<string | null> {
  switch (archiveFormat) {
    case 'gz':
      return await readGzipOriginalFileName(archivePath);
    case 'zip': {
      const directory = await unzipper.Open.file(archivePath);
      const entry = directory.files.find((file) => !file.path.endsWith('/'));

      return entry?.path ?? null;
    }
    default:
      return null;
  }
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
