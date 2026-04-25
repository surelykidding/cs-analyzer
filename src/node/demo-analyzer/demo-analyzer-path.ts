import path from 'node:path';
import { getStaticFolderPath } from 'csdm/node/filesystem/get-static-folder-path';

export function getDemoAnalyzerExecutableName(platform = process.platform) {
  return platform === 'win32' ? 'csda.exe' : 'csda';
}

export function getDemoAnalyzerExecutablePath(platform = process.platform) {
  return path.join(getStaticFolderPath(), getDemoAnalyzerExecutableName(platform));
}
