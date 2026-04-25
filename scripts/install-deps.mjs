import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const projectPath = fileURLToPath(new URL('..', import.meta.url));
const staticFolderPath = fileURLToPath(new URL('../static', import.meta.url));

const enhancedAnalyzerFlags = ['position-entities', 'position-window-start-seconds', 'position-window-end-seconds'];

async function supportsEnhancedDemoAnalyzer(binaryPath) {
  if (!(await fs.pathExists(binaryPath))) {
    return false;
  }

  try {
    const output = (await fs.readFile(binaryPath)).toString('latin1');
    return enhancedAnalyzerFlags.every((flag) => output.includes(flag));
  } catch (error) {
    return false;
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
  const npmBinarySupportsEnhancedFlags = await supportsEnhancedDemoAnalyzer(npmBinPath);
  const destinationSupportsEnhancedFlags = await supportsEnhancedDemoAnalyzer(destinationPath);
  if (!npmBinarySupportsEnhancedFlags && destinationSupportsEnhancedFlags) {
    return;
  }

  await fs.copy(npmBinPath, destinationPath);
}
