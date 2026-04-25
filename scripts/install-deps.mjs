import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { buildEnhancedDemoAnalyzer, getEnhancedDemoAnalyzerTarget } from './build-enhanced-demo-analyzer.mjs';

const projectPath = fileURLToPath(new URL('..', import.meta.url));
const staticFolderPath = fileURLToPath(new URL('../static', import.meta.url));
const analyzerFlagsPath = fileURLToPath(new URL('../src/node/demo-analyzer/demo-analyzer-flags.json', import.meta.url));

async function getAnalyzerFlags() {
  return fs.readJson(analyzerFlagsPath);
}

async function supportsDemoAnalyzerFlags(binaryPath, flags) {
  if (!(await fs.pathExists(binaryPath))) {
    return false;
  }

  try {
    const output = (await fs.readFile(binaryPath)).toString('latin1');
    return flags.every((flag) => output.includes(flag));
  } catch (error) {
    return false;
  }
}

async function ensureExecutable(binaryPath, platform) {
  if (platform !== 'win32') {
    await fs.chmod(binaryPath, 0o755);
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

function getDemoAnalyzerPlatformKey(platform, arch) {
  return `${platform}-${arch}`;
}

function getDemoAnalyzerBinarySubpath(platform, arch) {
  const supportedPlatforms = {
    'darwin-x64': 'darwin-x64/csda',
    'darwin-arm64': 'darwin-arm64/csda',
    'linux-x64': 'linux-x64/csda',
    'linux-arm64': 'linux-arm64/csda',
    'win32-x64': 'windows-x64/csda.exe',
  };

  const platformKey = getDemoAnalyzerPlatformKey(platform, arch);
  if (!supportedPlatforms[platformKey]) {
    throw new Error(`Unsupported platform: ${platformKey}`);
  }

  return supportedPlatforms[platformKey];
}

export async function installDemoAnalyzer(
  platform = process.platform,
  arch = process.arch,
  { requireEnhanced = false } = {},
) {
  const platformKey = getDemoAnalyzerPlatformKey(platform, arch);
  const npmBinPath = path.join(
    projectPath,
    'node_modules/@akiver/cs-demo-analyzer/dist/bin',
    getDemoAnalyzerBinarySubpath(platform, arch),
  );
  const destinationPath = path.join(staticFolderPath, platform === 'win32' ? 'csda.exe' : 'csda');
  const analyzerFlags = await getAnalyzerFlags();
  const enhancedAnalyzerFlags = [...analyzerFlags.core, ...analyzerFlags.tactics];

  getEnhancedDemoAnalyzerTarget(platformKey);
  try {
    await buildEnhancedDemoAnalyzer({ targetName: platformKey, outputPath: destinationPath });
    await ensureExecutable(destinationPath, platform);
    return;
  } catch (error) {
    const destinationSupportsEnhancedFlags = await supportsDemoAnalyzerFlags(destinationPath, enhancedAnalyzerFlags);
    if (destinationSupportsEnhancedFlags) {
      await ensureExecutable(destinationPath, platform);
      return;
    }

    if (requireEnhanced) {
      throw new Error(
        `Unable to build the enhanced demo analyzer for ${platformKey}. Install Go and run "npm run analyzer:build -- --target ${platformKey}". Cause: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    console.warn(
      `Unable to build the enhanced demo analyzer for ${platformKey}; falling back to the npm analyzer. Tactics analysis may run slower or report an analyzer compatibility error. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const npmBinarySupportsEnhancedFlags = await supportsDemoAnalyzerFlags(npmBinPath, enhancedAnalyzerFlags);
  const destinationSupportsEnhancedFlags = await supportsDemoAnalyzerFlags(destinationPath, enhancedAnalyzerFlags);
  if (!npmBinarySupportsEnhancedFlags && destinationSupportsEnhancedFlags) {
    await ensureExecutable(destinationPath, platform);
    return;
  }

  await fs.copy(npmBinPath, destinationPath);
  await ensureExecutable(destinationPath, platform);
}
