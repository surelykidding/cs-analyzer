import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs-extra';

const projectPath = fileURLToPath(new URL('..', import.meta.url));
const staticFolderPath = fileURLToPath(new URL('../static', import.meta.url));
const execFileAsync = promisify(execFile);

const enhancedAnalyzerFlags = [
  '-rounds',
  '-position-entities',
  '-position-window-start-seconds',
  '-position-window-end-seconds',
];

function outputChunkToString(chunk) {
  if (chunk === undefined) {
    return '';
  }

  return typeof chunk === 'string' ? chunk : chunk.toString();
}

async function supportsEnhancedDemoAnalyzer(binaryPath) {
  if (!(await fs.pathExists(binaryPath))) {
    return false;
  }

  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, ['--help'], {
      windowsHide: true,
    });
    const output = `${stdout}\n${stderr}`;
    return enhancedAnalyzerFlags.every((flag) => output.includes(flag));
  } catch (error) {
    const output = `${outputChunkToString(error?.stdout)}\n${outputChunkToString(error?.stderr)}`;
    return enhancedAnalyzerFlags.every((flag) => output.includes(flag));
  }
}

export async function installCounterStrikeVoiceExtractor(platform = process.platform) {
  const supportedPlatforms = ['darwin', 'win32', 'linux'];
  if (!supportedPlatforms.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const binPath = path.join(projectPath, 'node_modules/@akiver/csgo-voice-extractor/dist/bin', `${platform}-x64`);
  const destinationPath = path.join(staticFolderPath, 'csgove');
  await fs.copy(binPath, destinationPath);
}

export async function installBoilerWritter(platform = process.platform, arch = process.arch) {
  const supportedPlatforms = ['darwin-x64', 'darwin-arm64', 'win32-x64', 'linux-x64'];
  const binPath = `${platform}-${arch}`;
  if (!supportedPlatforms.includes(binPath)) {
    throw new Error(`Unsupported platform: ${binPath}`);
  }

  const npmBinPath = path.join(projectPath, 'node_modules/@akiver/boiler-writter/dist/bin', binPath);
  const destinationPath = path.join(staticFolderPath, 'boiler-writter');

  await fs.copy(npmBinPath, destinationPath);
}

export async function installDemoAnalyzer(platform = process.platform, arch = process.arch) {
  function getBinarySubpath() {
    const supportedPlatforms = {
      'darwin-x64': 'darwin-x64/csda',
      'darwin-arm64': 'darwin-arm64/csda',
      'linux-x64': 'linux-x64/csda',
      'linux-arm64': 'linux-arm64/csda',
      'win32-x64': 'windows-x64/csda.exe',
    };

    const platformKey = `${platform}-${arch}`;
    if (!supportedPlatforms[platformKey]) {
      throw new Error(`Unsupported platform: ${platformKey}`);
    }

    return supportedPlatforms[platformKey];
  }

  const npmBinPath = path.join(projectPath, 'node_modules/@akiver/cs-demo-analyzer/dist/bin', getBinarySubpath());
  const destinationPath = path.join(staticFolderPath, platform === 'win32' ? 'csda.exe' : 'csda');
  if (await supportsEnhancedDemoAnalyzer(destinationPath)) {
    return;
  }

  await fs.copy(npmBinPath, destinationPath);
}
